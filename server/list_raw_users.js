require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Using DATABASE_URL:', process.env.DATABASE_URL);
    console.log('Fetching users via Raw SQL...');
    const users = await prisma.$queryRaw`SELECT email, role, full_name FROM "User"`;
    console.log('Total Users:', users.length);
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('Error fetching users:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
