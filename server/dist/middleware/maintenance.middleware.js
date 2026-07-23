"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.maintenanceMiddleware = void 0;
const db_1 = __importDefault(require("../config/db"));
const jwt_1 = require("../utils/jwt");
/**
 * Global Maintenance Middleware
 * Redirects all non-Super Admin traffic if the platform is in maintenance mode.
 * Super Admins are ALWAYS allowed to log in and perform actions during maintenance mode.
 */
const maintenanceMiddleware = async (req, res, next) => {
    try {
        // 1. Get platform config
        const config = await db_1.default.platformConfig.findUnique({
            where: { id: "singleton" }
        });
        // 2. If no config or not in maintenance, proceed
        if (!config || !config.maintenanceMode) {
            return next();
        }
        // 3. Always allow Super Admin specific API routes
        if (req.originalUrl.includes("/api/super-admin")) {
            return next();
        }
        // 4. Check if request carries a valid Super Admin JWT token
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            try {
                const token = authHeader.split(" ")[1];
                const decoded = (0, jwt_1.verifyToken)(token);
                if (decoded && (decoded.role === "super_admin" || decoded.role === "SUPER_ADMIN")) {
                    return next();
                }
            }
            catch (err) {
                // invalid token - fall through to login/maintenance check
            }
        }
        // 5. Allow login attempt if the user is a Super Admin
        const isLoginPath = req.originalUrl.includes("/api/auth/login") ||
            req.originalUrl.includes("/api/users/login") ||
            req.originalUrl.includes("/api/auth/parent/login");
        if (isLoginPath && req.method === "POST") {
            const identifier = req.body?.email || req.body?.username || req.body?.phone;
            if (identifier && typeof identifier === 'string') {
                const cleanIdentifier = identifier.toLowerCase().trim();
                const user = await db_1.default.user.findFirst({
                    where: {
                        OR: [
                            { email: cleanIdentifier },
                            { phone: identifier.trim() }
                        ]
                    }
                });
                if (user && (user.role === "super_admin" || user.role === "SUPER_ADMIN")) {
                    return next();
                }
            }
        }
        // 6. Block all non-Super Admin traffic
        return res.status(503).json({
            success: false,
            maintenance: true,
            message: config.maintenanceMessage || "Platform is currently undergoing maintenance. Please try again later.",
            retryAfter: 3600 // 1 hour
        });
    }
    catch (e) {
        console.error("Maintenance check error:", e);
        next();
    }
};
exports.maintenanceMiddleware = maintenanceMiddleware;
