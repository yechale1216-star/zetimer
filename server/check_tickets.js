const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tickets = await prisma.supportTicket.findMany({
    include: { school: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }
  });
  console.log('Total Tickets:', tickets.length);
  console.log(JSON.stringify(tickets, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
