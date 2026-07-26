import prisma from '../src/config/db';

async function main() {
  console.log('Fetching all users in DB...');
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      schoolId: true,
      full_name: true,
    }
  });

  console.log('Current users list:');
  console.table(users);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
