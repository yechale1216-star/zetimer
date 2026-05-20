const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.user.update({
    where: { id: '91235bd0-675a-44ba-b9e5-35626e499877' },
    data: {
      email: 'abebe@school.com',
      password_hash: 'teacher123'
    }
  });
  console.log('Successfully reset Abebe Kebede!');
}
main().catch(console.error).finally(() => prisma.$disconnect());
