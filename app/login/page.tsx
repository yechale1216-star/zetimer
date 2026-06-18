'use client'

import { LoginForm } from '@/components/auth/login-form'
import { AdminSignupForm } from '@/components/auth/admin-signup-form'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authService } from '@/lib/auth/auth'
import { BarChart3, BookOpen, CheckCircle2, Clock, LayoutDashboard, ShieldCheck, Users, WifiOff } from 'lucide-react'
import { Logo } from '@/components/logo'
import { Suspense } from 'react'

function LoginContent() {
  const [view, setView] = useState<'login' | 'admin-signup' | 'forgot-password' | 'reset-password'>('login')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const t = searchParams.get('token')
    if (t) {
      setToken(t)
      setView('reset-password')
    }
  }, [searchParams])

  const handleLoginSuccess = (userData?: any) => {
    const user = userData || authService.getCurrentUser()
    console.log("[Login] Redirecting user with role:", user?.role, "onboarding completed:", user?.onboardingCompleted)
    
    if (user?.role === 'admin' || user?.role === 'school_admin' || user?.role === 'school-admin') {
      if (user?.onboardingCompleted === false) {
        console.log("[Login] Admin onboarding incomplete, redirecting to Setup Wizard")
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
      // Default fallback to prevent being stuck on login page
      console.warn("[Login] Unknown role, falling back to school admin dashboard:", user?.role)
      router.push('/school/admin')
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Left Side: Branding & Illustration (Desktop Only) */}
      <div className="hidden md:flex md:w-1/2 relative bg-primary/5 items-start justify-center p-8 pt-8 xl:p-12 xl:pt-12 overflow-hidden border-r border-border/50">
        {/* Abstract Background Shapes */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-3xl animate-pulse" />

        <div className="relative z-10 max-w-xl">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6 animate-in slide-in-from-left duration-700">
              <Logo size="md" href="/" />
            </div>

            <h2 className="text-4xl xl:text-5xl font-black text-foreground leading-[1.1] mb-6 animate-in slide-in-from-left duration-700 delay-100">
              Modern Attendance <br />
              <span className="text-primary">Management System.</span>
            </h2>
            <p className="text-lg xl:text-xl text-muted-foreground mb-10 animate-in slide-in-from-left duration-700 delay-200">
              The professional choice for schools to track attendance, manage students, and generate real-time reports with ease.
            </p>

            {/* Illustration Container */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-primary/20 border border-border/50 animate-in zoom-in duration-1000 delay-500 mb-10">
              <img
                src="/zetime_branding_professional.png"
                alt="Ethiopian School Attendance Analysis"
                className="w-full aspect-[16/11] object-cover"
              />
            </div>

            <div className="grid grid-cols-2 gap-6 animate-in slide-in-from-bottom duration-700 delay-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 shadow-sm border border-border flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium text-sm">Real-time Tracking</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 shadow-sm border border-border flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium text-sm">Student Management</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 shadow-sm border border-border flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium text-sm">Smart Notifications</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 shadow-sm border border-border flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium text-sm">Secure Data</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 shadow-sm border border-border flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium text-sm">Detailed Reports</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 shadow-sm border border-border flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium text-sm">Teacher Portal</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 shadow-sm border border-border flex items-center justify-center">
                  <WifiOff className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium text-sm">Offline Capability</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 shadow-sm border border-border flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium text-sm">Parent Access</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Authentication Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 md:p-12 relative overflow-x-hidden">
        {/* Background Accents (Mobile and Desktop) */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/[0.03] to-background" />

        <div className="max-w-md w-full py-8 md:py-0 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          {/* Mobile/Tablet Logo Section */}
          <div className="md:hidden flex flex-col items-center mb-10">
            <Logo size="md" href="/" className="scale-90 sm:scale-100" />
            <p className="text-sm text-muted-foreground mt-2">Attendance Management System</p>
          </div>

          <div className="w-full relative px-1 sm:px-0">
            {view === 'login' && (
              <LoginForm
                onLoginSuccess={handleLoginSuccess}
                onShowAdminSignup={() => setView('admin-signup')}
                onShowForgotPassword={() => setView('forgot-password')}
              />
            )}
            {view === 'admin-signup' && (
              <AdminSignupForm
                onSignupSuccess={handleLoginSuccess}
                onBack={() => setView('login')}
              />
            )}
            {view === 'forgot-password' && (
              <ForgotPasswordForm
                onBackToLogin={() => setView('login')}
              />
            )}
            {view === 'reset-password' && (
              <ResetPasswordForm
                token={token || ""}
                onResetSuccess={() => setView('login')}
              />
            )}
          </div>

          <div className="mt-8 text-center text-[10px] sm:text-xs text-muted-foreground/60 px-4">
            &copy; {new Date().getFullYear()} Zetime. Professional School Management Solutions. <br className="sm:hidden" /> Made for modern education.
          </div>
        </div>
      </div>
    </div>
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

