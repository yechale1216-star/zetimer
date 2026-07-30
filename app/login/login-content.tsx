'use client'

import { AuthWrapper } from '@/components/auth/auth-wrapper'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/auth/auth'
import { Suspense } from 'react'

function LoginContent() {
  const router = useRouter()

  const handleAuthSuccess = (userData?: any) => {
    // 1. Capture current state
    const user = userData || authService.getCurrentUser()
    const role = user?.role || 'parent';
    
    // Get schools from userData first, then fallback to localStorage
    let schools = userData?._availableSchools;
    if (!schools) {
      const availableStr = localStorage.getItem("available_schools")
      schools = availableStr ? JSON.parse(availableStr) : []
    }
    
    console.log(`[LoginPage] handleAuthSuccess | role: ${role} | schools: ${schools?.length || 0}`)
    
    // 2. Perform redirection with a tiny delay to let AuthContext settle
    const schoolList = Array.isArray(schools) ? schools : []
    
    setTimeout(() => {
      if (schoolList.length > 1) {
        console.log(`[Login] Redirecting to school selection (${schoolList.length} schools)`)
        window.location.href = '/auth/school-select'
        return
      }
      
      console.log(`[Login] Single school found. Redirecting to dashboard for role: ${role}`)
      
      if (role === 'admin' || role === 'school_admin' || role === 'school-admin') {
        if (user?.onboardingCompleted === false) {
          router.push('/onboarding')
        } else {
          router.push('/school/admin')
        }
      } else if (role === 'teacher') {
        router.push('/school/teacher')
      } else if (role === 'parent') {
        router.push('/parent/dashboard')
      } else if (role === 'super_admin') {
        router.push('/super-admin')
      } else {
        router.push('/school/admin')
      }
    }, 50)
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

