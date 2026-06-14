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
exports.checkParentsBatch = exports.setActiveSchool = exports.getMySchools = exports.updateProfile = exports.updateAnnouncement = exports.getAnnouncements = exports.postAnnouncement = exports.updatePreferences = exports.getPreferences = exports.markAllAsRead = exports.deleteNotification = exports.markAsRead = exports.getNotifications = exports.updatePassword = exports.searchParent = exports.loginParent = exports.listParentSchools = void 0;
const parentService = __importStar(require("../services/parent.service"));
const listParentSchools = async (req, res, next) => {
    try {
        const { phone } = req.query;
        if (!phone || typeof phone !== 'string') {
            return res.status(400).json({ success: false, message: "Phone is required." });
        }
        const normalizedPhone = parentService.normalizePhoneNumber(phone);
        const result = await parentService.listParentSchools(normalizedPhone);
        res.status(200).json(result);
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message || "Failed to list schools." });
    }
};
exports.listParentSchools = listParentSchools;
const loginParent = async (req, res, next) => {
    try {
        const { phone, password, schoolId } = req.body;
        if (!phone || !password) {
            return res.status(400).json({ success: false, message: "Phone and password are required." });
        }
        const normalizedPhone = parentService.normalizePhoneNumber(phone);
        const result = await parentService.loginParent(normalizedPhone, password, schoolId);
        res.status(200).json(result);
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message || "Failed to login." });
    }
};
exports.loginParent = loginParent;
const searchParent = async (req, res, next) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const { phone } = req.query;
        if (!phone || typeof phone !== 'string') {
            return res.status(400).json({ success: false, message: "Phone query parameter is required." });
        }
        const result = await parentService.searchParentByPhone(phone, schoolId);
        if (!result.success) {
            return res.status(404).json(result);
        }
        res.status(200).json(result);
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message || "Failed to search parent." });
    }
};
exports.searchParent = searchParent;
const updatePassword = async (req, res, next) => {
    try {
        const schoolId = req.headers['x-school-id'] || req.user?.schoolId;
        if (!schoolId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const { phone, currentPassword, newPassword } = req.body;
        if (!phone || !currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "Phone, current password, and new password are required." });
        }
        const result = await parentService.updatePassword(phone, currentPassword, newPassword, schoolId);
        res.status(200).json(result);
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message || "Failed to update password." });
    }
};
exports.updatePassword = updatePassword;
const getNotifications = async (req, res, next) => {
    try {
        const schoolId = req.headers['x-school-id'] || req.user?.schoolId;
        if (!schoolId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const { phone } = req.params;
        const notifications = await parentService.getNotifications(phone, schoolId);
        res.status(200).json({ success: true, data: notifications });
    }
    catch (error) {
        next(error);
    }
};
exports.getNotifications = getNotifications;
const markAsRead = async (req, res, next) => {
    try {
        const schoolId = req.headers['x-school-id'] || req.user?.schoolId;
        if (!schoolId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const { id } = req.params;
        await parentService.markNotificationAsRead(id, schoolId);
        res.status(200).json({ success: true, message: "Notification marked as read." });
    }
    catch (error) {
        next(error);
    }
};
exports.markAsRead = markAsRead;
const deleteNotification = async (req, res, next) => {
    try {
        const schoolId = req.headers['x-school-id'] || req.user?.schoolId;
        if (!schoolId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const { id } = req.params;
        await parentService.deleteNotification(id, schoolId);
        res.status(200).json({ success: true, message: "Notification deleted." });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteNotification = deleteNotification;
const markAllAsRead = async (req, res, next) => {
    try {
        const schoolId = req.headers['x-school-id'] || req.user?.schoolId;
        if (!schoolId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const { phone } = req.params;
        await parentService.markAllNotificationsAsRead(phone, schoolId);
        res.status(200).json({ success: true, message: "All notifications marked as read." });
    }
    catch (error) {
        next(error);
    }
};
exports.markAllAsRead = markAllAsRead;
const getPreferences = async (req, res, next) => {
    try {
        const schoolId = req.headers['x-school-id'] || req.user?.schoolId;
        if (!schoolId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const { phone } = req.params;
        const preferences = await parentService.getPreferences(phone, schoolId);
        res.status(200).json({ success: true, data: preferences });
    }
    catch (error) {
        next(error);
    }
};
exports.getPreferences = getPreferences;
const updatePreferences = async (req, res, next) => {
    try {
        const schoolId = req.headers['x-school-id'] || req.user?.schoolId;
        if (!schoolId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const { phone } = req.params;
        const preferences = await parentService.updatePreferences(phone, schoolId, req.body);
        res.status(200).json({ success: true, data: preferences, message: "Preferences updated successfully." });
    }
    catch (error) {
        next(error);
    }
};
exports.updatePreferences = updatePreferences;
const postAnnouncement = async (req, res, next) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const announcement = await parentService.postAnnouncement(schoolId, req.body);
        res.status(201).json({ success: true, data: announcement, message: "Announcement published." });
    }
    catch (error) {
        next(error);
    }
};
exports.postAnnouncement = postAnnouncement;
const getAnnouncements = async (req, res, next) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const announcements = await parentService.getSchoolAnnouncements(schoolId);
        res.status(200).json({ success: true, data: announcements });
    }
    catch (error) {
        next(error);
    }
};
exports.getAnnouncements = getAnnouncements;
const updateAnnouncement = async (req, res, next) => {
    try {
        const { id } = req.params;
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const announcement = await parentService.updateAnnouncement(id, schoolId, req.body);
        res.status(200).json({ success: true, data: announcement, message: "Announcement updated." });
    }
    catch (error) {
        next(error);
    }
};
exports.updateAnnouncement = updateAnnouncement;
const updateProfile = async (req, res, next) => {
    try {
        const schoolId = req.headers['x-school-id'] || req.user?.schoolId;
        if (!schoolId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const { phone } = req.params;
        const { name, email, address } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: "Name is required." });
        }
        const result = await parentService.updateProfile(phone, schoolId, { name, email, address });
        res.status(200).json(result);
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message || "Failed to update profile." });
    }
};
exports.updateProfile = updateProfile;
/**
 * GET /api/parent/me/schools
 * Returns all schools this parent has children in — server validated.
 */
const getMySchools = async (req, res, next) => {
    try {
        if (!req.user?.id)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const schools = await parentService.getParentSchools(req.user.id);
        res.status(200).json({ success: true, data: schools });
    }
    catch (error) {
        next(error);
    }
};
exports.getMySchools = getMySchools;
/**
 * POST /api/parent/me/active-school
 * Validates the parent owns a child in the requested school, then returns school info.
 */
const setActiveSchool = async (req, res, next) => {
    try {
        if (!req.user?.id)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const { schoolId } = req.body;
        if (!schoolId)
            return res.status(400).json({ success: false, message: 'schoolId is required.' });
        const hasAccess = await parentService.validateSchoolAccess(req.user.id, schoolId);
        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'You do not have a child enrolled in this school.' });
        }
        // Return the school details for the frontend to update context
        const schools = await parentService.getParentSchools(req.user.id);
        const school = schools.find((s) => s.id === schoolId);
        res.status(200).json({ success: true, data: school });
    }
    catch (error) {
        next(error);
    }
};
exports.setActiveSchool = setActiveSchool;
const checkParentsBatch = async (req, res, next) => {
    try {
        const { phones } = req.body;
        if (!Array.isArray(phones)) {
            return res.status(400).json({ success: false, message: "Phones must be an array." });
        }
        const existenceMap = await parentService.checkParentsExist(phones);
        res.status(200).json({ success: true, data: existenceMap });
    }
    catch (error) {
        next(error);
    }
};
exports.checkParentsBatch = checkParentsBatch;
