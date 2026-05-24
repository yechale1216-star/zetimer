"use client"

import { useState, useEffect } from "react"
import { LoginForm } from "./login-form"
import { AdminSignupForm } from "./admin-signup-form"
import { ForgotPasswordForm } from "./forgot-password-form"
import { ResetPasswordForm } from "./reset-password-form"

import { CheckCircle2, Clock, ShieldCheck, Users } from 'lucide-react'
import { Logo } from '@/components/logo'

interface AuthWrapperProps {
  onAuthSuccess: () => void
}

export function AuthWrapper({ onAuthSuccess }: AuthWrapperProps) {
  const [currentView, setCurrentView] = useState<"login" | "admin-signup" | "forgot-password" | "reset-password">(
    "login",
  )
  const [resetToken, setResetToken] = useState<string | null>(null)

  useEffect(() => {
    // Check if there's a reset token in the URL
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get("reset-token")
    if (token) {
      setResetToken(token)
      setCurrentView("reset-password")
    }
  }, [])

  const handleResetSuccess = () => {
    // Clear the token from URL and redirect to login
    window.history.replaceState({}, document.title, window.location.pathname)
    setResetToken(null)
    setCurrentView("login")
  }

  const renderView = () => {
    if (currentView === "admin-signup") {
      return <AdminSignupForm onSignupSuccess={onAuthSuccess} onBack={() => setCurrentView("login")} />
    }

    if (currentView === "forgot-password") {
      return <ForgotPasswordForm onBackToLogin={() => setCurrentView("login")} />
    }

    if (currentView === "reset-password" && resetToken) {
      return <ResetPasswordForm token={resetToken} onResetSuccess={handleResetSuccess} />
    }

    return (
      <LoginForm
        onLoginSuccess={onAuthSuccess}
        onShowForgotPassword={() => setCurrentView("forgot-password")}
        onShowAdminSignup={() => setCurrentView("admin-signup")}
      />
    )
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col md:flex-row bg-background overflow-x-hidden">
      {/* Left Side: Branding & Illustration (Desktop Only) */}
      <div className="hidden md:flex md:w-1/2 relative bg-primary/5 items-center justify-center p-8 xl:p-12 overflow-hidden border-r border-border/50">
        {/* Abstract Background Shapes */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-3xl animate-pulse" />
        
        <div className="relative z-10 max-w-lg">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6 animate-in slide-in-from-left duration-700">
              <Logo size="md" href="/" />
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
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 md:p-12 relative">
        {/* Background Accents */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/[0.03] to-background" />
        
        <div className="max-w-md w-full py-8 md:py-0 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          {/* Mobile/Tablet Logo Section */}
          <div className="md:hidden flex flex-col items-center mb-10">
            <Logo size="md" href="/" className="scale-90 sm:scale-100" />
            <p className="text-sm text-muted-foreground mt-2">Attendance Management System</p>
          </div>

          <div className="w-full relative px-1 sm:px-0">
            {renderView()}
          </div>

          <div className="mt-8 text-center text-[10px] sm:text-xs text-muted-foreground/60 px-4">
            &copy; {new Date().getFullYear()} Zetime. Professional School Management Solutions. <br className="sm:hidden" /> Made for modern education.
          </div>
        </div>
      </div>
    </div>
  )
}

