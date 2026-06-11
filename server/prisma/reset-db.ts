/**
 * Zetime Database RESET Script
 * ─────────────────────────────────────────────────────────────────
 * Wipes ALL schools, users, students, teachers, attendance — every
 * tenant record — while KEEPING:
 *   • subscription_plans + features + plan_features
 *   • platform_configs
 *   • addons
 *
 * After the wipe it re-seeds ONLY the super-admin account so the
 * platform is immediately usable for fresh onboarding.
 *
 * Run:
 *   npx ts-node prisma/reset-db.ts
 * ─────────────────────────────────────────────────────────────────
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n⚠️   ZETIME DATABASE RESET\n');
  console.log('This will permanently delete ALL schools, users, and data.');
  console.log('Subscription plans, features, and platform config are kept.\n');

  // ── Step 1: Delete in safe dependency order ──────────────────────────────

  console.log('🗑️   Deleting messaging & call data …');
  await prisma.callHistory.deleteMany({});
  await prisma.callParticipant.deleteMany({});
  await prisma.callSession.deleteMany({});
  await prisma.messageReaction.deleteMany({});
  await prisma.messageRead.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.conversationMember.deleteMany({});
  await prisma.conversation.deleteMany({});

  console.log('🗑️   Deleting attendance & notifications …');
  await prisma.attendance.deleteMany({});
  await prisma.parentNotification.deleteMany({});
  await prisma.attendanceReport.deleteMany({});

  console.log('🗑️   Deleting student data …');
  await prisma.studentPromotion.deleteMany({});
  await prisma.parentStudentLink.deleteMany({});
  await prisma.student.deleteMany({});

  console.log('🗑️   Deleting teacher data …');
  await prisma.teacherAssignment.deleteMany({});
  await prisma.teacher.deleteMany({});

  console.log('🗑️   Deleting academic structure …');
  await prisma.grade.deleteMany({});
  await prisma.section.deleteMany({});
  await prisma.stream.deleteMany({});

  console.log('🗑️   Deleting school-level records …');
  await prisma.auditLog.deleteMany({});
  await prisma.supportTicket.deleteMany({});
  await prisma.schoolFeatureOverride.deleteMany({});
  await prisma.schoolAddon.deleteMany({});
  await prisma.schoolSubscription.deleteMany({});
  await prisma.schoolSettings.deleteMany({});
  await prisma.parentPreferences.deleteMany({});
  await prisma.pendingRegistration.deleteMany({});
  await prisma.broadcastLog.deleteMany({});

  console.log('🗑️   Deleting all users …');
  await prisma.user.deleteMany({});

  console.log('🗑️   Deleting all schools …');
  await prisma.school.deleteMany({});

  console.log('\n✅  All tenant data cleared.\n');

  // ── Step 2: Re-seed the super admin ─────────────────────────────────────

  console.log('👑  Re-creating Super Admin …');
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@zetime.com' },
    update: {},
    create: {
      email: 'superadmin@zetime.com',
      password_hash: 'superadmin123',
      full_name: 'Super Administrator',
      role: 'super_admin',
      phone: '+251911000001',
      is_active: true,
    },
  });
  console.log(`   ✓ ${superAdmin.full_name} (${superAdmin.email})\n`);

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════');
  console.log('🎉  Database is clean and ready!\n');
  console.log('  SUPER ADMIN LOGIN');
  console.log('  Email    : superadmin@zetime.com');
  console.log('  Password : superadmin123\n');
  console.log('  You can now onboard new schools from the Super Admin panel.');
  console.log('═══════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('\n❌  Reset failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
