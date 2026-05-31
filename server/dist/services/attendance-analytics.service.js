"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDrillDownStats = exports.getAttendanceTrends = exports.getGradeStats = exports.getAttendanceSummary = void 0;
const db_1 = __importDefault(require("../config/db"));
const getAttendanceSummary = async (schoolId, filters) => {
    const { startDate, endDate, academicYear, session } = filters;
    const where = { schoolId };
    if (startDate || endDate) {
        where.date = {};
        if (startDate)
            where.date.gte = new Date(startDate);
        if (endDate)
            where.date.lte = new Date(endDate);
    }
    if (session && session !== 'total') {
        where.session = session;
    }
    const [totalStudents, attendanceCounts] = await Promise.all([
        db_1.default.student.count({ where: { schoolId } }),
        db_1.default.attendance.groupBy({
            by: ['status'],
            where: { ...where, schoolId },
            _count: {
                _all: true
            }
        })
    ]);
    const stats = {
        totalStudents,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        attendanceRate: 0
    };
    attendanceCounts.forEach((group) => {
        const status = group.status.toLowerCase();
        if (status === 'present')
            stats.present = group._count._all;
        else if (status === 'absent')
            stats.absent = group._count._all;
        else if (status === 'late')
            stats.late = group._count._all;
        else if (status === 'excused')
            stats.excused = group._count._all;
    });
    const totalRecorded = stats.present + stats.absent + stats.late + stats.excused;
    if (totalRecorded > 0) {
        stats.attendanceRate = Math.round(((stats.present + stats.late) / totalRecorded) * 100);
    }
    return stats;
};
exports.getAttendanceSummary = getAttendanceSummary;
const getGradeStats = async (schoolId, filters) => {
    const { startDate, endDate, session } = filters;
    const where = { schoolId };
    if (startDate || endDate) {
        where.date = {};
        if (startDate)
            where.date.gte = new Date(startDate);
        if (endDate)
            where.date.lte = new Date(endDate);
    }
    if (session && session !== 'total') {
        where.session = session;
    }
    // Get all students grouped by grade, section, stream, strictly for this school
    const students = await db_1.default.student.findMany({
        where: { schoolId },
        include: {
            grade: true,
            section: true,
            stream: true,
        }
    });
    const attendance = await db_1.default.attendance.findMany({
        where: { ...where, schoolId },
        select: {
            studentId: true,
            status: true,
            date: true,
        }
    });
    const attendanceMap = {};
    attendance.forEach(rec => {
        if (!attendanceMap[rec.studentId]) {
            attendanceMap[rec.studentId] = [];
        }
        attendanceMap[rec.studentId].push(rec);
    });
    const groups = {};
    students.forEach(student => {
        const gradeName = student.grade.name;
        const sectionName = student.section.name;
        const streamName = student.stream?.name || null;
        const key = `${gradeName}-${sectionName}-${streamName || 'none'}`;
        if (!groups[key]) {
            groups[key] = {
                grade: gradeName,
                section: sectionName,
                stream: streamName,
                totalStudents: 0,
                present: 0,
                absent: 0,
                late: 0,
                excused: 0,
                lastUpdated: null,
            };
        }
        groups[key].totalStudents++;
        const studentAttendance = attendanceMap[student.id] || [];
        studentAttendance.forEach(rec => {
            const status = rec.status.toLowerCase();
            if (status === 'present')
                groups[key].present++;
            else if (status === 'absent')
                groups[key].absent++;
            else if (status === 'late')
                groups[key].late++;
            else if (status === 'excused')
                groups[key].excused++;
            if (!groups[key].lastUpdated || rec.date > groups[key].lastUpdated) {
                groups[key].lastUpdated = rec.date;
            }
        });
    });
    return Object.values(groups).map(group => {
        const totalRecorded = group.present + group.absent + group.late + group.excused;
        return {
            ...group,
            attendanceRate: totalRecorded > 0 ? Math.round(((group.present + group.late) / totalRecorded) * 100) : 0
        };
    });
};
exports.getGradeStats = getGradeStats;
const getAttendanceTrends = async (schoolId, filters) => {
    const { startDate, endDate, grade, section, stream, session } = filters;
    const where = { schoolId };
    if (startDate || endDate) {
        where.date = {};
        if (startDate)
            where.date.gte = new Date(startDate);
        if (endDate)
            where.date.lte = new Date(endDate);
    }
    if (session && session !== 'total') {
        where.session = session;
    }
    if (grade || section || stream) {
        where.student = { schoolId };
        if (grade)
            where.student.grade = { name: grade };
        if (section)
            where.student.section = { name: section };
        if (stream)
            where.student.stream = { name: stream };
    }
    const attendance = await db_1.default.attendance.groupBy({
        by: ['date', 'status'],
        where: { ...where, schoolId },
        _count: {
            _all: true
        },
        orderBy: {
            date: 'asc'
        }
    });
    const trendMap = {};
    attendance.forEach(group => {
        const dateStr = group.date.toISOString().split('T')[0];
        if (!trendMap[dateStr]) {
            trendMap[dateStr] = { date: dateStr, present: 0, late: 0, total: 0 };
        }
        const status = group.status.toLowerCase();
        const count = group._count._all;
        trendMap[dateStr].total += count;
        if (status === 'present')
            trendMap[dateStr].present += count;
        else if (status === 'late')
            trendMap[dateStr].late += count;
    });
    return Object.values(trendMap).map((d) => ({
        date: d.date,
        rate: d.total > 0 ? Math.round(((d.present + d.late) / d.total) * 100) : 0
    }));
};
exports.getAttendanceTrends = getAttendanceTrends;
const getDrillDownStats = async (schoolId, gradeId, filters) => {
    const { startDate, endDate, section, stream } = filters;
    const where = {
        schoolId,
        student: {
            schoolId,
            gradeId: gradeId,
        }
    };
    if (section)
        where.student.sectionId = section;
    if (stream)
        where.student.streamId = stream;
    if (startDate || endDate) {
        where.date = {};
        if (startDate)
            where.date.gte = new Date(startDate);
        if (endDate)
            where.date.lte = new Date(endDate);
    }
    const students = await db_1.default.student.findMany({
        where: {
            schoolId,
            gradeId: gradeId,
            ...(section ? { sectionId: section } : {}),
            ...(stream ? { streamId: stream } : {}),
        },
        include: {
            section: true,
            stream: true,
            attendance: {
                where: {
                    schoolId,
                    ...(startDate || endDate ? {
                        date: {
                            ...(startDate ? { gte: new Date(startDate) } : {}),
                            ...(endDate ? { lte: new Date(endDate) } : {}),
                        }
                    } : {})
                },
                orderBy: { date: 'desc' }
            }
        }
    });
    return students.map(student => {
        const stats = {
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
        };
        student.attendance.forEach(rec => {
            const status = rec.status.toLowerCase();
            if (status === 'present')
                stats.present++;
            else if (status === 'absent')
                stats.absent++;
            else if (status === 'late')
                stats.late++;
            else if (status === 'excused')
                stats.excused++;
        });
        const total = stats.present + stats.absent + stats.late + stats.excused;
        return {
            id: student.id,
            studentId: student.student_id,
            fullName: student.fullName,
            section: student.section.name,
            stream: student.stream?.name || null,
            ...stats,
            attendanceRate: total > 0 ? Math.round(((stats.present + stats.late) / total) * 100) : 0,
            recentAttendance: student.attendance.slice(0, 5)
        };
    });
};
exports.getDrillDownStats = getDrillDownStats;
