import prisma from '../config/db';
import bcrypt from 'bcryptjs';

/**
 * Login Parent and establish session.
 * Syncs ParentStudent relation records.
 */
export const loginParent = async (phone: string, password: string) => {
  const cleanPhone = phone.replace(/\s+/g, '');

  const user = await prisma.user.findFirst({
    where: { phone: cleanPhone, role: 'parent' },
    include: { school: true }
  });

  if (!user) {
    throw new Error("Invalid phone number or password.");
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    throw new Error("Invalid phone number or password.");
  }

  // Retrieve students via ParentStudentLink (primary source), scoped to parent's primary school if available
  const links = await prisma.parentStudentLink.findMany({
    where: { 
      parentId: user.id,
      ...(user.schoolId && { schoolId: user.schoolId })
    },
    include: {
      student: {
        include: { grade: true, section: true, stream: true }
      }
    }
  });

  let students: any[] = links.map(l => l.student);

  // Fallback: find students via parent_phone on Student model (legacy data)
  if (students.length === 0) {
    const legacyStudents = await prisma.student.findMany({
      where: { 
        parent_phone: cleanPhone,
        ...(user.schoolId && { schoolId: user.schoolId })
      },
      include: { grade: true, section: true, stream: true }
    });
    students = legacyStudents;

    // Sync legacy students into ParentStudentLink
    for (const student of legacyStudents) {
      await prisma.parentStudentLink.upsert({
        where: { parentId_studentId: { parentId: user.id, studentId: student.id } },
        update: { schoolId: student.schoolId },
        create: { parentId: user.id, studentId: student.id, schoolId: student.schoolId }
      });
    }
  }

  if (students.length === 0) {
    throw new Error("No children profiles found associated with this account.");
  }

  const mappedStudents = students.map((s: any) => ({
    ...s,
    name: s.fullName,
    grade: s.grade?.name || '',
    section: s.section?.name || '',
    stream: s.stream?.name || null,
  }));

  return {
    success: true,
    id: user.id,
    parentName: user.full_name || students[0]?.parent_name || "Parent",
    parentPhone: cleanPhone,
    schoolId: user.schoolId || students[0]?.schoolId,
    students: mappedStudents
  };
};

/**
 * Get Parent Portal notifications.
 */
export const getNotifications = async (phone: string, schoolId: string) => {
  const cleanPhone = phone.replace(/\s+/g, '');

  const user = await prisma.user.findFirst({ 
    where: { phone: cleanPhone, role: 'parent', schoolId } 
  });
  
  if (!user) return [];

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: user.id, schoolId },
    select: { studentId: true }
  });
  const studentIds = links.map(l => l.studentId);

  const notifications = await prisma.parentNotification.findMany({
    where: {
      schoolId,
      OR: [
        { studentId: { in: studentIds } },
        { studentId: null }
      ]
    },
    orderBy: { createdAt: 'desc' },
    include: {
      student: {
        select: { id: true, fullName: true }
      }
    }
  });

  return notifications;
};

export const markNotificationAsRead = async (id: string, schoolId: string) => {
  return await prisma.parentNotification.update({
    where: { id, schoolId },
    data: { isRead: true }
  });
};

export const markAllNotificationsAsRead = async (phone: string, schoolId: string) => {
  const cleanPhone = phone.replace(/\s+/g, '');
  const user = await prisma.user.findFirst({ 
    where: { phone: cleanPhone, role: 'parent', schoolId } 
  });
  if (!user) return;

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: user.id, schoolId },
    select: { studentId: true }
  });
  const studentIds = links.map(l => l.studentId);

  return await prisma.parentNotification.updateMany({
    where: {
      schoolId,
      OR: [
        { studentId: { in: studentIds } },
        { studentId: null }
      ],
      isRead: false
    },
    data: { isRead: true }
  });
};

export const getPreferences = async (phone: string, schoolId: string) => {
  const cleanPhone = phone.replace(/\s+/g, '');
  return await prisma.parentPreferences.upsert({
    where: { parentPhone_schoolId: { parentPhone: cleanPhone, schoolId } },
    update: {},
    create: {
      parentPhone: cleanPhone,
      schoolId,
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true
    }
  });
};

export const updatePreferences = async (phone: string, schoolId: string, data: any) => {
  const cleanPhone = phone.replace(/\s+/g, '');
  return await prisma.parentPreferences.upsert({
    where: { parentPhone_schoolId: { parentPhone: cleanPhone, schoolId } },
    update: {
      emailNotifications: data.emailNotifications ?? true,
      smsNotifications: data.smsNotifications ?? false,
      pushNotifications: data.pushNotifications ?? true
    },
    create: {
      parentPhone: cleanPhone,
      schoolId,
      emailNotifications: data.emailNotifications ?? true,
      smsNotifications: data.smsNotifications ?? false,
      pushNotifications: data.pushNotifications ?? true
    }
  });
};

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

export const updatePassword = async (phone: string, currentPassword: string, newPassword: string, schoolId: string) => {
  const cleanPhone = phone.replace(/\s+/g, '');
  const user = await prisma.user.findFirst({
    where: { phone: cleanPhone, role: 'parent', schoolId }
  });

  if (!user) throw new Error("User not found.");
  const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValidPassword) throw new Error("Incorrect current password.");

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password_hash: hashedPassword }
  });

  return { success: true, message: "Password updated successfully." };
};

export const searchParentByPhone = async (phone: string, schoolId: string) => {
  const cleanPhone = phone.replace(/\s+/g, '');
  const user = await prisma.user.findFirst({
    where: { phone: cleanPhone, role: 'parent', schoolId },
    select: { id: true, full_name: true, email: true, phone: true, address: true }
  });

  if (!user) {
    return { success: false, message: "No parent found with this phone number." };
  }
  return { success: true, data: user };
};
