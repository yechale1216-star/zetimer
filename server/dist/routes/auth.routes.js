"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userService = __importStar(require("../services/user.service"));
const schoolService = __importStar(require("../services/school.service"));
const jwt_1 = require("../utils/jwt");
const email_1 = require("../utils/email");
const router = (0, express_1.Router)();
// Login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }
        const user = await userService.getUserByEmail(email);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        const valid = userService.verifyPassword(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        let customSchoolId = '';
        let schoolName = 'My School';
        let schoolLogo = '';
        if (user.schoolId) {
            const school = await schoolService.getSchoolById(user.schoolId);
            if (school) {
                customSchoolId = school.schoolId || '';
                schoolName = school.name || 'My School';
                // Get logo from settings
                if (school.settings) {
                    schoolLogo = school.settings.school_logo || '';
                }
            }
        }
        const token = (0, jwt_1.generateToken)({
            id: user.id,
            email: user.email,
            role: user.role,
            schoolId: user.schoolId || '',
            customSchoolId: customSchoolId,
        });
        res.status(200).json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.full_name,
                    role: user.role,
                    schoolId: user.schoolId,
                    customSchoolId,
                },
                schoolName,
                schoolLogo
            }
        });
    }
    catch (error) {
        next(error);
    }
});
// Signup (Admin creates school and account)
router.post('/signup', async (req, res, next) => {
    try {
        const { email, password, name, schoolName, role, phone } = req.body;
        // Create school first if admin
        let schoolId = '';
        let customSchoolId = '';
        if (role === 'admin' && schoolName) {
            const school = await schoolService.createSchool({ name: schoolName });
            schoolId = school.id;
            customSchoolId = school.schoolId || '';
        }
        // Create user
        const user = await userService.createUser({
            email,
            password_hash: password,
            full_name: name,
            role,
            phone,
            schoolId: schoolId || null,
        });
        const token = (0, jwt_1.generateToken)({
            id: user.id,
            email: user.email,
            role: user.role,
            schoolId: user.schoolId || '',
            customSchoolId: customSchoolId,
        });
        res.status(201).json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.full_name,
                    role: user.role,
                    schoolId: user.schoolId,
                    customSchoolId,
                },
                schoolName: schoolName || 'My School',
                schoolLogo: ''
            }
        });
    }
    catch (error) {
        next(error);
    }
});
// Forgot Password
router.post('/forgot-password', async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }
        const token = await userService.createPasswordResetToken(email);
        // We send success even if user not found for security (prevent email enumeration)
        if (token) {
            await (0, email_1.sendResetPasswordEmail)(email, token);
        }
        res.status(200).json({
            success: true,
            message: 'If an account with that email exists, we have sent password reset instructions.'
        });
    }
    catch (error) {
        next(error);
    }
});
// Verify Reset Token
router.get('/verify-reset-token', async (req, res, next) => {
    try {
        const { token } = req.query;
        if (!token || typeof token !== 'string') {
            return res.status(400).json({ success: false, message: 'Token is required' });
        }
        const user = await userService.getUserByResetToken(token);
        if (!user) {
            return res.status(400).json({ success: false, valid: false, message: 'Invalid or expired token' });
        }
        res.status(200).json({ success: true, valid: true, email: user.email });
    }
    catch (error) {
        next(error);
    }
});
// Reset Password
router.post('/reset-password', async (req, res, next) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ success: false, message: 'Token and password are required' });
        }
        await userService.resetPasswordByToken(token, password);
        res.status(200).json({
            success: true,
            message: 'Password successfully reset. You can now login with your new password.'
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Failed to reset password' });
    }
});
exports.default = router;
