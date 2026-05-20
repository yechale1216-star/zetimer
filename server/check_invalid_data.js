const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany();
  console.log(`Total students: ${students.length}`);
  
  const invalidStudents = students.filter(s => !s.gradeId || !s.sectionId);
  console.log(`Students missing gradeId or sectionId: ${invalidStudents.length}`);
  if (invalidStudents.length > 0) {
    console.log('Sample invalid students:', JSON.stringify(invalidStudents.slice(0, 5), null, 2));
  }

  // Check unique counts
  const grades = await prisma.grade.findMany();
  const sections = await prisma.section.findMany();
  console.log(`Grades in DB: ${grades.length}`);
  console.log(`Sections in DB: ${sections.length}`);
}

main().finally(() => prisma.$disconnect());
