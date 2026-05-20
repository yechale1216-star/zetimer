'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, LogOut, User, CheckSquare, BarChart2, BookOpen } from 'lucide-react'
import { authService } from '@/lib/auth/auth'
import { useRouter } from 'next/navigation'
import { notifications } from '@/lib/utils/notifications'
import { cn } from '@/lib/utils/utils'
import { ModeToggle } from '@/components/mode-toggle'

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const user = authService.getCurrentUser()

  const isActive = (path: string) => pathname === path

  const handleLogout = async () => {
    await authService.logout()
    notifications.info("Logged Out", "You have been successfully logged out")
    router.push('/login')
  }

  if (!mounted) {
    return <div className="flex h-screen bg-background items-center justify-center">Loading...</div>
  }

  return (
    <div className="flex h-screen bg-background flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0 border border-border">
              {user?.schoolLogo ? (
                <img src={user.schoolLogo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary font-bold text-lg">
                  {user?.schoolName?.[0]?.toUpperCase() || "T"}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold truncate bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent" title={user?.schoolName || "Teacher Panel"}>
                {user?.schoolName || "Teacher Panel"}
              </h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Teacher Panel</p>
            </div>
          </div>
          <ModeToggle />
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-hide">
          <NavLink href="/school/teacher" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" active={isActive('/school/teacher')} />
          <NavLink href="/school/teacher/attendance" icon={<CheckSquare className="w-4 h-4" />} label="Take Attendance" active={isActive('/school/teacher/attendance')} />
          <NavLink href="/school/teacher/classes" icon={<BookOpen className="w-4 h-4" />} label="My Classes" active={isActive('/school/teacher/classes')} />
          <NavLink href="/school/teacher/reports" icon={<BarChart2 className="w-4 h-4" />} label="Attendance Reports" active={isActive('/school/teacher/reports')} />
          <NavLink href="/school/teacher/profile" icon={<User className="w-4 h-4" />} label="My Profile" active={isActive('/school/teacher/profile')} />
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
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

      {/* Mobile Top Nav */}
      <div className="md:hidden border-b border-border p-4 flex justify-between items-center bg-card">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0 border border-border">
            {user?.schoolLogo ? (
              <img src={user.schoolLogo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary font-bold text-sm">
                {user?.schoolName?.[0]?.toUpperCase() || "T"}
              </span>
            )}
          </div>
          <h2 className="font-bold text-primary truncate">{user?.schoolName || "Teacher Panel"}</h2>
        </div>
        <div className="flex items-center gap-3">
          <ModeToggle />
          <div className="flex gap-4">
            <Link href="/school/teacher" className={cn(isActive('/school/teacher') ? "text-primary" : "text-muted-foreground")}>
              <LayoutDashboard className="w-5 h-5" />
            </Link>
            <Link href="/school/teacher/attendance" className={cn(isActive('/school/teacher/attendance') ? "text-primary" : "text-muted-foreground")}>
              <CheckSquare className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-muted/30">
        {children}
      </main>
    </div>
  )
}

function NavLink({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-4 py-2 rounded-lg transition text-sm font-medium",
        active 
          ? "bg-primary text-primary-foreground shadow-sm" 
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </Link>
  )
}
