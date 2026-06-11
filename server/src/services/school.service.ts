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

export const updateSchool = async (id: string, data: { name?: string; subscriptionStatus?: string }) => {
  const school = await prisma.school.update({
    where: { id },
    data: {
      name: data.name,
      subscriptionStatus: data.subscriptionStatus as any
    },
    include: {
      settings: true
    }
  });

  // Also update school_name in settings for consistency
  if (data.name) {
    await prisma.schoolSettings.update({
      where: { schoolId: id },
      data: { school_name: data.name }
    });
  }

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

export const getGrades = async (schoolId: string) => {
  return await prisma.grade.findMany({
    where: { schoolId },
    orderBy: { name: 'asc' }
  });
};

export const getSections = async (schoolId: string) => {
  return await prisma.section.findMany({
    where: { schoolId },
    orderBy: { name: 'asc' }
  });
};

export const getStreams = async (schoolId: string) => {
  return await prisma.stream.findMany({
    where: { schoolId },
    orderBy: { name: 'asc' }
  });
};

/** Returns rich school details for the super-admin view */
export const getSchoolDetails = async (id: string) => {
  const school = await prisma.school.findUnique({
    where: { id },
    include: {
      settings: true,
      subscription: { include: { plan: true } },
    },
  });
  if (!school) return null;

  const [userCount, studentCount] = await Promise.all([
    prisma.user.count({ where: { schoolId: id } }),
    prisma.student.count({ where: { schoolId: id } }),
  ]);

  let adminUser = await prisma.user.findFirst({ 
    where: { 
      schoolId: id, 
      role: { equals: 'admin', mode: 'insensitive' } 
    },
    select: { id: true, full_name: true, email: true, phone: true },
    orderBy: { createdAt: 'asc' }
  });

  // Fallback: If no 'admin' role found, just take the first user ever created for this school
  if (!adminUser) {
    adminUser = await prisma.user.findFirst({
      where: { schoolId: id },
      select: { id: true, full_name: true, email: true, phone: true },
      orderBy: { createdAt: 'asc' }
    });
  }

  return { ...school, userCount, studentCount, adminUser };
};

/** Suspend or unsuspend a school */
export const setSchoolSuspended = async (id: string, suspend: boolean) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Update School record
    const school = await tx.school.update({
      where: { id },
      data: { subscriptionStatus: suspend ? 'SUSPENDED' : 'ACTIVE' },
      include: { subscription: true }
    });

    // 2. Sync Subscription status if it exists
    if (school.subscription) {
      await tx.schoolSubscription.update({
        where: { id: school.subscription.id },
        data: { status: suspend ? 'suspended' : 'active' }
      });
    }

    return school;
  });
};
