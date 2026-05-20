const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Testing prisma.student.findMany...');
  try {
    const students = await prisma.student.findMany({
      include: {
        grade: true,
        section: true,
        stream: true
      }
    });
    console.log(`Found ${students.length} students`);
    if (students.length > 0) {
      console.log('First student sample:', JSON.stringify(students[0], null, 2));
    }
  } catch (error) {
    console.error('Error fetching students:', error);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
