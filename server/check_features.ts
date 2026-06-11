import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const features = await prisma.feature.findMany({
    where: { isActive: true }
  });
  console.log(JSON.stringify(features, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
