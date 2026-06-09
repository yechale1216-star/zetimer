const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { role: 'admin' },
    select: { id: true, email: true, schoolId: true, school: { select: { name: true } } }
  });
  console.log('Admin Users:');
  console.log(JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
