import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'abinet24x@gmail.com';
  const password = 'superadmin';
  const name = 'Admin User';
  const role = 'super_admin';

  console.log(`Creating superadmin: ${email}...`);

  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password_hash: hashedPassword,
        role: role,
        full_name: name,
        is_active: true
      },
      create: {
        email,
        password_hash: hashedPassword,
        full_name: name,
        role: role,
        is_active: true
      }
    });

    console.log('Superadmin created successfully:');
    console.log(JSON.stringify({
      id: user.id,
      email: user.email,
      role: user.role
    }, null, 2));

  } catch (error) {
    console.error('Error creating superadmin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
