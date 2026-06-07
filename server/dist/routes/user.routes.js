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
const router = (0, express_1.Router)();
// Get current user profile
router.get('/profile', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const user = await userService.getUserById(userId);
        res.status(200).json({ success: true, data: user });
    }
    catch (error) {
        next(error);
    }
});
// Get user by email — used by auth login (Public or filtered)
router.get('/by-email', async (req, res, next) => {
    try {
        const { email } = req.query;
        if (!email)
            return res.status(400).json({ success: false, message: 'Email required' });
        const user = await userService.getUserByEmail(email);
        res.status(200).json({ success: true, data: user });
    }
    catch (error) {
        next(error);
    }
});
// Get all users for a school (teachers list)
router.get('/', async (req, res, next) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(401).json({ success: false, message: 'School ID required' });
        const users = await userService.getUsers(schoolId);
        res.status(200).json({ success: true, data: users });
    }
    catch (error) {
        next(error);
    }
});
// Get all contacts for a school (admin, teacher, parent) - restricted based on requesting user
router.get('/contacts', async (req, res, next) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId) {
            return res.status(400).json({ success: false, message: 'School ID required' });
        }
        const contacts = await userService.getContacts(schoolId, req.user);
        res.status(200).json({ success: true, data: contacts });
    }
    catch (error) {
        next(error);
    }
});
// Create user
router.post('/', async (req, res, next) => {
    try {
        const schoolId = req.user?.schoolId;
        const data = { ...req.body };
        if (schoolId)
            data.schoolId = schoolId;
        const user = await userService.createUser(data);
        res.status(201).json({ success: true, data: user });
    }
    catch (error) {
        next(error);
    }
});
// Update user
router.put('/:id', async (req, res, next) => {
    try {
        const schoolId = req.user?.schoolId;
        const user = await userService.updateUser(req.params.id, req.body, schoolId);
        res.status(200).json({ success: true, data: user });
    }
    catch (error) {
        next(error);
    }
});
// Delete user
router.delete('/:id', async (req, res, next) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        await userService.deleteUser(req.params.id, schoolId);
        res.status(200).json({ success: true, message: 'User deleted' });
    }
    catch (error) {
        next(error);
    }
});
// Verify password (legacy or internal)
router.post('/verify-password', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await userService.getUserByEmail(email);
        if (!user)
            return res.status(200).json({ success: false, valid: false, message: 'User not found' });
        const valid = userService.verifyPassword(password, user.password_hash);
        res.status(200).json({ success: true, valid, data: valid ? user : null });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
