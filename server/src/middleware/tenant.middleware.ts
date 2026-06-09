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
export const tenantMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
    
    // For parents, allow overriding schoolId via header
    let schoolId = decoded.schoolId;
    if (decoded.role === 'parent' && schoolIdHeader) {
      schoolId = schoolIdHeader as string;
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
 * Suspended School Guard
 * Blocks all write requests (POST/PUT/PATCH/DELETE) for users whose school is SUSPENDED.
 * Super admins bypass this check. Read-only requests (GET/HEAD/OPTIONS) always pass.
 */
export const suspendedGuard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
      select: { subscriptionStatus: true },
    });

    if (school?.subscriptionStatus === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'Your school account is suspended. You can view existing data but cannot make changes. Please contact support.',
        code: 'SCHOOL_SUSPENDED',
      });
    }
  } catch (err) {
    // On DB error, fail open to avoid blocking legitimate users
    console.error('[suspendedGuard] DB error:', err);
  }

  next();
};
