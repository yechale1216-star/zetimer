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
  Menu,
  X,
  GraduationCap,
  Settings,
  ChevronRight,
  MessageSquare,
  Megaphone
} from "lucide-react"
import { parentDb } from "@/lib/db/parent-db"
import { authService } from "@/lib/auth/auth"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Logo } from "@/components/logo"
import { TopNav } from "@/components/layout/top-nav"

import { LanguageProvider, useLanguage } from "@/lib/context/language-context"
import { useSchool } from "@/lib/context/school-context"

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <ParentLayoutInner>{children}</ParentLayoutInner>
    </LanguageProvider>
  )
}

function ParentLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { t, language, setLanguage } = useLanguage()

  const { activeSchool, availableSchools, clearSchoolContext } = useSchool()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false)

  // 1. Auth check and initial data loading
  useEffect(() => {
    const userStr = localStorage.getItem("attendance_current_user")
    const studentsStr = localStorage.getItem("parent_students")

    if (!userStr) {
      router.push("/login")
      return
    }

    try {
      const user = JSON.parse(userStr)
      if (user.role !== "parent") {
        router.push("/login")
        return
      }
      setCurrentUser(user)

      if (studentsStr) {
        const studentList = JSON.parse(studentsStr)
        setStudents(studentList)

        // Load selected student
        const savedId = localStorage.getItem("parent_selected_student_id")
        let current = studentList.find((s: any) => s.id === savedId)

        // If current student not in active school, pick first available in school
        if (activeSchool && current && current.schoolId !== activeSchool.id) {
          current = studentList.find((s: any) => s.schoolId === activeSchool.id)
        }

        if (!current) current = studentList[0]

        if (current) {
          setSelectedStudent(current)
          localStorage.setItem("parent_selected_student_id", current.id)
        }
      }
    } catch (e) {
      localStorage.removeItem("attendance_current_user")
      router.push("/login")
    }
  }, [router, activeSchool])

  // Filter students based on active school
  const filteredStudents = activeSchool
    ? students.filter(s => s.schoolId === activeSchool.id)
    : students

  // Ensure selected student stays in sync with school switch
  useEffect(() => {
    if (activeSchool && selectedStudent && selectedStudent.schoolId !== activeSchool.id) {
      const next = students.find(s => s.schoolId === activeSchool.id)
      if (next) {
        setSelectedStudent(next)
        localStorage.setItem("parent_selected_student_id", next.id)
        window.dispatchEvent(new Event("studentChanged"))
      }
    }
  }, [activeSchool, selectedStudent, students])

  // 2. Fetch notification count periodically
  useEffect(() => {
    if (!currentUser?.phone) return

    const fetchCounts = async () => {
      const list = await parentDb.getNotifications(currentUser.phone, activeSchool?.id)
      const unread = list.filter(n => !n.isRead).length
      setUnreadCount(unread)
    }

    fetchCounts()
    const timer = setInterval(fetchCounts, 15000) // update every 15 seconds

    // Listen to read actions
    const handleRefresh = () => fetchCounts()
    window.addEventListener("refreshNotifications", handleRefresh)

    return () => {
      clearInterval(timer)
      window.removeEventListener("refreshNotifications", handleRefresh)
    }
  }, [currentUser, activeSchool, selectedStudent])

  // 3. Child selection handler
  const handleSelectStudent = (student: any) => {
    setSelectedStudent(student)
    localStorage.setItem("parent_selected_student_id", student.id)
    if (student.schoolId) {
      localStorage.setItem("x-school-id", student.schoolId)
    }
    setIsStudentDropdownOpen(false)

    // Trigger custom event to notify child components
    window.dispatchEvent(new Event("studentChanged"))
  }

  const handleLogout = () => {
    clearSchoolContext()
    authService.logout()
    router.push("/login")
  }

  if (!currentUser || !selectedStudent) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="typography-label text-muted-foreground">{t("portal_session_securing")}</p>
        </div>
      </div>
    )
  }

  const navLinks = [
    { href: "/parent/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/parent/communication", label: t("communication"), icon: MessageSquare },
    { href: "/parent/announcements", label: t("announcements"), icon: Megaphone },
    { href: "/parent/attendance", label: t("attendance"), icon: Calendar },
    { href: "/parent/profile", label: t("profile"), icon: User },
    {
      href: "/parent/notifications",
      label: t("notifications"),
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined
    },
  ]

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }

  return (
    <div className="flex h-screen bg-muted/30 overflow-hidden font-sans">

      {/* ─── DESKTOP SIDEBAR ──────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border/40 shrink-0 select-none">

        {/* Header/Logo - Restored Zetime Branding */}
        <div className="p-6 border-b border-border/40">
          <Logo href="/parent/dashboard" />
        </div>

        {/* Dynamic Multi-Child Selector */}
        <div className="p-4 border-b border-border/40">
          <div className="relative">
            <button
              onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
              className="w-full flex items-center justify-between p-2.5 bg-muted/50 hover:bg-muted rounded-xl transition-all border border-border/10 focus:ring-2 focus:ring-emerald-500/20 text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar className="h-8 w-8 ring-2 ring-emerald-600/10">
                  <AvatarFallback className="typography-label bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    {getInitials(selectedStudent.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="typography-label text-foreground truncate">{selectedStudent.fullName}</p>
                  <p className="typography-label text-muted-foreground">{t("grade")} {selectedStudent.grade}</p>
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0 ${isStudentDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Child Switcher Dropdown */}
            {isStudentDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border/40 rounded-xl shadow-xl z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <p className="typography-label text-[11px] text-muted-foreground/60 uppercase px-3 py-1 border-b border-border/20">{t("select_child")}</p>
                {filteredStudents.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => handleSelectStudent(student)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted text-left transition-colors ${student.id === selectedStudent.id ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""
                      }`}
                  >
                    <Avatar className="h-7 w-7 ring-1 ring-border">
                      <AvatarFallback className="typography-label bg-emerald-50 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 text-[10px]">
                        {getInitials(student.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className={`typography-body truncate ${student.id === selectedStudent.id ? "font-bold text-emerald-600 dark:text-emerald-400" : "font-medium text-foreground"}`}>
                        {student.fullName}
                      </p>
                      <p className="typography-helper text-muted-foreground">{t("grade")} {student.grade}</p>
                    </div>
                    {student.id === selectedStudent.id && (
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Multi-School Quick Switch Link */}
          {availableSchools.length > 1 && (
            <div className="mt-3 px-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/parent/school-select")}
                className="w-full text-emerald-600 border-emerald-600/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 h-8 text-[11px] font-bold uppercase tracking-wider rounded-lg"
              >
                {t("switch_school")}
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-grow p-4 space-y-1.5 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`typography-label flex items-center justify-between px-3 py-2.5 rounded-xl transition-all relative group ${isActive ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground"}`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>{link.label}</span>
                </div>
                {link.badge !== undefined && (
                  <span className={`typography-label px-2 py-0.5 text-[9px] rounded-full shrink-0 ${isActive ? "bg-white text-emerald-700" : "bg-rose-500 text-white"}`}>
                    {link.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border/40 flex flex-col gap-3">
          <div className="flex items-center justify-between px-2">
            <span className="typography-label text-muted-foreground">{t("logged_in_as")}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="typography-label h-8 w-8 p-0"
                onClick={() => setLanguage(language === 'en' ? 'am' : 'en')}
              >
                {language === 'en' ? 'EN' : 'AM'}
              </Button>
              <ModeToggle />
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="typography-label w-full flex items-center justify-center gap-2 py-2 px-3 border border-rose-500/20 hover:bg-rose-50 dark:hover:bg-rose-950/10 text-rose-500 hover:text-rose-600 rounded-xl transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t("logout")}</span>
          </button>
        </div>
      </aside>

      {/* ─── MOBILE CONTAINER ─────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
        <TopNav showMenuButton onMenuClick={() => setIsSidebarOpen(true)} />

        {/* Student Switcher Bar (Mobile & Desktop subset) */}
        <div className="md:hidden flex items-center justify-between p-2 px-4 bg-muted/20 border-b border-border/40">
          <div className="flex items-center gap-2">
            <span className="typography-label text-[10px] text-muted-foreground uppercase mt-0.5">{t("switch_student")}</span>
          </div>
          <div className="relative">
            <button
              onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
              className="flex items-center gap-1.5 p-1 px-2.5 bg-background hover:bg-muted rounded-full border border-border/40 text-left transition-all shadow-sm"
            >
              <Avatar className="h-5 w-5">
                <AvatarFallback className="typography-label bg-emerald-100 text-emerald-700 text-[9px]">
                  {getInitials(selectedStudent.fullName)}
                </AvatarFallback>
              </Avatar>
              <span className="typography-label text-[10px] max-w-[80px] truncate">{selectedStudent.fullName.split(" ")[0]}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>

            {/* Mobile Switcher Drawer */}
            {isStudentDropdownOpen && (
              <div className="absolute top-8 right-0 bg-card border border-border/40 rounded-xl shadow-xl z-50 overflow-hidden py-1 w-44 animate-in fade-in slide-in-from-top-1 duration-200">
                {filteredStudents.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => handleSelectStudent(student)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-left transition-colors"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="typography-label bg-emerald-50 text-emerald-600 text-[9px]">
                        {getInitials(student.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="typography-label text-[10px] truncate text-foreground">{student.fullName}</p>
                      <p className="text-[8px] text-muted-foreground">{t("grade")} {student.grade}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Slide-over Sidebar Drawer */}
        {isSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Overlay */}
            <div
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300"
            />

            {/* Drawer Body */}
            <div className="relative flex flex-col w-72 max-w-xs bg-card border-r border-border/40 z-50 p-4 animate-in slide-in-from-left duration-300">

              {/* Close Button & Branding */}
              <div className="flex items-center justify-between pb-4 border-b border-border/20 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center overflow-hidden border border-emerald-100 dark:border-emerald-800 shadow-sm">
                    {activeSchool?.logo ? (
                      <img src={activeSchool.logo} alt={activeSchool.name} className="h-full w-full object-contain p-1.5" />
                    ) : (
                      <GraduationCap className="h-5 w-5 text-emerald-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-xs truncate leading-tight">
                      {activeSchool?.name || t("zetime_portal")}
                    </h2>
                    {availableSchools.length > 1 && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => {
                          setIsSidebarOpen(false);
                          router.push("/parent/school-select");
                        }}
                        className="h-auto p-0 text-[9px] text-emerald-600 font-bold uppercase tracking-widest hover:text-emerald-700 mt-0.5"
                      >
                        {t("switch_school")}
                      </Button>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 hover:bg-muted text-muted-foreground rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Sidebar Navigation */}
              <nav className="flex-grow space-y-1.5 overflow-y-auto">
                {navLinks.map((link) => {
                  const Icon = link.icon
                  const isActive = pathname === link.href
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`typography-label flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${isActive ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/15" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4.5 h-4.5 shrink-0" />
                        <span>{link.label}</span>
                      </div>
                      {link.badge !== undefined && (
                        <span className={`typography-label px-2 py-0.5 text-[9px] rounded-full shrink-0 ${isActive ? "bg-white text-emerald-700" : "bg-rose-500 text-white"}`}>
                          {link.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </nav>

              {/* Mobile Sidebar Footer */}
              <div className="pt-4 border-t border-border/20 flex flex-col gap-3">
                <div className="typography-label flex items-center justify-between px-2 text-muted-foreground">
                  <span>{t("logged_in_as")}</span>
                  <span>{currentUser.name}</span>
                </div>

                <button
                  onClick={handleLogout}
                  className="typography-label w-full flex items-center justify-center gap-2 py-2.5 border border-rose-500/20 hover:bg-rose-50 text-rose-500 rounded-xl transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t("logout")}</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ─── MAIN CONTENT VIEWPORT ───────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto focus:outline-none p-4 md:p-6 bg-muted/10">
          <div className="max-w-6xl mx-auto space-y-6">
            {children}
          </div>
        </main>

      </div>
    </div>
  )
}
