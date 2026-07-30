import prisma from '../config/db';

// Helpers for the rules
const isP = (s: string | undefined): boolean => s?.toLowerCase() === 'present';
const isL = (s: string | undefined): boolean => s?.toLowerCase() === 'late';
const isE = (s: string | undefined): boolean => s?.toLowerCase() === 'excused';
const isA = (s: string | undefined): boolean => s?.toLowerCase() === 'absent';
const isAttendance = (s: string | undefined): boolean => isP(s) || isL(s);

// Guardrail: clamp date ranges to prevent full-history queries
const clampDateRange = (startDate?: string, endDate?: string) => {
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  // Enforce 90-day maximum window to prevent OOM
  const maxStart = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
  return { start: start < maxStart ? maxStart : start, end };
};

export const getAttendanceSummary = async (schoolId: string, filters: any) => {
  const { startDate, endDate, academicYear, session, grade, section, stream, mode } = filters;
  const isFullDay = !session || session === 'total';
  const isSessionMode = mode === 'session_based';
  const { start, end } = clampDateRange(startDate, endDate);

  const where: any = { schoolId, date: { gte: start, lte: end } };

  if (!isFullDay) {
    where.session = { equals: session.trim().toLowerCase(), mode: 'insensitive' };
  }

  // Filter attendance by student attributes if provided
  const studentWhere: any = { schoolId };
  if (grade && grade !== 'all') studentWhere.grade = { name: grade };
  if (section && section !== 'all') studentWhere.section = { name: section };
  if (stream && stream !== 'all') studentWhere.stream = { name: stream };

  if (grade || section || stream) {
    where.student = studentWhere;
  }

  const totalStudents = await prisma.student.count({ where: studentWhere });

  if (isFullDay) {
    // Use groupBy at DB level instead of loading all rows into memory
    const grouped = await prisma.attendance.groupBy({
      by: ['studentId', 'status', 'session'],
      where,
      _count: { _all: true }
    });

    // Build a student-day map from aggregated data for session pairing
    const studentStatusMap: Record<string, { morning?: string; afternoon?: string; daily?: string; count: number }[]> = {};

    for (const row of grouped) {
      if (!studentStatusMap[row.studentId]) studentStatusMap[row.studentId] = [];
      const sess = row.session?.toLowerCase();
      studentStatusMap[row.studentId].push({
        morning: sess === 'morning' ? row.status : undefined,
        afternoon: sess === 'afternoon' ? row.status : undefined,
        daily: !sess ? row.status : undefined,
        count: row._count._all,
      });
    }

    let present = 0, late = 0, excused = 0, absent = 0;

    for (const rows of Object.values(studentStatusMap)) {
      // Simplified counting: use status aggregates weighted by count
      for (const row of rows) {
        const s = row.morning || row.afternoon || row.daily;
        const n = row.count;
        if (!s) continue;
        if (isP(s)) present += n;
        else if (isL(s)) late += n;
        else if (isE(s)) excused += n;
        else if (isA(s)) absent += n;
      }
    }

    const totalEntries = present + late + excused + absent;
    const attendanceRate = totalEntries > 0
      ? Math.round(((present + late + excused) / totalEntries) * 100)
      : 0;

    return { totalStudents, present, late, excused, absent, attendanceRate };
  } else {
    // Single session — pure DB-level groupBy is perfect here
    const stats = {
      totalStudents,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      attendanceRate: 0
    };

    const attendanceCounts = await prisma.attendance.groupBy({
      by: ['status'],
      where,
      _count: { _all: true }
    });

    attendanceCounts.forEach((group: any) => {
      const s = group.status.toLowerCase();
      if (s === 'present') stats.present = group._count._all;
      else if (s === 'absent') stats.absent = group._count._all;
      else if (s === 'late') stats.late = group._count._all;
      else if (s === 'excused') stats.excused = group._count._all;
    });

    const totalRecorded = stats.present + stats.absent + stats.late + stats.excused;
    stats.attendanceRate = totalRecorded > 0
      ? Math.round(((stats.present + stats.late + stats.excused) / totalRecorded) * 100)
      : 0;

    return stats;
  }
};

export const getGradeStats = async (schoolId: string, filters: any) => {
  const { startDate, endDate, session, grade, section, stream, mode } = filters;
  const isFullDay = !session || session === 'total';
  const isSessionMode = mode === 'session_based';
  const { start, end } = clampDateRange(startDate, endDate);

  const where: any = { schoolId, date: { gte: start, lte: end } };
  if (!isFullDay) {
    where.session = { equals: session.trim().toLowerCase(), mode: 'insensitive' };
  }

  const studentWhere: any = { schoolId };
  if (grade && grade !== 'all') studentWhere.grade = { name: grade };
  if (section && section !== 'all') studentWhere.section = { name: section };
  if (stream && stream !== 'all') studentWhere.stream = { name: stream };

  if (grade || section || stream) {
    where.student = studentWhere;
  }

  // Use DB-level groupBy for students count per grade/section/stream
  const studentGroups = await prisma.student.groupBy({
    by: ['gradeId', 'sectionId', 'streamId'],
    where: studentWhere,
    _count: { _all: true }
  });

  // Get grade/section/stream name lookup
  const [grades, sections, streams] = await Promise.all([
    prisma.grade.findMany({ where: { schoolId }, select: { id: true, name: true } }),
    prisma.section.findMany({ where: { schoolId }, select: { id: true, name: true } }),
    prisma.stream.findMany({ where: { schoolId }, select: { id: true, name: true } }),
  ]);
  const gradeMap = Object.fromEntries(grades.map(g => [g.id, g.name]));
  const sectionMap = Object.fromEntries(sections.map(s => [s.id, s.name]));
  const streamMap = Object.fromEntries(streams.map(s => [s.id, s.name]));

  // DB-level attendance aggregation by student
  const attendanceAgg = await prisma.attendance.groupBy({
    by: ['studentId', 'status'],
    where,
    _count: { _all: true }
  });

  // Map studentId -> attendance stats
  const studentStats: Record<string, { present: number; late: number; excused: number; absent: number }> = {};
  for (const row of attendanceAgg) {
    if (!studentStats[row.studentId]) studentStats[row.studentId] = { present: 0, late: 0, excused: 0, absent: 0 };
    const s = row.status.toLowerCase();
    const n = row._count._all;
    if (s === 'present') studentStats[row.studentId].present += n;
    else if (s === 'late') studentStats[row.studentId].late += n;
    else if (s === 'excused') studentStats[row.studentId].excused += n;
    else if (s === 'absent') studentStats[row.studentId].absent += n;
  }

  // Get student->gradeId/sectionId/streamId mapping efficiently
  const studentMeta = await prisma.student.findMany({
    where: studentWhere,
    select: { id: true, gradeId: true, sectionId: true, streamId: true }
  });

  const groups: Record<string, any> = {};
  for (const s of studentMeta) {
    const key = `${s.gradeId}-${s.sectionId}-${s.streamId || 'none'}`;
    if (!groups[key]) {
      groups[key] = {
        gradeId: s.gradeId,
        sectionId: s.sectionId,
        streamId: s.streamId || null,
        grade: gradeMap[s.gradeId] || s.gradeId,
        section: sectionMap[s.sectionId] || s.sectionId,
        stream: s.streamId ? streamMap[s.streamId] || null : null,
        totalStudents: 0,
        present: 0,
        late: 0,
        excused: 0,
        absent: 0,
        lastUpdated: null,
      };
    }
    groups[key].totalStudents++;
    const att = studentStats[s.id];
    if (att) {
      groups[key].present += att.present;
      groups[key].late += att.late;
      groups[key].excused += att.excused;
      groups[key].absent += att.absent;
    }
  }

  return Object.values(groups).map(group => {
    const total = group.present + group.late + group.excused + group.absent;
    return {
      ...group,
      attendanceRate: total > 0
        ? Math.round(((group.present + group.late + group.excused) / total) * 100)
        : 0
    };
  });
};

export const getAttendanceTrends = async (schoolId: string, filters: any) => {
  const { startDate, endDate, grade, section, stream, session, mode } = filters;
  const isFullDay = !session || session === 'total';
  const { start, end } = clampDateRange(startDate, endDate);

  const where: any = { schoolId, date: { gte: start, lte: end } };
  if (!isFullDay) {
    where.session = { equals: session.trim().toLowerCase(), mode: 'insensitive' };
  }

  const studentWhere: any = { schoolId };
  if (grade && grade !== 'all') studentWhere.grade = { name: grade };
  if (section && section !== 'all') studentWhere.section = { name: section };
  if (stream && stream !== 'all') studentWhere.stream = { name: stream };

  if (grade || section || stream) {
    where.student = studentWhere;
  }

  // DB-level: group by date + status, count at DB not in Node memory
  const grouped = await prisma.attendance.groupBy({
    by: ['date', 'status'],
    where,
    _count: { studentId: true },
    orderBy: { date: 'asc' }
  });

  const byDate: Record<string, { present: number; total: number }> = {};
  for (const row of grouped) {
    const dateStr = new Date(row.date).toISOString().split('T')[0];
    if (!byDate[dateStr]) byDate[dateStr] = { present: 0, total: 0 };
    const n = (row._count as any).studentId;
    byDate[dateStr].total += n;
    const s = row.status.toLowerCase();
    if (s === 'present' || s === 'late' || s === 'excused') byDate[dateStr].present += n;
  }

  return Object.entries(byDate)
    .map(([date, { present, total }]) => ({
      date,
      rate: total > 0 ? Math.round((present / total) * 100) : 0
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

export const getDrillDownStats = async (schoolId: string, gradeId: string, filters: any) => {
  const { startDate, endDate, sectionId, streamId, mode } = filters;
  const isSessionMode = mode === 'session_based';
  const { start, end } = clampDateRange(startDate, endDate);

  const studentWhere: any = {
    schoolId,
    gradeId,
    ...(sectionId && sectionId !== 'all' ? { sectionId } : {}),
    ...(streamId && streamId !== 'all' ? { streamId } : {})
  };

  // Use DB-level aggregation instead of loading full attendance per student
  const students = await prisma.student.findMany({
    where: studentWhere,
    select: { id: true, student_id: true, fullName: true, sectionId: true, streamId: true },
  });

  if (students.length === 0) return [];

  const studentIds = students.map(s => s.id);

  // Bulk fetch attendance as aggregation
  const attendanceAgg = await prisma.attendance.groupBy({
    by: ['studentId', 'status'],
    where: {
      schoolId,
      studentId: { in: studentIds },
      date: { gte: start, lte: end },
    },
    _count: { _all: true }
  });

  // Fetch 5 most recent records per student (for recentAttendance display)
  const recentRecords = await prisma.attendance.findMany({
    where: { schoolId, studentId: { in: studentIds }, date: { gte: start, lte: end } },
    orderBy: { date: 'desc' },
    take: students.length * 5, // upper bound: 5 recent per student
    select: { studentId: true, date: true, status: true, session: true }
  });

  const recentByStudent: Record<string, any[]> = {};
  for (const rec of recentRecords) {
    if (!recentByStudent[rec.studentId]) recentByStudent[rec.studentId] = [];
    if (recentByStudent[rec.studentId].length < 5) recentByStudent[rec.studentId].push(rec);
  }

  // Build student stats map
  const statsMap: Record<string, { present: number; late: number; excused: number; absent: number }> = {};
  for (const row of attendanceAgg) {
    if (!statsMap[row.studentId]) statsMap[row.studentId] = { present: 0, late: 0, excused: 0, absent: 0 };
    const s = row.status.toLowerCase();
    const n = row._count._all;
    if (s === 'present') statsMap[row.studentId].present += n;
    else if (s === 'late') statsMap[row.studentId].late += n;
    else if (s === 'excused') statsMap[row.studentId].excused += n;
    else if (s === 'absent') statsMap[row.studentId].absent += n;
  }

  // Fetch section/stream names
  const [sections, streams] = await Promise.all([
    prisma.section.findMany({ where: { schoolId }, select: { id: true, name: true } }),
    prisma.stream.findMany({ where: { schoolId }, select: { id: true, name: true } }),
  ]);
  const sectionMap = Object.fromEntries(sections.map(s => [s.id, s.name]));
  const streamMap = Object.fromEntries(streams.map(s => [s.id, s.name]));

  return students.map(student => {
    const stats = statsMap[student.id] || { present: 0, late: 0, excused: 0, absent: 0 };
    const total = stats.present + stats.late + stats.excused + stats.absent;
    return {
      id: student.id,
      studentId: student.student_id,
      fullName: student.fullName,
      section: sectionMap[student.sectionId] || student.sectionId,
      stream: student.streamId ? streamMap[student.streamId] || null : null,
      ...stats,
      attendanceRate: total > 0 ? Math.round(((stats.present + stats.late + stats.excused) / total) * 100) : 0,
      recentAttendance: recentByStudent[student.id] || []
    };
  });
};
