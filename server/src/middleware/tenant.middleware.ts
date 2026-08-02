import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import jwt from 'jsonwebtoken';
import { resolveRoleInSchool } from '../services/auth_resolution.service';
import { cacheGet, cacheSetEx, cacheDel } from '../redis';
import { getJwtSecret } from '../utils/jwt';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    schoolId: string; // The internal UUID used for filtering
    customSchoolId?: string; // The SCH-XXXX ID
  };
}

/**
 * Middleware to verify JWT and extract tenant information.
 * Every request must pass through this or a public route.
 */
export const tenantMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const schoolIdHeader = req.headers['x-school-id'];

  // Public routes exclusion - use originalUrl since middleware is mounted at /api
  const publicPaths = [
    '/api/parent/schools',
    '/api/parent/login',
    '/api/auth',
    '/api/subscriptions/plans',
    '/api/subscriptions/addons',
    '/health'
  ];

  const url = req.originalUrl.split('?')[0]; // strip query string for comparison
  if (publicPaths.some(path => url.startsWith(path))) {
    return next();
  }

  let token: string | undefined;

  if (req.cookies && req.cookies.attendance_token) {
    token = req.cookies.attendance_token;
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authorization token required' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    
    let schoolId = decoded.schoolId;
    let role = decoded.role;

    // Resolve context-specific role
    const activeSchoolId = (schoolIdHeader as string) || schoolId;
    let requestedRole = req.headers['x-requested-role'] as string | undefined;

    if (!requestedRole) {
      if (url.startsWith('/api/parent')) {
        requestedRole = 'parent';
      } else if (url.startsWith('/api/teachers') || url.includes('/attendance-sessions')) {
        requestedRole = 'teacher';
      } else if (url.startsWith('/api/school/') || url.startsWith('/api/schools/') || url.startsWith('/api/settings')) {
        requestedRole = 'school_admin';
      }
    }

    if (activeSchoolId) {
      const cacheKey = `role:${decoded.id}:${activeSchoolId}:${requestedRole || ''}`;
      let contextRole = await cacheGet(cacheKey);

      if (!contextRole) {
        contextRole = await resolveRoleInSchool(decoded.id, activeSchoolId, requestedRole);
        if (contextRole) {
          await cacheSetEx(cacheKey, 300, contextRole); // 5 min TTL
        }
      }

      if (contextRole) {
        schoolId = activeSchoolId;
        role = contextRole;
      } else if (decoded.role === 'super_admin') {
        role = 'super_admin';
      } else {
        const isIdentityEndpoint = url.startsWith('/api/users/profile') || url.startsWith('/api/users/me');
        if (!isIdentityEndpoint && schoolIdHeader && decoded.schoolId && schoolIdHeader !== decoded.schoolId) {
          return res.status(403).json({ 
            success: false, 
            message: 'Access denied: You do not have an active role in the requested school context.' 
          });
        }
      }
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: role,
      schoolId: schoolId,
      customSchoolId: decoded.customSchoolId,
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

/**
 * Role-based Access Control Middleware
 */
export const authorize = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (req.user.role === 'super_admin') {
      return next(); // Super admin bypasses all role checks
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Forbidden: You do not have permission to access this resource' 
      });
    }

    next();
  };
};

/** Call this after a school is suspended/unsuspended to force next request to re-query */
export const invalidateSchoolStatusCache = async (schoolId: string) => {
  await cacheDel(`substatus:${schoolId}`);
};

/**
 * Subscription Guard
 * Blocks all write requests (POST/PUT/PATCH/DELETE) for users whose school is SUSPENDED or EXPIRED.
 * Super admins bypass this check. Read-only requests (GET/HEAD/OPTIONS) always pass.
 */
export const subscriptionGuard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Super admins are never blocked
  if (!req.user || req.user.role === 'super_admin') return next();

  // Read-only methods are always allowed — historical data stays accessible
  const readMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (readMethods.includes(req.method)) return next();

  const url = req.originalUrl.split('?')[0];
  const writeWhitelist = [
    '/api/parent/me/active-school',  // parent school-switching
    '/api/users/me/active-school',   // generic school-switching
    '/api/users/profile',            // profile updates
    '/api/parent/profile',           // parent profile updates
    '/api/parent/update-password',   // password change
    '/api/auth',                     // auth flows
    '/api/schools/support',          // help desk & feedback support tickets
    '/api/super-admin/support',      // super admin support tickets
  ];
  if (writeWhitelist.some(path => url.startsWith(path))) return next();

  const headerSchoolId = req.headers['x-school-id'] as string | undefined;
  const schoolId = headerSchoolId || req.user.schoolId;
  if (!schoolId) return next();

  try {
    const cacheKey = `substatus:${schoolId}`;
    let status = await cacheGet(cacheKey);

    if (!status) {
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        include: { subscription: true },
      });
      status = (school?.subscription?.status || school?.subscriptionStatus || 'ACTIVE').toUpperCase();
      await cacheSetEx(cacheKey, 90, status); // 90s TTL
    }

    if (status === 'SUSPENDED' || status === 'EXPIRED') {
      const message = status === 'SUSPENDED'
        ? 'Your school account is suspended. Please contact support.'
        : 'Your school subscription or trial has expired. Please upgrade your plan to continue making changes.';

      return res.status(403).json({
        success: false,
        message: message,
        code: `SCHOOL_${status}`,
      });
    }
  } catch (err) {
    console.error('[subscriptionGuard] DB error:', err);
  }

  next();
};

/**
 * Feature Guard
 * Checks if the school has a specific feature enabled based on their plan/addons.
 */
export const featureGuard = (featureKey: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Super admins bypass all feature checks
    if (!req.user || req.user.role === 'super_admin') return next();

    const schoolId = req.user.schoolId;
    if (!schoolId) return next();

    try {
      const cacheKey = `features:${schoolId}`;
      let grantedFeaturesRaw = await cacheGet(cacheKey);
      let grantedFeatures: string[];

      if (grantedFeaturesRaw) {
        grantedFeatures = JSON.parse(grantedFeaturesRaw);
      } else {
        const { resolveSchoolFeatures } = require('../services/subscription.service');
        grantedFeatures = await resolveSchoolFeatures(schoolId);
        await cacheSetEx(cacheKey, 600, JSON.stringify(grantedFeatures)); // 10 min TTL
      }

      if (!grantedFeatures.includes(featureKey)) {
        return res.status(403).json({
          success: false,
          message: `This feature (${featureKey}) is not included in your current plan. Please upgrade to access it.`,
          code: 'FEATURE_RESTRICTED',
          requiredFeature: featureKey
        });
      }
    } catch (err) {
      console.error('[featureGuard] DB error:', err);
    }

    next();
  };
};

