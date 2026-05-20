"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { parentDb, type ParentNotification } from "@/lib/db/parent-db"
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
  
  const [currentUser, setCurrentUser] = useState<any>(null)
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
  
  // Stats
  const totalDays = attendance.length
  const presents = attendance.filter(a => a.status?.toLowerCase() === "present").length
  const absents = attendance.filter(a => a.status?.toLowerCase() === "absent").length
  const lates = attendance.filter(a => a.status?.toLowerCase() === "late").length
  const excused = attendance.filter(a => a.status?.toLowerCase() === "excused").length

  // Circular gauge percentage calculation (Late is counted as half-present in generic stats)
  const attendanceRate = totalDays > 0 
    ? Math.round(((presents + excused + lates * 0.5) / totalDays) * 100) 
    : 100

  // Today's attendance resolver
  const getTodayAttendance = () => {
    const todayStr = new Date().toISOString().split("T")[0]
    
    // Filter records matching today's date in local standard format
    const todayRecords = attendance.filter(a => {
      const recDate = new Date(a.date).toISOString().split("T")[0]
      return recDate === todayStr
    })

    if (todayRecords.length === 0) {
      return { status: "Unmarked", morning: null, afternoon: null, isSessionBased: false }
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
    switch (status.toLowerCase()) {
      case "present":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none rounded-lg font-bold">Present</Badge>
      case "absent":
        return <Badge className="bg-rose-500 hover:bg-rose-600 border-none rounded-lg font-bold">Absent</Badge>
      case "late":
        return <Badge className="bg-amber-500 hover:bg-amber-600 border-none rounded-lg font-bold">Late</Badge>
      case "excused":
        return <Badge className="bg-blue-500 hover:bg-blue-600 border-none rounded-lg font-bold">Excused</Badge>
      default:
        return <Badge variant="outline" className="rounded-lg font-bold">Not Marked</Badge>
    }
  }

  const getSessionCard = (title: string, status: string | null) => {
    if (!status) return null
    let colorClass = "bg-muted/50 border-border/20"
    let icon = <Clock className="w-4 h-4 text-muted-foreground" />

    if (status.toLowerCase() === "present") {
      colorClass = "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
      icon = <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
    } else if (status.toLowerCase() === "absent") {
      colorClass = "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"
      icon = <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
    } else if (status.toLowerCase() === "late") {
      colorClass = "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300"
      icon = <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
    } else if (status.toLowerCase() === "excused") {
      colorClass = "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300"
      icon = <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
    }

    return (
      <div className={`flex items-center justify-between p-3.5 border rounded-xl transition-all ${colorClass}`}>
        <span className="text-xs font-bold">{title}</span>
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-xs font-black uppercase tracking-wider">{status}</span>
        </div>
      </div>
    )
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
      
      {/* ─── EMERGENCY ALERTS BANNER ──────────────────────────────────────── */}
      {emergencyNotice && (
        <Alert variant="destructive" className="border-rose-500/40 bg-rose-500/5 text-rose-800 dark:text-rose-200 rounded-2xl shadow-lg shadow-rose-500/5">
          <AlertOctagon className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          <AlertTitle className="font-extrabold uppercase tracking-wide flex items-center gap-2">
            Emergency Notice
          </AlertTitle>
          <AlertDescription className="text-xs font-semibold mt-1">
            <strong>{emergencyNotice.title}:</strong> {emergencyNotice.message}
            <span className="block text-[10px] opacity-75 mt-1">Posted: {formatNotificationTime(emergencyNotice.createdAt)}</span>
          </AlertDescription>
        </Alert>
      )}

      {/* ─── TODAY'S ATTENDANCE SUMMARY CARD ──────────────────────────────── */}
      <Card className="border-border/40 shadow-xl rounded-3xl bg-card/60 backdrop-blur-md overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/40 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Today's Attendance Breakdown</p>
                <h2 className="text-xl font-black tracking-tight">{selectedStudent?.fullName}</h2>
                <p className="text-xs text-muted-foreground font-semibold mt-0.5">Grade {selectedStudent?.grade} • Section {selectedStudent?.section}</p>
              </div>
            </div>

            <div className="flex-grow max-w-md w-full">
              {todayStatus.isSessionBased ? (
                <div className="grid grid-cols-2 gap-3.5">
                  {getSessionCard("Morning Session", todayStatus.morning)}
                  {getSessionCard("Afternoon Session", todayStatus.afternoon)}
                </div>
              ) : (
                <div className="flex items-center justify-between p-3.5 bg-muted/30 border border-border/20 rounded-2xl">
                  <span className="text-xs font-bold text-muted-foreground">Today's Daily Status</span>
                  <div className="flex items-center gap-2">
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
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground">Attendance rate</CardTitle>
            <CardDescription className="text-xs">Cumulative presence percentage</CardDescription>
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
                <span className="text-3xl font-black tracking-tight">{attendanceRate}%</span>
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">Rating</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-4 bg-emerald-500/5 p-1 px-3 rounded-full">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Target: 90% or higher</span>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Metrics Numbers Card */}
        <Card className="border-border/40 shadow-lg rounded-3xl bg-card/60 backdrop-blur-md lg:col-span-2 flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground">Term Summary Statistics</CardTitle>
            <CardDescription className="text-xs">Based on {totalDays} total recorded sessions</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0 flex-1 flex flex-col justify-center">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              <div className="p-4 bg-muted/20 border border-border/10 rounded-2xl text-center space-y-1">
                <span className="text-xs text-muted-foreground font-semibold">Presents</span>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{presents}</p>
                <span className="text-[9px] text-muted-foreground/60 font-semibold block leading-none">Days in class</span>
              </div>

              <div className="p-4 bg-muted/20 border border-border/10 rounded-2xl text-center space-y-1">
                <span className="text-xs text-muted-foreground font-semibold">Absents</span>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{absents}</p>
                <span className="text-[9px] text-muted-foreground/60 font-semibold block leading-none">Unexcused cuts</span>
              </div>

              <div className="p-4 bg-muted/20 border border-border/10 rounded-2xl text-center space-y-1">
                <span className="text-xs text-muted-foreground font-semibold">Late Arrivals</span>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{lates}</p>
                <span className="text-[9px] text-muted-foreground/60 font-semibold block leading-none">Tardy logs</span>
              </div>

              <div className="p-4 bg-muted/20 border border-border/10 rounded-2xl text-center space-y-1">
                <span className="text-xs text-muted-foreground font-semibold">Excused</span>
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{excused}</p>
                <span className="text-[9px] text-muted-foreground/60 font-semibold block leading-none">Approved leaves</span>
              </div>

            </div>

            <div className="mt-6 flex items-center justify-between text-xs border-t border-border/20 pt-4 px-1 text-muted-foreground">
              <span className="font-semibold">Need to submit a leave request?</span>
              <button 
                onClick={() => router.push("/parent/profile")}
                className="text-emerald-600 dark:text-emerald-400 font-extrabold hover:underline flex items-center gap-1"
              >
                <span>Contact Advisor</span>
                <ArrowRight className="w-3.5 h-3.5" />
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
              <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-500" />
                <span>Recent Attendance Alerts</span>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">Critical notifications specific to {selectedStudent?.fullName}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4 max-h-[300px] overflow-y-auto">
            {recentAlerts.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                <CheckCircle className="w-10 h-10 text-emerald-500/40 mb-2" />
                <p className="text-xs font-bold">No recent attendance alerts</p>
                <span className="text-[10px] text-muted-foreground/60 font-semibold mt-1">Excellent attendance consistency!</span>
              </div>
            ) : (
              recentAlerts.slice(0, 5).map((alert) => (
                <div 
                  key={alert.id} 
                  className={`flex gap-3 p-3 border rounded-2xl transition-all ${
                    alert.type === "absent" 
                      ? "bg-rose-500/5 border-rose-500/10" 
                      : "bg-amber-500/5 border-amber-500/10"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center ${
                    alert.type === "absent" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {alert.type === "absent" ? <XCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-foreground">{alert.title}</span>
                      <span className="text-[9px] text-muted-foreground font-semibold">{formatNotificationTime(alert.createdAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-semibold mt-1 leading-snug">{alert.message}</p>
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
              <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-emerald-500" />
                <span>School Announcements</span>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">Broad notifications and alerts from school administration</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4 max-h-[300px] overflow-y-auto">
            {announcements.filter(a => a.type !== "emergency").length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                <BookOpen className="w-10 h-10 text-emerald-500/40 mb-2" />
                <p className="text-xs font-bold">No school announcements</p>
                <span className="text-[10px] text-muted-foreground/60 font-semibold mt-1">Check back later for school newsletters.</span>
              </div>
            ) : (
              announcements.filter(a => a.type !== "emergency").slice(0, 5).map((announcement) => (
                <div key={announcement.id} className="p-3.5 bg-muted/20 border border-border/10 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-foreground">{announcement.title}</span>
                    <span className="text-[9px] text-muted-foreground font-semibold">{formatNotificationTime(announcement.createdAt)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">{announcement.message}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

      </div>

    </div>
  )
}
