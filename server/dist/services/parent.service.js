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
        where: { phone: cleanPhone, role: 'parent' },
        include: { school: true }
    });
    if (!user) {
        throw new Error("Invalid phone number or password.");
    }
    const isValidPassword = await bcryptjs_1.default.compare(password, user.password_hash);
    if (!isValidPassword) {
        throw new Error("Invalid phone number or password.");
    }
    // Retrieve students via ParentStudentLink (primary source), scoped to parent's primary school if available
    const links = await db_1.default.parentStudentLink.findMany({
        where: {
            parentId: user.id,
            ...(user.schoolId && { schoolId: user.schoolId })
        },
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
            where: {
                parent_phone: cleanPhone,
                ...(user.schoolId && { schoolId: user.schoolId })
            },
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
    return {
        success: true,
        id: user.id,
        parentName: user.full_name || students[0]?.parent_name || "Parent",
        parentPhone: cleanPhone,
        schoolId: user.schoolId || students[0]?.schoolId,
        students: mappedStudents
    };
};
exports.loginParent = loginParent;
/**
 * Get Parent Portal notifications.
 */
const getNotifications = async (phone, schoolId) => {
    const cleanPhone = phone.replace(/\s+/g, '');
    const user = await db_1.default.user.findFirst({
        where: { phone: cleanPhone, role: 'parent', schoolId }
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
                select: { id: true, fullName: true }
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
const markAllNotificationsAsRead = async (phone, schoolId) => {
    const cleanPhone = phone.replace(/\s+/g, '');
    const user = await db_1.default.user.findFirst({
        where: { phone: cleanPhone, role: 'parent', schoolId }
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
const getPreferences = async (phone) => {
    const cleanPhone = phone.replace(/\s+/g, '');
    return await db_1.default.parentPreferences.upsert({
        where: { parentPhone: cleanPhone },
        update: {},
        create: {
            parentPhone: cleanPhone,
            emailNotifications: true,
            smsNotifications: false,
            pushNotifications: true
        }
    });
};
exports.getPreferences = getPreferences;
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
    const cleanPhone = phone.replace(/\s+/g, '');
    const user = await db_1.default.user.findFirst({
        where: { phone: cleanPhone, role: 'parent', schoolId }
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
const searchParentByPhone = async (phone, schoolId) => {
    const cleanPhone = phone.replace(/\s+/g, '');
    const user = await db_1.default.user.findFirst({
        where: { phone: cleanPhone, role: 'parent', schoolId },
        select: { id: true, full_name: true, email: true, phone: true }
    });
    if (!user) {
        return { success: false, message: "No parent found with this phone number." };
    }
    return { success: true, data: user };
};
exports.searchParentByPhone = searchParentByPhone;
