import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'zetime12@gmail.com'
  const password = 'superadmin'
  const hashedPassword = bcrypt.hashSync(password, 10)

  console.log(`Setting up super admin: ${email}...`)

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password_hash: hashedPassword,
      role: 'super_admin'
    },
    create: {
      email,
      password_hash: hashedPassword,
      full_name: 'Zetime Super Admin',
      role: 'super_admin',
      is_active: true
    }
  })

  console.log('Super Admin account ready.')
  console.log(`ID: ${user.id}`)
  console.log(`Role: ${user.role}`)
}

main()
  .catch((e) => {
    console.error('Error setting up credentials:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
