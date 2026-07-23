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
            const typePush = status.toLowerCase() === 'absent' ? 'absent_arrival' : 'late_arrival';
            const isFemale = student.gender?.toLowerCase() === 'female';
            const isAbsent = status.toLowerCase() === 'absent';
            // Construct Amharic notification title and body
            const title = isAbsent
                ? (isFemale ? `${student.fullName} ዛሬ ቀርታለች` : `${student.fullName} ዛሬ ቀርቷል`)
                : (isFemale ? `${student.fullName} ዛሬ ዘግይታለች` : `${student.fullName} ዛሬ ዘግይቷል`);
            const sessionStrAm = session ? (session.toLowerCase() === 'morning' ? 'የጠዋት ክፍለ ጊዜ' : session.toLowerCase() === 'afternoon' ? 'የከሰዓት ክፍለ ጊዜ' : session) : '';
            const sessionClauseAm = sessionStrAm ? ` (${sessionStrAm})` : '';
            const message = isAbsent
                ? (isFemale
                    ? `${student.fullName} በ ${dateStr}${sessionClauseAm} ትምህርት ቤት እንዳልቀረበች ምልክት ተደርጓል።`
                    : `${student.fullName} በ ${dateStr}${sessionClauseAm} ትምህርት ቤት እንዳልቀረበ ምልክት ተደርጓል።`)
                : (isFemale
                    ? `${student.fullName} በ ${dateStr}${sessionClauseAm} ዘግይታ ትምህርት ቤት ደርሳለች።`
                    : `${student.fullName} በ ${dateStr}${sessionClauseAm} ዘግይቶ ትምህርት ቤት ደርሷል።`);
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
            // Send fcm push notification to linked parents
            const { sendCategoryNotification } = require('./notification.service');
            const parentLinks = await db_1.default.parentStudentLink.findMany({
                where: { studentId: student.id },
                include: { parent: true }
            });
            // Fetch school name once for all parent pushes
            const school = await db_1.default.school.findUnique({
                where: { id: schoolId },
                select: { name: true }
            });
            const schoolName = school?.name || 'ZeTime School';
            // Human-readable category label shown between school name and message body
            const categoryLabel = isAbsent ? 'Absent Alert' : 'Late Arrival';
            for (const link of parentLinks) {
                if (link.parent && link.parent.pushToken) {
                    // Check preferences only if phone is set
                    if (link.parent.phone) {
                        const prefs = await db_1.default.parentPreferences.findUnique({
                            where: { parentPhone_schoolId: { parentPhone: link.parent.phone, schoolId } }
                        });
                        if (prefs && !prefs.pushNotifications) {
                            continue; // Guard: parent disabled push alerts
                        }
                    }
                    await sendCategoryNotification(link.parent.pushToken, {
                        type: typePush,
                        title: schoolName, // School name is the notification title
                        body: message, // Full Amharic message as the body
                        route: `/parent/attendance`,
                        studentId: student.id,
                        schoolId,
                        schoolName,
                        categoryLabel, // Shown as the category subtext in Android
                        tag: `attendance-${student.id}`
                    }).catch((err) => {
                        console.error(`Failed to dispatch push to parent ${link.parentId}:`, err);
                    });
                }
            }
        }
        catch (notificationError) {
            console.error("Failed to create parent notification or send push:", notificationError);
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
    // Strict session isolation:
    // "none"  → daily mode  → WHERE session IS NULL  (only daily records)
    // "morning"/"afternoon" → session mode → WHERE session = value (only that session's records)
    // undefined/not sent   → no filter (all records, used by reports/analytics)
    if (session !== undefined && session !== null) {
        if (session === 'none') {
            where.session = null; // daily mode: fetch records with no session
        }
        else {
            where.session = session; // session mode: fetch only that session
        }
    }
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
const getAttendanceByStudent = async (studentId, schoolId, filters = {}) => {
    const { session } = filters;
    const where = { studentId, schoolId };
    if (session !== undefined && session !== null) {
        if (session === 'none') {
            where.session = null;
        }
        else {
            where.session = session;
        }
    }
    return await db_1.default.attendance.findMany({
        where,
        orderBy: { date: 'desc' },
    });
};
exports.getAttendanceByStudent = getAttendanceByStudent;
