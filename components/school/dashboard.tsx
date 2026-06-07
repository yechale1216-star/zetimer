"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, UserCheck, UserX, Clock, AlertTriangle, TrendingUp, Calendar } from "lucide-react"
import { db, type Student } from "@/lib/db/database"
import { notifications } from "@/lib/utils/notifications"
import { QuickActions } from "@/components/school/quick-actions"
import { useToast } from "@/hooks/use-toast"
import { authService } from "@/lib/auth/auth"
import { useSubscription } from "@/lib/context/subscription-context"
import { useSchoolSettings } from "@/hooks/use-school-settings"
import { Progress } from "@/components/ui/progress"
import {
  PieChart, Pie, Cell, Legend, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip
} from "recharts"
import { PageSkeleton } from "@/components/ui/page-skeleton"

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

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      const user = authService.getCurrentUser()
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
            const studentGrade = (student.grade || "").replace("Grade ", "").trim()
            const classGrade = String(cls.grade || cls.class?.grade || "").trim()
            const gradeMatch = studentGrade === classGrade
            const sectionMatch = (cls.section || cls.class?.section) === student.section
            const streamMatch = !(cls.stream || cls.class?.stream) || (cls.stream || cls.class?.stream) === student.stream
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

    // If session-based, only consider records that have a session field
    // to prevent old daily-mode records from polluting the dashboard.
    const today = isSessionBased ? rawToday.filter(r => r.session) : rawToday
    const all = isSessionBased ? rawAll.filter(r => r.session) : rawAll

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
        return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
      case "late":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
      case "absent":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
      case "excused":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
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

  if (isLoading) {
    return <PageSkeleton variant="dashboard" />
  }

  return (
    <div className="space-y-6 px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-2">
        <div className="space-y-1.5 w-full md:w-auto">
          <h2 className="typography-page-title text-4xl md:text-5xl font-semibold text-foreground leading-tight">
            {getGreeting()}, <span className="text-primary">{firstName}</span>
          </h2>
          <p className="typography-label text-muted-foreground">
            Here's what's happening with your school today.
          </p>
        </div>
        <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto">
          <div className="typography-label text-[10px] uppercase bg-primary/10 text-primary px-4 py-1.5 rounded-full border border-primary/20 shadow-sm">
            {new Date().toLocaleDateString("en-ET", {
              timeZone: "Africa/Addis_Ababa",
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
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

      <Card className="border-none shadow-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800">
        <CardHeader className="pb-0 border-none">
          <CardTitle className="typography-card-title flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            School Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-row items-center justify-between p-4 bg-white/95 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/50 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50">
                  <Users className="h-5 w-5" />
                </div>
                <p className="typography-label text-foreground uppercase text-[10px]">Total Students</p>
              </div>
              <p className="typography-page-title text-foreground text-2xl">{stats.totalStudents}</p>
            </div>

            <div className="flex flex-row items-center justify-between p-4 bg-white/95 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-950/50 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400 border border-green-200/50 dark:border-green-800/50">
                  <UserCheck className="h-5 w-5" />
                </div>
                <p className="typography-label text-green-600 dark:text-green-400 uppercase text-[10px]">Present</p>
              </div>
              <p className="typography-page-title text-green-600 dark:text-green-500 text-2xl">{stats.presentToday}</p>
            </div>

            <div className="flex flex-row items-center justify-between p-4 bg-white/95 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-950/50 rounded-lg flex items-center justify-center text-yellow-600 dark:text-yellow-400 border border-yellow-200/50 dark:border-yellow-800/50">
                  <Clock className="h-5 w-5" />
                </div>
                <p className="typography-label text-yellow-600 dark:text-yellow-400 uppercase text-[10px]">Late</p>
              </div>
              <p className="typography-page-title text-yellow-600 dark:text-yellow-500 text-2xl">{stats.lateToday}</p>
            </div>

            <div className="flex flex-row items-center justify-between p-4 bg-white/95 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-950/50 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-800/50">
                  <UserX className="h-5 w-5" />
                </div>
                <p className="typography-label text-red-600 dark:text-red-400 uppercase text-[10px]">Absent</p>
              </div>
              <p className="typography-page-title text-red-600 dark:text-red-500 text-2xl">{stats.absentToday}</p>
            </div>

            <div className="flex flex-row items-center justify-between p-4 bg-white/95 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/50 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <p className="typography-label text-blue-600 dark:text-blue-400 uppercase text-[10px]">Excused</p>
              </div>
              <p className="typography-page-title text-blue-600 dark:text-blue-500 text-2xl">{stats.excusedToday}</p>
            </div>

            <div className="flex flex-row items-center justify-between p-4 bg-gradient-to-br from-purple-500 to-indigo-600 dark:from-purple-600 dark:to-indigo-800 rounded-xl shadow-lg border-none transition-all hover:shadow-xl active:scale-[0.98] cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-white border border-white/20">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <p className="typography-label text-white uppercase text-[10px]">Rate</p>
              </div>
              <p className="typography-page-title text-white text-2xl">{stats.attendanceRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <QuickActions onNavigate={onNavigate || (() => {})} />


      {/* Analytics Dashboard Charts */}
      {chartData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 px-2">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="typography-card-title text-foreground">5-Day Attendance Trend</h3>
            </div>
            <div className="h-[300px] w-full p-6 bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
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
              {chartData.statusData.length > 0 ? (
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
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="typography-card-title text-foreground">Recent Activity</h3>
        </div>
        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-white/90 dark:bg-slate-900/90 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="typography-label">No recent attendance activity recorded yet</p>
            </div>
          ) : (
            recentActivity.map((activity, index) => (
              <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white/95 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 gap-4 sm:gap-0 shadow-sm transition-all hover:bg-white/80 dark:hover:bg-slate-800/80">
                <div className="flex items-center space-x-4 w-full sm:w-auto">
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="typography-label h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                      {activity.grade.match(/\d+/)?.[0] || activity.grade.charAt(0)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="typography-label text-foreground truncate uppercase">
                      {activity.grade} Attendance
                    </p>
                    <p className="typography-label text-[10px] text-muted-foreground truncate uppercase opacity-70">
                      Section {activity.section} {activity.stream ? `• ${activity.stream}` : ""} 
                      {activity.session ? ` • ${activity.session}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end space-x-4 w-full sm:w-auto border-t sm:border-0 pt-3 sm:pt-0 dark:border-slate-700/50">
                  <Badge variant="outline" className="typography-label bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 text-[10px] uppercase">
                    {activity.count} Present
                  </Badge>
                  <div className="text-right flex-shrink-0">
                    <p className="typography-label text-foreground uppercase">{formatDate(activity.date)}</p>
                    <p className="typography-label text-[10px] text-muted-foreground opacity-60">{activity.time}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}


