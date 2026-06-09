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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.searchParentByPhone = exports.checkParentsExist = exports.findOrCreateParentByPhone = exports.normalizePhoneNumber = exports.updatePassword = exports.postAnnouncement = exports.updatePreferences = exports.getPreferences = exports.markAllNotificationsAsRead = exports.deleteNotification = exports.markNotificationAsRead = exports.getNotifications = exports.loginParent = exports.validateSchoolAccess = exports.getParentSchools = exports.listParentSchools = void 0;
const db_1 = __importDefault(require("../config/db"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwt_1 = require("../utils/jwt");
const schoolService = __importStar(require("./school.service"));
/**
 * List all schools associated with a parent's phone number.
 */
const listParentSchools = async (phone) => {
    const cleanPhone = (0, exports.normalizePhoneNumber)(phone);
    const user = await db_1.default.user.findUnique({
        where: { phone: cleanPhone }
    });
    if (!user) {
        return { success: false, message: "No account found with this phone number." };
    }
    const schools = await (0, exports.getParentSchools)(user.id);
    return { success: true, data: schools };
};
exports.listParentSchools = listParentSchools;
/**
 * Get all schools a parent is linked to via their children.
 * Used by /me/schools — server-side validated only.
 */
const getParentSchools = async (userId) => {
    const links = await db_1.default.parentStudentLink.findMany({
        where: { parentId: userId },
        include: {
            school: {
                include: { settings: true }
            }
        }
    });
    const schoolMap = new Map();
    links.forEach(l => {
        if (l.school && l.schoolId && !schoolMap.has(l.schoolId)) {
            schoolMap.set(l.schoolId, {
                id: l.schoolId,
                name: l.school.name || 'My School',
                logo: l.school.settings?.school_logo || '',
                customSchoolId: l.school.schoolId || '',
            });
        }
    });
    return Array.from(schoolMap.values());
};
exports.getParentSchools = getParentSchools;
/**
 * Validate that a parent has at least one child in the given school.
 * Security boundary — never skip this check.
 */
const validateSchoolAccess = async (userId, schoolId) => {
    const link = await db_1.default.parentStudentLink.findFirst({
        where: { parentId: userId, schoolId }
    });
    return !!link;
};
exports.validateSchoolAccess = validateSchoolAccess;
/**
 * Login Parent and establish session.
 * Syncs ParentStudent relation records.
 */
const loginParent = async (phone, password, schoolId) => {
    const cleanPhone = (0, exports.normalizePhoneNumber)(phone);
    const user = await db_1.default.user.findUnique({
        where: { phone: cleanPhone },
        include: { school: true }
    });
    if (!user) {
        throw new Error("Invalid phone number or password.");
    }
    const isValidPassword = await bcryptjs_1.default.compare(password, user.password_hash);
    if (!isValidPassword) {
        throw new Error("Invalid phone number or password.");
    }
    // Retrieve ALL students via ParentStudentLink (global lookup)
    const links = await db_1.default.parentStudentLink.findMany({
        where: { parentId: user.id },
        include: {
            student: {
                include: { grade: true, section: true, stream: true }
            }
        }
    });
    let students = links.map(l => l.student);
    // Fallback: find students via parent_phone on Student model (legacy data)
    if (students.length === 0) {
        const legacyStudents = await db_1.default.student.findMany({
            where: { parent_phone: cleanPhone },
            include: { grade: true, section: true, stream: true }
        });
        students = legacyStudents;
        // Sync legacy students into ParentStudentLink
        for (const student of legacyStudents) {
            await db_1.default.parentStudentLink.upsert({
                where: { parentId_studentId: { parentId: user.id, studentId: student.id } },
                update: { schoolId: student.schoolId },
                create: { parentId: user.id, studentId: student.id, schoolId: student.schoolId }
            });
        }
    }
    if (students.length === 0) {
        throw new Error("No children profiles found associated with this account.");
    }
    const mappedStudents = students.map((s) => ({
        ...s,
        name: s.fullName,
        grade: s.grade?.name || '',
        section: s.section?.name || '',
        stream: s.stream?.name || null,
    }));
    // Get all associated schools for context switching
    const availableSchools = await (0, exports.getParentSchools)(user.id);
    // Generate a token for the parent
    let customSchoolId = '';
    let schoolName = 'My School';
    let schoolLogo = '';
    const firstStudent = students[0];
    // For parents, prioritize a school they actually have a child in
    const availableSchoolIds = availableSchools.map(s => s.id);
    let resolvedSchoolId = user.schoolId || '';
    if (!resolvedSchoolId || !availableSchoolIds.includes(resolvedSchoolId)) {
        resolvedSchoolId = firstStudent?.schoolId || '';
    }
    if (resolvedSchoolId) {
        const school = await schoolService.getSchoolById(resolvedSchoolId);
        if (school) {
            customSchoolId = school.schoolId || '';
            schoolName = school.name || schoolName;
            schoolLogo = school.settings?.school_logo || '';
        }
    }
    const token = (0, jwt_1.generateToken)({
        id: user.id,
        email: user.email || `parent-${cleanPhone}@zetime.com`,
        role: 'parent',
        schoolId: resolvedSchoolId,
        customSchoolId,
    });
    return {
        success: true,
        id: user.id,
        token,
        parentName: user.full_name || students[0]?.parent_name || "Parent",
        phone: cleanPhone,
        schoolId: resolvedSchoolId,
        schoolName,
        schoolLogo,
        students: mappedStudents,
        availableSchools,
    };
};
exports.loginParent = loginParent;
/**
 * Get Parent Portal notifications.
 */
const getNotifications = async (phone, schoolId) => {
    const cleanPhone = (0, exports.normalizePhoneNumber)(phone);
    const user = await db_1.default.user.findUnique({
        where: { phone: cleanPhone }
    });
    if (!user)
        return [];
    const links = await db_1.default.parentStudentLink.findMany({
        where: { parentId: user.id, schoolId },
        select: { studentId: true }
    });
    const studentIds = links.map(l => l.studentId);
    const notifications = await db_1.default.parentNotification.findMany({
        where: {
            schoolId,
            OR: [
                { studentId: { in: studentIds } },
                { studentId: null }
            ]
        },
        orderBy: { createdAt: 'desc' },
        include: {
            student: {
                select: { id: true, fullName: true, gender: true }
            }
        }
    });
    return notifications;
};
exports.getNotifications = getNotifications;
const markNotificationAsRead = async (id, schoolId) => {
    return await db_1.default.parentNotification.update({
        where: { id, schoolId },
        data: { isRead: true }
    });
};
exports.markNotificationAsRead = markNotificationAsRead;
const deleteNotification = async (id, schoolId) => {
    return await db_1.default.parentNotification.deleteMany({
        where: { id, schoolId }
    });
};
exports.deleteNotification = deleteNotification;
const markAllNotificationsAsRead = async (phone, schoolId) => {
    const cleanPhone = (0, exports.normalizePhoneNumber)(phone);
    const user = await db_1.default.user.findUnique({
        where: { phone: cleanPhone }
    });
    if (!user)
        return;
    const links = await db_1.default.parentStudentLink.findMany({
        where: { parentId: user.id, schoolId },
        select: { studentId: true }
    });
    const studentIds = links.map(l => l.studentId);
    return await db_1.default.parentNotification.updateMany({
        where: {
            schoolId,
            OR: [
                { studentId: { in: studentIds } },
                { studentId: null }
            ],
            isRead: false
        },
        data: { isRead: true }
    });
};
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
const getPreferences = async (phone, schoolId) => {
    const cleanPhone = phone.replace(/\s+/g, '');
    return await db_1.default.parentPreferences.upsert({
        where: { parentPhone_schoolId: { parentPhone: cleanPhone, schoolId } },
        update: {},
        create: {
            parentPhone: cleanPhone,
            schoolId,
            emailNotifications: true,
            smsNotifications: false,
            pushNotifications: true
        }
    });
};
exports.getPreferences = getPreferences;
const updatePreferences = async (phone, schoolId, data) => {
    const cleanPhone = phone.replace(/\s+/g, '');
    return await db_1.default.parentPreferences.upsert({
        where: { parentPhone_schoolId: { parentPhone: cleanPhone, schoolId } },
        update: {
            emailNotifications: data.emailNotifications ?? true,
            smsNotifications: data.smsNotifications ?? false,
            pushNotifications: data.pushNotifications ?? true
        },
        create: {
            parentPhone: cleanPhone,
            schoolId,
            emailNotifications: data.emailNotifications ?? true,
            smsNotifications: data.smsNotifications ?? false,
            pushNotifications: data.pushNotifications ?? true
        }
    });
};
exports.updatePreferences = updatePreferences;
const postAnnouncement = async (schoolId, data) => {
    return await db_1.default.parentNotification.create({
        data: {
            schoolId,
            studentId: data.studentId || null,
            type: data.type || "announcement",
            title: data.title,
            message: data.message,
            isRead: false
        }
    });
};
exports.postAnnouncement = postAnnouncement;
const updatePassword = async (phone, currentPassword, newPassword, schoolId) => {
    // Use global phone lookup — parents are global entities, not school-scoped in the User table
    const cleanPhone = (0, exports.normalizePhoneNumber)(phone);
    const user = await db_1.default.user.findFirst({
        where: {
            OR: [
                { phone: cleanPhone },
                { phone: phone.replace(/\s+/g, '') } // fallback: non-normalized input
            ]
        }
    });
    if (!user)
        throw new Error("User not found.");
    const isValidPassword = await bcryptjs_1.default.compare(currentPassword, user.password_hash);
    if (!isValidPassword)
        throw new Error("Incorrect current password.");
    const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
    await db_1.default.user.update({
        where: { id: user.id },
        data: { password_hash: hashedPassword }
    });
    return { success: true, message: "Password updated successfully." };
};
exports.updatePassword = updatePassword;
/**
 * Normalizes phone numbers to E.164 format for Ethiopian numbers.
 * Removes spaces, dashes, and ensures +251 prefix.
 */
const normalizePhoneNumber = (phone) => {
    if (!phone)
        return "";
    // Remove all non-numeric characters (except leading +)
    let cleaned = phone.replace(/[^\d+]/g, '');
    // Handle various Ethiopian formats
    if (cleaned.startsWith('0')) {
        cleaned = '+251' + cleaned.substring(1);
    }
    else if (cleaned.startsWith('251') && !cleaned.startsWith('+')) {
        cleaned = '+' + cleaned;
    }
    else if (!cleaned.startsWith('+') && cleaned.length > 0) {
        cleaned = '+251' + cleaned;
    }
    // Handle leading zero after country code (e.g. +25109... -> +2519...)
    if (cleaned.startsWith('+2510')) {
        cleaned = '+251' + cleaned.substring(5);
    }
    // Final cleanup of extra pluses
    if (cleaned.lastIndexOf("+") > 0) {
        cleaned = "+" + cleaned.replace(/\+/g, "");
    }
    return cleaned;
};
exports.normalizePhoneNumber = normalizePhoneNumber;
/**
 * Finds an existing parent by phone or creates a new one.
 * Atomic operation using upsert to prevent duplicates.
 */
const findOrCreateParentByPhone = async (phone, data) => {
    const cleanPhone = (0, exports.normalizePhoneNumber)(phone);
    // 1. Try finding by normalized phone first
    let existingUser = await db_1.default.user.findUnique({
        where: { phone: cleanPhone }
    });
    // 2. If not found, try unnormalized variations (e.g. 09... instead of +251...)
    if (!existingUser) {
        const rawNoPlus = cleanPhone.replace('+', '');
        const ethStandard = cleanPhone.startsWith('+251') ? '0' + cleanPhone.substring(4) : null;
        existingUser = await db_1.default.user.findFirst({
            where: {
                OR: [
                    { phone: rawNoPlus },
                    ...(ethStandard ? [{ phone: ethStandard }] : [])
                ]
            }
        });
        // If found by old format, update it to normalized format
        if (existingUser) {
            existingUser = await db_1.default.user.update({
                where: { id: existingUser.id },
                data: { phone: cleanPhone }
            });
        }
    }
    // 3. Fallback: Search by email if provided
    if (!existingUser && data.email) {
        existingUser = await db_1.default.user.findUnique({
            where: { email: data.email }
        });
        // If found by email, link the phone if it was missing
        if (existingUser && !existingUser.phone) {
            existingUser = await db_1.default.user.update({
                where: { id: existingUser.id },
                data: { phone: cleanPhone }
            });
        }
        else if (existingUser && existingUser.phone !== cleanPhone) {
            // Conflict: Email belongs to someone with a DIFFERENT phone
            throw new Error(`Email ${data.email} is already associated with another account.`);
        }
    }
    const hashedPassword = data.password
        ? await bcryptjs_1.default.hash(data.password, 10)
        : await bcryptjs_1.default.hash('zetime123', 10);
    const parentEmail = data.email || `parent-${cleanPhone.replace('+', '')}@zetime.com`;
    // 4. Final Upsert (now much safer)
    return await db_1.default.user.upsert({
        where: { phone: cleanPhone },
        update: {
            full_name: data.name || undefined,
            email: data.email || undefined,
            address: data.address || undefined,
        },
        create: {
            phone: cleanPhone,
            email: parentEmail,
            password_hash: hashedPassword,
            full_name: data.name || 'Parent',
            role: 'parent',
            address: data.address || null,
            is_active: true,
            schoolId: data.schoolId || null
        }
    });
};
exports.findOrCreateParentByPhone = findOrCreateParentByPhone;
const checkParentsExist = async (phones) => {
    const normalizedPhones = phones.map(exports.normalizePhoneNumber);
    const existingParents = await db_1.default.user.findMany({
        where: {
            phone: { in: normalizedPhones },
            role: 'parent'
        },
        select: { phone: true }
    });
    const existingSet = new Set(existingParents.map(p => p.phone));
    return normalizedPhones.map(p => existingSet.has(p));
};
exports.checkParentsExist = checkParentsExist;
const searchParentByPhone = async (phone, schoolId) => {
    const cleanPhone = phone.replace(/\s+/g, '');
    // Create variations of the phone number to search for (Ethiopian context)
    const phoneVariations = [cleanPhone];
    if (cleanPhone.startsWith('+251')) {
        const suffix = cleanPhone.substring(4); // e.g., 911223344
        phoneVariations.push(suffix);
        phoneVariations.push('0' + suffix);
        phoneVariations.push('251' + suffix);
    }
    else if (cleanPhone.startsWith('0')) {
        const suffix = cleanPhone.substring(1);
        phoneVariations.push(suffix);
        phoneVariations.push('+251' + suffix);
        phoneVariations.push('251' + suffix);
    }
    const user = await db_1.default.user.findFirst({
        where: {
            phone: { in: phoneVariations },
            role: 'parent'
        },
        select: { id: true, full_name: true, email: true, phone: true, address: true, schoolId: true }
    });
    if (user) {
        return { success: true, data: user };
    }
    // Fallback: Search Student table for legacy parent info
    const legacyStudent = await db_1.default.student.findFirst({
        where: { parent_phone: { in: phoneVariations } },
        select: { parent_name: true, parent_email: true, parent_phone: true, address: true }
    });
    if (legacyStudent) {
        return {
            success: true,
            data: {
                id: null, // No user account yet
                full_name: legacyStudent.parent_name,
                email: legacyStudent.parent_email,
                phone: legacyStudent.parent_phone,
                address: legacyStudent.address,
                isLegacy: true
            }
        };
    }
    return { success: false, message: "No parent found with this phone number." };
};
exports.searchParentByPhone = searchParentByPhone;
const updateProfile = async (phone, schoolId, data) => {
    const cleanPhone = (0, exports.normalizePhoneNumber)(phone);
    const user = await db_1.default.user.findUnique({
        where: { phone: cleanPhone }
    });
    if (!user) {
        throw new Error("Parent not found.");
    }
    const updatedUser = await db_1.default.user.update({
        where: { id: user.id },
        data: {
            full_name: data.name,
            email: data.email,
            address: data.address
        }
    });
    return {
        success: true,
        message: "Profile updated successfully.",
        data: {
            id: updatedUser.id,
            name: updatedUser.full_name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            address: updatedUser.address
        }
    };
};
exports.updateProfile = updateProfile;
