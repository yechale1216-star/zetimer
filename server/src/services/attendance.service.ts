import prisma from '../config/db';

export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export const markAttendance = async (data: any, schoolId: string) => {
  const { studentId, date, status, remarks, teacherId, userRole, userId } = data;
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

  // Fetch school settings for location restriction & edit permission checks
  const settings = await prisma.schoolSettings.findUnique({ where: { schoolId } });

  // 1. Geofence & Location Restriction Verification
  let locVerified = data.locationVerified ?? false;
  let locDistance: number | null = data.locationDistance != null ? Number(data.locationDistance) : null;

  if (settings?.restrict_location && !settings?.allow_outside_attendance) {
    if (settings.school_latitude != null && settings.school_longitude != null) {
      if (data.latitude == null || data.longitude == null) {
        throw new Error("Location verification failed: Device GPS location is required to submit attendance.");
      }
      const dist = calculateDistanceMeters(
        Number(data.latitude),
        Number(data.longitude),
        settings.school_latitude,
        settings.school_longitude
      );
      const allowedRadius = settings.allowed_radius_meters || 200;
      if (dist > allowedRadius) {
        throw new Error(`Attendance submission blocked: You are ${dist}m away from school location (Allowed radius: ${allowedRadius}m).`);
      }
      locVerified = true;
      locDistance = dist;
    }
  } else if (data.latitude != null && data.longitude != null && settings?.school_latitude != null && settings?.school_longitude != null) {
    locDistance = calculateDistanceMeters(
      Number(data.latitude),
      Number(data.longitude),
      settings.school_latitude,
      settings.school_longitude
    );
    locVerified = locDistance <= (settings.allowed_radius_meters || 200);
  }

  // Parse the day range in UTC
  const dateStr = typeof date === 'string' ? date.split("T")[0] : new Date(date).toISOString().split("T")[0];
  const startDate = new Date(`${dateStr}T00:00:00.000Z`);
  const endDate = new Date(`${dateStr}T23:59:59.999Z`);

  // Find if a record already exists for this student on this day and session.
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

  // 2. Attendance Edit Permission Verification
  if (existing && userRole === 'teacher') {
    if (settings && settings.allow_attendance_editing === false) {
      // Find active approved request
      const approvedRequest = await prisma.attendanceEditRequest.findFirst({
        where: {
          schoolId,
          teacherId: teacherId || userId,
          status: 'APPROVED',
          isUsed: false,
          date: {
            gte: startDate,
            lte: endDate,
          },
        }
      });

      if (!approvedRequest) {
        throw new Error("Attendance editing is disabled by School Admin. Please submit an edit request.");
      }

      // Consume the approved permission
      await prisma.attendanceEditRequest.update({
        where: { id: approvedRequest.id },
        data: { isUsed: true }
      });

      await prisma.auditLog.create({
        data: {
          schoolId,
          user_id: userId || teacherId || null,
          action: 'ATTENDANCE_EDIT_PERMITTED',
          entity_type: 'ATTENDANCE_EDIT_REQUEST',
          entity_id: approvedRequest.id,
          old_values: { status: existing.status, remarks: existing.remarks },
          new_values: { newStatus: status, remarks }
        }
      }).catch(err => console.error('[AuditLog] edit permission use log error:', err));
    }
  }

  const result = existing
    ? await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status,
          remarks,
          teacherId,
          session: session || null,
          latitude: data.latitude != null ? Number(data.latitude) : existing.latitude,
          longitude: data.longitude != null ? Number(data.longitude) : existing.longitude,
          locationVerified: locVerified,
          locationDistance: locDistance,
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
          latitude: data.latitude != null ? Number(data.latitude) : null,
          longitude: data.longitude != null ? Number(data.longitude) : null,
          locationVerified: locVerified,
          locationDistance: locDistance,
        }
      });

  // Audit log attendance operation
  await prisma.auditLog.create({
    data: {
      schoolId,
      user_id: userId || teacherId || null,
      action: existing ? 'ATTENDANCE_UPDATED' : 'ATTENDANCE_MARKED',
      entity_type: 'ATTENDANCE',
      entity_id: result.id,
      old_values: existing ? { status: existing.status, remarks: existing.remarks } : undefined,
      new_values: {
        studentId,
        status,
        session: session || null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        locationVerified: locVerified,
        locationDistance: locDistance
      }
    }
  }).catch(err => console.error('[AuditLog] Attendance error:', err));

  // Intercept and create parent notification if status is Absent or Late
  if (status && (status.toLowerCase() === 'absent' || status.toLowerCase() === 'late')) {
    try {
      const type = status.toLowerCase() === 'absent' ? 'absent' : 'late';
      const typePush = status.toLowerCase() === 'absent' ? 'absent_arrival' : 'late_arrival';
      
      const isFemale = (student as any).gender?.toLowerCase() === 'female';
      const isAbsent = status.toLowerCase() === 'absent';
      
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

      const { sendCategoryNotification } = require('./notification.service');
      const parentLinks = await prisma.parentStudentLink.findMany({
        where: { studentId: student.id },
        include: { parent: true }
      });

      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true }
      });
      const schoolName = school?.name || 'ZeTime School';
      const categoryLabel = isAbsent ? 'Absent Alert' : 'Late Arrival';

      for (const link of parentLinks) {
        if (link.parent && link.parent.pushToken) {
          if (link.parent.phone) {
            const prefs = await prisma.parentPreferences.findUnique({
              where: { parentPhone_schoolId: { parentPhone: link.parent.phone, schoolId } }
            });
            if (prefs && !prefs.pushNotifications) {
              continue;
            }
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
          }).catch((err: any) => {
            console.error(`Failed to dispatch push to parent ${link.parentId}:`, err);
          });
        }
      }
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

  if (session !== undefined && session !== null) {
    if (session === 'none') {
      where.session = null;
    } else {
      where.session = { equals: session.trim().toLowerCase(), mode: 'insensitive' };
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

// ─── ATTENDANCE EDIT REQUESTS & AUDIT LOGS ──────────────────────────────────

export const createEditRequest = async (schoolId: string, teacherId: string, data: any) => {
  const { studentId, gradeId, sectionId, date, session, reason } = data;

  if (!date) {
    throw new Error("Date is required for edit request");
  }

  const dateStr = typeof date === 'string' ? date.split("T")[0] : new Date(date).toISOString().split("T")[0];
  const parsedDate = new Date(`${dateStr}T00:00:00.000Z`);

  // Ensure teacher record exists or resolve teacherId
  let resolvedTeacherId = teacherId;
  const teacherRecord = await prisma.teacher.findFirst({
    where: { schoolId, OR: [{ id: teacherId }, { user_id: teacherId }] }
  });
  if (teacherRecord) {
    resolvedTeacherId = teacherRecord.id;
  }

  const editRequest = await prisma.attendanceEditRequest.create({
    data: {
      schoolId,
      teacherId: resolvedTeacherId,
      studentId: studentId || null,
      gradeId: gradeId || null,
      sectionId: sectionId || null,
      date: parsedDate,
      session: session ? session.toLowerCase() : null,
      reason: reason || null,
      status: 'PENDING',
    },
    include: {
      teacher: true,
      student: true
    }
  });

  await prisma.auditLog.create({
    data: {
      schoolId,
      user_id: teacherId,
      action: 'ATTENDANCE_EDIT_REQUEST_SUBMITTED',
      entity_type: 'ATTENDANCE_EDIT_REQUEST',
      entity_id: editRequest.id,
      new_values: { date: dateStr, session, reason }
    }
  }).catch(err => console.error('[AuditLog] Edit request submit error:', err));

  return editRequest;
};

export const getEditRequests = async (schoolId: string, filters: any = {}) => {
  const { teacherId, status } = filters;
  const where: any = { schoolId };

  if (teacherId) {
    where.OR = [
      { teacherId },
      { teacher: { user_id: teacherId } }
    ];
  }

  if (status) {
    where.status = status;
  }

  return await prisma.attendanceEditRequest.findMany({
    where,
    include: {
      teacher: true,
      student: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

export const approveEditRequest = async (requestId: string, adminUserId: string, schoolId: string, adminNote?: string) => {
  const request = await prisma.attendanceEditRequest.findFirst({
    where: { id: requestId, schoolId }
  });

  if (!request) {
    throw new Error("Edit request not found");
  }

  const updated = await prisma.attendanceEditRequest.update({
    where: { id: requestId },
    data: {
      status: 'APPROVED',
      processedBy: adminUserId,
      processedAt: new Date(),
      adminNote: adminNote || null,
    },
    include: {
      teacher: true,
      student: true
    }
  });

  await prisma.auditLog.create({
    data: {
      schoolId,
      user_id: adminUserId,
      action: 'ATTENDANCE_EDIT_REQUEST_APPROVED',
      entity_type: 'ATTENDANCE_EDIT_REQUEST',
      entity_id: requestId,
      old_values: { status: request.status },
      new_values: { status: 'APPROVED', adminNote }
    }
  }).catch(err => console.error('[AuditLog] Approve error:', err));

  return updated;
};

export const rejectEditRequest = async (requestId: string, adminUserId: string, schoolId: string, adminNote?: string) => {
  const request = await prisma.attendanceEditRequest.findFirst({
    where: { id: requestId, schoolId }
  });

  if (!request) {
    throw new Error("Edit request not found");
  }

  const updated = await prisma.attendanceEditRequest.update({
    where: { id: requestId },
    data: {
      status: 'REJECTED',
      processedBy: adminUserId,
      processedAt: new Date(),
      adminNote: adminNote || null,
    },
    include: {
      teacher: true,
      student: true
    }
  });

  await prisma.auditLog.create({
    data: {
      schoolId,
      user_id: adminUserId,
      action: 'ATTENDANCE_EDIT_REQUEST_REJECTED',
      entity_type: 'ATTENDANCE_EDIT_REQUEST',
      entity_id: requestId,
      old_values: { status: request.status },
      new_values: { status: 'REJECTED', adminNote }
    }
  }).catch(err => console.error('[AuditLog] Reject error:', err));

  return updated;
};

export const getAttendanceAuditLogs = async (schoolId: string) => {
  return await prisma.auditLog.findMany({
    where: {
      schoolId,
      entity_type: {
        in: ['ATTENDANCE', 'ATTENDANCE_EDIT_REQUEST']
      }
    },
    orderBy: { created_at: 'desc' },
    take: 100
  });
};
