const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Testing prisma.student.findMany with potentially invalid schoolId...');
  try {
    // Test with a non-existent but valid UUID
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    console.log(`Searching for schoolId: ${nonExistentId}`);
    const students1 = await prisma.student.findMany({
      where: { schoolId: nonExistentId }
    });
    console.log(`Found ${students1.length} students (expected 0)`);

    // Test with an invalid UUID string
    const invalidId = 'not-a-uuid';
    console.log(`Searching for schoolId: ${invalidId}`);
    const students2 = await prisma.student.findMany({
      where: { schoolId: invalidId }
    });
    console.log(`Found ${students2.length} students`);
  } catch (error) {
    console.error('CAUGHT ERROR:', error.message);
    if (error.code) {
      console.log('Prisma Error Code:', error.code);
    }
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
