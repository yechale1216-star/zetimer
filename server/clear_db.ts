import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Clearing database...');

  // Order matters due to foreign key constraints
  // Delete from bottom up (children first, then parents)
  
  await prisma.attendance.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.attendanceReport.deleteMany({});
  await prisma.parentNotification.deleteMany({});
  await prisma.parentStudentLink.deleteMany({});
  await prisma.messageRead.deleteMany({});
  await prisma.messageReaction.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.conversationMember.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.callParticipant.deleteMany({});
  await prisma.callHistory.deleteMany({});
  await prisma.callSession.deleteMany({});
  await prisma.teacherAssignment.deleteMany({});
  await prisma.parentPreferences.deleteMany({});
  await prisma.pendingRegistration.deleteMany({});
  
  await prisma.student.deleteMany({});
  await prisma.teacher.deleteMany({});
  await prisma.user.deleteMany({});
  
  await prisma.stream.deleteMany({});
  await prisma.section.deleteMany({});
  await prisma.grade.deleteMany({});
  
  await prisma.schoolSettings.deleteMany({});
  await prisma.school.deleteMany({});

  console.log('✅ Database cleared successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Failed to clear database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
