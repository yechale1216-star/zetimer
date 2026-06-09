"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.tenantMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'zetime-secret-key-2024-secure-and-long-enough';
/**
 * Middleware to verify JWT and extract tenant information.
 * Every request must pass through this or a public route.
 */
const tenantMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const schoolIdHeader = req.headers['x-school-id'];
    // Public routes exclusion - use originalUrl since middleware is mounted at /api
    const publicPaths = [
        '/api/parent/schools',
        '/api/parent/login',
        '/api/auth',
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
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // For parents, allow overriding schoolId via header
        let schoolId = decoded.schoolId;
        if (decoded.role === 'parent' && schoolIdHeader) {
            schoolId = schoolIdHeader;
        }
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            schoolId: schoolId,
            customSchoolId: decoded.customSchoolId,
        };
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
