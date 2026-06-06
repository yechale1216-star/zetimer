"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { PageSkeleton } from "@/components/ui/page-skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Search,
  Save,
  Calendar,
  Mail,
  MessageSquare,
  Settings,
  UserX,
  UserCheck,
  Clock,
  AlertTriangle,
  Phone,
  Copy,
  Check,
  Download,
} from "lucide-react"
import { db, type Student } from "@/lib/db/database"
import { notifications, combinedNotificationService, emailService } from "@/lib/utils/notifications"
import { useSchoolSettings } from "@/hooks/use-school-settings"
import { authService } from "@/lib/auth/auth"
import { parseJsonResponse } from "@/lib/utils/parse-json-response"


interface AttendanceState {
  [studentId: string]: {
    status: "present" | "late" | "absent" | "excused" | null
    note: string
  }
}

export function AttendanceTracking() {
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [attendanceState, setAttendanceState] = useState<AttendanceState>({})
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Addis_Ababa' }))
  const [selectedSession, setSelectedSession] = useState<"morning" | "afternoon">(
    parseInt(new Date().toLocaleTimeString('en-US', { timeZone: 'Africa/Addis_Ababa', hour12: false, hour: 'numeric' }), 10) < 12 ? "morning" : "afternoon"
  )
  const [searchTerm, setSearchTerm] = useState("")
  const [gradeFilter, setGradeFilter] = useState("All Grades")
  const [streamFilter, setStreamFilter] = useState("All Streams")
  const [sectionFilter, setSectionFilter] = useState("All Sections")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSendingNotifications, setIsSendingNotifications] = useState(false)
  const [showAbsentStudents, setShowAbsentStudents] = useState(false)
  const [absentSearchTerm, setAbsentSearchTerm] = useState("")
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null)
  const [showSessionConfirm, setShowSessionConfirm] = useState(false)
  const [pendingSession, setPendingSession] = useState<"morning" | "afternoon" | null>(null)
  const { settings } = useSchoolSettings()

  const [isTeacher, setIsTeacher] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [uiType, setUiType] = useState<"card_based" | "tabular">("card_based")

  useEffect(() => {
    if (settings?.attendanceUiType) {
      setUiType(settings.attendanceUiType)
    }
  }, [settings?.attendanceUiType])

  useEffect(() => {
    const user = authService.getCurrentUser()
    setIsTeacher(user?.role === "teacher")
    loadStudents()
  }, [])

  useEffect(() => {
    loadAttendanceForDate()
  }, [selectedDate, students, selectedSession, settings?.attendanceMode])

  useEffect(() => {
    filterStudents()
  }, [students, searchTerm, gradeFilter, streamFilter, sectionFilter])

  const loadStudents = async () => {
    setIsLoading(true)
    try {
      const user = authService.getCurrentUser()
      const studentsData = await db.getStudents()
      
      if (user?.role === "teacher") {
        const assignmentsData = await db.getTeacherAssignments(user.schoolId, user.teacherId || user.id)
        const classes = assignmentsData || []

        const allFilteredStudents = studentsData.filter((student: Student) => {
          return classes.some((cls: any) => {
            const gradeMatch = (student.grade || "").replace("Grade ", "") === String(cls.grade || "")
            const sectionMatch = student.section === cls.section
            const streamMatch = !cls.stream || student.stream === cls.stream
            return gradeMatch && sectionMatch && streamMatch
          })
        })

        setStudents(allFilteredStudents)
        console.log(
          `[v0] Loaded ${allFilteredStudents.length} students for attendance from ${classes.length} assigned classes`,
        )
      } else {
        setStudents(studentsData)
      }
    } catch (error) {
      console.error("[v0] Error loading students for teacher:", error)
      notifications.error("Error", "Failed to load students")
    } finally {
      setIsLoading(false)
    }
  }

  const loadAttendanceForDate = async () => {
    if (students.length === 0) return

    try {
      const attendanceRecords = await db.getAttendanceByDate(selectedDate)
      const isSessionBased = settings?.attendanceMode === "session_based"
      const filteredRecords = isSessionBased
        ? attendanceRecords.filter((r: any) => r.session?.toLowerCase() === selectedSession.toLowerCase())
        : attendanceRecords

      const newAttendanceState: AttendanceState = {}

      students.forEach((student) => {
        newAttendanceState[student.id] = {
          status: null,
          note: "",
        }
      })

      filteredRecords.forEach((record) => {
        if (newAttendanceState[record.student_id]) {
          newAttendanceState[record.student_id] = {
            status: record.status?.toLowerCase() as any,
            note: record.note || "",
          }
        }
      })

      setAttendanceState(newAttendanceState)
    } catch (error) {
      notifications.error("Error", "Failed to load attendance records")
    }
  }

  const filterStudents = () => {
    let filtered = students

    if (searchTerm) {
      filtered = filtered.filter(
        (student) =>
        (student.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.student_id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.grade || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.stream?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.section || "").toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (gradeFilter !== "All Grades") {
      filtered = filtered.filter((student) => student.grade === gradeFilter)
    }

    if (streamFilter !== "All Streams") {
      filtered = filtered.filter((student) => student.stream === streamFilter)
    }

    if (sectionFilter !== "All Sections") {
      filtered = filtered.filter((student) => student.section === sectionFilter)
    }

    setFilteredStudents(filtered)
  }

  const updateAttendance = (studentId: string, status: "present" | "late" | "absent" | "excused", note = "") => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        status,
        note,
      },
    }))
  }

  const handleSessionChange = (session: "morning" | "afternoon") => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Addis_Ababa' })
    // Only warn if selecting for today
    if (selectedDate !== today) {
      setSelectedSession(session)
      return
    }

    const currentHour = parseInt(new Date().toLocaleTimeString('en-US', { timeZone: 'Africa/Addis_Ababa', hour12: false, hour: 'numeric' }), 10)
    const isMorningTime = currentHour < 12
    
    if ((session === "morning" && !isMorningTime) || (session === "afternoon" && isMorningTime)) {
      setPendingSession(session)
      setShowSessionConfirm(true)
    } else {
      setSelectedSession(session)
    }
  }

  const confirmSessionChange = () => {
    if (pendingSession) {
      setSelectedSession(pendingSession)
    }
    setShowSessionConfirm(false)
    setPendingSession(null)
  }

  const updateNote = (studentId: string, note: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        note,
      },
    }))
  }

  const markAllAsPresent = () => {
    const newAttendanceState: AttendanceState = {}
    filteredStudents.forEach((student) => {
      newAttendanceState[student.id] = {
        status: "present",
        note: "",
      }
    })
    setAttendanceState((prev) => ({
      ...prev,
      ...newAttendanceState,
    }))
    notifications.success("Success", `Marked ${filteredStudents.length} students as present`)

  }

  const markSelectedAbsent = () => {
    if (selectedStudents.size === 0) {
      notifications.warning("No Selection", "Please select students first")
      return
    }
    const newAttendanceState: AttendanceState = { ...attendanceState }
    selectedStudents.forEach((id) => {
      newAttendanceState[id] = { status: "absent", note: "" }
    })
    setAttendanceState(newAttendanceState)
    setSelectedStudents(new Set())
    notifications.success("Success", `Marked ${selectedStudents.size} students as absent`)
  }

  const resetAttendance = () => {
    const newAttendanceState: AttendanceState = { ...attendanceState }
    filteredStudents.forEach((student) => {
      newAttendanceState[student.id] = { status: null, note: "" }
    })
    setAttendanceState(newAttendanceState)
    notifications.info("Attendance Reset", "Cleared attendance for filtered students")
  }

  const toggleStudentSelection = (studentId: string) => {
    const newSelection = new Set(selectedStudents)
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId)
    } else {
      newSelection.add(studentId)
    }
    setSelectedStudents(newSelection)
  }

  const toggleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set())
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)))
    }
  }

  const saveAttendance = async () => {
    setIsSaving(true)
    try {
      const isSessionBased = settings?.attendanceMode === "session_based"
      const attendanceRecords = Object.entries(attendanceState)
        .filter(([_, data]) => data.status !== null)
        .map(([studentId, data]) => ({
          student_id: studentId,
          date: selectedDate,
          status: data.status!,
          note: data.note,
          session: isSessionBased ? selectedSession : null,
        }))

      if (attendanceRecords.length === 0) {
        notifications.warning("No Data", "Please mark attendance for at least one student")

        return
      }

      await db.markAttendance(attendanceRecords)

      notifications.success("Attendance Saved Successfully", "The student attendance records have been updated.")


      await loadAttendanceForDate()
    } catch (error) {
      console.error("[v0] Error saving attendance:", error)
      notifications.error("Error", "Failed to save attendance. Please try again.")

    } finally {
      setIsSaving(false)
    }
  }

  const sendEmailNotifications = async () => {
    setIsSendingNotifications(true)
    try {
      const notificationsToSend = Object.entries(attendanceState)
        .filter(([_, data]) => data.status && ["absent", "late", "excused"].includes(data.status))
        .map(([studentId, data]) => {
          const student = students.find((s) => s.id === studentId)
          return student
            ? {
                student,
                status: data.status as "absent" | "late" | "excused",
                note: data.note,
              }
            : null
        })
        .filter(Boolean) as Array<{
        student: Student
        status: "absent" | "late" | "excused"
        note: string
      }>

      if (notificationsToSend.length === 0) {
        notifications.info("No Notifications", "No absent, late, or excused students to notify via email")
        return
      }

      const result = await combinedNotificationService.sendBulkNotifications(notificationsToSend, {
        email: true,
        sms: false,
      })

      if (result.email.failed > 0) {
        notifications.warning("Email Partially Sent", `${result.email.success} emails sent. ${result.email.failed} failed.`)
      } else {
        notifications.success("Emails Sent", `Successfully sent ${result.email.success} email alerts.`)
      }
    } catch (error) {
      notifications.error("Error", "Failed to send email notifications")
    } finally {
      setIsSendingNotifications(false)
    }
  }

  const sendSMSNotifications = async () => {
    setIsSendingNotifications(true)
    try {
      const notificationsToSend = Object.entries(attendanceState)
        .filter(([_, data]) => data.status && ["absent", "late", "excused"].includes(data.status))
        .map(([studentId, data]) => {
          const student = students.find((s) => s.id === studentId)
          return student
            ? {
                student,
                status: data.status as "absent" | "late" | "excused",
                note: data.note,
              }
            : null
        })
        .filter(Boolean) as Array<{
        student: Student
        status: "absent" | "late" | "excused"
        note: string
      }>

      if (notificationsToSend.length === 0) {
        notifications.info("No Notifications", "No absent, late, or excused students to notify via SMS")
        return
      }

      const result = await combinedNotificationService.sendBulkNotifications(notificationsToSend, {
        email: false,
        sms: true,
      })

      if (result.sms.failed > 0) {
        notifications.warning("SMS Partially Sent", `${result.sms.success} SMS sent. ${result.sms.failed} failed.`)
      } else {
        notifications.success("SMS Sent", `Successfully sent ${result.sms.success} SMS alerts.`)
      }
    } catch (error) {
      notifications.error("Error", "Failed to send SMS notifications")
    } finally {
      setIsSendingNotifications(false)
    }
  }

  const sendStudentNotification = async (studentId: string, channel: "email" | "sms") => {
    const data = attendanceState[studentId]
    if (!data || !data.status || !["absent", "late", "excused"].includes(data.status)) {
      notifications.warning("Status Required", "Student must be marked as Absent, Late, or Excused to send an alert.")
      return
    }

    const student = students.find((s) => s.id === studentId)
    if (!student) return

    setIsSendingNotifications(true)
    try {
      const result = await combinedNotificationService.sendBulkNotifications(
        [{ student, status: data.status as any, note: data.note }],
        { email: channel === "email", sms: channel === "sms" }
      )

      if (channel === "email") {
        if (result.email.success > 0) notifications.success("Email Sent", `Alert sent to ${student.name}'s parent.`)
        else notifications.error("Failed", "Failed to send email alert.")
      } else {
        if (result.sms.success > 0) notifications.success("SMS Sent", `Alert sent to ${student.name}'s parent.`)
        else notifications.error("Failed", "Failed to send SMS alert.")
      }
    } catch (error) {
      notifications.error("Error", "Failed to send notification")
    } finally {
      setIsSendingNotifications(false)
    }
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800 border-green-200"
      case "late":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "absent":
        return "bg-red-100 text-red-800 border-red-200"
      case "excused":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getAttendanceStats = () => {
    const stats = {
      present: 0,
      late: 0,
      absent: 0,
      excused: 0,
      unmarked: 0,
    }

    Object.values(attendanceState).forEach((data) => {
      if (data.status) {
        stats[data.status]++
      } else {
        stats.unmarked++
      }
    })

    return stats
  }

  const getAbsentStudents = () => {
    return filteredStudents.filter((student) => {
      const attendance = attendanceState[student.id]
      return attendance?.status === "absent"
    })
  }

  const getFilteredAbsentStudents = () => {
    const absentStudents = getAbsentStudents()

    if (!absentSearchTerm) {
      return absentStudents
    }

    return absentStudents.filter(
      (student) =>
        (student.name || "").toLowerCase().includes(absentSearchTerm.toLowerCase()) ||
        (student.student_id || "").toLowerCase().includes(absentSearchTerm.toLowerCase()) ||
        (student.grade || "").toLowerCase().includes(absentSearchTerm.toLowerCase()) ||
        student.stream?.toLowerCase().includes(absentSearchTerm.toLowerCase()) ||
        (student.section || "").toLowerCase().includes(absentSearchTerm.toLowerCase()),
    )
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedPhone(text)
      notifications.success("Copied!", `${label} copied to clipboard`)
      setTimeout(() => setCopiedPhone(null), 2000)
    } catch (error) {
      notifications.error("Error", "Failed to copy to clipboard")
    }
  }

  const initiateCall = (parentPhone: string, schoolPhone?: string) => {
    try {
      window.open(`tel:${parentPhone}`, "_blank")
    } catch (error) {
      const message = schoolPhone
        ? `Please call ${parentPhone} from your school phone: ${schoolPhone}`
        : `Please call ${parentPhone}`
      notifications.info("Call Instructions", message, 5000)
    }
  }

  const clearAbsentStudents = () => {
    const newAttendanceState: AttendanceState = { ...attendanceState }
    let clearedCount = 0

    Object.keys(newAttendanceState).forEach((studentId) => {
      if (newAttendanceState[studentId]?.status === "absent") {
        newAttendanceState[studentId] = {
          status: null,
          note: "",
        }
        clearedCount++
      }
    })

    setAttendanceState(newAttendanceState)
    notifications.success("Cleared", `Cleared ${clearedCount} absent student${clearedCount !== 1 ? "s" : ""}`)

  }


  const exportAttendanceToCSV = () => {
    console.log("[v0] Starting attendance CSV export...")

    try {
      const headers = ["Student Name", "Student ID", "Grade", "Stream", "Section", "Status", "Date", "Note"]

      const csvData = filteredStudents.map((student) => {
        const attendance = attendanceState[student.id]
        return [
          `"${student.name}"`,
          student.student_id || "",
          `"${student.grade || ""}"`,
          `"${student.stream || ""}"`,
          student.section || "",
          attendance?.status || "Not Marked",
          selectedDate,
          `"${attendance?.note || ""}"`,
        ]
      })

      const csvContent = [headers, ...csvData].map((row) => row.join(",")).join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `attendance_${selectedDate}.csv`
      link.style.display = "none"

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setTimeout(() => {
        window.URL.revokeObjectURL(url)
      }, 100)

      notifications.success("Export Complete", `Exported attendance for ${filteredStudents.length} students`)

    } catch (error) {
      console.error("[v0] CSV export error:", error)
      notifications.error("Export Failed", "Failed to export attendance. Please try again.")

    }
  }

  const stats = getAttendanceStats()
  const grades = [...new Set(students.map((s) => s.grade))].filter(Boolean)
  const streams = [...new Set(students.map((s) => s.stream).filter(Boolean))]
  const sections = [...new Set(students.map((s) => s.section))].filter(Boolean)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="typography-page-title text-foreground">Mark Attendance</h2>
        <div className="flex gap-2">
          <Button onClick={exportAttendanceToCSV} disabled={filteredStudents.length === 0} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={saveAttendance}
            disabled={isSaving}
            className="typography-label bg-blue-600 hover:bg-blue-700 text-white shadow-md"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Now"}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 px-1">
        <div className="flex items-center gap-1.5 p-1 bg-white/90 dark:bg-slate-900/90 rounded-full border border-slate-200/60 dark:border-slate-800 backdrop-blur-sm shadow-sm">
          <Button
            onClick={sendEmailNotifications}
            disabled={isSendingNotifications}
            variant="ghost"
            size="sm"
            className="typography-label h-7 px-3 text-[10px] uppercase text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-full"
          >
            <Mail className="w-3.5 h-3.5 mr-1.5" />
            Email
          </Button>
          <div className="w-px h-3 bg-slate-200 dark:bg-slate-800" />
          <Button
            onClick={sendSMSNotifications}
            disabled={isSendingNotifications}
            variant="ghost"
            size="sm"
            className="typography-label h-7 px-3 text-[10px] uppercase text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-full"
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
            SMS
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800">
        <CardHeader className="pb-0 border-none">
          <CardTitle className="typography-card-title flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Attendance Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex flex-col p-4 bg-white/95 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transform transition-all hover:scale-[1.02] active:scale-[0.98] hover:shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="h-4 w-4 text-green-500 dark:text-green-400" />
                <p className="typography-label text-[10px] text-muted-foreground uppercase">Present</p>
              </div>
              <p className="typography-page-title text-green-600 dark:text-green-500">{stats.present}</p>
            </div>

            <div className="flex flex-col p-4 bg-white/95 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transform transition-all hover:scale-[1.02] active:scale-[0.98] hover:shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
                <p className="typography-label text-[10px] text-muted-foreground uppercase">Late</p>
              </div>
              <p className="typography-page-title text-yellow-600 dark:text-yellow-500">{stats.late}</p>
            </div>

            <div className="flex flex-col p-4 bg-white/95 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transform transition-all hover:scale-[1.02] active:scale-[0.98] hover:shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <UserX className="h-4 w-4 text-red-500 dark:text-red-400" />
                <p className="typography-label text-[10px] text-muted-foreground uppercase">Absent</p>
              </div>
              <p className="typography-page-title text-red-600 dark:text-red-500">{stats.absent}</p>
            </div>

            <div className="flex flex-col p-4 bg-white/95 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transform transition-all hover:scale-[1.02] active:scale-[0.98] hover:shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                <p className="typography-label text-[10px] text-muted-foreground uppercase">Excused</p>
              </div>
              <p className="typography-page-title text-blue-600 dark:text-blue-500">{stats.excused}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800">
          <CardHeader className="pb-0 border-none">
            <CardTitle className="typography-label text-[10px] uppercase text-muted-foreground flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              Attendance Date
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Input
              id="attendance-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Addis_Ababa' })}
              className="h-10 bg-white/95 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-primary/20"
            />
          </CardContent>
        </Card>

        {settings?.attendanceMode === "session_based" && (
          <Card className="border-none shadow-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800">
            <CardHeader className="pb-0 border-none">
              <CardTitle className="typography-label text-[10px] uppercase text-muted-foreground">Attendance Session</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex gap-1.5 p-1 bg-white/95 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700">
                <Button
                  variant={selectedSession === "morning" ? "default" : "ghost"}
                  onClick={() => handleSessionChange("morning")}
                  className={`typography-label flex-1 h-9 uppercase rounded-lg transition-all ${selectedSession === "morning" ? "shadow-md scale-[1.02]" : ""}`}
                >
                  Morning
                </Button>
                <Button
                  variant={selectedSession === "afternoon" ? "default" : "ghost"}
                  onClick={() => handleSessionChange("afternoon")}
                  className={`typography-label flex-1 h-9 uppercase rounded-lg transition-all ${selectedSession === "afternoon" ? "shadow-md scale-[1.02]" : ""}`}
                >
                  Afternoon
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="border-none shadow-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 transition-colors group-focus-within:text-primary" />
              <Input
                placeholder="Search name, ID, or section..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 w-full bg-white/95 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-primary/20"
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="w-[120px] h-10 bg-white/95 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 rounded-xl">
                  <SelectValue placeholder="Grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Grades">All Grades</SelectItem>
                  {grades.map((grade) => (
                    <SelectItem key={grade || "unknown"} value={grade || "unknown"}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={streamFilter} onValueChange={setStreamFilter}>
                <SelectTrigger className="w-[120px] h-10 bg-white/95 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 rounded-xl">
                  <SelectValue placeholder="Stream" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Streams">All Streams</SelectItem>
                  {streams.map((stream) => (
                    <SelectItem key={stream || "unknown"} value={stream || "unknown"}>
                      {stream}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="w-[120px] h-10 bg-white/95 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 rounded-xl">
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Sections">All Sections</SelectItem>
                  {sections.map((section) => (
                    <SelectItem key={section || "unknown"} value={section || "unknown"}>
                      {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={selectedStudents.size > 0 ? () => {
                const newAttendanceState: AttendanceState = { ...attendanceState }
                selectedStudents.forEach((id) => {
                  newAttendanceState[id] = { status: "present", note: "" }
                })
                setAttendanceState(newAttendanceState)
                setSelectedStudents(new Set())
                notifications.success("Success", `Marked ${selectedStudents.size} students as present`)
              } : markAllAsPresent}
              disabled={isSaving}
              variant="outline"
              className="typography-label bg-white/95 dark:bg-slate-800/90 border-green-200 dark:border-green-900 hover:bg-green-50 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 h-9 rounded-xl uppercase"
            >
              {selectedStudents.size > 0 ? `Mark Selected Present (${selectedStudents.size})` : "Mark All Present"}
            </Button>
            {selectedStudents.size > 0 && (
              <Button
                onClick={markSelectedAbsent}
                disabled={isSaving}
                variant="outline"
                className="typography-label bg-white/95 dark:bg-slate-800/90 border-orange-200 dark:border-orange-900 hover:bg-orange-50 dark:hover:bg-orange-900/30 text-orange-700 dark:text-orange-400 h-9 rounded-xl uppercase"
              >
                Mark Selected Absent ({selectedStudents.size})
              </Button>
            )}
            <Button
              onClick={() => setShowAbsentStudents(true)}
              variant="outline"
              className="typography-label bg-white/95 dark:bg-slate-800/90 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 h-9 rounded-xl uppercase"
            >
              <UserX className="w-4 h-4 mr-2" />
              Absent ({getAbsentStudents().length})
            </Button>
            <Button
              onClick={resetAttendance}
              variant="ghost"
              className="typography-label text-muted-foreground hover:text-foreground h-9 rounded-xl uppercase"
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <PageSkeleton variant="table" />
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-20 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <p className="text-gray-600">No students found</p>
        </div>
      ) : uiType === "card_based" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((student) => {
            const attendance = attendanceState[student.id] || { status: null, note: "" }
            return (
              <Card key={student.id} className="border-none shadow-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800 transition-all hover:shadow-lg group active:scale-[0.99]">
                <CardContent className="p-6">
                  <div className="flex items-center mb-6">
                    <div className="flex-shrink-0 h-14 w-14">
                      <div className="typography-section-title h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                        {(student.name || student.first_name || "S").charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="ml-4 flex-1 min-w-0">
                      <h3 className="typography-card-title text-foreground truncate uppercase">{student.name}</h3>
                      <div className="typography-label text-[10px] text-muted-foreground uppercase opacity-70">
                        {student.student_id || ""} • {student.grade || ""} {student.stream || ""} {student.section || ""}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-6">
                    {(["present", "late", "absent", "excused"] as const).map((status) => (
                      <Button
                        key={status}
                        variant={attendance.status === status ? "default" : "outline"}
                        size="sm"
                        className={`typography-label capitalize h-10 rounded-xl text-[11px] uppercase ${ attendance.status === status ? getStatusColor(status) : "bg-white/95 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700" } transition-all active:scale-95`}
                        onClick={() => updateAttendance(student.id, status)}
                      >
                        {status}
                      </Button>
                    ))}
                  </div>

                  {attendance.status && ["absent", "late", "excused"].includes(attendance.status) && (
                    <div className="space-y-2">
                      <Label htmlFor={`note-${student.id}`} className="typography-label text-[10px] uppercase text-muted-foreground ml-1">
                        Note (optional)
                      </Label>
                      <Textarea
                        id={`note-${student.id}`}
                        placeholder="Add a reason or note..."
                        value={attendance.note}
                        onChange={(e) => updateNote(student.id, e.target.value)}
                        className="typography-helper min-h-[70px] bg-white/95 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-primary/20"
                      />
                    </div>
                  )}

                  {attendance.status && (
                    <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                      <Badge className={`typography-label ${getStatusColor(attendance.status)} text-[9px] uppercase px-2.5 py-0.5`}>
                        {attendance.status}
                      </Badge>
                      {["absent", "late", "excused"].includes(attendance.status) && (
                        <div className="flex gap-1.5">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                            onClick={() => sendStudentNotification(student.id, "email")}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-colors"
                            onClick={() => sendStudentNotification(student.id, "sms")}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="overflow-hidden border-none shadow-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800">
          <div className="overflow-x-auto max-h-[600px] relative scrollbar-hide">
            <Table>
              <TableHeader className="sticky top-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md z-10 border-b border-slate-200 dark:border-slate-800">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="w-12">
                    <input 
                      type="checkbox" 
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                      checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-16">Photo</TableHead>
                  <TableHead className="min-w-[200px]">Student Name</TableHead>
                  <TableHead className="w-32">Student ID</TableHead>
                  <TableHead className="min-w-[350px] text-center">Attendance Status</TableHead>
                  <TableHead className="min-w-[200px]">Remarks</TableHead>
                  <TableHead className="w-24 text-center">Notify</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => {
                  const attendance = attendanceState[student.id] || { status: null, note: "" }
                  return (
                    <TableRow key={student.id} className={`hover:bg-blue-50/30 transition-colors ${selectedStudents.has(student.id) ? 'bg-blue-50/50' : ''}`}>
                      <TableCell>
                        <input 
                          type="checkbox" 
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                          checked={selectedStudents.has(student.id)}
                          onChange={() => toggleStudentSelection(student.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="typography-label h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                          {(student.name || student.first_name || "S").charAt(0).toUpperCase()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="typography-label text-foreground dark:text-white">{student.name}</div>
                        <div className="typography-helper text-muted-foreground">{student.grade || ""} {student.stream || ""} {student.section || ""}</div>
                      </TableCell>
                      <TableCell className="typography-helper font-mono text-foreground dark:text-slate-300">{student.student_id}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {(["present", "late", "absent", "excused"] as const).map((status) => (
                            <Button
                              key={status}
                              variant={attendance.status === status ? "default" : "outline"}
                              size="sm"
                              className={`typography-helper capitalize h-8 px-3 ${ attendance.status === status ? getStatusColor(status) : "" } hover:scale-105 transition-transform`}
                              onClick={() => updateAttendance(student.id, status)}
                            >
                              {status}
                            </Button>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Note..."
                          value={attendance.note}
                          onChange={(e) => updateNote(student.id, e.target.value)}
                          className="typography-helper h-8 border-gray-200 focus:border-blue-400"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {attendance.status && ["absent", "late", "excused"].includes(attendance.status) ? (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => sendStudentNotification(student.id, "email")}
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => sendStudentNotification(student.id, "sms")}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-[10px] text-gray-400">N/A</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <div className="typography-body text-gray-600">
        Showing {filteredStudents.length} of {students.length} students
      </div>


      <Dialog open={showAbsentStudents} onOpenChange={setShowAbsentStudents}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="w-5 h-5 text-red-600" />
              Absent Students - {selectedDate}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search absent students by name, ID, grade, stream, or section"
                value={absentSearchTerm}
                onChange={(e) => setAbsentSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {settings?.schoolPhone && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-blue-600" />
                    <span className="typography-label text-blue-900">School Phone Number:</span>
                    <span className="typography-body font-mono text-blue-700">{settings.schoolPhone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(settings.schoolPhone!, "School phone")}
                      className="typography-helper h-8"
                    >
                      {copiedPhone === settings.schoolPhone ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Badge variant="outline" className="typography-helper bg-white border-blue-300">
                      Call families from this number
                    </Badge>
                  </div>
                </div>
                <p className="typography-helper text-blue-600 mt-2">
                  💡 Use your school phone to call parents. Click "Call" buttons below to dial parent numbers.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between px-1">
              <p className="typography-body text-gray-600">
                Showing {getFilteredAbsentStudents().length} of {getAbsentStudents().length} absent students
              </p>
              {getAbsentStudents().length === 0 && (
                <Badge className="bg-green-100 text-green-800">No absent students today!</Badge>
              )}
            </div>

            {getAbsentStudents().length === 0 ? (
              <div className="text-center py-12">
                <UserX className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="typography-label text-gray-600">No absent students for this date</p>
                <p className="typography-body text-gray-500 mt-1">All students are marked as present, late, or excused</p>
              </div>
            ) : getFilteredAbsentStudents().length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="typography-label text-gray-600">No students found</p>
                <p className="typography-body text-gray-500 mt-1">Try adjusting your search term</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2">
                {getFilteredAbsentStudents().map((student) => {
                  const attendance = attendanceState[student.id]
                  return (
                    <Card key={student.id} className="border-red-200 bg-red-50/30">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="typography-label h-10 w-10 rounded-full bg-red-600 flex items-center justify-center text-white">
                              {(student.name || student.first_name || "S").charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="typography-label text-foreground dark:text-white truncate">{student.name}</div>
                            <div className="typography-helper text-muted-foreground mt-0.5">ID: {student.student_id || ""}</div>
                            <div className="typography-helper text-muted-foreground">
                              {student.grade || ""} {student.stream || ""} {student.section || ""}
                            </div>
                            <div className="mt-3 space-y-2">
                              <div className="typography-helper">
                                <span className="typography-label text-foreground dark:text-slate-200">Parent:</span>
                                <span className="text-muted-foreground ml-1">{student.parent_name}</span>
                              </div>
                              <div className="typography-helper">
                                <span className="typography-label text-foreground dark:text-slate-200">Email:</span>
                                <span className="text-muted-foreground ml-1 break-all">{student.parent_email}</span>
                              </div>
                              <div className="bg-white border border-gray-200 rounded-lg p-2 mt-2">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="typography-helper text-gray-700">Parent Phone:</span>
                                  <span className="typography-label font-mono text-gray-900">
                                    {student.parent_phone}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => initiateCall(student.parent_phone || "", settings?.schoolPhone)}
                                    className="flex-1 h-8 bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <Phone className="w-3 h-3 mr-1" />
                                    Call Family
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => copyToClipboard(student.parent_phone || "", "Parent phone")}
                                    className="h-8 px-3"
                                  >
                                    {copiedPhone === student.parent_phone ? (
                                      <Check className="w-3 h-3" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </Button>
                                </div>
                                {settings?.schoolPhone && (
                                  <div className="typography-helper text-blue-600 mt-2 flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    <span>Call from: {settings.schoolPhone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {attendance?.note && (
                              <div className="mt-2 pt-2 border-t border-red-200">
                                <p className="typography-helper text-gray-700">
                                  <span className="typography-label">Note:</span> {attendance.note}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {getAbsentStudents().length > 0 && (
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAbsentStudents(false)
                    setAbsentSearchTerm("")
                  }}
                >
                  Close
                </Button>
                <Button
                  onClick={async () => {
                    setShowAbsentStudents(false)
                    await sendEmailNotifications()
                  }}
                  disabled={isSendingNotifications}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Notifications to Absent Students
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showSessionConfirm} onOpenChange={setShowSessionConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Session Change</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="typography-body text-gray-600">
              You are selecting the <span className="typography-label text-blue-600 capitalize">{pendingSession}</span> session, 
              but it is currently <span className="typography-label text-orange-600">{parseInt(new Date().toLocaleTimeString('en-US', { timeZone: 'Africa/Addis_Ababa', hour12: false, hour: 'numeric' }), 10) < 12 ? "Morning" : "Afternoon"}</span>. 
              Are you sure you want to take attendance for the {pendingSession} session?
            </p>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowSessionConfirm(false)}>Cancel</Button>
            <Button onClick={confirmSessionChange}>Confirm and Proceed</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


