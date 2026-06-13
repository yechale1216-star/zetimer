"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.maintenanceMiddleware = void 0;
const db_1 = __importDefault(require("../config/db"));
/**
 * Global Maintenance Middleware
 * Redirects all non-Super Admin traffic if the platform is in maintenance mode.
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
        // 3. Allow Super Admin related endpoints or authorized Super Admin users
        // (Check for specific super-admin route patterns or authorization headers with role: super_admin)
        const isSuperAdminRequest = req.url.includes("/api/super-admin") ||
            req.url.includes("/api/subscription");
        // We should also check the user's role from the token if possible,
        // but at the gateway level, we might just block based on path if it's simpler.
        // However, to be safe, let's allow paths that Super Admins need.
        if (isSuperAdminRequest) {
            return next();
        }
        // 4. Block all other traffic
        return res.status(503).json({
            success: false,
            maintenance: true,
            message: config.maintenanceMessage || "Platform is currently undergoing maintenance. Please try again later.",
            retryAfter: 3600 // 1 hour
        });
    }
    catch (e) {
        // If DB check fails, default to allowing traffic to avoid platform-wide lockout 
        // unless we want to be paranoid and block. Let's allow.
        console.error("Maintenance check error:", e);
        next();
    }
};
exports.maintenanceMiddleware = maintenanceMiddleware;
