import prisma from '../config/db';
import { generateSchoolId } from '../utils/school-id';

export const createSchool = async (data: { name: string; id?: string }) => {
  const customId = await generateSchoolId();
  
  const school = await prisma.school.create({
    data: {
      id: data.id,
      name: data.name,
      schoolId: customId,
      subscriptionStatus: 'ACTIVE',
      settings: {
        create: {
          school_name: data.name,
          attendance_mode: 'session_based',
          attendance_ui_type: 'card_based'
        }
      }
    },
    include: {
      settings: true
    }
  });

  return school;
};

export const getSchoolById = async (id: string) => {
  return await prisma.school.findUnique({
    where: { id },
    include: {
      settings: true,
    },
  });
};

export const getSchoolByCustomId = async (schoolId: string) => {
  return await prisma.school.findFirst({
    where: { schoolId },
    include: {
      settings: true,
    }
  });
};

export const getAllSchools = async () => {
  return await prisma.school.findMany({
    orderBy: { createdAt: 'desc' },
  });
};
