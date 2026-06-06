"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { parentDb, type ParentNotification } from "@/lib/db/parent-db"
import { useLanguage } from "@/lib/context/language-context"
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  BookOpen, 
  Activity,
  Heart,
  TrendingUp,
  MapPin,
  CalendarDays,
  Bell,
  Megaphone,
  AlertOctagon,
  ArrowRight,
  UserCheck
} from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export default function ParentDashboard() {
  const router = useRouter()
  const { t } = useLanguage()
  
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [firstName, setFirstName] = useState("Parent")
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [attendance, setAttendance] = useState<any[]>([])
  const [notificationsList, setNotificationsList] = useState<ParentNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 1. Initial Load & Auth verification
  const loadStudentData = async () => {
    const userStr = localStorage.getItem("attendance_current_user")
    const studentsStr = localStorage.getItem("parent_students")
    const studentId = localStorage.getItem("parent_selected_student_id")

    if (!userStr) {
      router.push("/login")
      return
    }

    try {
      const user = JSON.parse(userStr)
      setCurrentUser(user)

      if (user.name) {
        const nameParts = user.name.trim().split(/\s+/)
        const titles = ['dr', 'dr.', 'mr', 'mr.', 'mrs', 'mrs.', 'ms', 'ms.', 'prof', 'prof.']
        if (nameParts.length > 1 && titles.includes(nameParts[0].toLowerCase())) {
          setFirstName(`${nameParts[0]} ${nameParts[1]}`)
        } else {
          setFirstName(nameParts[0])
        }
      } else if (user.full_name) {
        setFirstName(user.full_name.split(' ')[0])
      }

      if (studentsStr && studentId) {
        const students = JSON.parse(studentsStr)
        const student = students.find((s: any) => s.id === studentId) || students[0]
        
        if (student) {
          setSelectedStudent(student)
          await fetchStudentAttendance(student.id)
          await fetchNotifications(user.phone)
        }
      } else if (studentsStr) {
        const students = JSON.parse(studentsStr)
        if (students[0]) {
          setSelectedStudent(students[0])
          localStorage.setItem("parent_selected_student_id", students[0].id)
          await fetchStudentAttendance(students[0].id)
          await fetchNotifications(user.phone)
        }
      }
    } catch (e) {
      console.error("[Dashboard] Load error:", e)
    } finally {
      setIsLoading(false)
    }
  }

  // 2. Fetch student's attendance list
  const fetchStudentAttendance = async (studentId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/attendance?studentId=${studentId}`)
      const data = await res.json()
      if (data.success && data.data) {
        setAttendance(data.data)
      } else {
        // Fallback to student relation directly if query fails
        const studentRes = await fetch(`${API_URL}/api/students/${studentId}`)
        const studentData = await studentRes.json()
        if (studentData.success && studentData.data?.attendance) {
          setAttendance(studentData.data.attendance)
        }
      }
    } catch (err) {
      console.error("[Dashboard] fetch attendance error:", err)
    }
  }

  // 3. Fetch portal notifications & announcements
  const fetchNotifications = async (phone: string) => {
    const list = await parentDb.getNotifications(phone)
    setNotificationsList(list)
  }

  // 4. Hook studentChanged listener to reload on header switcher selection
  useEffect(() => {
    loadStudentData()

    const handleStudentChange = () => {
      setIsLoading(true)
      loadStudentData()
    }

    window.addEventListener("studentChanged", handleStudentChange)
    return () => window.removeEventListener("studentChanged", handleStudentChange)
  }, [])

  // ─── DATA CALCULATIONS ──────────────────────────────────────────────────
  
  // Stats - Aggregated by day (to handle session-based double counting)
  const dailyMetrics = (() => {
    const byDate: Record<string, string[]> = {}
    attendance.forEach(a => {
      const date = new Date(a.date).toLocaleDateString('en-CA', { timeZone: 'Africa/Addis_Ababa' })
      if (!byDate[date]) byDate[date] = []
      if (a.status) byDate[date].push(a.status.toLowerCase())
    })

    const results = Object.values(byDate).map(statuses => {
      if (statuses.includes('absent')) return 'absent'
      if (statuses.includes('late')) return 'late'
      if (statuses.includes('excused')) return 'excused'
      if (statuses.includes('present')) return 'present'
      return 'unmarked'
    }).filter(s => s !== 'unmarked')

    return {
      total: results.length,
      presents: results.filter(s => s === 'present').length,
      absents: results.filter(s => s === 'absent').length,
      lates: results.filter(s => s === 'late').length,
      excused: results.filter(s => s === 'excused').length
    }
  })()

  const totalDays = dailyMetrics.total
  const presents = dailyMetrics.presents
  const absents = dailyMetrics.absents
  const lates = dailyMetrics.lates
  const excused = dailyMetrics.excused

  // Circular gauge percentage calculation (Daily level)
  const attendanceRate = totalDays > 0 
    ? Math.round(((presents + excused + lates * 0.8) / totalDays) * 100) 
    : 100

  // Today's attendance resolver
  const getTodayAttendance = () => {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Addis_Ababa' })
    
    // Filter records matching today's date in local standard format
    const todayRecords = attendance.filter(a => {
      const recDate = new Date(a.date).toLocaleDateString('en-CA', { timeZone: 'Africa/Addis_Ababa' })
      return recDate === todayStr
    })

    if (todayRecords.length === 0) {
      return { status: t("unmarked"), morning: null, afternoon: null, isSessionBased: false }
    }

    const morningRec = todayRecords.find(r => r.session?.toLowerCase() === "morning")
    const afternoonRec = todayRecords.find(r => r.session?.toLowerCase() === "afternoon")
    const dailyRec = todayRecords.find(r => !r.session)

    if (morningRec || afternoonRec) {
      return {
        status: "Marked",
        morning: morningRec?.status || "Unmarked",
        afternoon: afternoonRec?.status || "Unmarked",
        isSessionBased: true
      }
    }

    return {
      status: dailyRec?.status || "Unmarked",
      morning: null,
      afternoon: null,
      isSessionBased: false
    }
  }

  const todayStatus = getTodayAttendance()

  // School announcements (general school alert notifications)
  const announcements = notificationsList.filter(n => n.type === "announcement" || n.type === "emergency")
  const emergencyNotice = announcements.find(a => a.type === "emergency")

  // Child specific alerts (absent & late notifications)
  const recentAlerts = notificationsList.filter(n => (n.type === "absent" || n.type === "late" || n.type === "warning") && n.studentId === selectedStudent?.id)

  const formatNotificationTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    } catch {
      return dateStr
    }
  }

  // Visual status stylers
  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase()
    switch (s) {
      case "present":
        return <Badge className="typography-label bg-emerald-500 hover:bg-emerald-600 border-none rounded-lg">{t("presents")}</Badge>
      case "absent":
        return <Badge className="typography-label bg-rose-500 hover:bg-rose-600 border-none rounded-lg">{t("absents")}</Badge>
      case "late":
        return <Badge className="typography-label bg-amber-500 hover:bg-amber-600 border-none rounded-lg">{t("late_arrivals")}</Badge>
      case "excused":
        return <Badge className="typography-label bg-blue-500 hover:bg-blue-600 border-none rounded-lg">{t("excused")}</Badge>
      default:
        return <Badge variant="outline" className="typography-label rounded-lg px-3 py-1">{t("unmarked")}</Badge>
    }
  }

  const getSessionCard = (title: string, status: string | null) => {
    if (!status) return null
    const s = status.toLowerCase()
    let colorClass = "bg-muted/50 border-border/20"
    let icon = <Clock className="w-4 h-4 text-muted-foreground" />
    let statusLabel = t("unmarked")

    if (s === "present") {
      colorClass = "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
      icon = <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      statusLabel = t("presents")
    } else if (s === "absent") {
      colorClass = "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"
      icon = <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
      statusLabel = t("absents")
    } else if (s === "late") {
      colorClass = "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300"
      icon = <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
      statusLabel = t("late_arrivals")
    } else if (s === "excused") {
      colorClass = "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300"
      icon = <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      statusLabel = t("excused")
    }

    return (
      <div className={`flex items-center justify-between p-4 border rounded-2xl transition-all shadow-sm ${colorClass}`}>
        <span className="typography-label">{title}</span>
        <div className="flex items-center gap-2">
          {icon}
          <span className="typography-label uppercase">{statusLabel}</span>
        </div>
      </div>
    )
  }

  const getGreeting = () => {
    const hour = parseInt(new Date().toLocaleTimeString('en-US', { timeZone: 'Africa/Addis_Ababa', hour12: false, hour: 'numeric' }), 10)
    if (hour < 12) return t("good_morning")
    if (hour < 17) return t("good_afternoon")
    return t("good_evening")
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-32 w-full bg-card animate-pulse rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-40 bg-card animate-pulse rounded-3xl" />
          <div className="h-40 bg-card animate-pulse rounded-3xl" />
          <div className="h-40 bg-card animate-pulse rounded-3xl" />
        </div>
        <div className="h-64 bg-card animate-pulse rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-2">
        <div className="space-y-1.5 w-full md:w-auto">
          <h2 className="typography-page-title text-4xl md:text-5xl font-semibold text-foreground leading-tight">
            {getGreeting()}, <span className="text-emerald-600 dark:text-emerald-400">{firstName}</span>
          </h2>
          <p className="typography-label text-muted-foreground">
            {t("dashboard_overview")}
          </p>
        </div>
      </div>

      {/* ─── EMERGENCY ALERTS BANNER ──────────────────────────────────────── */}
      {emergencyNotice && (
        <Alert variant="destructive" className="border-rose-500/40 bg-rose-500/5 text-rose-800 dark:text-rose-200 rounded-2xl shadow-lg shadow-rose-500/5">
          <AlertOctagon className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          <AlertTitle className="typography-card-title uppercase flex items-center gap-2">
            {t("emergency_notice")}
          </AlertTitle>
          <AlertDescription className="typography-label mt-2">
            <span className="text-rose-900 dark:text-rose-100">{emergencyNotice.title}:</span> {emergencyNotice.message}
            <span className="typography-label block opacity-90 mt-2 uppercase">Posted: {formatNotificationTime(emergencyNotice.createdAt)}</span>
          </AlertDescription>
        </Alert>
      )}

      {/* ─── TODAY'S ATTENDANCE SUMMARY CARD ──────────────────────────────── */}
      <Card className="border-border/40 shadow-xl rounded-3xl bg-card/60 backdrop-blur-md overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 rounded-2xl flex items-center justify-center text-emerald-700 dark:text-emerald-400 shadow-inner">
                <UserCheck className="w-7 h-7" />
              </div>
              <div>
                <p className="typography-label text-emerald-600 dark:text-emerald-400 uppercase mb-1">{t("today_attendance")}</p>
                <h2 className="typography-page-title text-foreground">{selectedStudent?.fullName}</h2>
                <p className="typography-label text-foreground/80 dark:text-foreground/70 mt-1.5 flex items-center gap-2">
                  <Badge variant="secondary" className="typography-label">Grade {selectedStudent?.grade}</Badge>
                  <span className="opacity-40">•</span>
                  <Badge variant="secondary" className="typography-label">Section {selectedStudent?.section}</Badge>
                </p>
              </div>
            </div>

            <div className="flex-grow max-w-md w-full">
              {todayStatus.isSessionBased ? (
                <div className="grid grid-cols-2 gap-3.5">
                  {getSessionCard(t("morning_session"), todayStatus.morning)}
                  {getSessionCard(t("afternoon_session"), todayStatus.afternoon)}
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-muted/40 border-2 border-border/10 rounded-2xl">
                  <span className="typography-label text-foreground/70 uppercase">{t("today_attendance")}</span>
                  <div className="flex items-center gap-2 scale-110 origin-right">
                    {getStatusBadge(todayStatus.status)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── QUICK STATS & CIRCULAR GAUGE ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Attendance Rate Circular Progress Card */}
        <Card className="border-border/40 shadow-lg rounded-3xl bg-card/60 backdrop-blur-md flex flex-col justify-between">
          <CardHeader className="pb-4">
            <CardTitle className="typography-card-title uppercase text-foreground/80">{t("attendance_rate")}</CardTitle>
            <CardDescription className="typography-label">Cumulative presence ratio</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6 pt-0 flex-1">
            <div className="relative w-36 h-36 flex items-center justify-center">
              {/* SVG Ring Gauge */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-muted dark:stroke-slate-800"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-emerald-500 dark:stroke-emerald-400 transition-all duration-1000 ease-out"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - attendanceRate / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="typography-page-title text-foreground">{attendanceRate}%</span>
                <span className="typography-label text-muted-foreground uppercase mt-1 opacity-80">{t("rating")}</span>
              </div>
            </div>
            
            <div className="typography-label flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mt-6 bg-emerald-500/10 p-2 px-4 rounded-full border border-emerald-500/20 shadow-sm">
              <TrendingUp className="w-4 h-4" />
              <span className="uppercase tracking-wide">{t("target_text")}</span>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Metrics Numbers Card */}
        <Card className="border-border/40 shadow-lg rounded-3xl bg-card/60 backdrop-blur-md lg:col-span-2 flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="typography-card-title uppercase text-foreground/80">{t("term_summary")}</CardTitle>
            <CardDescription className="typography-label">Out of {totalDays} {t("total_days")} recorded</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0 flex-1 flex flex-col justify-center">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-center space-y-1.5 shadow-sm">
                <span className="typography-label text-emerald-700 dark:text-emerald-400 uppercase">{t("presents")}</span>
                <p className="typography-page-title text-emerald-600 dark:text-emerald-400">{presents}</p>
                <span className="typography-label text-muted-foreground/80 block">Days in class</span>
              </div>

              <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-center space-y-1.5 shadow-sm">
                <span className="typography-label text-rose-700 dark:text-rose-400 uppercase">{t("absents")}</span>
                <p className="typography-page-title text-rose-600 dark:text-rose-400">{absents}</p>
                <span className="typography-label text-muted-foreground/80 block">Unexcused cuts</span>
              </div>

              <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-center space-y-1.5 shadow-sm">
                <span className="typography-label text-amber-700 dark:text-amber-400 uppercase">{t("late_arrivals")}</span>
                <p className="typography-page-title text-amber-600 dark:text-amber-400">{lates}</p>
                <span className="typography-label text-muted-foreground/80 block">Tardy logs</span>
              </div>

              <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl text-center space-y-1.5 shadow-sm">
                <span className="typography-label text-blue-700 dark:text-blue-400 uppercase">{t("excused")}</span>
                <p className="typography-page-title text-blue-600 dark:text-blue-400">{excused}</p>
                <span className="typography-label text-muted-foreground/80 block">Approved leaves</span>
              </div>

            </div>

            <div className="typography-body mt-8 flex items-center justify-between border-t border-border/40 pt-5 px-1 text-foreground/70">
              <span className="typography-label">Need to submit a leave request?</span>
              <button 
                onClick={() => router.push("/parent/profile")}
                className="typography-label text-emerald-600 dark:text-emerald-400 hover:underline underline-offset-4 flex items-center gap-2 group"
              >
                <span>Contact Advisor</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* ─── NOTIFICATIONS FEED & ANNOUNCEMENTS PANELS ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Recent Absences & Late Alerts */}
        <Card className="border-border/40 shadow-lg rounded-3xl bg-card/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/20 pb-4">
            <div>
              <CardTitle className="typography-card-title uppercase text-foreground/80 flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-500" />
                <span>{t("recent_alerts")}</span>
              </CardTitle>
              <CardDescription className="typography-label mt-1 italic text-muted-foreground/80">Critical notifications for {selectedStudent?.fullName}.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4 max-h-[300px] overflow-y-auto">
            {recentAlerts.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground bg-muted/10 rounded-3xl border-2 border-dashed border-border/20">
                <CheckCircle className="w-12 h-12 text-emerald-500/50 mb-3" />
                <p className="typography-label uppercase">{t("no_alerts")}</p>
                <span className="typography-label text-muted-foreground/80 mt-2">Excellent attendance consistency!</span>
              </div>
            ) : (
              recentAlerts.slice(0, 5).map((alert) => (
                <div 
                  key={alert.id} 
                  className={`flex gap-4 p-4 border-2 rounded-2xl transition-all shadow-sm ${
                    alert.type === "absent" 
                      ? "bg-rose-500/10 border-rose-500/20 shadow-rose-500/5" 
                      : "bg-amber-500/10 border-amber-500/20 shadow-amber-500/5"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center shadow-sm ${
                    alert.type === "absent" ? "bg-rose-500 text-white" : "bg-amber-500 text-white"
                  }`}>
                    {alert.type === "absent" ? <XCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="typography-label text-foreground uppercase">{alert.title}</span>
                      <span className="typography-label text-muted-foreground opacity-70">{formatNotificationTime(alert.createdAt)}</span>
                    </div>
                    <p className="typography-label text-foreground/80 dark:text-foreground/70 mt-2">{alert.message}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right: School Announcements Board */}
        <Card className="border-border/40 shadow-lg rounded-3xl bg-card/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/20 pb-4">
            <div>
              <CardTitle className="typography-card-title uppercase text-foreground/80 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-emerald-500" />
                <span>{t("school_announcements")}</span>
              </CardTitle>
              <CardDescription className="typography-label mt-1 italic text-muted-foreground/80">Broad alerts from school administration.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4 max-h-[300px] overflow-y-auto">
            {announcements.filter(a => a.type !== "emergency").length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground bg-muted/10 rounded-3xl border-2 border-dashed border-border/20">
                <BookOpen className="w-12 h-12 text-emerald-500/50 mb-3" />
                <p className="typography-label uppercase">{t("no_announcements")}</p>
                <span className="typography-label text-muted-foreground/80 mt-2">Check back later for school newsletters.</span>
              </div>
            ) : (
              announcements.filter(a => a.type !== "emergency").slice(0, 5).map((announcement) => (
                <div key={announcement.id} className="p-4 bg-muted/40 border-2 border-border/10 rounded-2xl space-y-3 shadow-sm group hover:border-emerald-500/20 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="typography-label text-foreground uppercase group-hover:text-emerald-600 transition-colors">{announcement.title}</span>
                    <span className="typography-label text-muted-foreground opacity-70">{formatNotificationTime(announcement.createdAt)}</span>
                  </div>
                  <p className="typography-label text-foreground/80 dark:text-foreground/70">{announcement.message}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

      </div>

    </div>
  )
}
