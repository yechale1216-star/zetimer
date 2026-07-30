import prisma from '../config/db';

export const markAttendance = async (data: any, schoolId: string) => {
  const { studentId, date, status, remarks, teacherId } = data;
  // Normalize session to lowercase for consistent DB storage.
  // The bulk route bypasses validateAttendance middleware, so normalization
  // must happen here to avoid mixed-case records ("Morning" vs "morning").
  const session = data.session ? data.session.toLowerCase() : null;

  if (!studentId || !date) {
    throw new Error("Student ID and Date are required");
  }

  // Ensure student belongs to this school
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId }
  });
  if (!student) {
    throw new Error("Student not found in this school");
  }

  // Parse the day range in UTC
  const dateStr = typeof date === 'string' ? date.split("T")[0] : new Date(date).toISOString().split("T")[0];
  const startDate = new Date(`${dateStr}T00:00:00.000Z`);
  const endDate = new Date(`${dateStr}T23:59:59.999Z`);

  // Find if a record already exists for this student on this day and session.
  // Use case-insensitive match to handle any legacy mixed-case records.
  const existing = await prisma.attendance.findFirst({
    where: {
      schoolId,
      studentId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      ...(session
        ? { session: { equals: session, mode: 'insensitive' } }
        : { session: null }
      ),
    }
  });

  const result = existing
    ? await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status,
          remarks,
          teacherId,
          session: session || null,
        }
      })
    : await prisma.attendance.create({
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
      
      const isFemale = (student as any).gender?.toLowerCase() === 'female';
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
      
      await prisma.parentNotification.create({
        data: {
          schoolId,
          studentId: student.id,
          type,
          title,
          message,
          isRead: false
        }
      });

      // Fetch school name and parent links in parallel
      const { sendCategoryNotification } = require('./notification.service');
      const [school, parentLinks] = await Promise.all([
        prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } }),
        prisma.parentStudentLink.findMany({ where: { studentId: student.id }, include: { parent: true } })
      ]);
      const schoolName = school?.name || 'ZeTime School';
      const categoryLabel = isAbsent ? 'Absent Alert' : 'Late Arrival';

      // Batch preference check and push dispatch in parallel
      await Promise.allSettled(
        parentLinks
          .filter(link => link.parent?.pushToken)
          .map(async (link) => {
            // Check opt-out preferences if phone is available
            if (link.parent.phone) {
              const prefs = await prisma.parentPreferences.findUnique({
                where: { parentPhone_schoolId: { parentPhone: link.parent.phone, schoolId } }
              });
              if (prefs && !prefs.pushNotifications) return;
            }
            await sendCategoryNotification(link.parent.pushToken, {
              type: typePush,
              title: schoolName,
              body: message,
              route: `/parent/attendance`,
              studentId: student.id,
              schoolId,
              schoolName,
              categoryLabel,
              tag: `attendance-${student.id}`
            });
          })
      );
    } catch (notificationError) {
      console.error("Failed to create parent notification or send push:", notificationError);
    }
  }

  return result;
};

export const getAttendance = async (filters: any, schoolId: string) => {
  const { studentId, date, session, grade, section, startDate: filterStartDate, endDate: filterEndDate } = filters;
  const where: any = { schoolId };

  if (studentId) where.studentId = studentId;
  if (date) {
    const dateStr = typeof date === 'string' ? date.split("T")[0] : date;
    const startDate = new Date(`${dateStr}T00:00:00.000Z`);
    const endDate = new Date(`${dateStr}T23:59:59.999Z`);
    
    where.date = {
      gte: startDate,
      lte: endDate,
    };
  } else if (filterStartDate || filterEndDate) {
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
      where.session = null;   // daily mode: fetch records with no session
    } else {
      where.session = { equals: session.trim().toLowerCase(), mode: 'insensitive' }; // session mode: fetch only that session
    }
  }

  if (grade || section) {
    where.student = { schoolId };
    if (grade) where.student.gradeId = grade;
    if (section) where.student.sectionId = section;
  }

  return await prisma.attendance.findMany({
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

export const getAttendanceByStudent = async (studentId: string, schoolId: string, filters: any = {}) => {
  const { session } = filters;
  const where: any = { studentId, schoolId };

  if (session !== undefined && session !== null) {
    if (session === 'none') {
      where.session = null;
    } else {
      where.session = { equals: session.trim().toLowerCase(), mode: 'insensitive' };
    }
  }

  return await prisma.attendance.findMany({
    where,
    orderBy: { date: 'desc' },
  });
};
