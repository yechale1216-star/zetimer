import prisma from '../config/db';

/**
 * Generates a unique School ID in the format SCH-XXXX (e.g., SCH-0001).
 */
export async function generateSchoolId(): Promise<string> {
  const lastSchool = await prisma.school.findFirst({
    where: {
      schoolId: {
        startsWith: 'SCH-',
      },
    },
    orderBy: {
      schoolId: 'desc',
    },
  });

  let nextNumber = 1;
  if (lastSchool && lastSchool.schoolId) {
    const match = lastSchool.schoolId.match(/SCH-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `SCH-${nextNumber.toString().padStart(4, '0')}`;
}
