
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const schools = await prisma.school.findMany({
    include: { subscription: true }
  });
  
  const orphans = schools.filter(s => !s.subscription);
  console.log(`Found ${orphans.length} orphan schools.`);

  for (const school of orphans) {
    const tier = (school.subscriptionStatus || 'free').toLowerCase();
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { slug: tier }
    });

    if (plan) {
      console.log(`Creating subscription for ${school.name} with plan ${plan.name}`);
      const trialDays = plan.trialDays || 0;
      const billingStart = new Date(school.createdAt);
      const trialEndsAt = new Date(billingStart.getTime() + trialDays * 24 * 60 * 60 * 1000);
      const billingEnd = trialDays > 0 ? trialEndsAt : new Date(billingStart.getTime() + 30 * 24 * 60 * 60 * 1000);
      const renewalDate = new Date(billingEnd.getTime() + 24 * 60 * 60 * 1000);

      await prisma.schoolSubscription.create({
        data: {
          schoolId: school.id,
          planId: plan.id,
          billingPeriod: 'monthly',
          status: trialDays > 0 ? 'trial' : 'active',
          studentCount: 0,
          billingStart,
          billingEnd,
          renewalDate,
          trialEndsAt: trialDays > 0 ? trialEndsAt : null
        }
      });
    } else {
      console.log(`Could not find plan for tier ${tier} for school ${school.name}`);
      // Fallback to free if possible
      const freePlan = await prisma.subscriptionPlan.findUnique({ where: { slug: 'free' } });
      if (freePlan) {
          console.log(`Falling back to free plan for ${school.name}`);
          // ... repeat create logic ...
           const trialDays = freePlan.trialDays || 0;
            const billingStart = new Date(school.createdAt);
            const trialEndsAt = new Date(billingStart.getTime() + trialDays * 24 * 60 * 60 * 1000);
            const billingEnd = trialDays > 0 ? trialEndsAt : new Date(billingStart.getTime() + 30 * 24 * 60 * 60 * 1000);
            const renewalDate = new Date(billingEnd.getTime() + 24 * 60 * 60 * 1000);

            await prisma.schoolSubscription.create({
                data: {
                schoolId: school.id,
                planId: freePlan.id,
                billingPeriod: 'monthly',
                status: 'trial',
                studentCount: 0,
                billingStart,
                billingEnd,
                renewalDate,
                trialEndsAt: trialDays > 0 ? trialEndsAt : null
                }
            });
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
