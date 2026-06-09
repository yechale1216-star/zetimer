/**
 * Migration: Move all schools from 'starter' plan to 'free' plan.
 * Run: npx ts-node prisma/migrate-starter-to-free.ts
 */
import prisma from "../src/config/db";

async function main() {
  console.log("🔍 Finding 'starter' and 'free' plans...");
  
  const starterPlan = await prisma.subscriptionPlan.findUnique({ where: { slug: "starter" } });
  const freePlan = await prisma.subscriptionPlan.findUnique({ where: { slug: "free" } });

  if (!starterPlan || !freePlan) {
    console.error("❌ Missing plans. Ensure both 'starter' and 'free' exist.");
    process.exit(1);
  }

  console.log(`✅ Found Starter (${starterPlan.id}) and Free (${freePlan.id})`);

  const subscriptions = await prisma.schoolSubscription.findMany({
    where: { planId: starterPlan.id }
  });

  console.log(`📈 Found ${subscriptions.length} schools on 'starter' plan.`);

  if (subscriptions.length === 0) {
    console.log("✨ No schools to migrate. Done.");
    return;
  }

  const result = await prisma.schoolSubscription.updateMany({
    where: { planId: starterPlan.id },
    data: { planId: freePlan.id }
  });

  console.log(`🎉 Successfully migrated ${result.count} schools to 'free' plan.`);
}

main()
  .catch((e) => { console.error("❌ Migration failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
