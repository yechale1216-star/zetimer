'use client'

import { AuthWrapper } from '@/components/auth/auth-wrapper'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/auth/auth'
import { Suspense } from 'react'

function LoginContent() {
  const router = useRouter()

  const handleAuthSuccess = (userData?: any) => {
    const user = userData || authService.getCurrentUser()
    
    if (user?.role === 'admin' || user?.role === 'school_admin' || user?.role === 'school-admin') {
      if (user?.onboardingCompleted === false) {
        router.push('/onboarding')
      } else {
        router.push('/school/admin')
      }
    } else if (user?.role === 'teacher') {
      router.push('/school/teacher')
    } else if (user?.role === 'parent') {
      router.push('/parent/dashboard')
    } else if (user?.role === 'super_admin') {
      router.push('/super-admin')
    } else {
      router.push('/school/admin')
    }
  }

  return (
    <AuthWrapper onAuthSuccess={handleAuthSuccess} defaultView="login" />
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}

