"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAssignment = exports.createAssignment = exports.getAssignments = void 0;
const db_1 = __importDefault(require("../config/db"));
const getAssignments = async (schoolId, teacherId) => {
    const where = { school_id: schoolId };
    if (teacherId) {
        let resolvedTeacherId = teacherId;
        const user = await db_1.default.user.findUnique({ where: { id: teacherId } });
        if (user && user.teacher_id) {
            resolvedTeacherId = user.teacher_id;
        }
        where.teacher_id = resolvedTeacherId;
    }
    return await db_1.default.teacherAssignment.findMany({
        where,
        include: { teacher: true },
    });
};
exports.getAssignments = getAssignments;
const createAssignment = async (data) => {
    let teacherId = data.teacher_id;
    // Resolve User.id -> Teacher.id if a User ID was passed
    const user = await db_1.default.user.findUnique({ where: { id: teacherId } });
    if (user) {
        if (user.teacher_id) {
            teacherId = user.teacher_id;
        }
        else if (user.role === 'teacher' && user.school_id) {
            // Lazy-create missing Teacher record for this user
            const newTeacher = await db_1.default.teacher.create({
                data: {
                    name: user.full_name,
                    email: user.email,
                    schoolId: user.school_id,
                    user_id: user.id,
                    phone: user.phone || null,
                    profile_photo: user.profile_photo || null,
                }
            });
            await db_1.default.user.update({
                where: { id: user.id },
                data: { teacher_id: newTeacher.id }
            });
            teacherId = newTeacher.id;
        }
    }
    // Check for duplicate class assignment for this teacher
    const existing = await db_1.default.teacherAssignment.findFirst({
        where: {
            school_id: data.school_id,
            teacher_id: teacherId,
            grade: data.grade,
            section: data.section,
            stream: data.stream || null,
            subject: data.subject || null,
        }
    });
    if (existing) {
        throw new Error("This class assignment already exists for this teacher.");
    }
    return await db_1.default.teacherAssignment.create({
        data: {
            teacher_id: teacherId,
            school_id: data.school_id,
            grade: data.grade,
            section: data.section,
            subject: data.subject || null,
            stream: data.stream || null,
        },
        include: { teacher: true },
    });
};
exports.createAssignment = createAssignment;
const deleteAssignment = async (id) => {
    return await db_1.default.teacherAssignment.delete({ where: { id } });
};
exports.deleteAssignment = deleteAssignment;
