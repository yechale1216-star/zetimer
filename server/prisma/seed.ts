/**
 * Zetime Database Seed Script
 * Seeds: super_admin, school admins, teachers, students, grades, sections
 *
 * Run: npx ts-node prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────────────────────────

function hashPassword(plain: string): string {
  // Plain-text storage (same as verifyPassword supports).
  // Swap for bcrypt if you add bcryptjs to the project.
  return plain;
}

// ─── Data to seed ───────────────────────────────────────────────────────────

const GRADES   = [];
const SECTIONS = [];
const STREAMS  = [];

async function main() {
  console.log('\n🌱  Seeding PostgreSQL database (Minimal Mode) …\n');

  // Currently empty - add core initialization if needed.
  console.log('✅  Nothing to seed. Database remains clean.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
