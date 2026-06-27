
import prisma from '../config/db';

async function check() {
  const phone = '+251911058684'; // Normalized
  const user = await prisma.user.findUnique({
    where: { phone }
  });

  if (!user) {
    console.log("No user found for phone:", phone);
    return;
  }

  console.log("User found:", user.id, user.full_name);

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: user.id },
    include: {
      school: true,
      student: true
    }
  });

  console.log("Links found:", links.length);
  links.forEach(l => {
    console.log(`- School: ${l.school?.name} (${l.schoolId}) | Student: ${l.student?.fullName}`);
  });

  process.exit(0);
}

check().catch(e => {
    console.error(e);
    process.exit(1);
});
