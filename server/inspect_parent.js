const { PrismaClient } = require('@prisma/client');
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

  console.log('User found ID:', user.id);
  console.log('Global schoolId in User:', user.schoolId);

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: user.id },
    include: {
      student: {
        select: {
          fullName: true,
          schoolId: true,
          school: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });

  console.log(`Found ${links.length} parent-student links:`);
  links.forEach(l => {
    console.log(`- Student: ${l.student.fullName}, School: ${l.student.school.name} (Link SchoolId: ${l.schoolId}, Student SchoolId: ${l.student.schoolId})`);
  });

  // Check unique schools
  const schoolIds = [...new Set(links.map(l => l.schoolId))];
  console.log(`Unique school IDs from Links: ${schoolIds.join(', ')}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
