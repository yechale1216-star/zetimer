"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAttendanceByStudent = exports.getAttendance = exports.markAttendance = void 0;
const db_1 = __importDefault(require("../config/db"));
const markAttendance = async (data, schoolId) => {
    const { studentId, date, session, status, remarks, teacherId } = data;
    if (!studentId || !date) {
        throw new Error("Student ID and Date are required");
    }
    // Ensure student belongs to this school
    const student = await db_1.default.student.findFirst({
        where: { id: studentId, schoolId }
    });
    if (!student) {
        throw new Error("Student not found in this school");
    }
    // Parse the day range in UTC
    const dateStr = typeof date === 'string' ? date.split("T")[0] : new Date(date).toISOString().split("T")[0];
    const startDate = new Date(`${dateStr}T00:00:00.000Z`);
    const endDate = new Date(`${dateStr}T23:59:59.999Z`);
    // Find if a record already exists for this student on this day and session
    const existing = await db_1.default.attendance.findFirst({
        where: {
            schoolId,
            studentId,
            date: {
                gte: startDate,
                lte: endDate,
            },
            session: session || null,
        }
    });
    const result = existing
        ? await db_1.default.attendance.update({
            where: { id: existing.id },
            data: {
                status,
                remarks,
                teacherId,
                session: session || null,
            }
        })
        : await db_1.default.attendance.create({
            data: {
                studentId,
                schoolId,
                teacherId,
                date: startDate,
                status,
                session: session || null,
                remarks,
            }
        });
    // Intercept and create parent notification if status is Absent or Late
    if (status && (status.toLowerCase() === 'absent' || status.toLowerCase() === 'late')) {
        try {
            const type = status.toLowerCase() === 'absent' ? 'absent' : 'late';
            const title = status.toLowerCase() === 'absent' ? 'Absent Alert' : 'Late Arrival Alert';
            const sessionStr = session ? ` (${session} session)` : '';
            const message = `${student.fullName} has been marked ${status}${sessionStr} on ${dateStr}.`;
            await db_1.default.parentNotification.create({
                data: {
                    schoolId,
                    studentId: student.id,
                    type,
                    title,
                    message,
                    isRead: false
                }
            });
        }
        catch (notificationError) {
            console.error("Failed to create parent notification:", notificationError);
        }
    }
    return result;
};
exports.markAttendance = markAttendance;
const getAttendance = async (filters, schoolId) => {
    const { studentId, date, session, grade, section, startDate: filterStartDate, endDate: filterEndDate } = filters;
    const where = { schoolId };
    if (studentId)
        where.studentId = studentId;
    if (date) {
        const dateStr = typeof date === 'string' ? date.split("T")[0] : date;
        const startDate = new Date(`${dateStr}T00:00:00.000Z`);
        const endDate = new Date(`${dateStr}T23:59:59.999Z`);
        where.date = {
            gte: startDate,
            lte: endDate,
        };
    }
    else if (filterStartDate || filterEndDate) {
        where.date = {};
        if (filterStartDate) {
            const dateStr = typeof filterStartDate === 'string' ? filterStartDate.split("T")[0] : filterStartDate;
            where.date.gte = new Date(`${dateStr}T00:00:00.000Z`);
        }
        if (filterEndDate) {
            const dateStr = typeof filterEndDate === 'string' ? filterEndDate.split("T")[0] : filterEndDate;
            where.date.lte = new Date(`${dateStr}T23:59:59.999Z`);
        }
    }
    if (session)
        where.session = session;
    if (grade || section) {
        where.student = { schoolId };
        if (grade)
            where.student.gradeId = grade;
        if (section)
            where.student.sectionId = section;
    }
    return await db_1.default.attendance.findMany({
        where,
        include: {
            student: {
                include: {
                    grade: true,
                    section: true,
                    stream: true
                }
            }
        },
    });
};
exports.getAttendance = getAttendance;
const getAttendanceByStudent = async (studentId, schoolId) => {
    return await db_1.default.attendance.findMany({
        where: { studentId, schoolId },
        orderBy: { date: 'desc' },
    });
};
exports.getAttendanceByStudent = getAttendanceByStudent;
