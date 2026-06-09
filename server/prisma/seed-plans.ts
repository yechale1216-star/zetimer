/**
 * Seeds default subscription plans and feature catalog for modular SaaS model.
 * Run: npx ts-node prisma/seed-plans.ts
 */
import prisma from "../src/config/db";

const DEFAULT_FEATURES = [
  // Core (Enabled for all plans)
  { key: "attendance_tracking", name: "Attendance Tracking", category: "core", isCore: true, description: "Daily and session-based attendance recording" },
  { key: "student_management", name: "Student Management", category: "core", isCore: true, description: "Add, edit, and manage student records" },
  { key: "teacher_management", name: "Teacher Management", category: "core", isCore: true, description: "Manage teaching staff" },
  { key: "grade_section_management", name: "Grade & Section Management", category: "core", isCore: true, description: "Organize students into grades and sections" },
  { key: "basic_reports", name: "Basic Reports", category: "reporting", isCore: true, description: "Standard attendance reports" },
  { key: "export_csv", name: "Export CSV", category: "reporting", isCore: true, description: "Export data to CSV/Excel" },
  { key: "parent_portal", name: "Parent Portal", category: "communication", isCore: true, description: "Parents can view attendance and receive notifications" },
  { key: "student_promotion", name: "Student Promotion", category: "admin", isCore: true, description: "Bulk cohort-based student promotion" },
  
  // Add-ons (Modular advanced features)
  { key: "sms_notifications", name: "SMS Notifications", category: "communication", isCore: false, description: "Automated SMS alerts to parents" },
  { key: "email_notifications", name: "Email Notifications", category: "communication", isCore: false, description: "Automated EMAIL alerts to parents" },
  { key: "messaging", name: "Advanced Messaging", category: "communication", isCore: false, description: "Real-time chat between staff and parents" },
  { key: "advanced_analytics", name: "Advanced Analytics", category: "reporting", isCore: false, description: "In-depth attendance analytics and trends" },
  { key: "api_access", name: "API Access", category: "admin", isCore: false, description: "REST API for external integrations" },
  { key: "white_label", name: "White Label Branding", category: "admin", isCore: false, description: "Custom branding and domains" },
  { key: "video_calls", name: "Video Calls", category: "communication", isCore: false, description: "Parent-teacher video call sessions" },
  { key: "audit_logs", name: "Audit Logs", category: "admin", isCore: false, description: "Track all system actions" },
];

const DEFAULT_ADDONS = [
  { name: "SMS package", monthlyFlat: 2500, perUnit: false, featureKey: "sms_notifications", description: "Bulk SMS notifications for parents" },
  { name: "Email notification module", monthlyFlat: 1200, perUnit: false, featureKey: "email_notifications", description: "Automated email alerts for parents" },
  { name: "Communication module", monthlyFlat: 3500, perUnit: false, featureKey: "messaging", description: "Real-time chat between staff and parents" },
  { name: "Advanced analytics", monthlyFlat: 4500, perUnit: false, featureKey: "advanced_analytics", description: "In-depth data insights and trends" },
  { name: "API & Integrations", monthlyFlat: 6500, perUnit: false, featureKey: "api_access", description: "REST API for external integrations" },
  { name: "White label branding", monthlyFlat: 10000, perUnit: false, featureKey: "white_label", description: "Custom school portal domain and color scheme" },
  { name: "Extra branches", monthlyFlat: 4000, perUnit: true, unitLabel: "branch", description: "Manage multiple school branches" },
  { name: "Priority support", monthlyFlat: 5000, perUnit: false, description: "24/7 technical assistance" },
  { name: "Additional storage", monthlyFlat: 1500, perUnit: true, unitLabel: "100 GB block", description: "Cloud storage for document management" },
];

const DEFAULT_PLANS = [
  {
    name: "Free",
    slug: "free",
    description: "Free trial for new schools",
    monthlyTotal: 0,
    semesterTotal: 0,
    yearlyTotal: 0,
    maxStudents: 50,
    maxUsers: 5,
    trialDays: 14,
    sortOrder: 0,
  },
  {
    name: "Starter",
    slug: "starter",
    description: "Basic package for small schools",
    monthlyTotal: 2500,
    semesterTotal: 12500,
    yearlyTotal: 25000,
    maxStudents: 250,
    maxUsers: 15,
    trialDays: 0,
    sortOrder: 1,
  },
  {
    name: "Standard",
    slug: "standard",
    description: "Standard package for growing schools",
    monthlyTotal: 5500,
    semesterTotal: 27500,
    yearlyTotal: 55000,
    maxStudents: 600,
    maxUsers: 40,
    trialDays: 0,
    sortOrder: 2,
  },
  {
    name: "Premium",
    slug: "premium",
    description: "All core features with higher limits",
    monthlyTotal: 12000,
    semesterTotal: 60000,
    yearlyTotal: 120000,
    maxStudents: 1500,
    maxUsers: 100,
    trialDays: 0,
    sortOrder: 3,
  },
  {
    name: "Enterprise",
    slug: "enterprise",
    description: "Unlimited package for large institutions",
    monthlyTotal: 0,
    semesterTotal: 0,
    yearlyTotal: 0,
    maxStudents: -1,
    maxUsers: -1,
    trialDays: 0,
    sortOrder: 4,
  },
];

async function main() {
  console.log("🌱 Seeding SaaS Feature Catalog...");

  for (const feature of DEFAULT_FEATURES) {
    await prisma.feature.upsert({
      where: { key: feature.key },
      create: { ...feature, isActive: true },
      update: { 
        name: feature.name, 
        description: feature.description, 
        category: feature.category,
        isCore: feature.isCore 
      },
    });
    process.stdout.write(".");
  }
  console.log(`\n✅ ${DEFAULT_FEATURES.length} features seeded`);

  console.log("🌱 Seeding SaaS Subscription Plans (Limits Only)...");

  for (const planFields of DEFAULT_PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: planFields.slug },
      create: { ...planFields, isActive: true, isCustom: false },
      update: {
        name: planFields.name,
        description: planFields.description,
        monthlyTotal: planFields.monthlyTotal,
        semesterTotal: planFields.semesterTotal,
        yearlyTotal: planFields.yearlyTotal,
        maxStudents: planFields.maxStudents,
        maxUsers: planFields.maxUsers,
        trialDays: planFields.trialDays,
        sortOrder: planFields.sortOrder,
      },
    });
    console.log(`  ✅ Plan '${planFields.name}' limits updated`);
  }

  console.log("🌱 Seeding SaaS Modular Add-ons...");
  for (const addon of DEFAULT_ADDONS) {
    const addonId = addon.name.toLowerCase().replace(/\s+/g, "_");
    await prisma.addon.upsert({
      where: { id: addonId },
      create: { 
        id: addonId,
        ...addon 
      },
      update: { 
        monthlyFlat: addon.monthlyFlat, 
        perUnit: addon.perUnit, 
        unitLabel: addon.unitLabel, 
        description: addon.description,
        featureKey: addon.featureKey
      },
    });
    process.stdout.write(".");
  }

  console.log("\n🎉 SaaS refactor seed complete!");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
