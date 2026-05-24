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

const GRADES   = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const SECTIONS = ['A','B','C','D'];
const STREAMS  = ['Natural Science','Social Science','General'];

async function main() {
  console.log('\n🌱  Seeding PostgreSQL database …\n');

  // ── 1. Grades, Sections, Streams ──────────────────────────────────────────
  console.log('📚  Upserting grades, sections, streams …');
  for (const g of GRADES) {
    await prisma.grade.upsert({ where: { name: g }, update: {}, create: { name: g } });
  }
  for (const s of SECTIONS) {
    await prisma.section.upsert({ where: { name: s }, update: {}, create: { name: s } });
  }
  for (const s of STREAMS) {
    await prisma.stream.upsert({ where: { name: s }, update: {}, create: { name: s } });
  }
  console.log('   ✓ Grades / Sections / Streams done\n');

  // ── 2. Super Admin (no school) ────────────────────────────────────────────
  console.log('👑  Creating Super Admin …');
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@zetime.com' },
    update: {},
    create: {
      email: 'superadmin@zetime.com',
      password_hash: hashPassword('superadmin123'),
      full_name: 'Super Administrator',
      role: 'super_admin',
      phone: '+251911000001',
      is_active: true,
    },
  });
  console.log(`   ✓ ${superAdmin.full_name} (${superAdmin.email})\n`);

  // ── 3. Demo School ────────────────────────────────────────────────────────
  console.log('🏫  Creating Demo School …');
  const demoSchool = await prisma.school.upsert({
    where: { name: 'Demo High School' },
    update: {},
    create: { name: 'Demo High School' },
  });
  console.log(`   ✓ School: "${demoSchool.name}" (id: ${demoSchool.id})\n`);

  // School settings
  await prisma.schoolSettings.upsert({
    where: { school_id: demoSchool.id },
    update: {},
    create: {
      school_id: demoSchool.id,
      school_name: 'Demo High School',
      school_phone: '+251911000100',
      school_address: '123 Education Street, Addis Ababa',
      academic_year: '2024/2025',
      attendance_mode: 'session_based',
      attendance_ui_type: 'card_based',
      attendance_threshold: 75,
      allow_late_mark: true,
      email_notifications: true,
      sms_notifications: false,
      notification_time: '16:00',
    },
  });

  // ── 4. School Admin ───────────────────────────────────────────────────────
  console.log('🧑‍💼  Creating School Admin …');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@school.com' },
    update: { school_id: demoSchool.id },
    create: {
      email: 'admin@school.com',
      password_hash: hashPassword('admin123456'),
      full_name: 'School Administrator',
      role: 'admin',
      phone: '+251911000002',
      is_active: true,
      school_id: demoSchool.id,
    },
  });
  console.log(`   ✓ ${admin.full_name} (${admin.email})\n`);

  // ── 5. Demo Teachers ──────────────────────────────────────────────────────
  console.log('👩‍🏫  Creating Teachers …');

  const teachersData = [
    {
      name: 'Abebe Kebede',
      email: 'abebe.teacher@school.com',
      userEmail: 'abebe@school.com',
      password: 'teacher123',
      phone: '+251911000010',
      grade: '10', section: 'A', subject: 'Mathematics',
    },
    {
      name: 'Tigist Haile',
      email: 'tigist.teacher@school.com',
      userEmail: 'tigist@school.com',
      password: 'teacher123',
      phone: '+251911000011',
      grade: '10', section: 'B', subject: 'English',
    },
    {
      name: 'Yonas Tadesse',
      email: 'yonas.teacher@school.com',
      userEmail: 'yonas@school.com',
      password: 'teacher123',
      phone: '+251911000012',
      grade: '9', section: 'A', subject: 'Biology',
    },
    {
      name: 'Marta Girma',
      email: 'marta.teacher@school.com',
      userEmail: 'marta@school.com',
      password: 'teacher123',
      phone: '+251911000013',
      grade: '11', section: 'A', subject: 'Physics',
    },
    {
      name: 'Solomon Bekele',
      email: 'solomon.teacher@school.com',
      userEmail: 'solomon@school.com',
      password: 'teacher123',
      phone: '+251911000014',
      grade: '12', section: 'A', subject: 'Chemistry',
    },
  ];

  for (const t of teachersData) {
    // Create Teacher record
    let teacher = await prisma.teacher.findFirst({
      where: { email: t.email, schoolId: demoSchool.id },
    });
    if (!teacher) {
      teacher = await prisma.teacher.create({
        data: { name: t.name, email: t.email, schoolId: demoSchool.id },
      });
    }

    // Create User account linked to Teacher
    const userRecord = await prisma.user.upsert({
      where: { email: t.userEmail },
      update: { teacher_id: teacher.id, school_id: demoSchool.id },
      create: {
        email: t.userEmail,
        password_hash: hashPassword(t.password),
        full_name: t.name,
        role: 'teacher',
        phone: t.phone,
        is_active: true,
        school_id: demoSchool.id,
        teacher_id: teacher.id,
      },
    });

    // Create TeacherAssignment
    const existingAssign = await prisma.teacherAssignment.findFirst({
      where: {
        teacher_id: teacher.id,
        school_id: demoSchool.id,
        grade: t.grade,
        section: t.section,
      },
    });
    if (!existingAssign) {
      await prisma.teacherAssignment.create({
        data: {
          teacher_id: teacher.id,
          school_id: demoSchool.id,
          grade: t.grade,
          section: t.section,
          subject: t.subject,
        },
      });
    }

    console.log(`   ✓ ${t.name} — ${t.subject} (Grade ${t.grade}${t.section}) | login: ${t.userEmail}`);
  }

  // ── 6. Demo Students ──────────────────────────────────────────────────────
  console.log('\n👨‍🎓  Creating Students …');

  const grade10 = await prisma.grade.findUnique({ where: { name: '10' } });
  const grade9  = await prisma.grade.findUnique({ where: { name: '9' } });
  const grade11 = await prisma.grade.findUnique({ where: { name: '11' } });
  const sectionA = await prisma.section.findUnique({ where: { name: 'A' } });
  const sectionB = await prisma.section.findUnique({ where: { name: 'B' } });
  const streamNat = await prisma.stream.findUnique({ where: { name: 'Natural Science' } });

  const studentsData = [
    // Grade 10-A
    { fullName: 'Biruk Alemu',   student_id: 'STU-1001', grade: grade10!, section: sectionA!, stream: streamNat!, gender: 'Male',   dob: '2008-05-12', parentName: 'Alemu Biruk',   parentPhone: '+251911100001', parentEmail: 'alemu@parent.com' },
    { fullName: 'Hana Tesfaye',  student_id: 'STU-1002', grade: grade10!, section: sectionA!, stream: streamNat!, gender: 'Female', dob: '2008-08-22', parentName: 'Tesfaye Hana',  parentPhone: '+251911100002', parentEmail: 'tesfaye@parent.com' },
    { fullName: 'Daniel Girma',  student_id: 'STU-1003', grade: grade10!, section: sectionA!, stream: streamNat!, gender: 'Male',   dob: '2008-03-15', parentName: 'Girma Daniel',  parentPhone: '+251911100003', parentEmail: 'girma@parent.com' },
    // Grade 10-B
    { fullName: 'Sara Getachew', student_id: 'STU-1004', grade: grade10!, section: sectionB!, stream: null,       gender: 'Female', dob: '2008-11-08', parentName: 'Getachew Sara', parentPhone: '+251911100004', parentEmail: 'getachew@parent.com' },
    { fullName: 'Abel Worku',    student_id: 'STU-1005', grade: grade10!, section: sectionB!, stream: null,       gender: 'Male',   dob: '2008-07-20', parentName: 'Worku Abel',    parentPhone: '+251911100005', parentEmail: 'worku@parent.com' },
    // Grade 9-A
    { fullName: 'Meron Desta',   student_id: 'STU-0901', grade: grade9!,  section: sectionA!, stream: null,       gender: 'Female', dob: '2009-02-14', parentName: 'Desta Meron',   parentPhone: '+251911100006', parentEmail: 'desta@parent.com' },
    { fullName: 'Kidus Solomon', student_id: 'STU-0902', grade: grade9!,  section: sectionA!, stream: null,       gender: 'Male',   dob: '2009-06-30', parentName: 'Solomon Kidus', parentPhone: '+251911100007', parentEmail: 'solomon@parent.com' },
    // Grade 11-A
    { fullName: 'Amen Bekele',   student_id: 'STU-1101', grade: grade11!, section: sectionA!, stream: streamNat!, gender: 'Male',   dob: '2007-09-01', parentName: 'Bekele Amen',   parentPhone: '+251911100008', parentEmail: 'bekele@parent.com' },
    { fullName: 'Liya Hailu',    student_id: 'STU-1102', grade: grade11!, section: sectionA!, stream: streamNat!, gender: 'Female', dob: '2007-12-25', parentName: 'Hailu Liya',    parentPhone: '+251911100009', parentEmail: 'hailu@parent.com' },
  ];

  let createdStudents = 0;
  for (const s of studentsData) {
    const existing = await prisma.student.findUnique({ where: { student_id: s.student_id } });
    if (!existing) {
      await prisma.student.create({
        data: {
          fullName:     s.fullName,
          student_id:   s.student_id,
          gradeId:      s.grade.id,
          sectionId:    s.section.id,
          streamId:     s.stream?.id ?? null,
          schoolId:     demoSchool.id,
          gender:       s.gender,
          date_of_birth: s.dob,
          parent_name:  s.parentName,
          parent_phone: s.parentPhone,
          parent_email: s.parentEmail,
        },
      });
      createdStudents++;
    }
  }
  console.log(`   ✓ ${createdStudents} students inserted (${studentsData.length - createdStudents} already existed)\n`);

  // ── 7. Second School (for multi-tenant testing) ───────────────────────────
  console.log('🏫  Creating Second School (for multi-tenant testing) …');
  const school2 = await prisma.school.upsert({
    where: { name: 'Green Valley Academy' },
    update: {},
    create: { name: 'Green Valley Academy' },
  });

  await prisma.schoolSettings.upsert({
    where: { school_id: school2.id },
    update: {},
    create: {
      school_id: school2.id,
      school_name: 'Green Valley Academy',
      attendance_mode: 'session_based',
      attendance_ui_type: 'card_based',
      attendance_threshold: 80,
    },
  });

  const admin2 = await prisma.user.upsert({
    where: { email: 'admin@greenvalley.com' },
    update: { school_id: school2.id },
    create: {
      email: 'admin@greenvalley.com',
      password_hash: hashPassword('admin123456'),
      full_name: 'Green Valley Admin',
      role: 'admin',
      phone: '+251911000020',
      is_active: true,
      school_id: school2.id,
    },
  });
  console.log(`   ✓ School: "${school2.name}" | Admin: ${admin2.email}\n`);

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════');
  console.log('✅  Seed complete! Login credentials:\n');
  console.log('  SUPER ADMIN');
  console.log('  Email    : superadmin@zetime.com');
  console.log('  Password : superadmin123\n');
  console.log('  SCHOOL 1 ADMIN  (Demo High School)');
  console.log('  Email    : admin@school.com');
  console.log('  Password : admin123456\n');
  console.log('  TEACHERS (password: teacher123)');
  console.log('  abebe@school.com    → Mathematics Gr10A');
  console.log('  tigist@school.com   → English     Gr10B');
  console.log('  yonas@school.com    → Biology      Gr9A');
  console.log('  marta@school.com    → Physics     Gr11A');
  console.log('  solomon@school.com  → Chemistry   Gr12A\n');
  console.log('  SCHOOL 2 ADMIN  (Green Valley Academy)');
  console.log('  Email    : admin@greenvalley.com');
  console.log('  Password : admin123456\n');
  console.log('═══════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
