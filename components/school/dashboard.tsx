"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, UserCheck, UserX, Clock, AlertTriangle, TrendingUp, Calendar, RefreshCw } from "lucide-react"
import { db, type Student } from "@/lib/db/database"
import { notifications } from "@/lib/utils/notifications"
import { QuickActions } from "@/components/school/quick-actions"
import { useToast } from "@/hooks/use-toast"
import { authService } from "@/lib/auth/auth"
import { useAuth } from "@/lib/context/auth-context"
import { useSubscription } from "@/lib/context/subscription-context"
import { useSchoolSettings } from "@/hooks/use-school-settings"
import { Progress } from "@/components/ui/progress"
import {
  PieChart, Pie, Cell, Legend, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip
} from "recharts"
import { PageSkeleton } from "@/components/ui/page-skeleton"
import { cn } from "../../lib/utils/utils"

interface DashboardStats {
  totalStudents: number
  presentToday: number
  lateToday: number
  absentToday: number
  excusedToday: number
  attendanceRate: number
}

interface RecentActivity {
  grade: string
  section: string
  stream?: string
  session?: string
  count: number
  time: string
  date: string
}

interface DashboardProps {
  onNavigate?: (tab: string) => void
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    presentToday: 0,
    lateToday: 0,
    absentToday: 0,
    excusedToday: 0,
    attendanceRate: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [chartData, setChartData] = useState<{ trendData: any[]; statusData: any[] } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionFilter, setSessionFilter] = useState<"morning" | "afternoon" | "total">("total")
  const [rawData, setRawData] = useState<{ today: any[], all: any[], students: Student[] } | null>(null)
  const { toast } = useToast()
  // Consume the authenticated user from AuthContext — this is the single source of truth
  // for tenant identity. We NEVER read schoolId directly from localStorage here.
  const { user: authUser } = useAuth()
  const { subscription } = useSubscription()
  const { settings } = useSchoolSettings()
  const isSessionBased = settings?.attendanceMode === "session_based"

  // Derive trial info from shared subscription context (no extra API call)
  const trialInfo = (subscription?.status === "trial" || subscription?.status === "expired")
    ? {
        status: subscription.status,
        daysLeft: subscription.trialEndsAt
          ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / 86400000))
          : 0,
        maxStudents: subscription.studentCount || 100,
      }
    : null

  // CRITICAL TENANT ISOLATION GUARD:
  // Only load dashboard data once AuthContext has confirmed a non-empty schoolId.
  // This prevents any cross-tenant data from appearing even for a single render frame
  // when navigating here immediately after onboarding.
  const confirmedSchoolId = authUser?.schoolId || ""

  useEffect(() => {
    // Do not fetch anything until the authenticated tenant context is confirmed.
    if (!confirmedSchoolId) return

    loadDashboardData()

    // Poll for real-time updates from other users/tabs (every 10 seconds)
    const pollInterval = setInterval(() => {
      loadDashboardData(true)
    }, 10000)

    return () => clearInterval(pollInterval)
  }, [confirmedSchoolId]) // Re-run if schoolId ever changes (e.g. super-admin switching context)

  // Re-compute chart/stats when attendance mode setting changes
  // (settings is already loaded, rawData just needs to be re-processed)
  useEffect(() => {
    if (rawData) {
      // Re-run the rawData effect by triggering a dummy state update
      setRawData(prev => prev ? { ...prev } : null)
    }
  }, [isSessionBased]) // eslint-disable-line react-hooks/exhaustive-deps


  const loadDashboardData = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true)
    try {
      // Safety net: never fetch if schoolId is missing — all API calls would
      // lack the tenant header and could return another school's data.
      const user = authService.getCurrentUser()
      if (!user?.schoolId) {
        console.warn("[Dashboard] loadDashboardData called with no schoolId — aborting to prevent cross-tenant leak")
        setIsLoading(false)
        return
      }
      let students: Student[] = []

      if (user?.role === "teacher") {
        // Fetch assignments and all students in parallel
        const [assignmentsData, allStudents] = await Promise.all([
          db.getTeacherAssignments(user.schoolId, user.teacherId || user.id),
          db.getStudents(),
        ])
        const classes = assignmentsData || []

        students = allStudents.filter((student: Student) => {
          return classes.some((cls: any) => {
            const studentGrade = (student.grade || "").toLowerCase().replace("grade ", "").trim()
            const clsGradeId = String(cls.gradeId || "").toLowerCase().trim()
            const clsGradeName = String(cls.grade?.name || cls.class?.grade || "").toLowerCase().replace("grade ", "").trim()
            
            const gradeMatch = studentGrade === clsGradeId || studentGrade === clsGradeName
            
            const studentSection = (student.section || "").toLowerCase().trim()
            const clsSectionId = String(cls.sectionId || "").toLowerCase().trim()
            const clsSectionName = String(cls.section?.name || cls.class?.section || "").toLowerCase().trim()
            
            const sectionMatch = studentSection === clsSectionId || studentSection === clsSectionName

            const studentStream = (student.stream || "").toLowerCase().trim()
            const clsStreamId = String(cls.streamId || "").toLowerCase().trim()
            const clsStreamName = String(cls.stream?.name || cls.class?.stream || "").toLowerCase().trim()
            
            const streamMatch = !cls.streamId || studentStream === clsStreamId || studentStream === clsStreamName
            
            return gradeMatch && sectionMatch && streamMatch
          })
        })
      } else {
        students = await db.getStudents()
      }

      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Addis_Ababa' })

      // Fetch both attendance datasets in parallel
      const [todayAttendance, allAttendance] = await Promise.all([
        db.getAttendanceByDate(today),
        db.getAttendance(),
      ])

      const studentIds = students.map((s) => s.id)
      const filteredTodayAttendance = todayAttendance.filter(
        (a) => user?.role === "admin" || studentIds.includes(a.student_id),
      )
      const filteredAllAttendance = allAttendance.filter(
        (a) => user?.role === "admin" || studentIds.includes(a.student_id),
      )

      setRawData({ today: filteredTodayAttendance, all: filteredAllAttendance, students })
    } catch (error) {
      notifications.error("Error", "Failed to load dashboard data")
    } finally {
      setIsLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = parseInt(new Date().toLocaleTimeString('en-US', { timeZone: 'Africa/Addis_Ababa', hour12: false, hour: 'numeric' }), 10)
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }

  const [firstName, setFirstName] = useState("User")

  useEffect(() => {
    const user = authService.getCurrentUser()
    if (user?.name) {
      const nameParts = user.name.trim().split(/\s+/)
      const titles = ['dr', 'dr.', 'mr', 'mr.', 'mrs', 'mrs.', 'ms', 'ms.', 'prof', 'prof.']
      if (nameParts.length > 1 && titles.includes(nameParts[0].toLowerCase())) {
        setFirstName(`${nameParts[0]} ${nameParts[1]}`)
      } else {
        setFirstName(nameParts[0])
      }
    }
  }, [])

  useEffect(() => {
    if (!rawData) return

    const { today: rawToday, all: rawAll, students } = rawData

    // Strict mode isolation — same logic as attendance-tracking.tsx:
    // - daily mode    → only records with null/undefined/empty session
    // - session mode  → only records that have a session value
    const today = isSessionBased
      ? rawToday.filter(r => r.session && r.session !== "")
      : rawToday.filter(r => r.session === null || r.session === undefined || r.session === "")

    const all = isSessionBased
      ? rawAll.filter(r => r.session && r.session !== "")
      : rawAll.filter(r => r.session === null || r.session === undefined || r.session === "")

    const sessionFilteredToday = sessionFilter === "total" 
      ? today 
      : today.filter(a => a.session?.toLowerCase() === sessionFilter.toLowerCase())

    const sessionFilteredAll = sessionFilter === "total" 
      ? all 
      : all.filter(a => a.session?.toLowerCase() === sessionFilter.toLowerCase())

    // Helper: status counts as present (Present or Late)
    const isPresent = (status: string | undefined) => {
      const s = status?.toLowerCase()
      return s === "present" || s === "late"
    }

    let presentToday = 0
    let lateToday = 0
    let absentToday = 0
    let excusedToday = 0

    // NEW GRANULAR CLASSIFIER
    const isP = (s: string | undefined) => s?.toLowerCase() === "present"
    const isL = (s: string | undefined) => s?.toLowerCase() === "late"
    const isE = (s: string | undefined) => s?.toLowerCase() === "excused"
    const isA = (s: string | undefined) => s?.toLowerCase() === "absent"
    const isAtt = (s: string | undefined) => isP(s) || isL(s)

    if (isSessionBased && sessionFilter === "total") {
      const studentGroups: { [studentId: string]: any[] } = {}
      sessionFilteredToday.forEach(a => {
        if (!studentGroups[a.student_id]) studentGroups[a.student_id] = []
        studentGroups[a.student_id].push(a)
      })

      Object.values(studentGroups).forEach(records => {
        const m = records.find(r => r.session?.toLowerCase() === "morning")
        const a = records.find(r => r.session?.toLowerCase() === "afternoon")

        if (m && a) {
          if (isP(m.status) && isP(a.status)) {
            presentToday++
          } else if (isAtt(m.status) && isAtt(a.status)) {
            lateToday++
          } else if (isE(m.status) && isE(a.status)) {
            excusedToday++
          } else if (isA(m.status) && isA(a.status)) {
            absentToday++
          }
        }
      })
    } else {
      presentToday = sessionFilteredToday.filter((a) => a.status?.toLowerCase() === "present").length
      lateToday = sessionFilteredToday.filter((a) => a.status?.toLowerCase() === "late").length
      absentToday = sessionFilteredToday.filter((a) => a.status?.toLowerCase() === "absent").length
      excusedToday = sessionFilteredToday.filter((a) => a.status?.toLowerCase() === "excused").length
    }

    const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Addis_Ababa' })

    const recentAttendance = sessionFilteredAll.filter((a) => {
      return a.attendance_date === todayDate && ["present", "late"].includes(a.status?.toLowerCase())
    })

    const totalRecentRecords = sessionFilteredAll.filter((a) => {
      return a.attendance_date === todayDate
    }).length

    const attendanceRate = isSessionBased && sessionFilter === "total"
      ? (Object.keys(sessionFilteredToday).length > 0 
          ? ((presentToday + lateToday + excusedToday) / Object.keys(sessionFilteredToday).length) * 100 
          : 0)
      : (totalRecentRecords > 0 ? (recentAttendance.length / totalRecentRecords) * 100 : 0)

    setStats({
      totalStudents: students.length,
      presentToday,
      lateToday,
      absentToday,
      excusedToday,
      attendanceRate: Math.round(attendanceRate),
    })

    // Prepare analytics data for charts
    const statusData = [
      { name: 'Present', value: presentToday },
      { name: 'Late', value: lateToday },
      { name: 'Absent', value: absentToday },
      { name: 'Excused', value: excusedToday },
    ].filter(d => d.value > 0)

    const trendDataMap: any = {}
    let daysFound = 0
    let dayOffset = 0
    
    const TARGET_TZ = 'Africa/Addis_Ababa'
    
    // Helper to get target YYYY-MM-DD
    const getTargetDateStr = (date: Date) => {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: TARGET_TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(date)
      const y = parts.find(p => p.type === 'year')?.value
      const m = parts.find(p => p.type === 'month')?.value
      const d = parts.find(p => p.type === 'day')?.value
      return `${y}-${m}-${d}`
    }

    const currentAddisDate = new Date()

    while (daysFound < 5) {
      const d = new Date(currentAddisDate)
      d.setDate(d.getDate() - dayOffset)
      
      const dayShort = new Intl.DateTimeFormat('en-US', {
        timeZone: TARGET_TZ,
        weekday: 'short'
      }).format(d)
      
      if (dayShort !== "Sat" && dayShort !== "Sun") {
        const dateStr = getTargetDateStr(d)
        trendDataMap[dateStr] = { date: dateStr, present: 0, late: 0, total: 0, fullDayPresent: 0, totalStudents: 0 }
        daysFound++
      }
      dayOffset++
    }

    if (isSessionBased && sessionFilter === "total") {
      // Session-based Full Day view: apply Full Day Present logic per student per date.
      // All records in 'all' are already session-filtered if isSessionBased is true.
      
      const sessionRecords = all.filter(r => trendDataMap[r.attendance_date])

      // Group by date → studentId → { morning, afternoon }
      const dateStudentMap: Record<string, Record<string, { morning?: string; afternoon?: string }>> = {}
      sessionRecords.forEach((record) => {
        const d = record.attendance_date
        if (!dateStudentMap[d]) dateStudentMap[d] = {}
        if (!dateStudentMap[d][record.student_id]) dateStudentMap[d][record.student_id] = {}
        const sess = record.session?.toLowerCase()
        if (sess === "morning") dateStudentMap[d][record.student_id].morning = record.status
        else if (sess === "afternoon") dateStudentMap[d][record.student_id].afternoon = record.status
      })

      // Compute Full Day Present rate per date
      Object.entries(dateStudentMap).forEach(([dateStr, studentMap]) => {
        const totalStudentsOnDay = Object.keys(studentMap).length
        const fullDayPresent = Object.values(studentMap).filter(
          (entry) =>
            entry.morning !== undefined &&
            entry.afternoon !== undefined &&
            isPresent(entry.morning) &&
            isPresent(entry.afternoon)
        ).length
        if (trendDataMap[dateStr]) {
          trendDataMap[dateStr].fullDayPresent = fullDayPresent
          trendDataMap[dateStr].totalStudents = totalStudentsOnDay
        }
      })
    } else {
      // Non-session-based or single-session filter: count raw records
      sessionFilteredAll.forEach((record) => {
        const d = record.attendance_date
        if (trendDataMap[d]) {
          trendDataMap[d].total++
          const status = record.status?.toLowerCase()
          if (status === "present") trendDataMap[d].present++
          else if (status === "late") trendDataMap[d].late++
        }
      })
    }

    const trendData = Object.values(trendDataMap)
      .sort((a: any, b: any) => a.date.localeCompare(b.date))
      .map((d: any) => {
        let rate = 0
        if (isSessionBased && sessionFilter === "total") {
          rate = d.totalStudents > 0
            ? Math.round((d.fullDayPresent / d.totalStudents) * 100)
            : 0
        } else {
          rate = d.total > 0 ? Math.round(((d.present + d.late) / d.total) * 100) : 0
        }
        return {
          date: new Date(d.date + "T00:00:00").toLocaleDateString("en-ET", { timeZone: TARGET_TZ, weekday: "short" }),
          rate
        }
      })

    setChartData({ trendData, statusData })

    const todayAttendance = sessionFilteredAll.filter(
      (a) => a.attendance_date === todayDate
    )

    const classActivityMap: Record<string, any> = {}

    todayAttendance.forEach((record) => {
      const student = students.find((s) => s.id === record.student_id)
      if (!student) return

      const classKey = `${student.grade}-${student.section}-${student.stream || ""}-${record.session || "daily"}`
      
      if (!classActivityMap[classKey]) {
        classActivityMap[classKey] = {
          grade: student.grade,
          section: student.section,
          stream: student.stream,
          session: record.session,
          count: 0,
          lastTimestamp: new Date(record.created_at || record.attendance_date).getTime(),
          date: record.created_at || record.attendance_date
        }
      }
      
      classActivityMap[classKey].count++
      const currentTimestamp = new Date(record.created_at || record.attendance_date).getTime()
      if (currentTimestamp > classActivityMap[classKey].lastTimestamp) {
        classActivityMap[classKey].lastTimestamp = currentTimestamp
        classActivityMap[classKey].date = record.created_at || record.attendance_date
      }
    })

    const activity = Object.values(classActivityMap)
      .sort((a, b) => b.lastTimestamp - a.lastTimestamp)
      .map((group: any) => ({
        grade: group.grade,
        section: group.section,
        stream: group.stream,
        session: group.session,
        count: group.count,
        time: new Date(group.date).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        date: group.date
      }))

    setRecentActivity(activity as RecentActivity[])
  }, [rawData, sessionFilter])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
      case "late":
        return "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
      case "absent":
        return "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800"
      case "excused":
        return "bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)

    if (checkDate.getTime() === today.getTime()) return "Today"
    return date.toLocaleDateString("en-ET", {
      timeZone: "Africa/Addis_Ababa",
      weekday: "short",
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    })
  }


  return (
    <div className="space-y-6 px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-2">
        <div className="space-y-1.5 w-full md:w-auto">
          <h2 className="text-3xl md:text-5xl font-black text-foreground leading-[1.1] tracking-tight uppercase">
            {getGreeting()}, <span className="text-primary">{firstName}</span>
          </h2>
          <p className="text-xs md:text-sm font-bold text-muted-foreground/60 uppercase tracking-widest">
            School Health Overview • {new Date().toLocaleDateString("en-ET", { timeZone: "Africa/Addis_Ababa", month: 'short', day: 'numeric' })}
          </p>
        </div>
        <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto">
          <div className="typography-label text-[10px] uppercase bg-primary/10 text-primary px-4 py-1.5 rounded-full border border-primary/20 shadow-sm flex items-center gap-3">
            {new Date().toLocaleDateString("en-ET", {
              timeZone: "Africa/Addis_Ababa",
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            <button 
              onClick={() => loadDashboardData()}
              className="ml-2 hover:text-primary-focus transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {isSessionBased && (
            <div className="flex gap-1.5 p-1 bg-white/50 dark:bg-slate-800/50 rounded-full border border-slate-200 dark:border-slate-700">
              <Button 
                variant={sessionFilter === "total" ? "default" : "ghost"} 
                onClick={() => setSessionFilter("total")}
                size="sm"
                className="typography-label h-7 px-3 text-[10px] uppercase rounded-full"
              >
                Full Day
              </Button>
              <Button 
                variant={sessionFilter === "morning" ? "default" : "ghost"} 
                onClick={() => setSessionFilter("morning")}
                size="sm"
                className="typography-label h-7 px-3 text-[10px] uppercase rounded-full"
              >
                Morning
              </Button>
              <Button 
                variant={sessionFilter === "afternoon" ? "default" : "outline"} 
                onClick={() => setSessionFilter("afternoon")}
                size="sm"
                className="typography-label h-7 px-3 text-[10px] uppercase rounded-full border-none"
              >
                Afternoon
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* School Overview Stats - Reimagined as a single row card */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4">
        {[
          { label: "Total Students", value: stats.totalStudents, icon: Users, color: "slate", trend: null },
          { label: "Present", value: stats.presentToday, icon: UserCheck, color: "emerald", trend: null },
          { label: "Late", value: stats.lateToday, icon: Clock, color: "amber", trend: null },
          { label: "Absent", value: stats.absentToday, icon: UserX, color: "rose", trend: null },
          { label: "Excused", value: stats.excusedToday, icon: AlertTriangle, color: "sky", trend: null },
          { label: "Attendance", value: `${stats.attendanceRate}%`, icon: TrendingUp, color: "indigo", isRate: true },
        ].map((item, idx) => (
          <div 
            key={idx} 
            className={cn(
              "relative overflow-hidden transition-all duration-300 active:scale-[0.98] group rounded-[24px] p-4 flex flex-col items-center justify-center text-center border shadow-sm",
              item.isRate 
                ? "bg-slate-900 dark:bg-primary text-white border-transparent" 
                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
            )}
          >
            <div className={cn(
              "w-9 h-9 rounded-2xl flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110",
              item.isRate 
                ? "bg-white/10" 
                : `bg-${item.color}-500/10 text-${item.color}-600 dark:text-${item.color}-400`
            )}>
              <item.icon className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <p className={cn(
                "text-lg font-black tracking-tight leading-none mb-1",
                item.isRate ? "text-white" : `text-foreground`
              )}>
                {isLoading ? (
                  <span className="inline-block w-8 h-4 bg-current opacity-10 animate-pulse rounded" />
                ) : (
                  item.value
                )}
              </p>
              <p className={cn(
                "text-[9px] uppercase font-black tracking-widest leading-none",
                item.isRate ? "text-white/60" : "text-muted-foreground/60"
              )}>
                {item.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      <QuickActions onNavigate={onNavigate || (() => {})} />


      {/* Analytics Dashboard Charts */}
      {/* Analytics Dashboard Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 px-2">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="typography-card-title text-foreground">5-Day Attendance Trend</h3>
          </div>
          <div className="h-[300px] w-full p-6 bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex items-center justify-center">
            {isLoading || !chartData ? (
              <div className="w-full h-full bg-slate-100 dark:bg-slate-800/20 animate-pulse rounded-2xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTrendRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: 'var(--primary)', fontWeight: 'bold' }}
                    labelStyle={{ color: 'var(--foreground)', marginBottom: '4px' }}
                    formatter={(value: number) => [`${value}%`, 'Attendance Rate']}
                  />
                  <Area type="monotone" dataKey="rate" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorTrendRate)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <Card className="border-none shadow-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800">
          <CardHeader className="pb-0 border-none">
            <CardTitle className="typography-card-title flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
              Today's Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || !chartData ? (
              <div className="h-[250px] w-full mt-4 bg-slate-100 dark:bg-slate-800/20 animate-pulse rounded-2xl" />
            ) : chartData.statusData.length > 0 ? (
              <div className="h-[250px] w-full mt-4 p-2 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-slate-200 dark:border-slate-700">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {chartData.statusData.map((entry, index) => {
                        const getColor = (name: string) => {
                          switch (name.toLowerCase()) {
                            case 'present': return '#10b981' // Green
                            case 'late': return '#f59e0b'    // Yellow
                            case 'absent': return '#ef4444'  // Red
                            case 'excused': return '#3b82f6' // Blue
                            default: return '#888888'
                          }
                        }
                        return <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
                      })}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}
                      itemStyle={{ color: 'var(--foreground)', fontWeight: 'bold' }}
                      labelStyle={{ color: 'var(--muted-foreground)' }}
                      formatter={(value: number, name: string) => [
                        `${value} Student${value !== 1 ? 's' : ''}`, 
                        name
                      ]}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground gap-3">
                <div className="p-4 bg-muted rounded-full">
                  <AlertTriangle className="w-8 h-8 opacity-20" />
                </div>
                <p className="typography-label">No attendance data for today</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Feed</h3>
          </div>
          <Badge variant="outline" className="text-[10px] font-black uppercase tracking-tight opacity-50 bg-slate-50 border-slate-100">
            Today
          </Badge>
        </div>
        <div className="space-y-3">
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-white/95 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 gap-4 animate-pulse shadow-sm">
                <div className="flex items-center space-x-4 w-full">
                  <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                  <div className="space-y-2 w-full">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
                  </div>
                </div>
                <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded shrink-0" />
              </div>
            ))
          ) : recentActivity.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-white/90 dark:bg-slate-900/90 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="typography-label">No recent attendance activity recorded yet</p>
            </div>
          ) : (
            recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[24px] shadow-sm transition-all active:scale-[0.99] group">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black border border-primary/20">
                    {activity.grade.match(/\d+/)?.[0] || '?' }
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground uppercase leading-none mb-1 truncate">
                      {activity.grade}
                    </p>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tight">
                      Sec {activity.section} {activity.session ? `• ${activity.session}` : ""}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                   <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase">
                        {activity.count} Present
                      </span>
                   </div>
                   <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-tighter">
                     {activity.time}
                   </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}


