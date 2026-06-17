import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'zetime-secret-key-2024-secure-and-long-enough';

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

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // For parents, allow overriding schoolId via header (supports multi-school parents)
    // BUT validate they actually have a child in the requested school to prevent
    // cross-school data access via a forged/stale x-school-id header.
    let schoolId = decoded.schoolId;

    if (decoded.role === 'parent' && schoolIdHeader && schoolIdHeader !== schoolId) {
      const requestedSchoolId = schoolIdHeader as string;
      try {
        // Verify parent has at least one student in the requested school
        const link = await prisma.parentStudentLink.findFirst({
          where: {
            parentId: decoded.id,
            schoolId: requestedSchoolId,
          }
        });
        if (link) {
          schoolId = requestedSchoolId;
        } else {
          console.warn(
            `[tenantMiddleware] Parent ${decoded.id} attempted to access school ${requestedSchoolId} but has no student link. Ignoring header override.`
          );
          // Keep JWT schoolId - do not allow the override
        }
      } catch (dbErr) {
        console.error('[tenantMiddleware] Failed to verify parent-school link:', dbErr);
        // On DB error, fall back to JWT schoolId (safe default)
      }
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      schoolId: schoolId,
      customSchoolId: decoded.customSchoolId,
    };
    next();
  } catch (error) {
    console.error('JWT Verification Error:', error);
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

  const schoolId = req.user.schoolId;
  if (!schoolId) return next();

  try {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: { 
        subscription: true 
      },
    });

    // Check status from both school (deprecated) and real subscription record
    const status = (school?.subscription?.status || school?.subscriptionStatus || 'ACTIVE').toUpperCase();
    
    console.log(`[subscriptionGuard] Checking school ${school?.schoolId || 'unknown'}. Status: ${status}`);

    if (status === 'SUSPENDED' || status === 'EXPIRED') {
      console.log(`[subscriptionGuard] BLOCKING request to ${req.method} ${req.originalUrl} - School ${status}`);
      
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
      const { resolveSchoolFeatures } = require('../services/subscription.service');
      const grantedFeatures = await resolveSchoolFeatures(schoolId);

      if (!grantedFeatures.includes(featureKey)) {
        console.log(`[featureGuard] BLOCKING request to ${req.method} ${req.originalUrl} - Missing feature: ${featureKey}`);
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
