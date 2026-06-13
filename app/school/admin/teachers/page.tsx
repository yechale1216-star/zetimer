'use client'

import dynamic from 'next/dynamic'

const TeacherManagement = dynamic(
  () => import('@/components/school/teacher-management').then(mod => mod.TeacherManagement),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }
)

export default function TeachersPage() {
  return (
    <div className="p-4 md:p-8">
      <TeacherManagement />
    </div>
  )
}
