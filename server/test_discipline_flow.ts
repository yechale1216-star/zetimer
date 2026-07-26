import prisma from './src/config/db';
import { DisciplineService } from './src/services/discipline.service';

async function main() {
  console.log('=== Starting Discipline Integration Test ===');

  // 1. Get a test school and student
  const school = await prisma.school.findFirst();
  if (!school) {
    throw new Error('No school found in DB');
  }
  console.log(`Using school: ${school.name} (${school.id})`);

  const student = await prisma.student.findFirst({
    where: { schoolId: school.id },
    include: { grade: true, section: true }
  });

  if (!student) {
    console.log('No student found in DB, skipping test creation');
    return;
  }
  console.log(`Using student: ${student.fullName} (${student.id})`);

  // 2. Ensure categories are seeded
  const categories = await DisciplineService.ensureDefaultCategories(school.id);
  console.log(`Categories ensured: ${categories.length} categories available`);

  // 3. Create an admin user context for reporting
  const adminUser = await prisma.user.findFirst({ where: { schoolId: school.id, role: 'school_admin' } })
    || await prisma.user.findFirst({ where: { schoolId: school.id } });
  
  const userCtx = {
    id: adminUser?.id || 'admin-test-id',
    role: 'school_admin',
    schoolId: school.id,
    email: adminUser?.email || 'admin@test.com'
  };

  // 4. File a discipline incident
  console.log('Filing a discipline incident...');
  const incident = await DisciplineService.createIncident(userCtx, {
    studentId: student.id,
    title: 'Disruption in classroom',
    description: 'Student was repeatedly using mobile phone during class.',
    categoryName: 'Phone Misuse',
    severity: 'MEDIUM',
    location: 'Room 102',
    witnesses: ['Teacher Kebede'],
    immediateAction: 'Phone confiscated temporarily',
    parentNotified: true
  });
  console.log(`✅ Incident created: ID=${incident.id}, Title="${incident.title}", Status=${incident.status}`);

  // 5. Add a follow-up
  console.log('Adding follow-up note...');
  const followUp = await DisciplineService.addFollowUp(userCtx, incident.id, {
    note: 'Parent called and acknowledged phone rules.',
    actionTaken: 'Parent meeting scheduled',
    status: 'UNDER_REVIEW'
  });
  console.log(`✅ Follow-up added: StatusAfter=${followUp.statusAfter}`);

  // 6. Fetch incidents list with search
  console.log('Testing incident search and filter...');
  const listResult = await DisciplineService.getIncidents(userCtx, { search: 'Disruption', page: 1, limit: 10 });
  console.log(`✅ Incidents search returned ${listResult.total} items (found: ${listResult.items.map(i => i.title).join(', ')})`);

  // 7. Test Analytics
  console.log('Testing Analytics endpoint...');
  const analytics = await DisciplineService.getAnalytics(userCtx);
  console.log(`✅ Analytics fetched: Total=${analytics.total}, OpenCases=${analytics.openCases}, Critical=${analytics.criticalCases}`);

  // 8. Clean up test incident
  console.log('Cleaning up test incident...');
  await prisma.studentDiscipline.delete({ where: { id: incident.id } });
  console.log('🎉 All Discipline module integration checks passed successfully!');
}

main().catch(err => {
  console.error('❌ Discipline Test Failed:', err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
