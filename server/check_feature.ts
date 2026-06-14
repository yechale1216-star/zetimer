
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const feature = await prisma.feature.findUnique({
    where: { key: 'messaging' }
  });
  console.log('Messaging Feature:', feature);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
