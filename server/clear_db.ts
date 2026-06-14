
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Database Cleanup ---');

  // Sequential deletes to avoid transaction timeouts
  try {
    // Delete logs and tickets
    await prisma.attendanceReport.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.broadcastLog.deleteMany();
    await prisma.parentNotification.deleteMany();
    await prisma.supportTicket.deleteMany();

    // Delete messaging data
    await prisma.messageReaction.deleteMany();
    await prisma.messageRead.deleteMany();
    await prisma.pinnedMessage.deleteMany();
    await prisma.message.deleteMany();
    await prisma.conversationMember.deleteMany();
    await prisma.conversation.deleteMany();

    // Delete call sessions
    await prisma.callHistory.deleteMany();
    await prisma.callParticipant.deleteMany();
    await prisma.callSession.deleteMany();

    // Delete student data
    await prisma.studentPromotion.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.parentStudentLink.deleteMany();
    await prisma.student.deleteMany();

    // Delete teacher data
    await prisma.teacherAssignment.deleteMany();
    await prisma.teacher.deleteMany();

    // Delete school structural data
    await prisma.grade.deleteMany();
    await prisma.section.deleteMany();
    await prisma.stream.deleteMany();

    // Delete school settings and subscriptions
    await prisma.schoolSettings.deleteMany();
    await prisma.schoolAddon.deleteMany();
    await prisma.schoolFeatureOverride.deleteMany();
    await prisma.schoolSubscription.deleteMany();

    // Delete registration data
    await prisma.pendingRegistration.deleteMany();

    // Delete ALL users EXCEPT super_admins
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        role: { not: 'super_admin' }
      }
    });
    console.log(`Deleted ${deletedUsers.count} non-admin users.`);

    // Delete all Schools
    const deletedSchools = await prisma.school.deleteMany();
    console.log(`Deleted ${deletedSchools.count} schools.`);

  } catch (err) {
    console.error('Cleanup error:', err);
    throw err;
  }

  console.log('--- Cleanup Complete ---');
}

main()
  .catch(e => {
    console.error('Cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
