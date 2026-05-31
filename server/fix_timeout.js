const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Attempting to increase statement timeout...');
  try {
    await prisma.$executeRawUnsafe('SET statement_timeout = 600000;'); // 10 minutes
    console.log('Timeout set to 10 minutes for this session.');
  } catch (e) {
    console.error('Failed to set timeout:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
