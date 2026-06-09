const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const mediumPlan = await prisma.subscriptionPlan.findUnique({
    where: { slug: "medium" }
  });

  if (mediumPlan) {
    console.log('Found medium plan, updating to standard...');
    
    // Check if standard already exists
    const standardPlan = await prisma.subscriptionPlan.findUnique({
      where: { slug: "standard" }
    });

    if (standardPlan) {
      console.log('Standard plan already exists. Re-assigning subscriptions from medium to standard...');
      await prisma.schoolSubscription.updateMany({
        where: { planId: mediumPlan.id },
        data: { planId: standardPlan.id }
      });
      console.log('Deleting medium plan...');
      await prisma.subscriptionPlan.delete({ where: { id: mediumPlan.id } });
    } else {
      console.log('Renaming medium plan to standard...');
      await prisma.subscriptionPlan.update({
        where: { id: mediumPlan.id },
        data: { name: "Standard", slug: "standard" }
      });
    }
  } else {
      console.log('No medium plan found.');
  }

  // Ensure 'standard' exists regardless
  const standardExists = await prisma.subscriptionPlan.findUnique({ where: { slug: "standard" } });
  if (!standardExists) {
      console.log('Standard plan does not exist. Please run the seeder.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
