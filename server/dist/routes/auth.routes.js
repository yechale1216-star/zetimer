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
        if (user.schoolId) {
            const school = await schoolService.getSchoolById(user.schoolId);
            if (school) {
                customSchoolId = school.schoolId || '';
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
                }
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
                }
            }
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
