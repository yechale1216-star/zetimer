import prisma from './src/config/db';

async function main() {
  try {
    const cats = await prisma.disciplineCategory.findMany();
    const incidents = await prisma.studentDiscipline.findMany();
    console.log('=== Discipline DB Audit ===');
    console.log(`Categories count: ${cats.length}`);
    console.log(`Incidents count:  ${incidents.length}`);
    if (cats.length > 0) {
      console.log('Categories:', cats.map(c => c.name));
    }
  } catch (err: any) {
    console.error('Error querying discipline tables:', err.message);
  }
}

main().finally(() => prisma.$disconnect());
