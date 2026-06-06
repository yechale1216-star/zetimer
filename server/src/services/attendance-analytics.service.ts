import prisma from '../config/db';

// Helpers for the rules
const isP = (s: string | undefined): boolean => s?.toLowerCase() === 'present';
const isL = (s: string | undefined): boolean => s?.toLowerCase() === 'late';
const isE = (s: string | undefined): boolean => s?.toLowerCase() === 'excused';
const isA = (s: string | undefined): boolean => s?.toLowerCase() === 'absent';
const isAttendance = (s: string | undefined): boolean => isP(s) || isL(s);

export const getAttendanceSummary = async (schoolId: string, filters: any) => {
  const { startDate, endDate, academicYear, session } = filters;
  const isFullDay = !session || session === 'total';

  const where: any = { schoolId };
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  if (!isFullDay) {
    where.session = session;
  }

  const totalStudents = await prisma.student.count({ where: { schoolId } });

  if (isFullDay) {
    const allRecords = await prisma.attendance.findMany({
      where: { ...where, schoolId },
      select: { studentId: true, date: true, session: true, status: true }
    });

    const hasAnySessionRecords = allRecords.some(r => r.session);

    const byStudentDate: Record<string, { morning?: string; afternoon?: string; daily?: string }> = {};
    allRecords.forEach(rec => {
      if (hasAnySessionRecords && !rec.session) return;
      const dateStr = rec.date.toISOString().split('T')[0];
      const key = `${rec.studentId}||${dateStr}`;
      if (!byStudentDate[key]) byStudentDate[key] = {};
      const sess = rec.session?.toLowerCase();
      if (sess === 'morning') byStudentDate[key].morning = rec.status;
      else if (sess === 'afternoon') byStudentDate[key].afternoon = rec.status;
      else byStudentDate[key].daily = rec.status;
    });

    let present = 0;
    let late = 0;
    let excused = 0;
    let absent = 0;

    Object.values(byStudentDate).forEach(entry => {
      const { morning: m, afternoon: a, daily: d } = entry;

      if (m !== undefined || a !== undefined) {
        if (m !== undefined && a !== undefined) {
          // Both sessions recorded
          if (isP(m) && isP(a)) present++;
          else if (isAttendance(m) && isAttendance(a)) late++;
          else if (isE(m) && isE(a)) excused++;
          else if (isA(m) && isA(a)) absent++;
          // Partial days are ignored per user request "remove partial Day it is not neccessary"
        }
      } else if (d !== undefined) {
        // Fallback for daily mode
        if (isP(d)) present++;
        else if (isL(d)) late++;
        else if (isE(d)) excused++;
        else if (isA(d)) absent++;
      }
    });

    const totalEntries = present + late + excused + absent;
    const attendanceRate = totalEntries > 0
      ? Math.round(((present + late + excused) / totalEntries) * 100)
      : 0;

    return {
      totalStudents,
      present,
      late,
      excused,
      absent,
      attendanceRate
    };
  } else {
    // Single session view
    const attendanceCounts = await prisma.attendance.groupBy({
      by: ['status'],
      where: { ...where, schoolId },
      _count: { _all: true }
    });

    const stats = {
      totalStudents,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      attendanceRate: 0
    };

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
  const { startDate, endDate, session } = filters;
  const isFullDay = !session || session === 'total';

  const where: any = { schoolId };
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }
  if (!isFullDay) {
    where.session = session;
  }

  const students = await prisma.student.findMany({
    where: { schoolId },
    include: { grade: true, section: true, stream: true }
  });

  const attendance = await prisma.attendance.findMany({
    where: { ...where, schoolId },
    select: { studentId: true, status: true, date: true, session: true }
  });

  const hasAnySessionRecords = attendance.some(r => r.session);

  const attendanceMap: Record<string, any[]> = {};
  attendance.forEach(rec => {
    if (hasAnySessionRecords && !rec.session) return;
    if (!attendanceMap[rec.studentId]) attendanceMap[rec.studentId] = [];
    attendanceMap[rec.studentId].push(rec);
  });

  const groups: Record<string, any> = {};

  students.forEach(student => {
    const key = `${student.gradeId}-${student.sectionId}-${student.streamId || 'none'}`;
    if (!groups[key]) {
      groups[key] = {
        gradeId: student.gradeId,
        sectionId: student.sectionId,
        streamId: student.streamId || null,
        grade: student.grade.name,
        section: student.section.name,
        stream: student.stream?.name || null,
        totalStudents: 0,
        present: 0,
        late: 0,
        excused: 0,
        absent: 0,
        lastUpdated: null as Date | null,
      };
    }

    groups[key].totalStudents++;
    const records = attendanceMap[student.id] || [];

    if (isFullDay) {
      const byDate: Record<string, { morning?: string; afternoon?: string; daily?: string }> = {};
      records.forEach(rec => {
        const dateStr = rec.date.toISOString().split('T')[0];
        if (!byDate[dateStr]) byDate[dateStr] = {};
        const s = rec.session?.toLowerCase();
        if (s === 'morning') byDate[dateStr].morning = rec.status;
        else if (s === 'afternoon') byDate[dateStr].afternoon = rec.status;
        else byDate[dateStr].daily = rec.status;

        if (!groups[key].lastUpdated || rec.date > groups[key].lastUpdated) {
          groups[key].lastUpdated = rec.date;
        }
      });

      Object.values(byDate).forEach(entry => {
        const { morning: m, afternoon: a, daily: d } = entry;
        if (m !== undefined || a !== undefined) {
          if (m !== undefined && a !== undefined) {
             if (isP(m) && isP(a)) groups[key].present++;
             else if (isAttendance(m) && isAttendance(a)) groups[key].late++;
             else if (isE(m) && isE(a)) groups[key].excused++;
             else if (isA(m) && isA(a)) groups[key].absent++;
          }
        } else if (d !== undefined) {
          if (isP(d)) groups[key].present++;
          else if (isL(d)) groups[key].late++;
          else if (isE(d)) groups[key].excused++;
          else if (isA(d)) groups[key].absent++;
        }
      });
    } else {
      records.forEach(rec => {
        const s = rec.status?.toLowerCase();
        if (s === 'present') groups[key].present++;
        else if (s === 'late') groups[key].late++;
        else if (s === 'excused') groups[key].excused++;
        else if (s === 'absent') groups[key].absent++;
      });
    }
  });

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
  const { startDate, endDate, grade, section, stream, session } = filters;
  const isFullDay = !session || session === 'total';

  const where: any = { schoolId };
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  const allRecords = await prisma.attendance.findMany({
    where: { ...where, ...(isFullDay ? {} : { session }) },
    select: { studentId: true, date: true, session: true, status: true },
    orderBy: { date: 'asc' }
  });

  const hasAnySessionRecords = allRecords.some(r => r.session);

  const byDateStudent: Record<string, Record<string, { morning?: string; afternoon?: string; daily?: string }>> = {};
  allRecords.forEach(rec => {
    if (isFullDay && hasAnySessionRecords && !rec.session) return;
    const dateStr = rec.date.toISOString().split('T')[0];
    if (!byDateStudent[dateStr]) byDateStudent[dateStr] = {};
    if (!byDateStudent[dateStr][rec.studentId]) byDateStudent[dateStr][rec.studentId] = {};
    const s = rec.session?.toLowerCase();
    if (s === 'morning') byDateStudent[dateStr][rec.studentId].morning = rec.status;
    else if (s === 'afternoon') byDateStudent[dateStr][rec.studentId].afternoon = rec.status;
    else byDateStudent[dateStr][rec.studentId].daily = rec.status;
  });

  return Object.entries(byDateStudent).map(([dateStr, studentMap]) => {
    let presentCount = 0;
    const total = Object.keys(studentMap).length;

    Object.values(studentMap).forEach(entry => {
      const { morning: m, afternoon: a, daily: d } = entry;
      if (isFullDay) {
        if (m !== undefined && a !== undefined) {
          if (isAttendance(m) && isAttendance(a)) presentCount++;
          else if (isE(m) && isE(a)) presentCount++; 
        } else if (d !== undefined && (isAttendance(d) || isE(d))) {
          presentCount++;
        }
      } else {
        const s = m || a || d;
        if (isAttendance(s) || isE(s)) presentCount++;
      }
    });

    return {
      date: dateStr,
      rate: total > 0 ? Math.round((presentCount / total) * 100) : 0
    };
  }).sort((a, b) => a.date.localeCompare(b.date));
};

export const getDrillDownStats = async (schoolId: string, gradeId: string, filters: any) => {
  const { startDate, endDate, sectionId, streamId } = filters;
  const students = await prisma.student.findMany({
    where: { 
      schoolId, 
      gradeId, 
      ...(sectionId ? { sectionId } : {}), 
      ...(streamId ? { streamId } : {}) 
    },
    include: {
      section: true,
      stream: true,
      attendance: {
        where: { schoolId, ...(startDate || endDate ? { date: { ...(startDate ? { gte: new Date(startDate) } : {}), ...(endDate ? { lte: new Date(endDate) } : {}) } } : {}) },
        orderBy: { date: 'desc' }
      }
    }
  });

  return students.map(student => {
    const stats = {
      present: 0,
      late: 0,
      excused: 0,
      absent: 0,
    };

    const hasAnySessionRecords = student.attendance.some(r => r.session);
    const byDate: Record<string, { morning?: string; afternoon?: string; daily?: string }> = {};

    student.attendance.forEach(rec => {
      if (hasAnySessionRecords && !rec.session) return;
      const dStr = rec.date.toISOString().split('T')[0];
      if (!byDate[dStr]) byDate[dStr] = {};
      const s = rec.session?.toLowerCase();
      if (s === 'morning') byDate[dStr].morning = rec.status;
      else if (s === 'afternoon') byDate[dStr].afternoon = rec.status;
      else byDate[dStr].daily = rec.status;
    });

    Object.values(byDate).forEach(entry => {
      const { morning: m, afternoon: a, daily: d } = entry;
      if (m !== undefined || a !== undefined) {
        if (m !== undefined && a !== undefined) {
          if (isP(m) && isP(a)) stats.present++;
          else if (isAttendance(m) && isAttendance(a)) stats.late++;
          else if (isE(m) && isE(a)) stats.excused++;
          else if (isA(m) && isA(a)) stats.absent++;
        }
      } else if (d !== undefined) {
        if (isP(d)) stats.present++;
        else if (isL(d)) stats.late++;
        else if (isE(d)) stats.excused++;
        else if (isA(d)) stats.absent++;
      }
    });

    const total = stats.present + stats.late + stats.excused + stats.absent;
    return {
      id: student.id,
      studentId: student.student_id,
      fullName: student.fullName,
      section: student.section.name,
      stream: student.stream?.name || null,
      ...stats,
      attendanceRate: total > 0 ? Math.round(((stats.present + stats.late + stats.excused) / total) * 100) : 0,
      recentAttendance: student.attendance.slice(0, 5)
    };
  });
};
