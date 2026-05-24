import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- USERS ---');
  const users = await prisma.user.findMany({ where: { full_name: { contains: 'Alex' } } });
  console.log(JSON.stringify(users, null, 2));
  
  console.log('--- TEACHERS ---');
  const teachers = await prisma.teacher.findMany({ where: { name: { contains: 'Alex' } } });
  console.log(JSON.stringify(teachers, null, 2));

  console.log('--- ALL TEACHERS ---');
  const allTeachers = await prisma.teacher.findMany({});
  console.log(allTeachers.map(t => `${t.name} (User ID: ${t.user_id})`));
}

main().finally(() => prisma.$disconnect());
