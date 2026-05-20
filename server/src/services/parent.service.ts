import prisma from '../config/db';
import bcrypt from 'bcryptjs';

/**
 * Login Parent and establish session.
 * Syncs ParentStudent relation records.
 */
export const loginParent = async (phone: string, password: string) => {
  const cleanPhone = phone.replace(/\s+/g, '');

  const user = await prisma.user.findFirst({
    where: { phone: cleanPhone, role: 'parent' }
  });

  if (!user) {
    throw new Error("Invalid phone number or password.");
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    throw new Error("Invalid phone number or password.");
  }

  // 1. Retrieve students via ParentStudentLink (primary source)
  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: user.id },
    include: {
      student: {
        include: { grade: true, section: true, stream: true }
      }
    }
  });

  let students: any[] = links.map(l => l.student);

  // 2. Fallback: find students via parent_phone on Student model (legacy data)
  if (students.length === 0) {
    const legacyStudents = await prisma.student.findMany({
      where: { parent_phone: cleanPhone },
      include: { grade: true, section: true, stream: true }
    });
    students = legacyStudents;

    // Sync legacy students into ParentStudentLink for future logins
    for (const student of legacyStudents) {
      await prisma.parentStudentLink.upsert({
        where: { parentId_studentId: { parentId: user.id, studentId: student.id } },
        update: {},
        create: { parentId: user.id, studentId: student.id }
      });
    }
  }

  if (students.length === 0) {
    throw new Error("No children profiles found associated with this account.");
  }

  // 3. Ensure ParentPreferences record exists
  await prisma.parentPreferences.upsert({
    where: { parentPhone: cleanPhone },
    update: {},
    create: {
      parentPhone: cleanPhone,
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true
    }
  });

  // Flat map to frontend Student interface
  const mappedStudents = students.map((s: any) => ({
    ...s,
    name: s.fullName,
    grade: s.grade?.name || '',
    section: s.section?.name || '',
    stream: s.stream?.name || null,
  }));

  return {
    success: true,
    parentName: user.full_name || students[0]?.parent_name || "Parent",
    parentPhone: cleanPhone,
    students: mappedStudents
  };
};

/**
 * Get Parent Portal notifications.
 * Includes student-specific alerts AND general announcements/emergencies.
 */
export const getNotifications = async (phone: string) => {
  const cleanPhone = phone.replace(/\s+/g, '');

  // 1. Get linked student IDs
  const user = await prisma.user.findFirst({ where: { phone: cleanPhone, role: 'parent' } });
  
  let studentIds: string[] = [];
  if (user) {
    const links = await prisma.parentStudentLink.findMany({
      where: { parentId: user.id },
      select: { studentId: true }
    });
    studentIds = links.map(l => l.studentId);
  }

  if (studentIds.length === 0) {
    // Fallback: lookup students directly
    const directStudents = await prisma.student.findMany({
      where: { parent_phone: cleanPhone },
      select: { id: true, schoolId: true }
    });
    studentIds.push(...directStudents.map(s => s.id));
  }

  // Get schoolId from first student
  const student = await prisma.student.findFirst({
    where: { parent_phone: cleanPhone },
    select: { schoolId: true }
  });

  const schoolId = student?.schoolId || "";

  // 2. Fetch notifications: student-specific OR general school notifications
  const notifications = await prisma.parentNotification.findMany({
    where: {
      OR: [
        { studentId: { in: studentIds } },
        {
          AND: [
            { schoolId: schoolId },
            { studentId: null }
          ]
        }
      ]
    },
    orderBy: { createdAt: 'desc' },
    include: {
      student: {
        select: {
          id: true,
          fullName: true
        }
      }
    }
  });

  return notifications;
};

/**
 * Mark notification as read.
 */
export const markNotificationAsRead = async (id: string) => {
  return await prisma.parentNotification.update({
    where: { id },
    data: { isRead: true }
  });
};

/**
 * Mark all parent notifications as read.
 */
export const markAllNotificationsAsRead = async (phone: string) => {
  const cleanPhone = phone.replace(/\s+/g, '');

  // 1. Get linked student IDs
  const user = await prisma.user.findFirst({ where: { phone: cleanPhone, role: 'parent' } });
  
  let studentIds: string[] = [];
  if (user) {
    const links = await prisma.parentStudentLink.findMany({
      where: { parentId: user.id },
      select: { studentId: true }
    });
    studentIds = links.map(l => l.studentId);
  }

  const student = await prisma.student.findFirst({
    where: { parent_phone: cleanPhone },
    select: { schoolId: true }
  });

  const schoolId = student?.schoolId || "";

  // 2. Update status to isRead: true
  return await prisma.parentNotification.updateMany({
    where: {
      OR: [
        { studentId: { in: studentIds } },
        {
          AND: [
            { schoolId: schoolId },
            { studentId: null }
          ]
        }
      ],
      isRead: false
    },
    data: { isRead: true }
  });
};

/**
 * Get Parent Settings/Preferences.
 */
export const getPreferences = async (phone: string) => {
  const cleanPhone = phone.replace(/\s+/g, '');
  let prefs = await prisma.parentPreferences.findUnique({
    where: { parentPhone: cleanPhone }
  });

  if (!prefs) {
    prefs = await prisma.parentPreferences.create({
      data: {
        parentPhone: cleanPhone,
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true
      }
    });
  }

  return prefs;
};

/**
 * Update Parent Settings/Preferences.
 */
export const updatePreferences = async (phone: string, data: any) => {
  const cleanPhone = phone.replace(/\s+/g, '');
  return await prisma.parentPreferences.upsert({
    where: { parentPhone: cleanPhone },
    update: {
      emailNotifications: data.emailNotifications ?? true,
      smsNotifications: data.smsNotifications ?? false,
      pushNotifications: data.pushNotifications ?? true
    },
    create: {
      parentPhone: cleanPhone,
      emailNotifications: data.emailNotifications ?? true,
      smsNotifications: data.smsNotifications ?? false,
      pushNotifications: data.pushNotifications ?? true
    }
  });
};

/**
 * Post an Announcement (General or specific)
 */
export const postAnnouncement = async (schoolId: string, data: any) => {
  return await prisma.parentNotification.create({
    data: {
      schoolId,
      studentId: data.studentId || null,
      type: data.type || "announcement",
      title: data.title,
      message: data.message,
      isRead: false
    }
  });
};

/**
 * Update Parent Password
 */
export const updatePassword = async (phone: string, currentPassword: string, newPassword: string) => {
  const cleanPhone = phone.replace(/\s+/g, '');

  const user = await prisma.user.findFirst({
    where: { phone: cleanPhone, role: 'parent' }
  });

  if (!user) {
    throw new Error("User not found.");
  }

  const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValidPassword) {
    throw new Error("Incorrect current password.");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  await prisma.user.update({
    where: { id: user.id },
    data: { password_hash: hashedPassword }
  });

  return { success: true, message: "Password updated successfully." };
};

/**
 * Search parent by phone
 */
export const searchParentByPhone = async (phone: string) => {
  const cleanPhone = phone.replace(/\s+/g, '');
  const user = await prisma.user.findFirst({
    where: { phone: cleanPhone, role: 'parent' },
    select: {
      id: true,
      full_name: true,
      email: true,
      phone: true
    }
  });

  if (!user) {
    return { success: false, message: "No parent found with this phone number." };
  }

  return { success: true, data: user };
};
