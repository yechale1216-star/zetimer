import prisma from '../config/db';

export const DEFAULT_DISCIPLINE_CATEGORIES = [
  'Late Arrival',
  'Unexcused Absence',
  'Uniform Violation',
  'Classroom Misbehavior',
  'Disrespect',
  'Bullying',
  'Fighting',
  'Cheating',
  'Phone Misuse',
  'Property Damage',
  'Theft',
  'Smoking',
  'Violence',
  'Other'
];

/**
 * Creates an audit log entry for discipline actions.
 */
async function logDisciplineAudit(params: {
  schoolId: string;
  userId?: string;
  action: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        schoolId: params.schoolId,
        user_id: params.userId || null,
        action: params.action,
        entity_type: 'DISCIPLINE',
        entity_id: params.entityId,
        old_values: params.oldValues || undefined,
        new_values: params.newValues || undefined
      }
    });
  } catch (err) {
    console.error('[DisciplineService] AuditLog error:', err);
  }
}

/**
 * Sends notifications to parents for a student discipline record.
 */
async function notifyParentForDiscipline(params: {
  schoolId: string;
  studentId: string;
  title: string;
  message: string;
  type?: string;
}) {
  try {
    // 1. Create ParentNotification record
    await prisma.parentNotification.create({
      data: {
        schoolId: params.schoolId,
        studentId: params.studentId,
        title: params.title,
        message: params.message,
        type: params.type || 'DISCIPLINE'
      }
    });

    // 2. Find linked parents via ParentStudentLink
    const links = await prisma.parentStudentLink.findMany({
      where: { schoolId: params.schoolId, studentId: params.studentId },
      include: { parent: true }
    });

    for (const link of links) {
      if (link.parent) {
        await prisma.userNotification.create({
          data: {
            schoolId: params.schoolId,
            userId: link.parent.id,
            title: params.title,
            message: params.message,
            type: params.type || 'DISCIPLINE'
          }
        });
      }
    }
  } catch (err) {
    console.error('[DisciplineService] Parent Notification error:', err);
  }
}

/**
 * Helper to fetch teacher homeroom assignments for permission checks.
 */
async function getTeacherAssignments(userId: string, schoolId: string) {
  const teacher = await prisma.teacher.findFirst({
    where: { user_id: userId, schoolId }
  });
  if (!teacher) return [];
  return await prisma.teacherAssignment.findMany({
    where: { teacher_id: teacher.id, schoolId }
  });
}

export class DisciplineService {
  /**
   * Seed default categories for a school if none exist.
   */
  static async ensureDefaultCategories(schoolId: string) {
    const existing = await prisma.disciplineCategory.findMany({
      where: { schoolId }
    });
    if (existing.length === 0) {
      const data = DEFAULT_DISCIPLINE_CATEGORIES.map(name => ({
        schoolId,
        name,
        isDefault: true
      }));
      await prisma.disciplineCategory.createMany({
        data,
        skipDuplicates: true
      });
    }
    return prisma.disciplineCategory.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Get all categories for a school.
   */
  static async getCategories(schoolId: string) {
    return this.ensureDefaultCategories(schoolId);
  }

  /**
   * Create a custom category for a school.
   */
  static async createCategory(schoolId: string, name: string, description?: string) {
    return prisma.disciplineCategory.create({
      data: {
        schoolId,
        name,
        description,
        isDefault: false
      }
    });
  }

  /**
   * Delete a custom category.
   */
  static async deleteCategory(schoolId: string, categoryId: string) {
    return prisma.disciplineCategory.deleteMany({
      where: { id: categoryId, schoolId, isDefault: false }
    });
  }

  /**
   * Create a new student discipline incident.
   */
  static async createIncident(
    user: { id: string; role: string; schoolId: string; email: string },
    data: {
      studentId: string;
      date?: string | Date;
      time?: string;
      categoryId?: string;
      categoryName: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      title: string;
      description: string;
      location?: string;
      witnesses?: string[];
      evidence?: any[];
      immediateAction?: string;
      parentNotified?: boolean;
      followUpDate?: string | Date;
    }
  ) {
    const schoolId = user.schoolId;

    // Fetch student info to verify tenant & retrieve grade, section, stream
    const student = await prisma.student.findFirst({
      where: { id: data.studentId, schoolId },
      include: { grade: true, section: true, stream: true }
    });

    if (!student) {
      throw new Error('Student not found in this school');
    }

    // If Homeroom Teacher, verify teacher is assigned to student's section/grade
    if (user.role === 'teacher') {
      const assignments = await getTeacherAssignments(user.id, schoolId);
      const isAssigned = assignments.some(
        a => a.gradeId === student.gradeId && a.sectionId === student.sectionId
      );
      if (!isAssigned) {
        throw new Error('Forbidden: You can only report discipline incidents for your assigned homeroom students');
      }
    }

    // Reporter name
    const reporterUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { full_name: true }
    });
    const reportedByName = reporterUser?.full_name || user.email;

    const incident = await prisma.studentDiscipline.create({
      data: {
        schoolId,
        studentId: student.id,
        gradeId: student.gradeId,
        sectionId: student.sectionId,
        streamId: student.streamId,
        date: data.date ? new Date(data.date) : new Date(),
        time: data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        categoryId: data.categoryId || null,
        categoryName: data.categoryName,
        severity: data.severity,
        title: data.title,
        description: data.description,
        location: data.location || null,
        reportedById: user.id,
        reportedByName,
        witnesses: data.witnesses ? (data.witnesses as any) : undefined,
        evidence: data.evidence ? (data.evidence as any) : undefined,
        immediateAction: data.immediateAction || null,
        parentNotified: Boolean(data.parentNotified),
        parentNotifiedAt: data.parentNotified ? new Date() : null,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
        status: 'OPEN'
      },
      include: {
        student: true,
        grade: true,
        section: true,
        stream: true
      }
    });

    // Create Initial FollowUp entry
    await prisma.disciplineFollowUp.create({
      data: {
        disciplineId: incident.id,
        authorId: user.id,
        authorName: reportedByName,
        note: `Incident created with status OPEN and severity ${data.severity}.`,
        actionTaken: data.immediateAction || 'Incident reported',
        statusBefore: null,
        statusAfter: 'OPEN'
      }
    });

    // Log Audit Log
    await logDisciplineAudit({
      schoolId,
      userId: user.id,
      action: 'DISCIPLINE_CREATED',
      entityId: incident.id,
      newValues: {
        student: student.fullName,
        title: data.title,
        severity: data.severity,
        category: data.categoryName
      }
    });

    // Parent Notification if enabled
    if (data.parentNotified) {
      const notifTitle = `Discipline Report: ${student.fullName}`;
      const notifMsg = `Your child, ${student.fullName}, received a ${data.severity} severity report for "${data.categoryName}" on ${new Date(incident.date).toLocaleDateString()}. Tap to view details.`;
      await notifyParentForDiscipline({
        schoolId,
        studentId: student.id,
        title: notifTitle,
        message: notifMsg
      });
      await logDisciplineAudit({
        schoolId,
        userId: user.id,
        action: 'DISCIPLINE_NOTIFICATION_SENT',
        entityId: incident.id
      });
    }

    return incident;
  }

  /**
   * Get incidents with multi-role access control, searching, filtering, and pagination.
   */
  static async getIncidents(
    user: { id: string; role: string; schoolId: string },
    query: {
      page?: number;
      limit?: number;
      search?: string;
      studentId?: string;
      gradeId?: string;
      sectionId?: string;
      streamId?: string;
      categoryId?: string;
      categoryName?: string;
      severity?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      reporterId?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ) {
    const schoolId = user.schoolId;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = { schoolId };

    // Role-specific scoping
    if (user.role === 'teacher') {
      const assignments = await getTeacherAssignments(user.id, schoolId);
      if (assignments.length === 0) {
        return { items: [], total: 0, page, limit, totalPages: 0 };
      }
      const OR = assignments.map(a => ({
        gradeId: a.gradeId,
        sectionId: a.sectionId,
        ...(a.streamId ? { streamId: a.streamId } : {})
      }));
      where.OR = OR;
    } else if (user.role === 'parent') {
      // Find linked students
      const links = await prisma.parentStudentLink.findMany({
        where: { parentId: user.id, schoolId },
        select: { studentId: true }
      });
      const studentIds = links.map(l => l.studentId);
      if (studentIds.length === 0) {
        return { items: [], total: 0, page, limit, totalPages: 0 };
      }
      where.studentId = { in: studentIds };
    }

    // Additional filters
    if (query.studentId) where.studentId = query.studentId;
    if (query.gradeId) where.gradeId = query.gradeId;
    if (query.sectionId) where.sectionId = query.sectionId;
    if (query.streamId) where.streamId = query.streamId;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.categoryName) where.categoryName = { equals: query.categoryName, mode: 'insensitive' };
    if (query.severity) where.severity = query.severity.toUpperCase();
    if (query.status) where.status = query.status.toUpperCase();
    if (query.reporterId) where.reportedById = query.reporterId;

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = new Date(query.startDate);
      if (query.endDate) where.date.lte = new Date(query.endDate);
    }

    if (query.search) {
      const s = query.search.trim();
      where.AND = [
        where.AND || {},
        {
          OR: [
            { title: { contains: s, mode: 'insensitive' } },
            { description: { contains: s, mode: 'insensitive' } },
            { categoryName: { contains: s, mode: 'insensitive' } },
            { reportedByName: { contains: s, mode: 'insensitive' } },
            { student: { fullName: { contains: s, mode: 'insensitive' } } },
            { student: { student_id: { contains: s, mode: 'insensitive' } } }
          ]
        }
      ];
    }

    const orderByField = query.sortBy || 'createdAt';
    const orderDirection = query.sortOrder || 'desc';

    const [items, total] = await Promise.all([
      prisma.studentDiscipline.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: orderDirection },
        include: {
          student: {
            select: {
              id: true,
              student_id: true,
              fullName: true,
              grade: { select: { name: true } },
              section: { select: { name: true } },
              stream: { select: { name: true } }
            }
          },
          grade: true,
          section: true,
          stream: true,
          followUps: {
            orderBy: { createdAt: 'desc' },
            take: 3
          }
        }
      }),
      prisma.studentDiscipline.count({ where })
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get single incident detail with security checks.
   */
  static async getIncidentById(
    user: { id: string; role: string; schoolId: string },
    incidentId: string
  ) {
    const incident = await prisma.studentDiscipline.findFirst({
      where: { id: incidentId, schoolId: user.schoolId },
      include: {
        student: true,
        grade: true,
        section: true,
        stream: true,
        reportedBy: { select: { id: true, full_name: true, email: true, role: true } },
        followUps: { orderBy: { createdAt: 'asc' } },
        category: true
      }
    });

    if (!incident) {
      throw new Error('Incident not found');
    }

    // Role security check
    if (user.role === 'teacher') {
      const assignments = await getTeacherAssignments(user.id, user.schoolId);
      const isAssigned = assignments.some(
        a => a.gradeId === incident.gradeId && a.sectionId === incident.sectionId
      );
      if (!isAssigned) {
        throw new Error('Forbidden: You do not have permission to view this homeroom student record');
      }
    } else if (user.role === 'parent') {
      const link = await prisma.parentStudentLink.findFirst({
        where: { parentId: user.id, studentId: incident.studentId, schoolId: user.schoolId }
      });
      if (!link) {
        throw new Error('Forbidden: You can only view records for your linked child');
      }

      // Log Parent Viewed Audit Log if first time viewed
      await logDisciplineAudit({
        schoolId: user.schoolId,
        userId: user.id,
        action: 'DISCIPLINE_PARENT_VIEWED',
        entityId: incident.id
      });
    }

    return incident;
  }

  /**
   * Update an existing discipline incident.
   */
  static async updateIncident(
    user: { id: string; role: string; schoolId: string; email: string },
    incidentId: string,
    data: {
      title?: string;
      description?: string;
      severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      status?: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED';
      categoryName?: string;
      categoryId?: string;
      location?: string;
      witnesses?: string[];
      evidence?: any[];
      immediateAction?: string;
      resolutionNotes?: string;
      followUpDate?: string | Date;
      notifyParent?: boolean;
    }
  ) {
    const existing = await this.getIncidentById(user, incidentId);

    // Reporter user info
    const reporterUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { full_name: true }
    });
    const authorName = reporterUser?.full_name || user.email;

    const oldSeverity = existing.severity;
    const oldStatus = existing.status;

    const updated = await prisma.studentDiscipline.update({
      where: { id: incidentId },
      data: {
        title: data.title ?? existing.title,
        description: data.description ?? existing.description,
        severity: data.severity ?? existing.severity,
        status: data.status ?? existing.status,
        categoryName: data.categoryName ?? existing.categoryName,
        categoryId: data.categoryId ?? existing.categoryId,
        location: data.location ?? existing.location,
        witnesses: data.witnesses !== undefined ? (data.witnesses as any) : (existing.witnesses as any),
        evidence: data.evidence !== undefined ? (data.evidence as any) : (existing.evidence as any),
        immediateAction: data.immediateAction ?? existing.immediateAction,
        resolutionNotes: data.resolutionNotes ?? existing.resolutionNotes,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : existing.followUpDate
      },
      include: {
        student: true,
        grade: true,
        section: true
      }
    });

    // Record follow-up entry if status/severity changed or notes added
    if (data.status !== oldStatus || data.severity !== oldSeverity || data.resolutionNotes) {
      await prisma.disciplineFollowUp.create({
        data: {
          disciplineId: updated.id,
          authorId: user.id,
          authorName,
          note: data.resolutionNotes || `Updated incident status to ${updated.status} and severity to ${updated.severity}.`,
          actionTaken: data.immediateAction || null,
          statusBefore: oldStatus,
          statusAfter: updated.status
        }
      });
    }

    // Log Audit Log
    await logDisciplineAudit({
      schoolId: user.schoolId,
      userId: user.id,
      action: updated.status === 'RESOLVED' ? 'DISCIPLINE_RESOLVED' : updated.status === 'CLOSED' ? 'DISCIPLINE_CLOSED' : 'DISCIPLINE_EDITED',
      entityId: updated.id,
      oldValues: { severity: oldSeverity, status: oldStatus },
      newValues: { severity: updated.severity, status: updated.status }
    });

    // Notify Parent if requested or status/severity changed
    if (data.notifyParent || oldSeverity !== updated.severity || oldStatus !== updated.status) {
      const studentName = (updated as any).student?.fullName || 'Student';
      const notifTitle = `Discipline Update: ${studentName}`;
      const notifMsg = `Incident "${updated.title}" for ${studentName} has been updated. Severity: ${updated.severity}, Status: ${updated.status}.`;
      await notifyParentForDiscipline({
        schoolId: user.schoolId,
        studentId: updated.studentId,
        title: notifTitle,
        message: notifMsg
      });
      await prisma.studentDiscipline.update({
        where: { id: incidentId },
        data: { parentNotified: true, parentNotifiedAt: new Date() }
      });
    }

    return updated;
  }

  /**
   * Delete discipline incident (School Admin only).
   */
  static async deleteIncident(user: { id: string; role: string; schoolId: string }, incidentId: string) {
    if (user.role !== 'school_admin' && user.role !== 'super_admin') {
      throw new Error('Forbidden: Only School Admin can delete discipline records');
    }

    const existing = await prisma.studentDiscipline.findFirst({
      where: { id: incidentId, schoolId: user.schoolId }
    });

    if (!existing) {
      throw new Error('Incident not found');
    }

    await prisma.studentDiscipline.delete({
      where: { id: incidentId }
    });

    await logDisciplineAudit({
      schoolId: user.schoolId,
      userId: user.id,
      action: 'DISCIPLINE_DELETED',
      entityId: incidentId,
      oldValues: { title: existing.title, studentId: existing.studentId }
    });

    return { success: true };
  }

  /**
   * Parent Acknowledgment of a discipline report.
   */
  static async acknowledgeIncident(
    user: { id: string; role: string; schoolId: string },
    incidentId: string,
    notes?: string
  ) {
    if (user.role !== 'parent') {
      throw new Error('Only parents can acknowledge discipline reports');
    }

    const incident = await this.getIncidentById(user, incidentId);

    const updated = await prisma.studentDiscipline.update({
      where: { id: incident.id },
      data: {
        parentAcknowledged: true,
        parentAcknowledgedAt: new Date(),
        parentAcknowledgementNotes: notes || null
      }
    });

    await logDisciplineAudit({
      schoolId: user.schoolId,
      userId: user.id,
      action: 'DISCIPLINE_PARENT_ACKNOWLEDGED',
      entityId: incident.id,
      newValues: { notes }
    });

    return updated;
  }

  /**
   * Add a follow-up note to an incident.
   */
  static async addFollowUp(
    user: { id: string; role: string; schoolId: string; email: string },
    incidentId: string,
    data: { note: string; actionTaken?: string; status?: string }
  ) {
    const incident = await this.getIncidentById(user, incidentId);

    const reporterUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { full_name: true }
    });
    const authorName = reporterUser?.full_name || user.email;

    const statusBefore = incident.status;
    let statusAfter = incident.status;

    if (data.status && data.status !== incident.status) {
      await prisma.studentDiscipline.update({
        where: { id: incidentId },
        data: { status: data.status }
      });
      statusAfter = data.status;
    }

    const followUp = await prisma.disciplineFollowUp.create({
      data: {
        disciplineId: incident.id,
        authorId: user.id,
        authorName,
        note: data.note,
        actionTaken: data.actionTaken || null,
        statusBefore,
        statusAfter
      }
    });

    await logDisciplineAudit({
      schoolId: user.schoolId,
      userId: user.id,
      action: 'DISCIPLINE_FOLLOWUP_ADDED',
      entityId: incident.id,
      newValues: { note: data.note, statusAfter }
    });

    return followUp;
  }

  /**
   * Analytics & dashboard metrics.
   */
  static async getAnalytics(user: { id: string; role: string; schoolId: string }) {
    const schoolId = user.schoolId;
    const where: any = { schoolId };

    if (user.role === 'teacher') {
      const assignments = await getTeacherAssignments(user.id, schoolId);
      if (assignments.length === 0) {
        return {
          total: 0, open: 0, resolved: 0, critical: 0, thisMonth: 0,
          byCategory: [], bySeverity: [], byGrade: [], repeatOffenders: [], topReporters: []
        };
      }
      where.OR = assignments.map(a => ({
        gradeId: a.gradeId,
        sectionId: a.sectionId
      }));
    }

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      total,
      open,
      underReview,
      resolved,
      closed,
      critical,
      thisMonthCount,
      allIncidents
    ] = await Promise.all([
      prisma.studentDiscipline.count({ where }),
      prisma.studentDiscipline.count({ where: { ...where, status: 'OPEN' } }),
      prisma.studentDiscipline.count({ where: { ...where, status: 'UNDER_REVIEW' } }),
      prisma.studentDiscipline.count({ where: { ...where, status: 'RESOLVED' } }),
      prisma.studentDiscipline.count({ where: { ...where, status: 'CLOSED' } }),
      prisma.studentDiscipline.count({ where: { ...where, severity: 'CRITICAL' } }),
      prisma.studentDiscipline.count({ where: { ...where, createdAt: { gte: firstDayOfMonth } } }),
      prisma.studentDiscipline.findMany({
        where,
        select: {
          id: true,
          severity: true,
          status: true,
          categoryName: true,
          createdAt: true,
          date: true,
          reportedByName: true,
          student: { select: { id: true, fullName: true, student_id: true } },
          grade: { select: { name: true } },
          section: { select: { name: true } }
        }
      })
    ]);

    // Aggregate metrics
    const categoryCounts: Record<string, number> = {};
    const severityCounts: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    const gradeCounts: Record<string, number> = {};
    const studentCounts: Record<string, { student: any; count: number }> = {};
    const reporterCounts: Record<string, number> = {};
    const monthlyMap: Record<string, number> = {};

    allIncidents.forEach(inc => {
      // Category
      categoryCounts[inc.categoryName] = (categoryCounts[inc.categoryName] || 0) + 1;

      // Severity
      severityCounts[inc.severity] = (severityCounts[inc.severity] || 0) + 1;

      // Grade
      const gradeName = inc.grade?.name || 'Unknown';
      gradeCounts[gradeName] = (gradeCounts[gradeName] || 0) + 1;

      // Repeat offenders
      const sKey = inc.student.id;
      if (!studentCounts[sKey]) {
        studentCounts[sKey] = { student: inc.student, count: 0 };
      }
      studentCounts[sKey].count += 1;

      // Reporter
      const rName = inc.reportedByName || 'Unknown';
      reporterCounts[rName] = (reporterCounts[rName] || 0) + 1;

      // Monthly
      const d = new Date(inc.date || inc.createdAt);
      const mKey = d.toLocaleString('default', { month: 'short' });
      monthlyMap[mKey] = (monthlyMap[mKey] || 0) + 1;
    });

    const byCategory = Object.entries(categoryCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const bySeverity = Object.entries(severityCounts).map(([name, value]) => ({ name, value }));

    const byGrade = Object.entries(gradeCounts).map(([name, value]) => ({ name, value }));

    const repeatOffenders = Object.values(studentCounts)
      .filter(s => s.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topReporters = Object.entries(reporterCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total,
      open,
      openCases: open + underReview,
      resolvedCases: resolved + closed,
      criticalCases: critical,
      thisMonth: thisMonthCount,
      byCategory,
      bySeverity,
      byGrade,
      repeatOffenders,
      topReporters,
      monthlyMap
    };
  }
}
