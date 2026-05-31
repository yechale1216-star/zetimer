import prisma from '../config/db';
import bcrypt from 'bcryptjs';

// Map database relational model to flat frontend model
const mapStudentToFlat = (student: any) => {
  if (!student) return null;
  return {
    ...student,
    name: student.fullName, // map back to 'name' for frontend
    grade: student.grade?.name || '',
    section: student.section?.name || '',
    stream: student.stream?.name || null,
  };
};

export const getAllStudents = async (schoolId: string) => {
  if (!schoolId) throw new Error('School ID is required');
  
  const students = await prisma.student.findMany({
    where: { schoolId: schoolId },
    include: {
      grade: true,
      section: true,
      stream: true
    }
  });
  return students.map(mapStudentToFlat);
};

export const createStudent = async (data: any, schoolId: string) => {
  if (!schoolId) throw new Error('School ID is required');

  // Create or connect relations with schoolId scoping
  const newStudent = await prisma.student.create({
    data: {
      fullName: data.name,
      student_id: data.student_id,
      parent_email: data.parent_email || "",
      parent_phone: data.parent_phone || "",
      parent_name: data.parent_name || "",
      gender: data.gender,
      date_of_birth: data.date_of_birth,
      school: { connect: { id: schoolId } },
      grade: {
        connectOrCreate: {
          where: { schoolId_name: { schoolId, name: data.grade } },
          create: { name: data.grade, schoolId }
        }
      },
      section: {
        connectOrCreate: {
          where: { schoolId_name: { schoolId, name: data.section } },
          create: { name: data.section, schoolId }
        }
      },
      stream: data.stream ? {
        connectOrCreate: {
          where: { schoolId_name: { schoolId, name: data.stream } },
          create: { name: data.stream, schoolId }
        }
      } : undefined
    },
    include: {
      grade: true,
      section: true,
      stream: true
    }
  });

  // Handle Parent User Account creation or linking
  if (data.existingParentId) {
    await prisma.parentStudentLink.create({
      data: {
        parentId: data.existingParentId,
        studentId: newStudent.id,
        schoolId: schoolId
      }
    });
  } else if (data.parent_phone && data.parent_password) {
    const cleanPhone = data.parent_phone.replace(/\s+/g, '');
    const hashedPassword = await bcrypt.hash(data.parent_password, 10);
    const parentEmail = data.parent_email || `parent-${cleanPhone}@zetime.com`;

    const user = await prisma.user.upsert({
      where: { email: parentEmail },
      update: {
        password_hash: hashedPassword,
        full_name: data.parent_name || 'Parent',
        phone: cleanPhone,
        role: 'parent',
        schoolId: schoolId
      },
      create: {
        email: parentEmail,
        password_hash: hashedPassword,
        full_name: data.parent_name || 'Parent',
        phone: cleanPhone,
        role: 'parent',
        schoolId: schoolId,
        is_active: true
      }
    });

    await prisma.parentStudentLink.create({
      data: {
        parentId: user.id,
        studentId: newStudent.id,
        schoolId: schoolId
      }
    });
  }

  return mapStudentToFlat(newStudent);
};

export const getStudentById = async (id: string, schoolId: string) => {
  const student = await prisma.student.findFirst({
    where: { id, schoolId },
    include: { 
      attendance: true,
      grade: true,
      section: true,
      stream: true
    },
  });
  return mapStudentToFlat(student);
};

export const updateStudent = async (id: string, data: any, schoolId: string) => {
  const updateData: any = {};
  if (data.name) updateData.fullName = data.name;
  if (data.student_id) updateData.student_id = data.student_id;
  if (data.parent_email) updateData.parent_email = data.parent_email;
  if (data.parent_phone) updateData.parent_phone = data.parent_phone;
  if (data.parent_name) updateData.parent_name = data.parent_name;
  if (data.gender) updateData.gender = data.gender;
  if (data.date_of_birth) updateData.date_of_birth = data.date_of_birth;

  if (data.grade) {
    updateData.grade = {
      connectOrCreate: {
        where: { schoolId_name: { schoolId, name: data.grade } },
        create: { name: data.grade, schoolId }
      }
    };
  }
  if (data.section) {
    updateData.section = {
      connectOrCreate: {
        where: { schoolId_name: { schoolId, name: data.section } },
        create: { name: data.section, schoolId }
      }
    };
  }
  if (data.stream) {
    updateData.stream = {
      connectOrCreate: {
        where: { schoolId_name: { schoolId, name: data.stream } },
        create: { name: data.stream, schoolId }
      }
    };
  }

  const updatedStudent = await prisma.student.update({ 
    where: { id, schoolId }, 
    data: updateData,
    include: {
      grade: true,
      section: true,
      stream: true
    }
  });

  return mapStudentToFlat(updatedStudent);
};

export const deleteStudent = async (id: string, schoolId: string) => {
  return await prisma.student.delete({ 
    where: { id, schoolId } 
  });
};

export const getStudentsByParentPhone = async (parentPhone: string, schoolId: string) => {
  const students = await prisma.student.findMany({
    where: { parent_phone: parentPhone, schoolId },
    include: {
      grade: true,
      section: true,
      stream: true,
      attendance: {
        orderBy: { date: 'desc' }
      }
    }
  });
  return students.map((student) => ({
    ...mapStudentToFlat(student),
    attendance: student.attendance
  }));
};
