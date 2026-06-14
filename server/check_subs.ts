
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const schools = await prisma.school.findMany({
    include: { subscription: true }
  });
  const schoolsWithoutSub = schools.filter(s => !s.subscription);
  console.log(`Found ${schools.length} schools total.`);
  console.log(`Found ${schoolsWithoutSub.length} schools without a subscription.`);
  console.log(JSON.stringify(schoolsWithoutSub.map(s => ({ id: s.id, name: s.name, status: s.subscriptionStatus })), null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
