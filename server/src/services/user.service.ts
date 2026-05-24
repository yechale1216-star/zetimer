import prisma from '../config/db';
import bcrypt from 'bcryptjs';

export const getUserByEmail = async (email: string) => {
  return await prisma.user.findUnique({ where: { email } });
};

export const getUserById = async (id: string) => {
  return await prisma.user.findUnique({ where: { id } });
};

export const getUsers = async (schoolId?: string) => {
  const where: any = {};
  if (schoolId) where.school_id = schoolId;
  return await prisma.user.findMany({ where });
};

export const getContacts = async (schoolId: string) => {
  // Extract all parent phones from students in this school for legacy linking
  const students = await prisma.student.findMany({
    where: { schoolId },
    select: { parent_phone: true }
  });
  
  const parentPhones = students
    .map(s => s.parent_phone ? s.parent_phone.replace(/\s+/g, '') : '')
    .filter(p => p !== '');

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { school_id: schoolId },
        { parentStudents: { some: { student: { schoolId } } } },
        { phone: { in: parentPhones }, role: 'parent' }
      ],
      role: { in: ['admin', 'school_admin', 'teacher', 'parent'] },
      is_active: true
    },
    select: {
      id: true,
      full_name: true,
      profile_photo: true,
      role: true,
      phone: true,
    }
  });

  // De-duplicate by User ID only, to allow teachers/admins with the same testing phone
  const uniqueUsers = new Map();
  for (const u of users) {
    if (!uniqueUsers.has(u.id)) {
      uniqueUsers.set(u.id, u);
    }
  }

  return Array.from(uniqueUsers.values());
};

export const createUser = async (data: any) => {
  let teacherId = data.teacher_id || null;

  // Prevent duplicate phone for teachers
  if (data.role === 'teacher' && data.phone) {
    const cleanPhone = data.phone.trim();
    const existing = await prisma.user.findFirst({
      where: { phone: cleanPhone, role: 'teacher' }
    });
    if (existing) {
      throw new Error('Phone already registered for another teacher.');
    }
    data.phone = cleanPhone;
  }

  // Automatically create a corresponding Teacher record if role is 'teacher'
  if (data.role === 'teacher' && !teacherId && data.school_id) {
    const teacher = await prisma.teacher.create({
      data: {
        name: data.full_name,
        email: data.email,
        schoolId: data.school_id,
        phone: data.phone || null,
        subject: data.subject || null,
        qualification: data.qualification || null,
        experience_years: data.experience_years !== undefined && data.experience_years !== null ? Number(data.experience_years) : null,
        is_active: data.is_active !== false,
        profile_photo: data.profile_photo || null,
      }
    });
    teacherId = teacher.id;
  }

  const hashedPassword = data.password_hash && !data.password_hash.startsWith('$2')
    ? bcrypt.hashSync(data.password_hash, 10)
    : data.password_hash;

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password_hash: hashedPassword,
      full_name: data.full_name,
      role: data.role || 'teacher',
      phone: data.phone || null,
      is_active: data.is_active !== false,
      teacher_id: teacherId,
      school_id: data.school_id || null,
      subject: data.subject || null,
      qualification: data.qualification || null,
      experience_years: data.experience_years !== undefined && data.experience_years !== null ? Number(data.experience_years) : null,
      profile_photo: data.profile_photo || null,
    },
  });

  // Link the newly created User ID to the Teacher record
  if (data.role === 'teacher' && teacherId) {
    try {
      await prisma.teacher.update({
        where: { id: teacherId },
        data: { user_id: user.id }
      });
    } catch (e) {
      console.error("Failed to link user_id on teacher record:", e);
    }
  }

  return user;
};

export const updateUser = async (id: string, data: any) => {
  const updateData: any = {};
  if (data.full_name !== undefined) updateData.full_name = data.full_name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) {
    const cleanPhone = data.phone.trim();
    
    // Prevent duplicate phone for teachers on update
    const currentUser = await prisma.user.findUnique({ where: { id } });
    if (currentUser?.role === 'teacher' && cleanPhone) {
      const existing = await prisma.user.findFirst({
        where: { phone: cleanPhone, role: 'teacher', id: { not: id } }
      });
      if (existing) {
        throw new Error('Phone already registered for another teacher.');
      }
    }
    updateData.phone = cleanPhone;
  }
  if (data.password_hash !== undefined) {
    updateData.password_hash = data.password_hash && !data.password_hash.startsWith('$2')
      ? bcrypt.hashSync(data.password_hash, 10)
      : data.password_hash;
  }
  if (data.is_active !== undefined) updateData.is_active = data.is_active;
  if (data.teacher_id !== undefined) updateData.teacher_id = data.teacher_id;
  if (data.subject !== undefined) updateData.subject = data.subject;
  if (data.qualification !== undefined) updateData.qualification = data.qualification;
  if (data.experience_years !== undefined) updateData.experience_years = data.experience_years !== null ? Number(data.experience_years) : null;
  if (data.profile_photo !== undefined) updateData.profile_photo = data.profile_photo;

  const user = await prisma.user.update({ where: { id }, data: updateData });

  // Update corresponding Teacher record if it exists
  if (user.teacher_id && (data.full_name !== undefined || data.email !== undefined || data.phone !== undefined || data.subject !== undefined || data.qualification !== undefined || data.experience_years !== undefined || data.is_active !== undefined || data.profile_photo !== undefined)) {
    try {
      await prisma.teacher.update({
        where: { id: user.teacher_id },
        data: {
          ...(data.full_name !== undefined && { name: data.full_name }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.subject !== undefined && { subject: data.subject }),
          ...(data.qualification !== undefined && { qualification: data.qualification }),
          ...(data.experience_years !== undefined && { experience_years: data.experience_years !== null ? Number(data.experience_years) : null }),
          ...(data.is_active !== undefined && { is_active: data.is_active }),
          ...(data.profile_photo !== undefined && { profile_photo: data.profile_photo }),
        }
      });
    } catch (e) {
      console.error("Failed to update linked teacher record:", e);
    }
  }

  return user;
};

export const deleteUser = async (id: string) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (user && user.teacher_id) {
    try {
      // Delete assignments first
      await prisma.teacherAssignment.deleteMany({ where: { teacher_id: user.teacher_id } });
      // Delete teacher record
      await prisma.teacher.delete({ where: { id: user.teacher_id } });
    } catch (e) {
      console.error("Failed to delete linked teacher:", e);
    }
  }
  return await prisma.user.delete({ where: { id } });
};

export const verifyPassword = (plain: string, hash: string): boolean => {
  // Support plain text passwords (dev mode) and bcrypt hashes
  if (hash.startsWith('$2')) {
    try { return require('bcryptjs').compareSync(plain, hash); } catch { return false; }
  }
  return plain === hash;
};
