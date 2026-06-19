import { PrismaClient } from '@prisma/client';

// Use DIRECT_URL for admin tasks to bypass connection pooling issues
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL
    }
  }
});

async function main() {
  console.log('🧹 Clearing database using DIRECT_URL...');

  try {
    const tablenames = await prisma.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

    const tables = tablenames
      .map(({ tablename }) => tablename)
      .filter((name) => name !== '_prisma_migrations');

    for (const table of tables) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${table}" RESTART IDENTITY CASCADE;`);
      console.log(`✅ Truncated ${table}`);
    }
    console.log('✨ Database cleared!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
