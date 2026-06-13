const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const u = await prisma.user.findUnique({
      where: { email: 'abinet23x@gmail.com' }
    });

    if (!u) {
      console.log('User abinet23x@gmail.com not found');
      return;
    }

    console.log(`User: ${u.full_name}, SchoolId: ${u.schoolId}, Role: ${u.role}`);

    const contacts = await prisma.user.findMany({
      where: {
        schoolId: u.schoolId,
        role: { in: ['admin', 'school_admin', 'teacher', 'parent'] },
        is_active: true,
        // id: { not: u.id } // The service usually filters out self
      }
    });

    console.log(`Found ${contacts.length} contacts for school ${u.schoolId}`);
    contacts.forEach(c => console.log(`- ${c.full_name} (${c.role})`));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
