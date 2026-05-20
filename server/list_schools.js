const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schools = await prisma.school.findMany();
  console.log('SCHOOLS IN DB:');
  schools.forEach(s => console.log(`- ${s.id}: ${s.name}`));
}

main().finally(() => prisma.$disconnect());
