"use client"

import type React from "react"
import { useState, useEffect } from "react"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Logo } from "@/components/logo"
import { TopNav } from "@/components/layout/top-nav"

import { LanguageProvider, useLanguage } from "@/lib/context/language-context"
import { useSchool } from "@/lib/context/school-context"
import { useAuth } from "@/lib/context/auth-context"
import { AuthGuard } from "@/components/auth/auth-guard"
import { clearMessageCache } from "@/lib/utils/message-cache"
import { cn } from "@/lib/utils/utils"

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["parent"]}>
      <LanguageProvider>
        <ParentLayoutInner>{children}</ParentLayoutInner>
      </LanguageProvider>
    </AuthGuard>
  )
}

function ParentLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useLanguage()

  const { activeSchool, availableSchools, clearSchoolContext } = useSchool()
  const { user: currentUser, logout: authLogout } = useAuth()
  
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false)
  const [showBottomNav, setShowBottomNav] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const studentsStr = localStorage.getItem("parent_students")
    if (studentsStr) {
      try {
        const studentList = JSON.parse(studentsStr)
        setStudents(studentList)
        const savedId = localStorage.getItem("parent_selected_student_id")
        let current = studentList.find((s: any) => s.id === savedId)
        if (activeSchool && current && current.schoolId !== activeSchool.id) {
          current = studentList.find((s: any) => s.schoolId === activeSchool.id)
        }
        if (!current) current = studentList[0]
        if (current) {
          setSelectedStudent(current)
          localStorage.setItem("parent_selected_student_id", current.id)
        }
      } catch (e) { console.error(e) }
    }
  }, [activeSchool])

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
    if (currentScrollY > lastScrollY && currentScrollY > 100) {
      setShowBottomNav(false)
    } else {
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
    clearMessageCache().catch(() => {})
    clearSchoolContext()
    authLogout()
    router.push("/login")
  }

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

  const filteredStudents = activeSchool ? students.filter(s => s.schoolId === activeSchool.id) : students

  return (
    <div className="flex h-screen bg-background dark:bg-slate-950 flex-col md:flex-row relative overflow-hidden">
      
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border shrink-0 select-none relative z-20">
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
              "flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-sm font-semibold",
              isActive(link.href) ? "bg-primary/15 text-primary shadow-sm" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            )}>
              <div className="flex items-center gap-3">
                <span className={isActive(link.href) ? "text-primary" : "text-slate-500"}>{link.icon}</span>
                <span>{link.label}</span>
              </div>
              {link.badge && <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">{link.badge}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 px-3 text-rose-500 border border-rose-500/20 rounded-xl hover:bg-rose-50 transition-all font-semibold text-sm">
            <LogOut className="w-4 h-4" /><span>{t("logout")}</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile Sidebar ── */}
      {sidebarOpen && <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}
      <aside className={cn(
        "md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-card dark:bg-slate-900 border-r border-border flex flex-col shadow-2xl transition-transform duration-300 ease-in-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-5 border-b border-border flex justify-between items-center">
          <Logo size="sm" href="/parent/dashboard" />
          <button onClick={() => setSidebarOpen(false)}><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} onClick={() => setSidebarOpen(false)}>
               <div className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold mb-1", isActive(link.href) ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted")}>
                 {link.icon} <span className="flex-1">{link.label}</span> {isActive(link.href) && <ChevronRight className="w-4 h-4" />}
               </div>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2.5 border border-rose-500/20 text-rose-500 rounded-xl font-semibold text-sm">
            <LogOut className="w-4 h-4" /><span>{t("logout")}</span>
          </button>
        </div>
      </aside>

      {/* ── Main Workspace ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <TopNav showMenuButton onMenuClick={() => setSidebarOpen(true)} />

        {/* Mobile Student Bar */}
        <div className="md:hidden flex items-center justify-between p-2 px-4 bg-muted/20 border-b border-border/40">
           <button onClick={() => setStudentDropdownOpen(!studentDropdownOpen)} className="flex items-center gap-2 p-1 px-3 bg-background rounded-full border border-border shadow-sm">
             <Avatar className="h-5 w-5"><AvatarFallback className="text-[9px]">{getInitials(selectedStudent.fullName)}</AvatarFallback></Avatar>
             <span className="text-[11px] font-bold">{selectedStudent.fullName.split(" ")[0]}</span>
             <ChevronDown className="w-3 h-3" />
           </button>
           {unreadCount > 0 && <Link href="/parent/notifications" className="p-2 relative"><Bell className="w-4 h-4" /><span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" /></Link>}
        </div>

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
                    <Button variant="outline" className="w-full text-[11px] font-bold uppercase rounded-xl" onClick={() => router.push("/parent/school-select")}>{t("switch_school")}</Button>
                  </div>
                )}
             </div>
          </div>
        )}

        <main 
          className={cn("flex-1 flex flex-col overflow-auto focus:outline-none relative", !isCommunicationPage && "pb-24 md:pb-0")}
          onScroll={handleMainScroll}
        >
          <div className="max-w-6xl mx-auto w-full p-4 md:p-6 space-y-6 flex-1 flex flex-col min-h-0">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        {!isCommunicationPage && (
          <nav className={cn(
            "md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur-md transition-transform duration-300 pb-safe",
            !showBottomNav ? "translate-y-full" : "translate-y-0"
          )}>
            <div className="flex items-stretch justify-around h-16">
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
    <Link href={href} className="flex-1">
      <div className={cn(
        "flex flex-col items-center justify-center gap-1 h-full transition-all duration-200 relative",
        active ? "text-primary scale-105" : "text-muted-foreground"
      )}>
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
        {badge !== undefined && <span className="absolute top-2 right-1/4 bg-rose-500 text-white text-[8px] font-bold min-w-[14px] h-[14px] flex items-center justify-center rounded-full ring-2 ring-background">{badge}</span>}
      </div>
    </Link>
  )
}
