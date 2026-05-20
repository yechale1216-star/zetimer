'use client'

import { LoginForm } from '@/components/auth/login-form'
import { AdminSignupForm } from '@/components/auth/admin-signup-form'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/auth/auth'
import { CheckCircle2, Clock, ShieldCheck, Users } from 'lucide-react'

export default function LoginPage() {
  const [view, setView] = useState<'login' | 'admin-signup' | 'forgot-password' | 'reset-password'>('login')
  const router = useRouter()

  const handleLoginSuccess = () => {
    const user = authService.getCurrentUser()
    if (user?.role === 'admin') {
      router.push('/school/admin')
    } else if (user?.role === 'teacher') {
      router.push('/school/teacher')
    } else if (user?.role === 'super_admin') {
      router.push('/super-admin')
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Left Side: Branding & Illustration (Desktop Only) */}
      <div className="hidden md:flex md:w-1/2 relative bg-primary/5 items-center justify-center p-8 xl:p-12 overflow-hidden border-r border-border/50">
        {/* Abstract Background Shapes */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-3xl animate-pulse" />
        
        <div className="relative z-10 max-w-lg">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6 animate-in slide-in-from-left duration-700">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="text-primary-foreground font-black text-2xl">Z</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Zetime</h1>
            </div>
            
            <h2 className="text-4xl xl:text-5xl font-black text-foreground leading-[1.1] mb-6 animate-in slide-in-from-left duration-700 delay-100">
              Modern Attendance <br />
              <span className="text-primary">Management.</span>
            </h2>
            <p className="text-lg xl:text-xl text-muted-foreground mb-10 animate-in slide-in-from-left duration-700 delay-200">
              The professional choice for schools to track attendance, manage students, and generate real-time reports with ease.
            </p>

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
            </div>
          </div>

          {/* Illustration Container */}
          <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-primary/20 border border-border/50 animate-in zoom-in duration-1000 delay-500">
            <img 
              src="/school_login_illustration_1778883405545.png" 
              alt="School Attendance Illustration" 
              className="w-full aspect-video object-cover"
            />
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
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20 mb-4 scale-90 sm:scale-100">
              <span className="text-primary-foreground font-black text-2xl">Z</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Zetime</h1>
            <p className="text-sm text-muted-foreground">Attendance Management System</p>
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
                token="" // This would normally come from URL params
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

