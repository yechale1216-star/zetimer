import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱  Seeding platform infrastructure...');

  // 1. Create Core Features
  const features = [
    { key: 'messaging', name: 'Messaging', category: 'communication', isCore: true },
    { key: 'calling', name: 'Voice Calling', category: 'communication', isCore: true },
    { key: 'attendance', name: 'Attendance Tracking', category: 'core', isCore: true },
    { key: 'analytics', name: 'Analytics Dashboard', category: 'reporting', isCore: false },
    { key: 'announcements', name: 'School Announcements', category: 'communication', isCore: true },
  ];

  for (const f of features) {
    await prisma.feature.upsert({
      where: { key: f.key },
      update: f,
      create: f,
    });
  }
  console.log('✅ Features seeded.');

  // 2. Create Subscription Plans
  const plans = [
    {
      name: 'Free Trial',
      slug: 'free',
      description: 'Perfect for small schools starting out.',
      pricePerStudentMonthly: 0,
      maxStudents: 100,
      trialDays: 14,
      isActive: true,
      features: ['messaging', 'attendance', 'announcements']
    },
    {
      name: 'Professional',
      slug: 'pro',
      description: 'Advanced features for growing schools.',
      pricePerStudentMonthly: 10,
      maxStudents: 1000,
      trialDays: 0,
      isActive: true,
      features: ['messaging', 'calling', 'attendance', 'analytics', 'announcements']
    }
  ];

  for (const p of plans) {
    const { features: planFeatures, ...planData } = p;
    const plan = await prisma.subscriptionPlan.upsert({
      where: { slug: p.slug },
      update: planData,
      create: planData,
    });

    // Link features to plans
    for (const fKey of planFeatures) {
      const feature = await prisma.feature.findUnique({ where: { key: fKey } });
      if (feature) {
        await prisma.planFeature.upsert({
          where: { planId_featureId: { planId: plan.id, featureId: feature.id } },
          update: {},
          create: { planId: plan.id, featureId: feature.id },
        });
      }
    }
  }
  console.log('✅ Subscription plans seeded.');

  // 3. Create Super Admin (Default password: admin_password)
  const superAdminEmail = 'super@zetime.io';
  await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      email: superAdminEmail,
      password_hash: 'admin_password', // Simplified for dev reset
      full_name: 'System Super Admin',
      role: 'super_admin',
      is_active: true,
    },
  });
  console.log(`✅ Super Admin created: ${superAdminEmail}`);

  console.log('✨ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
