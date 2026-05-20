'use client'

import { Dashboard } from '@/components/school/dashboard'
import { useRouter } from 'next/navigation'

export default function TeacherDashboard() {
  const router = useRouter()

  const handleNavigate = (tab: string) => {
    const tabToPath: Record<string, string> = {
      'dashboard': '/school/teacher',
      'attendance': '/school/teacher/attendance',
      'reports': '/school/teacher/reports',
      'profile': '/school/teacher/profile',
    }

    const path = tabToPath[tab]
    if (path) {
      router.push(path)
    }
  }

  return (
    <div className="p-4 md:p-8">
      <Dashboard onNavigate={handleNavigate} />
    </div>
  )
}
