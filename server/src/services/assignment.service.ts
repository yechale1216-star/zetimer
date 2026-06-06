import prisma from '../config/db';

export const getAssignments = async (schoolId: string, teacherId?: string) => {
  if (!schoolId) throw new Error('School ID is required');
  const where: any = { schoolId };
  if (teacherId) {
    let resolvedTeacherId = teacherId;
    const user = await prisma.user.findFirst({ 
      where: { id: teacherId, schoolId } 
    });
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

export const createAssignment = async (data: any, schoolId: string) => {
  if (!schoolId) throw new Error('School ID is required');
  let teacherId = data.teacher_id;

  // Resolve User.id -> Teacher.id if a User ID was passed
  const user = await prisma.user.findFirst({ 
    where: { id: teacherId, schoolId } 
  });
  
  if (user) {
    if (user.teacher_id) {
      teacherId = user.teacher_id;
    } else if (user.role === 'teacher') {
      // Lazy-create missing Teacher record for this user
      const newTeacher = await prisma.teacher.create({
        data: {
          name: user.full_name,
          email: user.email,
          schoolId: schoolId,
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

  // Check for duplicate class assignment for this teacher in this school
  const existing = await prisma.teacherAssignment.findFirst({
    where: {
      schoolId,
      teacher_id: teacherId,
      gradeId: data.gradeId,
      sectionId: data.sectionId,
      streamId: data.streamId || null,
      subject: data.subject || null,
    }
  });

  if (existing) {
    throw new Error("This class assignment already exists for this teacher.");
  }

  return await prisma.teacherAssignment.create({
    data: {
      teacher_id: teacherId,
      schoolId: schoolId,
      gradeId: data.gradeId,
      sectionId: data.sectionId,
      subject: data.subject || null,
      streamId: data.streamId || null,
    },
    include: { teacher: true, grade: true, section: true, stream: true },
  });
};

export const deleteAssignment = async (id: string, schoolId: string) => {
  return await prisma.teacherAssignment.delete({ 
    where: { id, schoolId } 
  });
};
