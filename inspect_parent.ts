import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const phone = '+251924919888';
  console.log(`Inspecting parent with phone: ${phone}`);

  const user = await prisma.user.findFirst({
    where: { phone: phone }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log('User found:', JSON.stringify(user, null, 2));

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: user.id },
    include: {
      student: true,
      school: true
    }
  });

  console.log(`Found ${links.length} parent-student links:`);
  links.forEach(l => {
    console.log(`- Student: ${l.student.fullName}, School: ${l.school.name} (ID: ${l.schoolId})`);
  });

  // Check unique schools
  const schoolIds = [...new Set(links.map(l => l.schoolId))];
  console.log(`Unique school IDs found: ${schoolIds.join(', ')}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
