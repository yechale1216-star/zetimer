const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getDefaultSchoolId = async () => {
  console.log('Searching for first school...');
  let school = await prisma.school.findFirst();
  if (!school) {
    console.log('No school found, creating Main School...');
    school = await prisma.school.create({
      data: { name: 'Main School' }
    });
  }
  console.log('School ID:', school.id);
  return school.id;
};

async function main() {
  try {
    await getDefaultSchoolId();
    console.log('SUCCESS');
  } catch (error) {
    console.error('CAUGHT ERROR:', error);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
