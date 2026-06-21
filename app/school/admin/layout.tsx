'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, User, CheckSquare, BarChart2, BookOpen,
  Settings, LogOut, CreditCard, MessageSquare, Phone, TrendingUp, ShieldBan,
  X, ChevronRight, Megaphone
} from 'lucide-react'
import { cn } from "@/lib/utils/utils"

import { useAuth } from '@/lib/context/auth-context'
import { useSchool } from '@/lib/context/school-context'
import { AuthGuard } from '@/components/auth/auth-guard'
import { useRouter } from 'next/navigation'
import { notifications } from '@/lib/utils/notifications'
import { TrialBanner } from '@/components/school/trial-banner'
import { SubscriptionProvider } from '@/lib/context/subscription-context'
import { ModeToggle } from '@/components/mode-toggle'
import { SocketProvider } from '@/components/providers/socket-provider'
import { CallProvider } from '@/components/providers/call-provider'
import { Logo } from '@/components/logo'
import { TopNav } from '@/components/layout/top-nav'

import { apiUrl } from '@/lib/api-config'
const API_URL = apiUrl;
import { clearMessageCache } from '@/lib/utils/message-cache'

function SuspendedBanner() {
  const [isSuspended, setIsSuspended] = React.useState(false)
  const { user } = useAuth()

  React.useEffect(() => {
    const check = async () => {
      try {
        const token = localStorage.getItem('attendance_token')
        if (!user?.schoolId || user?.role === 'super_admin') return
        const res = await fetch(`${API_URL}/api/schools/${user.schoolId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const json = await res.json()
        if (json.success && json.data?.subscriptionStatus === 'SUSPENDED') {
          setIsSuspended(true)
        }
      } catch {}
    }
    check()
  }, [user])

  if (!isSuspended) return null

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-red-600 text-white text-sm font-medium z-50">
      <ShieldBan className="w-4 h-4 flex-shrink-0" />
      <span>
        <strong>Account Suspended.</strong> You can view existing data but cannot create, edit, or delete anything.
        Please contact support to restore access.
      </span>
    </div>
  )
}

export default function SchoolAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  const { user, features, logout } = useAuth()
  const { clearSchoolContext } = useSchool()
  const isAdmin = user?.role === 'admin' || user?.role === 'school_admin'
  const [isMounted, setIsMounted] = React.useState(false)
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [showBottomNav, setShowBottomNav] = React.useState(true)
  const [lastScrollY, setLastScrollY] = React.useState(0)

  const handleMainScroll = (e: React.UIEvent<HTMLElement>) => {
    const currentScrollY = e.currentTarget.scrollTop
    const diff = currentScrollY - lastScrollY
    
    // Standard behavior: Disappear when scroll DOWN (diff > 5), Reappear when scroll UP (diff < -5)
    if (diff > 5 && currentScrollY > 100) {
      setShowBottomNav(false)
    } else if (diff < -5) {
      setShowBottomNav(true)
    }
    setLastScrollY(currentScrollY)
  }

  React.useEffect(() => {
    const handleChatScroll = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.direction === 'down') {
        setShowBottomNav(false);
      } else if (customEvent.detail?.direction === 'up') {
        setShowBottomNav(true);
      }
    };

    window.addEventListener('chat-scroll', handleChatScroll);
    return () => window.removeEventListener('chat-scroll', handleChatScroll);
  }, []);

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  React.useEffect(() => {
    if (user?.role === 'admin' && user?.onboardingCompleted === false) {
      if (pathname !== "/onboarding") {
        console.log("[RedirectDebug] Redirecting to /onboarding")
        router.replace('/onboarding')
      }
    }
  }, [user, router, pathname])

  // Close sidebar on route change
  React.useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const isPublicPage = pathname === "/school/admin/signup"
  const isActive = (path: string) => pathname === path
  const isCommunicationPage = pathname?.includes('/communication')

  const handleLogout = () => {
    console.log(`[AdminLayout][LOGOUT] userId: ${user?.id} | role: ${user?.role}`)
    clearMessageCache().catch(() => {})
    clearSchoolContext()
    logout()
    notifications.info("Logged Out", "You have been successfully logged out")
    router.push('/login')
  }

  if (!isMounted) return null

  if (isPublicPage) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <div className="p-6">
          <Logo size="md" href="/" />
        </div>
        <main className="flex-1">
          {children}
        </main>
      </div>
    )
  }

  const allNavItems = [
    { href: '/school/admin', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', show: true },
    { href: '/school/admin/announcements', icon: <Megaphone className="w-5 h-5" />, label: 'Announcements', show: true },
    { href: '/school/admin/communication', icon: <MessageSquare className="w-5 h-5" />, label: 'Communication', show: true },
    { href: '/school/admin/calls', icon: <Phone className="w-5 h-5" />, label: 'Calls', show: true },
    { href: '/school/admin/students', icon: <Users className="w-5 h-5" />, label: 'Students', show: true },
    { href: '/school/admin/teachers', icon: <User className="w-5 h-5" />, label: 'Teachers', show: true },
    { href: '/school/admin/teacher-assignments', icon: <BookOpen className="w-5 h-5" />, label: 'Assignments', show: true },
    { href: '/school/admin/attendance', icon: <CheckSquare className="w-5 h-5" />, label: 'Attendance', show: true },
    { href: '/school/admin/attendance-by-grade', icon: <BarChart2 className="w-5 h-5" />, label: 'Grade Analytics', show: true },
    { href: '/school/admin/reports', icon: <BookOpen className="w-5 h-5" />, label: 'Reports', show: true },
    { href: '/school/admin/promotion', icon: <TrendingUp className="w-5 h-5" />, label: 'Promotion', show: true },
    { href: '/school/admin/subscription', icon: <CreditCard className="w-5 h-5" />, label: 'Subscription & Pricing', show: true },
    { href: '/school/admin/settings', icon: <Settings className="w-5 h-5" />, label: 'Settings', show: true },
    { href: '/school/admin/profile', icon: <User className="w-5 h-5" />, label: 'Profile', show: true },
    { href: '/school/admin/support', icon: <MessageSquare className="w-5 h-5" />, label: 'Help & Support', show: true },
  ]

  return (
    <AuthGuard allowedRoles={['admin', 'school_admin']}>
      <SubscriptionProvider>
        <SocketProvider>
          <CallProvider>
          <div className="flex h-screen bg-background dark:bg-slate-950 flex-col md:flex-row relative overflow-hidden">
            {/* Premium Background Pattern & Gradients */}
            <div className="absolute inset-0 pointer-events-none z-0">
              <div className="absolute inset-0 bg-none dark:bg-none [background-size:20px_20px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
              <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100/20 dark:bg-blue-900/10 rounded-full blur-[120px] animate-pulse" />
              <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-100/20 dark:bg-indigo-900/10 rounded-full blur-[120px] animate-pulse" />
            </div>

            {/* ── Mobile / Tablet Sidebar Drawer ── */}
            {/* Backdrop */}
            {sidebarOpen && (
              <div
                className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Slide-in drawer */}
            <aside
              className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-card dark:bg-slate-900 border-r border-border flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/80 backdrop-blur-xl">
                <Logo size="sm" href="/school/admin" />
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg hover:bg-secondary transition text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Nav */}
              <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {allNavItems
                  .filter(item => item.show)
                  .map(item => {
                    const active = item.href === '/school/admin/subscription'
                      ? pathname.startsWith('/school/admin/subscription')
                      : isActive(item.href)
                    return (
                      <Link key={item.href} href={item.href}>
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-semibold group ${
                          active
                            ? 'bg-primary/15 text-primary shadow-sm'
                            : 'text-slate-600 dark:text-slate-300 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}>
                          <span className={active ? 'text-primary' : 'text-slate-500 dark:text-slate-400 group-hover:text-foreground'}>
                            {item.icon}
                          </span>
                          <span className="flex-1">{item.label}</span>
                          {active && <ChevronRight className="w-4 h-4 text-primary/60" />}
                        </div>
                      </Link>
                    )
                  })}
              </nav>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-3 px-4 py-2 mb-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                    {user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate capitalize">
                      {user?.role} {user?.customSchoolId && `• ${user.customSchoolId}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 transition text-sm font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </aside>

            {/* ── Desktop Sidebar ── */}
            <aside className="hidden md:flex w-64 border-r border-border bg-card/70 dark:bg-slate-950/70 backdrop-blur-xl flex-col relative z-20">
              <div className="p-6 border-b border-border flex items-center">
                <Logo size="md" href="/school/admin" />
              </div>
              <nav className="flex-1 p-4 pt-4 space-y-2 overflow-y-auto scrollbar-hide">
                {allNavItems
                  .filter(item => item.show)
                  .map(item => {
                    const active = item.href === '/school/admin/subscription'
                      ? pathname.startsWith('/school/admin/subscription')
                      : isActive(item.href)
                    return (
                      <NavLink
                        key={item.href}
                        href={item.href}
                        icon={item.icon}
                        label={item.label}
                        active={active}
                      />
                    )
                  })}
              </nav>

              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-3 px-4 py-2 mb-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    {user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate capitalize">
                      {user?.role} {user?.customSchoolId && `• ${user.customSchoolId}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition text-sm font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </aside>

            {/* ── Main Content ── */}
            <div className="flex-1 flex flex-col overflow-hidden relative z-10">
              <TopNav showMenuButton onMenuClick={() => setSidebarOpen(true)} />

              <main 
                className={cn(
                  "flex-1 flex flex-col overflow-auto relative min-h-0",
                  !isCommunicationPage && "pb-20 md:pb-0"
                )}
                onScroll={handleMainScroll}
              >
                <SuspendedBanner />
                <div className="flex-1 flex flex-col h-full min-h-0">
                  {children}
                </div>
              </main>

              {/* ── Mobile Bottom Navigation (5 tabs) ── */}
              {!isCommunicationPage && (
                <nav className={cn(
                  "md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur-md shadow-[0_-2px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-2px_20px_rgba(0,0,0,0.3)] transition-transform duration-300 ease-in-out",
                  !showBottomNav ? "translate-y-full" : "translate-y-0"
                )}>
                <div className="flex items-stretch justify-around">
                  <MobileTabLink
                    href="/school/admin"
                    icon={<LayoutDashboard className="w-5 h-5" />}
                    label="Home"
                    active={isActive('/school/admin')}
                  />
                  <MobileTabLink
                    href="/school/admin/announcements"
                    icon={<Megaphone className="w-5 h-5" />}
                    label="Alerts"
                    active={isActive('/school/admin/announcements')}
                  />
                  <MobileTabLink
                    href="/school/admin/attendance-by-grade"
                    icon={<BarChart2 className="w-5 h-5" />}
                    label="Analytics"
                    active={isActive('/school/admin/attendance-by-grade')}
                  />
                  <MobileTabLink
                    href="/school/admin/attendance"
                    icon={<CheckSquare className="w-5 h-5" />}
                    label="Attendance"
                    active={isActive('/school/admin/attendance')}
                  />
                  <MobileTabLink
                    href="/school/admin/settings"
                    icon={<Settings className="w-5 h-5" />}
                    label="Settings"
                    active={isActive('/school/admin/settings')}
                  />
                </div>
              </nav>
              )}
            </div>
          </div>
        </CallProvider>
      </SocketProvider>
    </SubscriptionProvider>
    </AuthGuard>
  )
}

function NavLink({
  href,
  icon,
  label,
  active,
}: {
  href: string
  icon: React.ReactNode
  label: string
  active: boolean
}) {
  return (
    <Link href={href}>
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-semibold ${active
          ? 'bg-primary/15 text-primary shadow-sm'
          : 'text-slate-600 dark:text-slate-300 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}>
        <div className={active ? 'text-primary' : 'text-slate-500 dark:text-slate-400 group-hover:text-foreground'}>
          {icon}
        </div>
        {label}
      </div>
    </Link>
  )
}

function MobileTabLink({
  href,
  icon,
  label,
  active,
}: {
  href: string
  icon: React.ReactNode
  label: string
  active: boolean
}) {
  return (
    <Link href={href} className="flex-1 min-w-0">
      <div className={`relative flex flex-col items-center justify-center gap-[5px] py-3 px-1 min-h-[60px] transition-all duration-200 ${
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
      }`}>
        {/* Active indicator pill at top */}
        {active && (
          <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[3px] rounded-full bg-primary" />
        )}
        {/* Icon */}
        <span className={`flex items-center justify-center transition-transform duration-200 ${active ? 'scale-110' : 'scale-100'}`}>
          {icon}
        </span>
        {/* Label — always visible */}
        <span className="text-[11px] font-semibold leading-tight tracking-wide text-center whitespace-nowrap">
          {label}
        </span>
      </div>
    </Link>
  )
}
