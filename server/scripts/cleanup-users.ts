import prisma from '../src/config/db';

async function main() {
  console.log('Starting cleanup...');

  // Count users before
  const totalBefore = await prisma.user.count();
  console.log(`Total users before cleanup: ${totalBefore}`);

  // Delete users whose role is NOT super_admin AND schoolId is null
  const result = await prisma.user.deleteMany({
    where: {
      AND: [
        { role: { notIn: ['super_admin', 'superadmin', 'SUPER_ADMIN'] } },
        { schoolId: null }
      ]
    }
  });

  console.log(`Deleted ${result.count} users.`);

  // Count users after
  const totalAfter = await prisma.user.count();
  console.log(`Total users remaining: ${totalAfter}`);

  // List remaining users summary by role
  const remaining = await prisma.user.groupBy({
    by: ['role'],
    _count: { id: true }
  });
  console.log('Remaining users breakdown:', remaining);
}

main()
  .catch((e) => {
    console.error('Error during cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
