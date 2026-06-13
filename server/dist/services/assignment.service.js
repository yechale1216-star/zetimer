"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAssignment = exports.deleteAssignment = exports.createAssignment = exports.getAssignments = void 0;
const db_1 = __importDefault(require("../config/db"));
const getAssignments = async (schoolId, teacherId) => {
    if (!schoolId)
        throw new Error('School ID is required');
    const where = { schoolId };
    if (teacherId) {
        let resolvedTeacherId = teacherId;
        const user = await db_1.default.user.findFirst({
            where: { id: teacherId, schoolId }
        });
        if (user && user.teacher_id) {
            resolvedTeacherId = user.teacher_id;
        }
        where.teacher_id = resolvedTeacherId;
    }
    return await db_1.default.teacherAssignment.findMany({
        where,
        include: {
            teacher: true,
            grade: true,
            section: true,
            stream: true
        },
    });
};
exports.getAssignments = getAssignments;
const createAssignment = async (data, schoolId) => {
    if (!schoolId)
        throw new Error('School ID is required');
    let teacherId = data.teacher_id;
    // Resolve User.id -> Teacher.id if a User ID was passed
    const user = await db_1.default.user.findFirst({
        where: { id: teacherId, schoolId }
    });
    if (user) {
        if (user.teacher_id) {
            teacherId = user.teacher_id;
        }
        else if (user.role === 'teacher') {
            // Lazy-create missing Teacher record for this user
            const newTeacher = await db_1.default.teacher.create({
                data: {
                    name: user.full_name,
                    email: user.email,
                    schoolId: schoolId,
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
    // Check for duplicate class assignment for this teacher in this school
    const existing = await db_1.default.teacherAssignment.findFirst({
        where: {
            schoolId,
            teacher_id: teacherId,
            gradeId: data.gradeId,
            sectionId: data.sectionId,
            streamId: data.streamId || null,
            subject: data.subject || null,
        }
    });
    if (existing) {
        throw new Error("This class assignment already exists for this teacher.");
    }
    return await db_1.default.teacherAssignment.create({
        data: {
            teacher_id: teacherId,
            schoolId: schoolId,
            gradeId: data.gradeId,
            sectionId: data.sectionId,
            subject: data.subject || null,
            streamId: data.streamId || null,
        },
        include: { teacher: true, grade: true, section: true, stream: true },
    });
};
exports.createAssignment = createAssignment;
const deleteAssignment = async (id, schoolId) => {
    return await db_1.default.teacherAssignment.delete({
        where: { id, schoolId }
    });
};
exports.deleteAssignment = deleteAssignment;
const updateAssignment = async (id, data, schoolId) => {
    return await db_1.default.teacherAssignment.update({
        where: { id, schoolId },
        data: {
            teacher_id: data.teacher_id,
            gradeId: data.gradeId,
            sectionId: data.sectionId,
            streamId: data.streamId || null,
            subject: data.subject || null,
        },
        include: { teacher: true, grade: true, section: true, stream: true },
    });
};
exports.updateAssignment = updateAssignment;
