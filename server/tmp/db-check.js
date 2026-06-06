const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const schools = await prisma.school.findMany({
    select: { id: true, name: true }
  });
  console.log("Schools:", schools);
  
  const students = await prisma.student.groupBy({
    by: ['schoolId'],
    _count: { _all: true }
  });
  console.log("Students by School:", students);
}

check().catch(console.error).finally(() => prisma.$disconnect());
