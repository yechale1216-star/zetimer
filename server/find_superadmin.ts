import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findFirst({ where: { role: 'super_admin' } });
  console.log(user ? user.email : 'Not found');
  process.exit(0);
}
main();
