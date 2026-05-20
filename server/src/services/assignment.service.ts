import prisma from '../config/db';

export const getAssignments = async (schoolId: string, teacherId?: string) => {
  const where: any = { school_id: schoolId };
  if (teacherId) {
    let resolvedTeacherId = teacherId;
    const user = await prisma.user.findUnique({ where: { id: teacherId } });
    if (user && user.teacher_id) {
      resolvedTeacherId = user.teacher_id;
    }
    where.teacher_id = resolvedTeacherId;
  }
  return await prisma.teacherAssignment.findMany({
    where,
    include: { teacher: true },
  });
};

export const createAssignment = async (data: any) => {
  let teacherId = data.teacher_id;

  // Resolve User.id -> Teacher.id if a User ID was passed
  const user = await prisma.user.findUnique({ where: { id: teacherId } });
  if (user) {
    if (user.teacher_id) {
      teacherId = user.teacher_id;
    } else if (user.role === 'teacher' && user.school_id) {
      // Lazy-create missing Teacher record for this user
      const newTeacher = await prisma.teacher.create({
        data: {
          name: user.full_name,
          email: user.email,
          schoolId: user.school_id,
          user_id: user.id,
          phone: user.phone || null,
          profile_photo: user.profile_photo || null,
        }
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { teacher_id: newTeacher.id }
      });
      teacherId = newTeacher.id;
    }
  }

  // Check for duplicate class assignment for this teacher
  const existing = await prisma.teacherAssignment.findFirst({
    where: {
      school_id: data.school_id,
      teacher_id: teacherId,
      grade: data.grade,
      section: data.section,
      stream: data.stream || null,
      subject: data.subject || null,
    }
  });

  if (existing) {
    throw new Error("This class assignment already exists for this teacher.");
  }

  return await prisma.teacherAssignment.create({
    data: {
      teacher_id: teacherId,
      school_id: data.school_id,
      grade: data.grade,
      section: data.section,
      subject: data.subject || null,
      stream: data.stream || null,
    },
    include: { teacher: true },
  });
};

export const deleteAssignment = async (id: string) => {
  return await prisma.teacherAssignment.delete({ where: { id } });
};
