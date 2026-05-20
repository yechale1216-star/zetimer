'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Settings, CreditCard, LogOut, User, Users, CheckSquare, BarChart2, BookOpen } from 'lucide-react'
import { authService } from '@/lib/auth/auth'
import { useRouter } from 'next/navigation'
import { notifications } from '@/lib/utils/notifications'
import { TrialBanner } from '@/components/school/trial-banner'
import { SubscriptionProvider } from '@/lib/context/subscription-context'
import { ModeToggle } from '@/components/mode-toggle'

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
    setUser(authService.getCurrentUser())
    setIsAdmin(authService.isAdmin())
  }, [])

  const isActive = (path: string) => pathname === path

  const handleLogout = async () => {
    await authService.logout()
    notifications.info("Logged Out", "You have been successfully logged out")
    router.push('/login')
  }

  return (
    <SubscriptionProvider>
      <div className="flex h-screen bg-slate-50/50 dark:bg-slate-950 flex-col md:flex-row relative overflow-hidden">
        {/* Premium Background Pattern & Gradients */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-none [background-size:20px_20px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200/30 dark:bg-blue-900/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-200/30 dark:bg-indigo-900/10 rounded-full blur-[120px] animate-pulse" />
        </div>
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 border-r border-border bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl flex-col relative z-20">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0 border border-border">
                {user?.schoolLogo ? (
                  <img src={user.schoolLogo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary font-bold text-lg">
                    {user?.schoolName?.[0]?.toUpperCase() || "S"}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold truncate bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent" title={user?.schoolName || "School Admin"}>
                  {user?.schoolName || "School Admin"}
                </h2>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Administrator</p>
              </div>
            </div>
            <ModeToggle />
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-hide">
            <NavLink href="/school/admin" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" active={isActive('/school/admin')} />
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
            <NavLink href="/school/admin/subscription" icon={<CreditCard className="w-4 h-4" />} label="Subscription & Pricing" active={pathname.startsWith('/school/admin/subscription')} />
            {isAdmin && <NavLink href="/school/admin/settings" icon={<Settings className="w-4 h-4" />} label="Settings" active={isActive('/school/admin/settings')} />}
            <NavLink href="/school/admin/profile" icon={<User className="w-4 h-4" />} label="Profile" active={isActive('/school/admin/profile')} />
          </nav>

          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 px-4 py-2 mb-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                {user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate capitalize">{user?.role}</p>
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
          <TrialBanner />
          {/* Mobile Header */}
          <div className="md:hidden border-b border-border bg-background/50 p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0 border border-border">
                {user?.schoolLogo ? (
                  <img src={user.schoolLogo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary font-bold text-sm">
                    {user?.schoolName?.[0]?.toUpperCase() || "S"}
                  </span>
                )}
              </div>
              <h2 className="font-bold text-foreground truncate">{user?.schoolName || "School Admin"}</h2>
            </div>
            <ModeToggle />
          </div>

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
                active={isActive('/school/admin') && !isActive('/school/admin/subscription') && !isActive('/school/admin/settings')}
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
      <div className={`flex items-center gap-3 px-4 py-2 rounded-lg transition text-sm font-medium ${
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
      }`}>
        {icon}
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
      <div className={`flex flex-col items-center gap-1 px-4 py-3 transition ${
        active
          ? 'text-primary'
          : 'text-muted-foreground'
      }`}>
        {icon}
        <span className="text-xs">{label}</span>
      </div>
    </Link>
  )
}
