import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');

  // Delete all related records first
  await prisma.attendanceReport.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.parentStudentLink.deleteMany();
  await prisma.parentNotification.deleteMany();
  await prisma.messageRead.deleteMany();
  await prisma.messageReaction.deleteMany();
  await prisma.pinnedMessage.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationMember.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.callParticipant.deleteMany();
  await prisma.callHistory.deleteMany();
  await prisma.callSession.deleteMany();
  await prisma.teacherAssignment.deleteMany();
  await prisma.studentPromotion.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.student.deleteMany();
  await prisma.section.deleteMany();
  await prisma.stream.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.schoolSettings.deleteMany();
  await prisma.pendingRegistration.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.schoolFeatureOverride.deleteMany();
  await prisma.schoolAddon.deleteMany();
  await prisma.schoolSubscription.deleteMany();
  
  const teachersDeleted = await prisma.teacher.deleteMany({});
  console.log(`Deleted ${teachersDeleted.count} teachers.`);

  // Delete all users EXCEPT super_admin
  const usersDeleted = await prisma.user.deleteMany({
    where: {
      role: {
        not: 'super_admin'
      }
    }
  });
  console.log(`Deleted ${usersDeleted.count} users.`);

  // Delete all schools
  const schoolsDeleted = await prisma.school.deleteMany({});
  console.log(`Deleted ${schoolsDeleted.count} schools.`);

  console.log('Done clearing database.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
