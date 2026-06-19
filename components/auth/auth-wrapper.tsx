"use client"

import { useState, useEffect } from "react"
import { LoginForm } from "./login-form"
import { AdminSignupForm } from "./admin-signup-form"
import { ForgotPasswordForm } from "./forgot-password-form"
import { ResetPasswordForm } from "./reset-password-form"

import { ArrowLeft, BarChart3, BookOpen, CheckCircle2, Clock, Download, LayoutDashboard, ShieldCheck, Users, WifiOff, XCircle } from 'lucide-react'
import { Logo } from '@/components/logo'

import { useLanguage } from "@/lib/context/language-context"
import { ModeToggle } from "@/components/mode-toggle"

type AuthView = "landing" | "login" | "admin-signup" | "forgot-password" | "reset-password"

interface AuthWrapperProps {
  onAuthSuccess: () => void
  defaultView?: AuthView
}

export function AuthWrapper({ onAuthSuccess, defaultView = "landing" }: AuthWrapperProps) {
  const { t, language, setLanguage } = useLanguage()
  const [currentView, setCurrentView] = useState<AuthView>(defaultView)
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    // Check if there's a reset token in the URL
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get("reset-token")
    if (token) {
      setResetToken(token)
      setCurrentView("reset-password")
    }

    // Detect screen size to decide default view
    const handleResize = () => {
      const desktop = window.innerWidth >= 768
      setIsDesktop(desktop)
      // On mobile/tablet, skip landing and go straight to login
      if (!desktop && currentView === "landing") {
        setCurrentView("login")
      }
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [currentView])

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsInstallable(false)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    // Check if app is already installed in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
       setIsInstallable(false)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      setDeferredPrompt(null)
      setIsInstallable(false)
    }
  }

  const handleResetSuccess = () => {
    // Clear the token from URL and redirect to login
    window.history.replaceState({}, document.title, window.location.pathname)
    setResetToken(null)
    setCurrentView("login")
  }

  const renderAuthForm = () => {
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

  // Landing Page View (Desktop Only)
  if (isDesktop && currentView === "landing") {
    return (
      <div className="auth-page min-h-screen relative overflow-y-auto overflow-x-hidden flex flex-col">
        {/* Navigation Header */}
        <header className="relative z-50 w-full px-8 py-6 flex items-center justify-between animate-in fade-in slide-in-from-top duration-700 max-w-7xl mx-auto">
          <div className="flex items-center gap-12">
            <Logo size="md" href="/" withText={true} />
            
            <nav className="hidden lg:flex items-center gap-8">
              <a href="#services" className="text-[11px] font-black text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase tracking-widest">Services</a>
              <a href="/about" className="text-[11px] font-black text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase tracking-widest">{t("about")}</a>
              <a href="/pricing" className="text-[11px] font-black text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase tracking-widest">{t("pricing")}</a>
              <a href="/terms" className="text-[11px] font-black text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase tracking-widest">{t("terms")}</a>
              {isInstallable && (
                <button 
                  onClick={handleInstallClick}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                >
                  <Download className="w-3 h-3" />
                  Install App
                </button>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-6">
            {/* Theme & Language Toggles (Consistent with Login Card) */}
            <div className="hidden sm:flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-200/50 dark:bg-white/5 p-1.5 px-3 rounded-full border border-slate-300 dark:border-white/10 transition-all hover:border-slate-400">
                 <span className="typography-label text-[10px] text-slate-600 dark:text-slate-500 uppercase font-black">{t("theme")}</span>
                 <div className="scale-75">
                   <ModeToggle />
                 </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-200/50 dark:bg-white/5 p-1.5 px-3 rounded-full border border-slate-300 dark:border-white/10 transition-all hover:border-slate-400">
                <button 
                  onClick={() => setLanguage('en')}
                  className={`text-[10px] px-2.5 py-0.5 rounded-full transition-all font-black ${language === 'en' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-500 hover:text-slate-900'}`}
                >
                  EN
                </button>
                <button 
                  onClick={() => setLanguage('am')}
                  className={`text-[10px] px-2.5 py-0.5 rounded-full transition-all font-black ${language === 'am' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-500 hover:text-slate-900'}`}
                >
                  አማ
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setCurrentView("login")}
                className="px-6 py-2.5 rounded-xl font-bold text-slate-700 dark:text-slate-200 hover:bg-white/10 transition-all"
              >
                Sign In
              </button>
              <button 
                onClick={() => setCurrentView("admin-signup")}
                className="px-6 py-2.5 rounded-xl font-bold bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all active:scale-95"
              >
                Get Started
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex flex-col items-center relative z-10 w-full">
          {/* Hero Content */}
          <section id="home" className="flex flex-col lg:flex-row items-center gap-12 w-full max-w-7xl mx-auto px-8 pt-6 pb-16">
            <div className="flex-1 text-center lg:text-left space-y-4 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider animate-in fade-in slide-in-from-bottom duration-700">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                The Bridge Between Home & School
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight animate-in slide-in-from-left duration-700 delay-100">
                Modern School <span className="text-blue-600 dark:text-blue-400 italic">Attendance Management</span> & Communication Platform.
              </h1>
              
              <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed animate-in slide-in-from-left duration-700 delay-200 mx-auto lg:mx-0">
                The professional platform for schools to master precision attendance management and real-time analytics, while bridging the communication gap between parents and staff through high-priority messaging.
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4 animate-in slide-in-from-bottom duration-700 delay-300">
                <button 
                  onClick={() => setCurrentView("admin-signup")}
                  className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-xl shadow-blue-500/30 hover:bg-blue-500 transition-all active:scale-95 text-sm"
                >
                  Join Your School
                </button>
                <div className="flex items-center -space-x-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 overflow-hidden">
                      <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" />
                    </div>
                  ))}
                  <div className="pl-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Trusted by 2k+ Families
                  </div>
                </div>
              </div>
            </div>

            {/* Illustration */}
            <div className="flex-1 w-full max-w-2xl animate-in zoom-in duration-1000 delay-500">
               <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 rounded-[40px] blur-3xl opacity-20 dark:opacity-40 group-hover:opacity-60 transition duration-1000"></div>
                <div className="relative rounded-[32px] overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.12)] dark:shadow-2xl border border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/10 backdrop-blur-2xl transition-transform duration-700 group-hover:scale-[1.02]">
                  <img
                    src="/zetime_branding_professional.png"
                    alt="Zetime Communication Dashboard"
                    className="w-full aspect-[4/3] object-cover opacity-95"
                  />
                  {/* Floating Analytics Card */}
                  <div className="absolute bottom-6 left-6 p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-xl border border-white/20 dark:border-white/5 animate-bounce-slow">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Analytics</div>
                        <div className="text-xl font-black text-slate-900 dark:text-white">+24% Efficiency</div>
                      </div>
                    </div>
                  </div>
                  {/* Floating Notification Box */}
                  <div className="absolute top-6 right-6 p-3 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-lg border border-white/20 dark:border-white/5 animate-in fade-in slide-in-from-top-4 duration-1000 delay-1000">
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                         <LayoutDashboard className="w-4 h-4 text-blue-600" />
                       </div>
                       <div>
                         <div className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter">High Priority</div>
                         <div className="text-[11px] font-bold text-slate-900 dark:text-white">Emergency Announcement</div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Core Pillars Section */}
          <section id="services" className="w-full py-24 bg-white/30 dark:bg-white/[0.02] backdrop-blur-sm border-y border-white/40 dark:border-white/10">
            <div className="max-w-7xl mx-auto px-8">
              <div className="text-center mb-16 space-y-4">
                <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">The Three Pillars of Zetime</h2>
                <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">A unified ecosystem where communication, attendance, and analytics work in perfect synergy.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                {/* Pillar 1: Communication */}
                <div className="flex flex-col space-y-6">
                  <div className="w-16 h-16 rounded-[22px] bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-500/20">
                    <Users className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="text-blue-600 font-bold uppercase tracking-widest text-[10px] mb-1">Priority One</div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">Strategic Communication</h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed italic border-l-4 border-blue-500/20 pl-6 py-2">
                      Transform passive updates into active engagement with private parent-teacher messaging and high-priority school announcements.
                    </p>
                  </div>
                </div>

                {/* Pillar 2: Attendance */}
                <div className="flex flex-col space-y-6">
                  <div className="w-16 h-16 rounded-[22px] bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-500/20">
                    <Clock className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="text-indigo-600 font-bold uppercase tracking-widest text-[10px] mb-1">Modern Foundation</div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">Precision Attendance</h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed italic border-l-4 border-indigo-500/20 pl-6 py-2">
                      Modernize your school with automated attendance tracking, student organization, and real-time arrival logging.
                    </p>
                  </div>
                </div>

                {/* Pillar 3: Analytics */}
                <div className="flex flex-col space-y-6">
                  <div className="w-16 h-16 rounded-[22px] bg-emerald-600 text-white flex items-center justify-center shadow-xl shadow-emerald-500/20">
                    <BarChart3 className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="text-emerald-600 font-bold uppercase tracking-widest text-[10px] mb-1">Actionable Intelligence</div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">Advanced Analytics</h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed italic border-l-4 border-emerald-500/20 pl-6 py-2">
                      Gain high-level clarity with multi-session attendance trends, interactive status distribution charts, and detailed grade-level performance exports.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Final Redirect Footer */}
          <footer className="w-full py-12 px-8 text-center text-slate-500/60 font-medium">
             <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-8 border-t border-slate-200 dark:border-white/5 pt-12">
                <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[11px] text-slate-500 dark:text-slate-500 uppercase font-black">
                  <a href="/about" className="hover:text-blue-600 transition-colors tracking-[0.2em]">{t("about")}</a>
                  <a href="/pricing" className="hover:text-blue-600 transition-colors tracking-[0.2em]">{t("pricing")}</a>
                  <a href="/privacy" className="hover:text-blue-600 transition-colors tracking-[0.2em]">Privacy</a>
                  <a href="/terms" className="hover:text-blue-600 transition-colors tracking-[0.2em]">{t("terms")}</a>
                </div>
                <div className="text-[11px] tracking-[0.3em] uppercase">
                  &copy; {new Date().getFullYear()} Zetime &bull; The New Standard
                </div>
             </div>
          </footer>
        </main>
      </div>
    )
  }

  // Auth View (Mobile/Tablet or Desktop After CTA)
  return (
    <div className="auth-page min-h-screen relative overflow-y-auto overflow-x-hidden flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Action Header */}
      <header className="absolute top-0 left-0 right-0 z-50 w-full px-8 py-8 flex items-center justify-end animate-in fade-in slide-in-from-top duration-700 max-w-7xl mx-auto">
        {isDesktop && (
          <button 
            onClick={() => setCurrentView("landing")}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white font-black transition-all hover:scale-105 text-xs uppercase tracking-[0.2em]"
          >
            <ArrowLeft className="w-5 h-5 pointer-events-none" />
            BACK
          </button>
        )}
      </header>

      {/* Balanced Responsive Aligned Authentication Form */}
      <div className="max-w-md w-full animate-in fade-in zoom-in-95 duration-1000 z-10 relative flex flex-col justify-start pt-0 -mt-10 md:-mt-24 min-h-screen">
        
        {/* Mobile Install Button */}
        {isInstallable && !isDesktop && (
          <div className="flex justify-center mb-6">
            <button 
              onClick={handleInstallClick}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-lg text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400"
            >
              <Download className="w-4 h-4" />
              Install Zetime App
            </button>
          </div>
        )}

        <div className="w-full relative px-1 sm:px-0">
          {renderAuthForm()}
        </div>

        <div className="mt-8 text-center animate-in fade-in duration-1000 delay-500">
           <div className="typography-label flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] text-slate-500 dark:text-slate-500 uppercase font-black mb-6">
              <a href="/about" className="hover:text-blue-700 dark:hover:text-blue-400 transition-colors tracking-widest">{t("about")}</a>
              <a href="/pricing" className="hover:text-blue-700 dark:hover:text-blue-400 transition-colors tracking-widest">{t("pricing")}</a>
              <a href="/privacy" className="hover:text-blue-700 dark:hover:text-blue-400 transition-colors tracking-widest">PRIVACY</a>
              <a href="/terms" className="hover:text-blue-700 dark:hover:text-blue-400 transition-colors tracking-widest">{t("terms")}</a>
           </div>
           <div className="text-[10px] text-slate-500/40 dark:text-slate-400/40 font-medium uppercase tracking-[0.3em]">
            &copy; {new Date().getFullYear()} Zetime &bull; Management Suite
          </div>
        </div>
      </div>
    </div>
  )
}

