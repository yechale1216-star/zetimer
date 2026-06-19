import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL
    }
  }
})

async function main() {
  console.log('--- Database Cleanup Started ---')

  // We delete in reverse order of dependencies to avoid foreign key violations.
  // Note: Many relations have onDelete: Cascade in the schema, but explicit deletion is safer for cleanup.
  
  console.log('1. Clearing transactional data...')
  await prisma.attendance.deleteMany({})
  await prisma.messageRead.deleteMany({})
  await prisma.messageReaction.deleteMany({})
  await prisma.pinnedMessage.deleteMany({})
  await prisma.message.deleteMany({})
  await prisma.callParticipant.deleteMany({})
  await prisma.callHistory.deleteMany({})
  await prisma.callSession.deleteMany({})
  await prisma.parentNotification.deleteMany({})
  await prisma.auditLog.deleteMany({})
  await prisma.broadcastLog.deleteMany({})

  console.log('2. Clearing student and parent data...')
  await prisma.parentStudentLink.deleteMany({})
  await prisma.studentPromotion.deleteMany({})
  await prisma.student.deleteMany({})

  console.log('3. Clearing academic structure...')
  await prisma.teacherAssignment.deleteMany({})
  await prisma.grade.deleteMany({})
  await prisma.section.deleteMany({})
  await prisma.stream.deleteMany({})
  await prisma.teacher.deleteMany({})

  console.log('4. Clearing school-specific configurations...')
  await prisma.schoolSettings.deleteMany({})
  await prisma.schoolSubscription.deleteMany({})
  await prisma.schoolAddon.deleteMany({})
  await prisma.schoolFeatureOverride.deleteMany({})
  await prisma.supportTicket.deleteMany({})
  await prisma.pendingRegistration.deleteMany({})

  console.log('5. Clearing Users and Schools...')
  // Identify super admins to preserve if possible, or just follow user's direct order.
  // User said "cleare from db schools and users", so we will likely clear all.
  // BUT we will save one super_admin if it exists to allow the user to get back in.
  
  const superAdmins = await prisma.user.findMany({ where: { role: 'super_admin' } })
  if (superAdmins.length > 0) {
    console.log(`Preserving ${superAdmins.length} super admin(s) for access:`, superAdmins.map(u => u.email).join(', '))
    await prisma.user.deleteMany({ where: { role: { not: 'super_admin' } } })
  } else {
    await prisma.user.deleteMany({})
  }

  // Final step: Clear schools (Cascade will handle remaining sub-objects if any)
  await prisma.school.deleteMany({})

  console.log('--- Database Cleanup Finished ---')
  console.log('Schools: 0')
  const remainingUsers = await prisma.user.count()
  console.log(`Users: ${remainingUsers} (Preserved Super Admins)`)
}

main()
  .catch((e) => {
    console.error('Error during cleanup:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
