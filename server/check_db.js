
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const schools = await prisma.school.findMany({ take: 1 });
    console.log('Schools table exists. Found:', schools.length);
  } catch (e) {
    console.error('Error accessing School table:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
