"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchParentByPhone = exports.updatePassword = exports.postAnnouncement = exports.updatePreferences = exports.getPreferences = exports.markAllNotificationsAsRead = exports.markNotificationAsRead = exports.getNotifications = exports.loginParent = void 0;
const db_1 = __importDefault(require("../config/db"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
/**
 * Login Parent and establish session.
 * Syncs ParentStudent relation records.
 */
const loginParent = async (phone, password) => {
    const cleanPhone = phone.replace(/\s+/g, '');
    const user = await db_1.default.user.findFirst({
        where: { phone: cleanPhone, role: 'parent' }
    });
    if (!user) {
        throw new Error("Invalid phone number or password.");
    }
    const isValidPassword = await bcryptjs_1.default.compare(password, user.password_hash);
    if (!isValidPassword) {
        throw new Error("Invalid phone number or password.");
    }
    // 1. Retrieve students via ParentStudentLink (primary source)
    const links = await db_1.default.parentStudentLink.findMany({
        where: { parentId: user.id },
        include: {
            student: {
                include: { grade: true, section: true, stream: true }
            }
        }
    });
    let students = links.map(l => l.student);
    // 2. Fallback: find students via parent_phone on Student model (legacy data)
    if (students.length === 0) {
        const legacyStudents = await db_1.default.student.findMany({
            where: { parent_phone: cleanPhone },
            include: { grade: true, section: true, stream: true }
        });
        students = legacyStudents;
        // Sync legacy students into ParentStudentLink for future logins
        for (const student of legacyStudents) {
            await db_1.default.parentStudentLink.upsert({
                where: { parentId_studentId: { parentId: user.id, studentId: student.id } },
                update: {},
                create: { parentId: user.id, studentId: student.id }
            });
        }
    }
    if (students.length === 0) {
        throw new Error("No children profiles found associated with this account.");
    }
    // 3. Ensure ParentPreferences record exists
    await db_1.default.parentPreferences.upsert({
        where: { parentPhone: cleanPhone },
        update: {},
        create: {
            parentPhone: cleanPhone,
            emailNotifications: true,
            smsNotifications: false,
            pushNotifications: true
        }
    });
    // Flat map to frontend Student interface
    const mappedStudents = students.map((s) => ({
        ...s,
        name: s.fullName,
        grade: s.grade?.name || '',
        section: s.section?.name || '',
        stream: s.stream?.name || null,
    }));
    return {
        success: true,
        parentName: user.full_name || students[0]?.parent_name || "Parent",
        parentPhone: cleanPhone,
        students: mappedStudents
    };
};
exports.loginParent = loginParent;
/**
 * Get Parent Portal notifications.
 * Includes student-specific alerts AND general announcements/emergencies.
 */
const getNotifications = async (phone) => {
    const cleanPhone = phone.replace(/\s+/g, '');
    // 1. Get linked student IDs
    const user = await db_1.default.user.findFirst({ where: { phone: cleanPhone, role: 'parent' } });
    let studentIds = [];
    if (user) {
        const links = await db_1.default.parentStudentLink.findMany({
            where: { parentId: user.id },
            select: { studentId: true }
        });
        studentIds = links.map(l => l.studentId);
    }
    if (studentIds.length === 0) {
        // Fallback: lookup students directly
        const directStudents = await db_1.default.student.findMany({
            where: { parent_phone: cleanPhone },
            select: { id: true, schoolId: true }
        });
        studentIds.push(...directStudents.map(s => s.id));
    }
    // Get schoolId from first student
    const student = await db_1.default.student.findFirst({
        where: { parent_phone: cleanPhone },
        select: { schoolId: true }
    });
    const schoolId = student?.schoolId || "";
    // 2. Fetch notifications: student-specific OR general school notifications
    const notifications = await db_1.default.parentNotification.findMany({
        where: {
            OR: [
                { studentId: { in: studentIds } },
                {
                    AND: [
                        { schoolId: schoolId },
                        { studentId: null }
                    ]
                }
            ]
        },
        orderBy: { createdAt: 'desc' },
        include: {
            student: {
                select: {
                    id: true,
                    fullName: true
                }
            }
        }
    });
    return notifications;
};
exports.getNotifications = getNotifications;
/**
 * Mark notification as read.
 */
const markNotificationAsRead = async (id) => {
    return await db_1.default.parentNotification.update({
        where: { id },
        data: { isRead: true }
    });
};
exports.markNotificationAsRead = markNotificationAsRead;
/**
 * Mark all parent notifications as read.
 */
const markAllNotificationsAsRead = async (phone) => {
    const cleanPhone = phone.replace(/\s+/g, '');
    // 1. Get linked student IDs
    const user = await db_1.default.user.findFirst({ where: { phone: cleanPhone, role: 'parent' } });
    let studentIds = [];
    if (user) {
        const links = await db_1.default.parentStudentLink.findMany({
            where: { parentId: user.id },
            select: { studentId: true }
        });
        studentIds = links.map(l => l.studentId);
    }
    const student = await db_1.default.student.findFirst({
        where: { parent_phone: cleanPhone },
        select: { schoolId: true }
    });
    const schoolId = student?.schoolId || "";
    // 2. Update status to isRead: true
    return await db_1.default.parentNotification.updateMany({
        where: {
            OR: [
                { studentId: { in: studentIds } },
                {
                    AND: [
                        { schoolId: schoolId },
                        { studentId: null }
                    ]
                }
            ],
            isRead: false
        },
        data: { isRead: true }
    });
};
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
/**
 * Get Parent Settings/Preferences.
 */
const getPreferences = async (phone) => {
    const cleanPhone = phone.replace(/\s+/g, '');
    let prefs = await db_1.default.parentPreferences.findUnique({
        where: { parentPhone: cleanPhone }
    });
    if (!prefs) {
        prefs = await db_1.default.parentPreferences.create({
            data: {
                parentPhone: cleanPhone,
                emailNotifications: true,
                smsNotifications: false,
                pushNotifications: true
            }
        });
    }
    return prefs;
};
exports.getPreferences = getPreferences;
/**
 * Update Parent Settings/Preferences.
 */
const updatePreferences = async (phone, data) => {
    const cleanPhone = phone.replace(/\s+/g, '');
    return await db_1.default.parentPreferences.upsert({
        where: { parentPhone: cleanPhone },
        update: {
            emailNotifications: data.emailNotifications ?? true,
            smsNotifications: data.smsNotifications ?? false,
            pushNotifications: data.pushNotifications ?? true
        },
        create: {
            parentPhone: cleanPhone,
            emailNotifications: data.emailNotifications ?? true,
            smsNotifications: data.smsNotifications ?? false,
            pushNotifications: data.pushNotifications ?? true
        }
    });
};
exports.updatePreferences = updatePreferences;
/**
 * Post an Announcement (General or specific)
 */
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
/**
 * Update Parent Password
 */
const updatePassword = async (phone, currentPassword, newPassword) => {
    const cleanPhone = phone.replace(/\s+/g, '');
    const user = await db_1.default.user.findFirst({
        where: { phone: cleanPhone, role: 'parent' }
    });
    if (!user) {
        throw new Error("User not found.");
    }
    const isValidPassword = await bcryptjs_1.default.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
        throw new Error("Incorrect current password.");
    }
    const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
    await db_1.default.user.update({
        where: { id: user.id },
        data: { password_hash: hashedPassword }
    });
    return { success: true, message: "Password updated successfully." };
};
exports.updatePassword = updatePassword;
/**
 * Search parent by phone
 */
const searchParentByPhone = async (phone) => {
    const cleanPhone = phone.replace(/\s+/g, '');
    const user = await db_1.default.user.findFirst({
        where: { phone: cleanPhone, role: 'parent' },
        select: {
            id: true,
            full_name: true,
            email: true,
            phone: true
        }
    });
    if (!user) {
        return { success: false, message: "No parent found with this phone number." };
    }
    return { success: true, data: user };
};
exports.searchParentByPhone = searchParentByPhone;
