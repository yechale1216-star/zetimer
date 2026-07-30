import prisma from '../config/db';

export interface Membership {
  id: string; // matches schoolId
  name: string; // matches schoolName
  role: string;
  customSchoolId?: string;
  logo?: string;
}

// ─── Role resolution in-memory cache ─────────────────────────────────────────
// Avoids 2-4 DB queries per API request for the same user+school combo.
// TTL: 5 minutes. Cache is auto-invalidated on role/school changes by calling invalidateRoleCache().
interface CacheEntry { role: string | null; expiresAt: number }
const roleCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const invalidateRoleCache = (userId: string, schoolId?: string) => {
  if (schoolId) {
    // Delete all keys matching this user+school pair
    for (const key of roleCache.keys()) {
      if (key.startsWith(`${userId}:${schoolId}:`)) roleCache.delete(key);
    }
  } else {
    // Invalidate all entries for this user
    for (const key of roleCache.keys()) {
      if (key.startsWith(`${userId}:`)) roleCache.delete(key);
    }
  }
};

// Periodically clean up expired entries (runs every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of roleCache.entries()) {
    if (entry.expiresAt < now) roleCache.delete(key);
  }
}, 10 * 60 * 1000);

/**
 * Resolves all schools and roles associated with a user.
 * Checks User (staff), Teacher, and ParentStudentLink models.
 */
export const getMemberships = async (userId: string): Promise<Membership[]> => {
  const memberships: Membership[] = [];

  // Run all 3 membership lookups in parallel
  const [user, teacherRecords, parentLinks] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { school: { include: { settings: true } } }
    }),
    prisma.teacher.findMany({
      where: { user_id: userId },
      include: { school: { include: { settings: true } } }
    }),
    prisma.parentStudentLink.findMany({
      where: { parentId: userId },
      include: { school: { include: { settings: true } } }
    }),
  ]);

  // 1. Staff/Admin Memberships (via User table)
  if (user && user.schoolId && user.role && user.role !== 'parent') {
    memberships.push({
      id: user.schoolId,
      name: user.school?.name || 'My School',
      role: user.role,
      customSchoolId: user.school?.schoolId || '',
      logo: (user.school?.settings as any | null)?.school_logo || ''
    });
  }

  // 2. Teacher Memberships
  for (const t of teacherRecords) {
    if (t.schoolId && !memberships.some(m => m.id === t.schoolId && m.role === 'teacher')) {
      memberships.push({
        id: t.schoolId,
        name: t.school?.name || 'My School',
        role: 'teacher',
        customSchoolId: t.school?.schoolId || '',
        logo: (t.school?.settings as any | null)?.school_logo || ''
      });
    }
  }

  // 3. Parent Memberships
  for (const l of parentLinks) {
    if (l.schoolId && !memberships.some(m => m.id === l.schoolId && m.role === 'parent')) {
      memberships.push({
        id: l.schoolId,
        name: l.school?.name || 'My School',
        role: 'parent',
        customSchoolId: l.school?.schoolId || '',
        logo: (l.school?.settings as any | null)?.school_logo || ''
      });
    }
  }
  
  // 4. Special case: Super Admin
  if (user?.role === 'super_admin') {
    if (!memberships.some(m => m.role === 'super_admin')) {
      memberships.push({ id: 'global', name: 'Zetime Platform', role: 'super_admin' });
    }
  }

  return memberships;
};

/**
 * Determines the specific role a user has within a specific school.
 * Results are cached for 5 minutes to eliminate repeated DB queries per request.
 */
export const resolveRoleInSchool = async (userId: string, schoolId: string, requestedRole?: string): Promise<string | null> => {
  if (!userId || !schoolId) return null;

  const cacheKey = `${userId}:${schoolId}:${requestedRole || 'auto'}`;
  const cached = roleCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.role;
  }

  const result = await _resolveRoleInSchool(userId, schoolId, requestedRole);
  roleCache.set(cacheKey, { role: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
};

/** Internal uncached implementation */
const _resolveRoleInSchool = async (userId: string, schoolId: string, requestedRole?: string): Promise<string | null> => {
  if (!userId || !schoolId) return null;

  // Super Admin bypass — single DB call, cached after first hit
  const globalUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (globalUser?.role === 'super_admin') return 'super_admin';

  if (schoolId === 'global') return null;

  // 1. If a specific role is requested, validate it precisely
  if (requestedRole) {
    if (requestedRole === 'parent') {
      const parent = await prisma.parentStudentLink.findFirst({ where: { parentId: userId, schoolId }, select: { id: true } });
      if (parent) return 'parent';
    }

    if (requestedRole === 'teacher') {
      // Check Teacher table and User table simultaneously
      const [teacher, userRecord] = await Promise.all([
        prisma.teacher.findFirst({ where: { user_id: userId, schoolId }, select: { id: true } }),
        prisma.user.findFirst({ where: { id: userId, schoolId, role: 'teacher' }, select: { id: true } }),
      ]);
      if (teacher || userRecord) return 'teacher';
    }

    if (requestedRole === 'admin' || requestedRole === 'school_admin' || requestedRole === 'school-admin') {
      const user = await prisma.user.findFirst({
        where: { id: userId, schoolId, role: { in: ['admin', 'school_admin'] } },
        select: { role: true }
      });
      if (user) return user.role;
    }

    const staffRoles = ['staff', 'registrar', 'discipline_officer', 'call_center'];
    if (staffRoles.includes(requestedRole)) {
      const user = await prisma.user.findFirst({ where: { id: userId, schoolId, role: requestedRole }, select: { id: true } });
      if (user) return requestedRole;
    }
  }

  // 2. Fallback: run all 3 checks in parallel for fastest resolution
  const [user, teacher, parent] = await Promise.all([
    prisma.user.findFirst({ where: { id: userId, schoolId }, select: { role: true } }),
    prisma.teacher.findFirst({ where: { user_id: userId, schoolId }, select: { id: true } }),
    prisma.parentStudentLink.findFirst({ where: { parentId: userId, schoolId }, select: { id: true } }),
  ]);

  if (user && user.role && !['parent', 'student'].includes(user.role)) return user.role;
  if (teacher) return 'teacher';
  if (parent) return 'parent';

  return null;
};
