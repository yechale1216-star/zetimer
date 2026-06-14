
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const messageCount = await prisma.message.count();
  const conversationCount = await prisma.conversation.count();
  const latestMessages = await prisma.message.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      sender: { select: { full_name: true } }
    }
  });

  console.log(`Total Conversations: ${conversationCount}`);
  console.log(`Total Messages: ${messageCount}`);
  console.log('Latest Messages:');
  console.log(JSON.stringify(latestMessages, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
