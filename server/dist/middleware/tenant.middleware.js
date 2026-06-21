"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.featureGuard = exports.subscriptionGuard = exports.authorize = exports.tenantMiddleware = void 0;
const db_1 = __importDefault(require("../config/db"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_resolution_service_1 = require("../services/auth_resolution.service");
const JWT_SECRET = process.env.JWT_SECRET || 'zetime-secret-key-2024-secure-and-long-enough';
/**
 * Middleware to verify JWT and extract tenant information.
 * Every request must pass through this or a public route.
 */
const tenantMiddleware = async (req, res, next) => {
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
    let token;
    if (req.cookies && req.cookies.attendance_token) {
        token = req.cookies.attendance_token;
    }
    else if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }
    if (!token) {
        return res.status(401).json({ success: false, message: 'Authorization token required' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        let schoolId = decoded.schoolId;
        let role = decoded.role;
        // Resolve context-specific role
        const activeSchoolId = schoolIdHeader || schoolId;
        let requestedRole = req.headers['x-requested-role'];
        // SITUATIONAL ROLE RESOLUTION:
        // If the user is accessing a specific portal's API, infer the requested role.
        // This allows dual-role users (e.g. Teacher + Parent) to use both portals
        // in different tabs without conflict.
        if (!requestedRole) {
            if (url.startsWith('/api/parent')) {
                requestedRole = 'parent';
            }
            else if (url.startsWith('/api/teachers') || url.includes('/attendance-sessions')) {
                // Broadly speaking, routes under /api/teachers or attendance tracking require teacher role
                requestedRole = 'teacher';
            }
            else if (url.startsWith('/api/school/') || url.startsWith('/api/schools/') || url.startsWith('/api/settings')) {
                // Admin portal routes
                requestedRole = 'school_admin';
            }
        }
        if (activeSchoolId) {
            // Fetch the role for THIS specific school and situational context (requestedRole)
            const contextRole = await (0, auth_resolution_service_1.resolveRoleInSchool)(decoded.id, activeSchoolId, requestedRole);
            console.log(`[tenantMiddleware] resolveRole(${decoded.id}, ${activeSchoolId}, ${requestedRole}) => ${contextRole}`);
            if (contextRole) {
                schoolId = activeSchoolId;
                role = contextRole;
            }
            else if (decoded.role === 'super_admin') {
                // Super admins are global, role doesn't change
                role = 'super_admin';
            }
            else {
                // Context resolution failed.
                // For identity endpoints (profile), never block - just use token defaults
                const isIdentityEndpoint = url.startsWith('/api/users/profile') || url.startsWith('/api/users/me');
                if (!isIdentityEndpoint && schoolIdHeader && decoded.schoolId && schoolIdHeader !== decoded.schoolId) {
                    console.warn(`[tenantMiddleware] User ${decoded.id} denied access to school ${activeSchoolId} (mismatch)`);
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied: You do not have an active role in the requested school context.'
                    });
                }
                // Fallback: use decoded values from JWT token
                console.log(`[tenantMiddleware] Context resolution failed, using JWT defaults: role=${decoded.role}, school=${decoded.schoolId}`);
            }
        }
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: role, // Now context-aware!
            schoolId: schoolId,
            customSchoolId: decoded.customSchoolId,
        };
        console.log(`[tenantMiddleware] User: ${decoded.email}, School: ${schoolId}, Role: ${role}`);
        next();
    }
    catch (error) {
        console.error('JWT Verification Error:', error);
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};
exports.tenantMiddleware = tenantMiddleware;
/**
 * Role-based Access Control Middleware
 */
const authorize = (roles) => {
    return (req, res, next) => {
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
exports.authorize = authorize;
/**
 * Subscription Guard
 * Blocks all write requests (POST/PUT/PATCH/DELETE) for users whose school is SUSPENDED or EXPIRED.
 * Super admins bypass this check. Read-only requests (GET/HEAD/OPTIONS) always pass.
 */
const subscriptionGuard = async (req, res, next) => {
    // Super admins are never blocked
    if (!req.user || req.user.role === 'super_admin')
        return next();
    // Read-only methods are always allowed — historical data stays accessible
    const readMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (readMethods.includes(req.method))
        return next();
    const schoolId = req.user.schoolId;
    if (!schoolId)
        return next();
    try {
        const school = await db_1.default.school.findUnique({
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
    }
    catch (err) {
        console.error('[subscriptionGuard] DB error:', err);
    }
    next();
};
exports.subscriptionGuard = subscriptionGuard;
/**
 * Feature Guard
 * Checks if the school has a specific feature enabled based on their plan/addons.
 */
const featureGuard = (featureKey) => {
    return async (req, res, next) => {
        // Super admins bypass all feature checks
        if (!req.user || req.user.role === 'super_admin')
            return next();
        const schoolId = req.user.schoolId;
        if (!schoolId)
            return next();
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
        }
        catch (err) {
            console.error('[featureGuard] DB error:', err);
        }
        next();
    };
};
exports.featureGuard = featureGuard;
