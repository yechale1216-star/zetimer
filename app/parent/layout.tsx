"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  Calendar,
  User,
  Bell,
  LogOut,
  ChevronDown,
  X,
  GraduationCap,
  MessageSquare,
  Megaphone,
  ChevronRight
} from "lucide-react"
import { parentDb } from "@/lib/db/parent-db"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Logo } from "@/components/logo"
import { TopNav } from "@/components/layout/top-nav"

import { LanguageProvider, useLanguage } from "@/lib/context/language-context"
import { useSchool } from "@/lib/context/school-context"
import { useAuth } from "@/lib/context/auth-context"
import { AuthGuard } from "@/components/auth/auth-guard"
import { clearMessageCache } from "@/lib/utils/message-cache"
import { cn } from "@/lib/utils/utils"
import { SocketProvider } from "@/components/providers/socket-provider"
import { CallProvider } from "@/components/providers/call-provider"

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["parent"]}>
      <LanguageProvider>
        <SocketProvider>
          <CallProvider>
            <ParentLayoutInner>{children}</ParentLayoutInner>
          </CallProvider>
        </SocketProvider>
      </LanguageProvider>
    </AuthGuard>
  )
}

function ParentLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useLanguage()

  const { activeSchool: ctxActiveSchool, availableSchools: ctxAvailableSchools, clearSchoolContext } = useSchool()
  const { user: currentUser, logout: authLogout } = useAuth()

  // Fallback to localStorage when SchoolContext hasn't hydrated yet.
  // Priority: 1) SchoolContext  2) available_schools key  3) Protected login-time backup (never wiped by clearSchoolContext)
  const [lsActiveSchool, setLsActiveSchool] = useState<any>(null)
  const [lsAvailableSchools, setLsAvailableSchools] = useState<any[]>([])

  useEffect(() => {
    const readFromStorage = () => {
      try {
        // Active school
        const active = localStorage.getItem("active_school")
        if (active) setLsActiveSchool(JSON.parse(active))

        // Available schools — try standard key first, then protected backup
        const available = localStorage.getItem("available_schools")
        if (available) {
          const parsed = JSON.parse(available)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLsAvailableSchools(parsed)
            return
          }
        }
        // Protected backup (written at login, never wiped by clearSchoolContext)
        const ts = localStorage.getItem("zt_parent_login_ts")
        const isRecent = ts && (Date.now() - parseInt(ts)) < 24 * 60 * 60 * 1000 // 24h window
        if (isRecent) {
          const backup = localStorage.getItem("zt_parent_login_schools")
          if (backup) {
            const parsed = JSON.parse(backup)
            if (Array.isArray(parsed) && parsed.length > 0) {
              setLsAvailableSchools(parsed)
              // Also restore available_schools so context picks it up next cycle
              localStorage.setItem("available_schools", backup)
            }
          }
        }
      } catch { /* ignore */ }
    }

    readFromStorage()
    window.addEventListener("schoolSwitched", readFromStorage)
    window.addEventListener("userSessionChanged", readFromStorage)
    return () => {
      window.removeEventListener("schoolSwitched", readFromStorage)
      window.removeEventListener("userSessionChanged", readFromStorage)
    }
  }, [])

  // Use context values when available, fall back to localStorage
  const activeSchool = ctxActiveSchool || lsActiveSchool
  const availableSchools = ctxAvailableSchools.length > 0 ? ctxAvailableSchools : lsAvailableSchools

  const [students, setStudents] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false)
  const [showBottomNav, setShowBottomNav] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  const loadStudents = useCallback(() => {
    const studentsStr = localStorage.getItem("parent_students")
    if (!studentsStr) return
    try {
      const studentList: any[] = JSON.parse(studentsStr)
      if (!studentList.length) return
      setStudents(studentList)

      // Determine which school is active so we pick the right student
      let currentSchoolId: string | undefined
      try {
        const storedActive = localStorage.getItem("active_school")
        currentSchoolId = storedActive ? JSON.parse(storedActive)?.id : undefined
      } catch { /* ignore */ }
      // Fallback to x-school-id header value
      if (!currentSchoolId) currentSchoolId = localStorage.getItem("x-school-id") || undefined

      const savedId = localStorage.getItem("parent_selected_student_id")

      // 1. Try the saved student, but ONLY if it belongs to the current school
      let current = currentSchoolId
        ? studentList.find((s: any) => s.id === savedId && s.schoolId === currentSchoolId)
        : studentList.find((s: any) => s.id === savedId)

      // 2. Fall back to any student from the current school
      if (!current && currentSchoolId) {
        current = studentList.find((s: any) => s.schoolId === currentSchoolId)
      }

      // 3. Last resort: first student overall (should not happen in normal flow)
      if (!current) current = studentList[0]

      if (current) {
        setSelectedStudent(current)
        localStorage.setItem("parent_selected_student_id", current.id)
        if (current.schoolId) localStorage.setItem("x-school-id", current.schoolId)
        window.dispatchEvent(new Event("studentChanged"))
      }
    } catch (e) { console.error(e) }
  }, [activeSchool])

  useEffect(() => {
    loadStudents()
    window.addEventListener("schoolSwitched", loadStudents)
    return () => window.removeEventListener("schoolSwitched", loadStudents)
  }, [loadStudents])

  useEffect(() => {
    const fetchCounts = async () => {
      if (!currentUser?.phone) return
      const list = await parentDb.getNotifications(currentUser.phone, activeSchool?.id)
      setUnreadCount(list.filter(n => !n.isRead).length)
    }
    fetchCounts()
    const timer = setInterval(fetchCounts, 30000)
    return () => clearInterval(timer)
  }, [currentUser, activeSchool])

  const handleMainScroll = (e: React.UIEvent<HTMLElement>) => {
    const currentScrollY = e.currentTarget.scrollTop
    const diff = currentScrollY - lastScrollY

    if (diff > 5 && currentScrollY > 100) {
      setShowBottomNav(false)
    } else if (diff < -5) {
      setShowBottomNav(true)
    }
    setLastScrollY(currentScrollY)
  }

  const handleSelectStudent = (student: any) => {
    setSelectedStudent(student)
    localStorage.setItem("parent_selected_student_id", student.id)
    if (student.schoolId) localStorage.setItem("x-school-id", student.schoolId)
    setStudentDropdownOpen(false)
    window.dispatchEvent(new Event("studentChanged"))
  }

  const handleLogout = () => {
    clearMessageCache().catch(() => { })
    clearSchoolContext()
    authLogout()
    router.push("/login")
  }

  useEffect(() => {
    (window as any).goBack = () => router.push("/parent/dashboard")
  }, [router])

  const isActive = (path: string) => pathname === path
  const isCommunicationPage = pathname?.includes('/communication')

  if (!selectedStudent) return null

  const navLinks = [
    { href: "/parent/dashboard", label: t("dashboard"), icon: <LayoutDashboard /> },
    { href: "/parent/communication", label: t("communication"), icon: <MessageSquare />, badge: unreadCount > 0 ? unreadCount : undefined },
    { href: "/parent/announcements", label: t("notifications"), icon: <Megaphone /> },
    { href: "/parent/attendance", label: t("attendance"), icon: <Calendar /> },
    { href: "/parent/profile", label: t("profile"), icon: <User /> },
  ]

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()

  // Students filtered strictly to current active school only
  const filteredStudents = students.filter((s: any) => {
    if (activeSchool) return s.schoolId === activeSchool.id
    // If no active school context yet, try x-school-id
    const xSchoolId = typeof window !== "undefined" ? localStorage.getItem("x-school-id") : null
    if (xSchoolId) return s.schoolId === xSchoolId
    // Last resort: show selected student's school
    if (selectedStudent?.schoolId) return s.schoolId === selectedStudent.schoolId
    return true
  })

  return (
    <div className="flex h-screen bg-background dark:bg-slate-950 flex-col md:flex-row relative overflow-hidden">
      {/* Modern Glow Effects - Exact Admin Spec */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] animate-pulse pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse pointer-events-none opacity-50 z-0" />
      <div className="fixed top-[20%] right-[10%] w-[30%] h-[30%] bg-emerald-500/5 rounded-full blur-[100px] animate-pulse pointer-events-none z-0" />

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-64 bg-card/70 dark:bg-slate-900/70 backdrop-blur-xl border-r border-border shrink-0 select-none relative z-20">
        {/* Static Zetime Branding */}
        <div className="p-6 border-b border-border"><Logo href="/parent/dashboard" /></div>

        <div className="p-4 border-b border-border">
          <button onClick={() => setStudentDropdownOpen(!studentDropdownOpen)} className="w-full flex items-center justify-between p-2.5 bg-muted/50 rounded-xl border border-border/10">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px] bg-primary/10 text-primary">{getInitials(selectedStudent.fullName)}</AvatarFallback></Avatar>
              <div className="min-w-0"><p className="text-sm font-bold truncate">{selectedStudent.fullName}</p></div>
            </div>
            <ChevronDown className={cn("w-4 h-4 transition-transform", studentDropdownOpen && "rotate-180")} />
          </button>
        </div>

        <nav className="flex-grow p-4 space-y-1.5 overflow-y-auto no-scrollbar">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} className={cn(
              "flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-sm font-semibold group",
              isActive(link.href)
                ? "bg-primary/15 text-primary shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "transition-colors",
                  isActive(link.href) ? "text-primary" : "text-slate-500 group-hover:text-foreground"
                )}>{link.icon}</span>
                <span>{link.label}</span>
              </div>
              {link.badge && <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">{link.badge}</span>}
              {isActive(link.href) && <ChevronRight className="w-4 h-4 opacity-70" />}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          {availableSchools.length > 1 && (
            <button onClick={() => router.push("/auth/school-select")} className="w-full flex items-center justify-center gap-2 py-2 px-3 text-primary border border-primary/20 rounded-xl hover:bg-primary/5 transition-all font-semibold text-sm">
              <GraduationCap className="w-4 h-4" /><span>{t("switch_school")}</span>
            </button>
          )}
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 px-3 text-rose-500 border border-rose-500/20 rounded-xl hover:bg-rose-50 transition-all font-semibold text-sm">
            <LogOut className="w-4 h-4" /><span>{t("logout")}</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile Sidebar ── */}
      {sidebarOpen && <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}
      <aside className={cn(
        "md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-card dark:bg-slate-900 border-r border-border flex flex-col shadow-2xl transition-transform duration-300 ease-in-out overflow-hidden",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-5 border-b border-border flex justify-between items-center">
          <Logo size="sm" href="/parent/dashboard" />
          <button onClick={() => setSidebarOpen(false)}><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto min-h-0 p-4 space-y-1">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} onClick={() => setSidebarOpen(false)}>
              <div className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold mb-1", isActive(link.href) ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted")}>
                {link.icon} <span className="flex-1">{link.label}</span> {isActive(link.href) && <ChevronRight className="w-4 h-4" />}
              </div>
            </Link>
          ))}
        </nav>
        <div className="shrink-0 p-4 border-t border-border space-y-2 pb-safe">
          {availableSchools.length > 1 && (
            <button onClick={() => { router.push("/auth/school-select"); setSidebarOpen(false) }} className="w-full flex items-center justify-center gap-2 py-2.5 border border-primary/20 text-primary rounded-xl font-semibold text-sm">
              <GraduationCap className="w-4 h-4" /><span>{t("switch_school")}</span>
            </button>
          )}
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2.5 border border-rose-500/20 text-rose-500 rounded-xl font-semibold text-sm">
            <LogOut className="w-4 h-4" /><span>{t("logout")}</span>
          </button>
        </div>
      </aside>

      {/* ── Main Workspace ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Standard TopNav - Hidden on communication to use chat headers */}
        {!isCommunicationPage && <TopNav showMenuButton onMenuClick={() => setSidebarOpen(true)} />}

        {/* Mobile Student Bar - Hidden on communication */}
        {!isCommunicationPage && (
          <div className="md:hidden flex items-center justify-between p-2 px-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
            <button onClick={() => setStudentDropdownOpen(!studentDropdownOpen)} className="flex items-center gap-2 p-1 px-3 bg-white/50 dark:bg-slate-800/50 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
              <Avatar className="h-5 w-5 border border-white/20"><AvatarFallback className="text-[9px] bg-primary/10 text-primary">{getInitials(selectedStudent.fullName)}</AvatarFallback></Avatar>
              <span className="text-[11px] font-black uppercase tracking-tight">{selectedStudent.fullName.split(" ")[0]}</span>
              <ChevronDown className="w-3 h-3 opacity-50" />
            </button>
            {unreadCount > 0 && <Link href="/parent/communication" className="p-2 relative"><Bell className="w-4 h-4 text-primary" /><span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-slate-900" /></Link>}
          </div>
        )}

        {/* Student Switcher Backdrop/Modal */}
        {studentDropdownOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-card w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="p-5 border-b border-border flex justify-between items-center bg-muted/30">
                <h3 className="font-bold flex items-center gap-2"><GraduationCap className="w-5 h-5 text-primary" /> {t("select_child")}</h3>
                <button onClick={() => setStudentDropdownOpen(false)} className="p-1.5 hover:bg-muted rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2 no-scrollbar">
                {filteredStudents.map(student => (
                  <button key={student.id} onClick={() => handleSelectStudent(student)} className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-2xl transition-all border",
                    student.id === selectedStudent.id ? "bg-primary/10 border-primary/20 ring-1 ring-primary/20" : "bg-muted/10 border-transparent hover:bg-muted"
                  )}>
                    <Avatar className="h-10 w-10 shrink-0"><AvatarFallback className="bg-primary/10 text-primary font-bold">{getInitials(student.fullName)}</AvatarFallback></Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <p className={cn("text-sm truncate font-bold", student.id === selectedStudent.id ? "text-primary" : "text-foreground")}>{student.fullName}</p>
                      <p className="text-xs text-muted-foreground">{t("grade")} {student.grade}</p>
                    </div>
                    {student.id === selectedStudent.id && <div className="w-2 h-2 bg-primary rounded-full" />}
                  </button>
                ))}
              </div>
              {availableSchools.length > 1 && (
                <div className="p-4 bg-muted/10 border-t border-border">
                  <Button variant="outline" className="w-full text-[11px] font-bold uppercase rounded-xl" onClick={() => router.push("/auth/school-select")}>{t("switch_school")}</Button>
                </div>
              )}
            </div>
          </div>
        )}

        <main
          className={cn("flex-1 flex flex-col overflow-auto relative min-h-0", !isCommunicationPage && "pb-20 md:pb-0")}
          onScroll={handleMainScroll}
        >
          <div className={cn("mx-auto w-full flex-1 flex flex-col min-h-0 z-10", !isCommunicationPage ? "max-w-6xl p-4 md:p-6 space-y-6" : "p-0")}>
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        {!isCommunicationPage && (
          <nav className={cn(
            "md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border/50 bg-background/80 backdrop-blur-xl transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] pb-safe",
            !showBottomNav ? "translate-y-full" : "translate-y-0"
          )}>
            <div className="flex items-stretch justify-around h-16 px-2">
              <MobileTabLink href="/parent/dashboard" icon={<LayoutDashboard className="w-5 h-5" />} label={t("dashboard")} active={isActive("/parent/dashboard")} />
              <MobileTabLink href="/parent/communication" icon={<MessageSquare className="w-5 h-5" />} label={t("communication")} active={isActive("/parent/communication")} badge={unreadCount > 0 ? unreadCount : undefined} />
              <MobileTabLink href="/parent/announcements" icon={<Megaphone className="w-5 h-5" />} label={t("notifications")} active={isActive("/parent/announcements")} />
              <MobileTabLink href="/parent/attendance" icon={<Calendar className="w-5 h-5" />} label={t("attendance")} active={isActive("/parent/attendance")} />
              <MobileTabLink href="/parent/profile" icon={<User className="w-5 h-5" />} label={t("profile")} active={isActive("/parent/profile")} />
            </div>
          </nav>
        )}
      </div>
    </div>
  )
}

function MobileTabLink({ href, icon, label, active, badge }: { href: string, icon: React.ReactNode, label: string, active: boolean, badge?: number }) {
  return (
    <Link href={href} className="flex-1 relative group active:scale-95 transition-transform duration-100">
      <div className={cn(
        "flex flex-col items-center justify-center gap-1 h-full transition-all duration-300",
        active ? 'text-primary' : 'text-muted-foreground/60'
      )}>
        <div className={cn(
          "relative p-1 rounded-xl transition-all duration-300",
          active ? "bg-primary/10 scale-110" : ""
        )}>
          {icon}
          {active && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
          )}
          {badge !== undefined && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-black min-w-[14px] h-[14px] flex items-center justify-center rounded-full ring-2 ring-background">
              {badge}
            </span>
          )}
        </div>
        <span className={cn(
          "text-[9px] font-black uppercase tracking-widest transition-all duration-300",
          active ? "opacity-100 translate-y-0" : "opacity-40"
        )}>
          {label}
        </span>
      </div>
    </Link>
  )
}
