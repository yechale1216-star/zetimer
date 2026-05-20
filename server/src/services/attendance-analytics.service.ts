import prisma from '../config/db';

export const getAttendanceSummary = async (schoolId: string, filters: any) => {
  const { startDate, endDate, academicYear, session } = filters;
  
  const where: any = { schoolId };
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }
  if (session && session !== 'total') {
    where.session = session;
  }

  const [totalStudents, attendanceCounts] = await Promise.all([
    prisma.student.count({ where: { schoolId } }),
    prisma.attendance.groupBy({
      by: ['status'],
      where,
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

  attendanceCounts.forEach((group: any) => {
    const status = group.status.toLowerCase();
    if (status === 'present') stats.present = group._count._all;
    else if (status === 'absent') stats.absent = group._count._all;
    else if (status === 'late') stats.late = group._count._all;
    else if (status === 'excused') stats.excused = group._count._all;
  });

  const totalRecorded = stats.present + stats.absent + stats.late + stats.excused;
  if (totalRecorded > 0) {
    stats.attendanceRate = Math.round(((stats.present + stats.late) / totalRecorded) * 100);
  }

  return stats;
};

export const getGradeStats = async (schoolId: string, filters: any) => {
  const { startDate, endDate, session } = filters;

  const where: any = { schoolId };
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }
  if (session && session !== 'total') {
    where.session = session;
  }

  // Get all students grouped by grade, section, stream
  const students = await prisma.student.findMany({
    where: { schoolId },
    include: {
      grade: true,
      section: true,
      stream: true,
    }
  });

  // Get attendance records for the period
  const attendance = await prisma.attendance.findMany({
    where,
    select: {
      studentId: true,
      status: true,
      date: true,
    }
  });

  // Create an attendance map for faster lookup: studentId -> attendanceRecords[]
  const attendanceMap: Record<string, any[]> = {};
  attendance.forEach(rec => {
    if (!attendanceMap[rec.studentId]) {
      attendanceMap[rec.studentId] = [];
    }
    attendanceMap[rec.studentId].push(rec);
  });

  // Group stats
  const groups: Record<string, any> = {};

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
        lastUpdated: null as Date | null,
      };
    }

    groups[key].totalStudents++;
    
    // Use the attendance map for O(1) lookup
    const studentAttendance = attendanceMap[student.id] || [];
    studentAttendance.forEach(rec => {
      const status = rec.status.toLowerCase();
      if (status === 'present') groups[key].present++;
      else if (status === 'absent') groups[key].absent++;
      else if (status === 'late') groups[key].late++;
      else if (status === 'excused') groups[key].excused++;
      
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

export const getAttendanceTrends = async (schoolId: string, filters: any) => {
  const { startDate, endDate, grade, section, stream, session } = filters;

  const where: any = { schoolId };
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  if (session && session !== 'total') {
    where.session = session;
  }

  if (grade || section || stream) {
    where.student = {};
    if (grade) where.student.grade = { name: grade };
    if (section) where.student.section = { name: section };
    if (stream) where.student.stream = { name: stream };
  }

  const attendance = await prisma.attendance.groupBy({
    by: ['date', 'status'],
    where,
    _count: {
      _all: true
    },
    orderBy: {
      date: 'asc'
    }
  });

  const trendMap: Record<string, any> = {};
  attendance.forEach(group => {
    const dateStr = group.date.toISOString().split('T')[0];
    if (!trendMap[dateStr]) {
      trendMap[dateStr] = { date: dateStr, present: 0, late: 0, total: 0 };
    }
    const status = group.status.toLowerCase();
    const count = group._count._all;
    trendMap[dateStr].total += count;
    if (status === 'present') trendMap[dateStr].present += count;
    else if (status === 'late') trendMap[dateStr].late += count;
  });

  return Object.values(trendMap).map((d: any) => ({
    date: d.date,
    rate: d.total > 0 ? Math.round(((d.present + d.late) / d.total) * 100) : 0
  }));
};

export const getDrillDownStats = async (schoolId: string, gradeId: string, filters: any) => {
  const { startDate, endDate, section, stream } = filters;

  const where: any = { 
    schoolId,
    student: {
      gradeId: gradeId,
    }
  };

  if (section) where.student.sectionId = section;
  if (stream) where.student.streamId = stream;
  
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  const students = await prisma.student.findMany({
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
      if (status === 'present') stats.present++;
      else if (status === 'absent') stats.absent++;
      else if (status === 'late') stats.late++;
      else if (status === 'excused') stats.excused++;
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
