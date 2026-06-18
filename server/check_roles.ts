
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Fetching users...');
  const users = await prisma.user.findMany({
    select: {
      email: true,
      role: true,
      full_name: true,
      id: true
    }
  });
  console.log('Users found:', users.length);
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
