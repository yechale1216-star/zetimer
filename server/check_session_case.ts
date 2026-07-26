import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const morning = await prisma.attendance.count({ where: { session: 'Morning' } });
  const afternoon = await prisma.attendance.count({ where: { session: 'Afternoon' } });
  const fullDay = await prisma.attendance.count({ where: { session: 'Full Day' } });
  const lowerMorning = await prisma.attendance.count({ where: { session: 'morning' } });
  const lowerAfternoon = await prisma.attendance.count({ where: { session: 'afternoon' } });
  
  console.log('=== Session Case Audit ===');
  console.log(`  "Morning"   (Title Case): ${morning}`);
  console.log(`  "Afternoon" (Title Case): ${afternoon}`);
  console.log(`  "Full Day"  (legacy):     ${fullDay}`);
  console.log(`  "morning"   (lowercase):  ${lowerMorning}`);
  console.log(`  "afternoon" (lowercase):  ${lowerAfternoon}`);

  const needsMigration = morning + afternoon + fullDay;
  if (needsMigration > 0) {
    console.log(`\n⚠️  ${needsMigration} records need migration to lowercase.`);
    console.log('Running migration...');

    if (morning > 0) {
      await prisma.attendance.updateMany({ where: { session: 'Morning' }, data: { session: 'morning' } });
      console.log(`  ✅ Migrated ${morning} "Morning" → "morning"`);
    }
    if (afternoon > 0) {
      await prisma.attendance.updateMany({ where: { session: 'Afternoon' }, data: { session: 'afternoon' } });
      console.log(`  ✅ Migrated ${afternoon} "Afternoon" → "afternoon"`);
    }
    if (fullDay > 0) {
      // "Full Day" records were from old single-endpoint path with no real session — treat as null
      await prisma.attendance.updateMany({ where: { session: 'Full Day' }, data: { session: null } });
      console.log(`  ✅ Migrated ${fullDay} "Full Day" → null`);
    }
    console.log('\n🎉 Migration complete!');
  } else {
    console.log('\n✅ All records already use lowercase sessions. No migration needed.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
