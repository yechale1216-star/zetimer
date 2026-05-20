const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schools = await prisma.school.findMany({
    include: { _count: { select: { students: true } } }
  });
  console.log('SCHOOL STUDENT COUNTS:');
  schools.forEach(s => console.log(`- ${s.id}: ${s._count.students} students`));
}

main().finally(() => prisma.$disconnect());
