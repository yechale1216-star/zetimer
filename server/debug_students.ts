import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const students = await prisma.student.findMany({
    include: { school: true }
  })
  console.log('--- STUDENT LIST ---')
  students.forEach(s => {
    console.log(`ID: ${s.id} | student_id: ${s.student_id} | Name: ${s.fullName} | School: ${s.schoolId} (${s.school?.name})`)
  })
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
