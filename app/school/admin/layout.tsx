'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, User, CheckSquare, BarChart2, BookOpen,
  Settings, LogOut, CreditCard, MessageSquare, Phone, TrendingUp
} from 'lucide-react'
import { authService } from '@/lib/auth/auth'
import { useRouter } from 'next/navigation'
import { notifications } from '@/lib/utils/notifications'
import { TrialBanner } from '@/components/school/trial-banner'
import { SubscriptionProvider } from '@/lib/context/subscription-context'
import { ModeToggle } from '@/components/mode-toggle'
import { SocketProvider } from '@/components/providers/socket-provider'
import { CallProvider } from '@/components/providers/call-provider'
import { Logo } from '@/components/logo'
import { TopNav } from '@/components/layout/top-nav'

export default function SchoolAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  const [user, setUser] = React.useState<any>(null)
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
    const currentUser = authService.getCurrentUser()
    setUser(currentUser)
    setIsAdmin(authService.isAdmin())

    console.log("[RedirectDebug] SchoolAdminLayout mount:", {
      hasUser: !!currentUser,
      role: currentUser?.role,
      onboardingCompleted: currentUser?.onboardingCompleted,
      pathname
    })

    // Redirect new admins to onboarding wizard if they haven't completed setup.
    // Use explicit === false check so existing users without the field don't get redirected.
    if (currentUser?.role === 'admin' && currentUser?.onboardingCompleted === false) {
      if (pathname !== "/onboarding") {
        console.log("[RedirectDebug] Redirecting to /onboarding")
        router.replace('/onboarding')
      }
    }
  }, [router, pathname])

  const isPublicPage = pathname === "/school/admin/signup"

  const isActive = (path: string) => pathname === path

  const handleLogout = async () => {
    await authService.logout()
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

  return (
    <SubscriptionProvider>
      <SocketProvider>
        <CallProvider>
          <div className="flex h-screen bg-slate-50/50 dark:bg-slate-950 flex-col md:flex-row relative overflow-hidden">
            {/* Premium Background Pattern & Gradients */}
            <div className="absolute inset-0 pointer-events-none z-0">
              <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-none [background-size:20px_20px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
              <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200/30 dark:bg-blue-900/10 rounded-full blur-[120px] animate-pulse" />
              <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-200/30 dark:bg-indigo-900/10 rounded-full blur-[120px] animate-pulse" />
            </div>
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-64 border-r border-border bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl flex-col relative z-20">
              <div className="p-6 border-b border-border flex items-center">
                <Logo size="md" href="/school/admin" />
              </div>
              <nav className="flex-1 p-4 pt-4 space-y-2 overflow-y-auto scrollbar-hide">
                <NavLink href="/school/admin" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" active={isActive('/school/admin')} />
                <NavLink href="/school/admin/communication" icon={<MessageSquare className="w-4 h-4" />} label="Communication" active={isActive('/school/admin/communication')} />
                <NavLink href="/school/admin/calls" icon={<Phone className="w-4 h-4" />} label="Calls" active={isActive('/school/admin/calls')} />
                <NavLink href="/school/admin/students" icon={<Users className="w-4 h-4" />} label="Students" active={isActive('/school/admin/students')} />
                {isAdmin && (
                  <>
                    <NavLink href="/school/admin/teachers" icon={<User className="w-4 h-4" />} label="Teachers" active={isActive('/school/admin/teachers')} />
                    <NavLink href="/school/admin/teacher-assignments" icon={<BookOpen className="w-4 h-4" />} label="Assignments" active={isActive('/school/admin/teacher-assignments')} />
                  </>
                )}
                <NavLink href="/school/admin/attendance" icon={<CheckSquare className="w-4 h-4" />} label="Attendance" active={isActive('/school/admin/attendance')} />
                <NavLink href="/school/admin/attendance-by-grade" icon={<BarChart2 className="w-4 h-4" />} label="Grade Analytics" active={isActive('/school/admin/attendance-by-grade')} />
                <NavLink href="/school/admin/reports" icon={<BookOpen className="w-4 h-4" />} label="Reports" active={isActive('/school/admin/reports')} />
                {isAdmin && <NavLink href="/school/admin/promotion" icon={<TrendingUp className="w-4 h-4" />} label="Promotion" active={isActive('/school/admin/promotion')} />}
                <NavLink href="/school/admin/subscription" icon={<CreditCard className="w-4 h-4" />} label="Subscription & Pricing" active={pathname.startsWith('/school/admin/subscription')} />
                {isAdmin && <NavLink href="/school/admin/settings" icon={<Settings className="w-4 h-4" />} label="Settings" active={isActive('/school/admin/settings')} />}
                <NavLink href="/school/admin/profile" icon={<User className="w-4 h-4" />} label="Profile" active={isActive('/school/admin/profile')} />
                <NavLink href="/school/admin/support" icon={<MessageSquare className="w-4 h-4" />} label="Help & Support" active={isActive('/school/admin/support')} />
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

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative z-10">
              <TopNav showMenuButton />
              {/* Content */}
              <main className="flex-1 overflow-auto pb-20 md:pb-0">
                {children}
              </main>

              {/* Mobile Bottom Navigation Tabs */}
              <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-sm">
                <div className="flex items-center justify-around">
                  <MobileTabLink
                    href="/school/admin"
                    icon={<LayoutDashboard className="w-5 h-5" />}
                    label="Dashboard"
                    active={isActive('/school/admin') && !isActive('/school/admin/subscription') && !isActive('/school/admin/settings') && !isActive('/school/admin/communication') && !isActive('/school/admin/calls')}
                  />
                  <MobileTabLink
                    href="/school/admin/communication"
                    icon={<MessageSquare className="w-5 h-5" />}
                    label="Talk"
                    active={isActive('/school/admin/communication')}
                  />
                  <MobileTabLink
                    href="/school/admin/calls"
                    icon={<Phone className="w-5 h-5" />}
                    label="Calls"
                    active={isActive('/school/admin/calls')}
                  />
                  <MobileTabLink
                    href="/school/admin/subscription"
                    icon={<CreditCard className="w-5 h-5" />}
                    label="Pricing"
                    active={isActive('/school/admin/subscription')}
                  />
                  <MobileTabLink
                    href="/school/admin/settings"
                    icon={<Settings className="w-5 h-5" />}
                    label="Settings"
                    active={isActive('/school/admin/settings')}
                  />
                  <MobileTabLink
                    href="/school/admin/profile"
                    icon={<User className="w-5 h-5" />}
                    label="Profile"
                    active={isActive('/school/admin/profile')}
                  />
                </div>
              </nav>
            </div>
          </div>
        </CallProvider>
      </SocketProvider>
    </SubscriptionProvider>
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
    <Link href={href}>
      <div className={`flex flex-col items-center gap-1 px-4 py-3 transition ${active
          ? 'text-primary'
          : 'text-muted-foreground'
        }`}>
        {icon}
        <span className="text-xs">{label}</span>
      </div>
    </Link>
  )
}
