'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, LogOut, User, CheckSquare, BarChart2, BookOpen, MessageSquare } from 'lucide-react'
import { useAuth } from '@/lib/context/auth-context'
import { AuthGuard } from '@/components/auth/auth-guard'
import { useRouter } from 'next/navigation'
import { notifications } from '@/lib/utils/notifications'
import { cn } from '@/lib/utils/utils'
import { ModeToggle } from '@/components/mode-toggle'
import { Logo } from '@/components/logo'
import { TopNav } from '@/components/layout/top-nav'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { LanguageProvider } from '@/lib/context/language-context'
import { SocketProvider } from '@/components/providers/socket-provider'
import { CallProvider } from '@/components/providers/call-provider'

function NavLink({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-semibold",
        active 
          ? "bg-primary text-primary-foreground shadow-md" 
          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground"
      )}
    >
      <div className={active ? "text-primary-foreground" : "text-slate-500 dark:text-slate-400 group-hover:text-foreground"}>
        {icon}
      </div>
      {label}
    </Link>
  )
}

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mounted, setMounted] = React.useState(false)
  const { user, logout } = useAuth()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isActive = (path: string) => pathname === path

  const handleLogout = async () => {
    await logout()
    notifications.info("Logged Out", "You have been successfully logged out")
    router.push('/login')
  }

  if (!mounted) {
    return <PageSkeleton variant="dashboard" />
  }

  return (
    <AuthGuard allowedRoles={['teacher']}>
      <LanguageProvider>
        <SocketProvider>
          <CallProvider>
            <div className="flex h-screen bg-background flex-col md:flex-row">
              {/* Desktop Sidebar */}
              <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col">
                <div className="p-6 border-b border-border flex items-center">
                  <Logo size="md" href="/school/teacher" />
                </div>
                <nav className="flex-1 p-4 pt-4 space-y-2 overflow-y-auto scrollbar-hide">
                  <NavLink href="/school/teacher" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" active={isActive('/school/teacher')} />
                  <NavLink href="/school/teacher/communication" icon={<MessageSquare className="w-4 h-4" />} label="Communication" active={isActive('/school/teacher/communication')} />
                  <NavLink href="/school/teacher/attendance" icon={<CheckSquare className="w-4 h-4" />} label="Take Attendance" active={isActive('/school/teacher/attendance')} />
                  <NavLink href="/school/teacher/classes" icon={<BookOpen className="w-4 h-4" />} label="My Classes" active={isActive('/school/teacher/classes')} />
                  <NavLink href="/school/teacher/reports" icon={<BarChart2 className="w-4 h-4" />} label="Attendance Reports" active={isActive('/school/teacher/reports')} />
                  <NavLink href="/school/teacher/profile" icon={<User className="w-4 h-4" />} label="My Profile" active={isActive('/school/teacher/profile')} />
                </nav>

                <div className="p-4 border-t border-border">
                  <div className="flex items-center gap-3 px-4 py-2 mb-2">
                    {user?.profile_photo ? (
                      <img
                        src={user.profile_photo}
                        alt={user.name}
                        className="h-8 w-8 rounded-full object-cover border border-primary/20"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-1 ring-primary/20">
                        {user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                    )}
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
              <div className="flex-1 flex flex-col overflow-hidden">
                <TopNav showMenuButton />
                <main className="flex-1 flex flex-col overflow-y-auto bg-muted/30 min-h-0">
                  <div className="flex-1 flex flex-col h-full min-h-0">
                    {children}
                  </div>
                </main>
              </div>
            </div>
          </CallProvider>
        </SocketProvider>
      </LanguageProvider>
    </AuthGuard>
  )
}
