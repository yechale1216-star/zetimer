import prisma from '../config/db';
import bcrypt from 'bcryptjs';

// Helper to get or create a default school
const getDefaultSchoolId = async () => {
  let school = await prisma.school.findFirst();
  if (!school) {
    school = await prisma.school.create({
      data: { name: 'Main School' }
    });
  }
  return school.id;
};

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

export const getAllStudents = async (schoolId?: string) => {
  let targetSchoolId = schoolId;
  if (!targetSchoolId) {
    targetSchoolId = await getDefaultSchoolId();
  }
  const students = await prisma.student.findMany({
    where: { schoolId: targetSchoolId },
    include: {
      grade: true,
      section: true,
      stream: true
    }
  });
  return students.map(mapStudentToFlat);
};

export const createStudent = async (data: any, schoolIdFromHeader?: string) => {
  let schoolId = schoolIdFromHeader || data.schoolId;
  if (!schoolId) {
    schoolId = await getDefaultSchoolId();
  }

  // Make sure school exists in Postgres to prevent constraint errors
  let school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) {
    school = await prisma.school.create({
      data: {
        id: schoolId,
        name: data.schoolName || 'PostgreSQL School'
      }
    });
  }

  // Create or connect relations
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
          where: { name: data.grade },
          create: { name: data.grade }
        }
      },
      section: {
        connectOrCreate: {
          where: { name: data.section },
          create: { name: data.section }
        }
      },
      stream: data.stream ? {
        connectOrCreate: {
          where: { name: data.stream },
          create: { name: data.stream }
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
    // Link existing parent
    await prisma.parentStudentLink.create({
      data: {
        parentId: data.existingParentId,
        studentId: newStudent.id
      }
    });
  } else if (data.parent_phone && data.parent_password) {
    // Create new parent
    const cleanPhone = data.parent_phone.replace(/\s+/g, '');
    const hashedPassword = await bcrypt.hash(data.parent_password, 10);
    const parentEmail = data.parent_email || `parent-${cleanPhone}@zetime.com`;

    const user = await prisma.user.upsert({
      where: { email: parentEmail }, // Assuming email is unique constraint
      update: {
        password_hash: hashedPassword,
        full_name: data.parent_name || 'Parent',
        phone: cleanPhone,
        role: 'parent',
        school_id: schoolId
      },
      create: {
        email: parentEmail,
        password_hash: hashedPassword,
        full_name: data.parent_name || 'Parent',
        phone: cleanPhone,
        role: 'parent',
        school_id: schoolId,
        is_active: true
      }
    });

    await prisma.parentStudentLink.create({
      data: {
        parentId: user.id,
        studentId: newStudent.id
      }
    });
  }

  return mapStudentToFlat(newStudent);
};

export const getStudentById = async (id: string) => {
  const student = await prisma.student.findUnique({
    where: { id },
    include: { 
      attendance: true,
      grade: true,
      section: true,
      stream: true
    },
  });
  return mapStudentToFlat(student);
};

export const updateStudent = async (id: string, data: any) => {
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
        where: { name: data.grade },
        create: { name: data.grade }
      }
    };
  }
  if (data.section) {
    updateData.section = {
      connectOrCreate: {
        where: { name: data.section },
        create: { name: data.section }
      }
    };
  }
  if (data.stream) {
    updateData.stream = {
      connectOrCreate: {
        where: { name: data.stream },
        create: { name: data.stream }
      }
    };
  }

  const updatedStudent = await prisma.student.update({ 
    where: { id }, 
    data: updateData,
    include: {
      grade: true,
      section: true,
      stream: true
    }
  });

  // Handle Parent User Account update
  if (data.parent_phone && data.parent_password) {
    const cleanPhone = data.parent_phone.replace(/\s+/g, '');
    const hashedPassword = await bcrypt.hash(data.parent_password, 10);
    const parentEmail = data.parent_email || `parent-${cleanPhone}@zetime.com`;

    // Try to find existing parent by phone first
    const existingParent = await prisma.user.findFirst({
      where: { phone: cleanPhone, role: 'parent' }
    });

    if (existingParent) {
      await prisma.user.update({
        where: { id: existingParent.id },
        data: {
          password_hash: hashedPassword,
          full_name: data.parent_name || existingParent.full_name,
          email: parentEmail
        }
      });
    } else {
      // If not exists, create
      await prisma.user.upsert({
        where: { email: parentEmail },
        update: {
          password_hash: hashedPassword,
          full_name: data.parent_name || 'Parent',
          phone: cleanPhone,
          role: 'parent',
        },
        create: {
          email: parentEmail,
          password_hash: hashedPassword,
          full_name: data.parent_name || 'Parent',
          phone: cleanPhone,
          role: 'parent',
          is_active: true
        }
      });
    }
  }

  return mapStudentToFlat(updatedStudent);
};

export const deleteStudent = async (id: string) => {
  return await prisma.student.delete({ where: { id } });
};

export const getStudentsByParentPhone = async (parentPhone: string) => {
  const students = await prisma.student.findMany({
    where: { parent_phone: parentPhone },
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
