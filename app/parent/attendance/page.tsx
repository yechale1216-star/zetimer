"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  CalendarDays, 
  ListOrdered, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Activity,
  ChevronLeft,
  ChevronRight,
  Filter,
  UserCheck
} from "lucide-react"
import { useLanguage } from "@/lib/context/language-context"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export default function AttendanceHistory() {
  const { t, language } = useLanguage()
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [attendance, setAttendance] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters state
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [activeTab, setActiveTab] = useState<"calendar" | "table">("calendar")

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
  
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  // 1. Initial Load & Auth verification
  const loadData = async () => {
    const studentId = localStorage.getItem("parent_selected_student_id")
    const studentsStr = localStorage.getItem("parent_students")

    if (studentsStr && studentId) {
      const students = JSON.parse(studentsStr)
      const student = students.find((s: any) => s.id === studentId) || students[0]
      if (student) {
        setSelectedStudent(student)
        await fetchStudentAttendance(student.id)
      }
    }
    setIsLoading(false)
  }

  // 2. Fetch student's attendance list
  const fetchStudentAttendance = async (studentId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/attendance?studentId=${studentId}`)
      const data = await res.json()
      if (data.success && data.data) {
        setAttendance(data.data)
      } else {
        // Fallback
        const studentRes = await fetch(`${API_URL}/api/students/${studentId}`)
        const studentData = await studentRes.json()
        if (studentData.success && studentData.data?.attendance) {
          setAttendance(studentData.data.attendance)
        }
      }
    } catch (err) {
      console.error("[AttendanceHistory] Fetch error:", err)
    }
  }

  // Hook studentChanged event
  useEffect(() => {
    loadData()

    const handleStudentChange = () => {
      setIsLoading(true)
      loadData()
    }

    window.addEventListener("studentChanged", handleStudentChange)
    return () => window.removeEventListener("studentChanged", handleStudentChange)
  }, [])

  // ─── FILTER CALCULATIONS ────────────────────────────────────────────────
  
  // Filter attendance records by selected month and year
  const filteredAttendance = attendance.filter(a => {
    const d = new Date(a.date)
    const month = parseInt(new Intl.DateTimeFormat('en-US', { month: 'numeric', timeZone: 'Africa/Addis_Ababa' }).format(d)) - 1
    const year = parseInt(new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'Africa/Addis_Ababa' }).format(d))
    return month === selectedMonth && year === selectedYear
  })

  // Monthly stats - Aggregated by day
  const monthlyMetrics = (() => {
    const byDate: Record<string, string[]> = {}
    filteredAttendance.forEach(a => {
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

  const totalMonthlyDays = monthlyMetrics.total
  const monthlyPresents = monthlyMetrics.presents
  const monthlyAbsents = monthlyMetrics.absents
  const monthlyLates = monthlyMetrics.lates
  const monthlyExcused = monthlyMetrics.excused

  const monthlyRate = totalMonthlyDays > 0 
    ? Math.round(((monthlyPresents + monthlyExcused + monthlyLates * 0.8) / totalMonthlyDays) * 100) 
    : 100

  // ─── CALENDAR RENDERING GENERATORS ──────────────────────────────────────

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay() // 0 = Sunday, 1 = Monday etc.
  }

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear(prev => prev - 1)
    } else {
      setSelectedMonth(prev => prev - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear(prev => prev + 1)
    } else {
      setSelectedMonth(prev => prev + 1)
    }
  }

  // Generate calendar days grid
  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth)
  const firstDayIndex = getFirstDayOfMonth(selectedYear, selectedMonth)
  
  const calendarCells = []
  
  // Blank days before 1st of month
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push({ day: null, dateStr: null })
  }

  // Days of the month
  for (let d = 1; d <= daysInMonth; d++) {
    // Create date in Addis Ababa timezone
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    calendarCells.push({ day: d, dateStr })
  }

  // Find attendance status for a calendar day
  const getDayAttendance = (dateStr: string) => {
    const records = attendance.filter(a => {
      const recDate = new Date(a.date).toLocaleDateString('en-CA', { timeZone: 'Africa/Addis_Ababa' })
      return recDate === dateStr
    })

    if (records.length === 0) return null

    // If session based, check if there's any absent or late
    const morning = records.find(r => r.session?.toLowerCase() === "morning")
    const afternoon = records.find(r => r.session?.toLowerCase() === "afternoon")
    const daily = records.find(r => !r.session)

    if (morning || afternoon) {
      // Aggregate: if either is absent, color as absent. Otherwise late, otherwise present
      const statuses = [morning?.status, afternoon?.status].filter(Boolean)
      if (statuses.some(s => s.toLowerCase() === "absent")) return "absent"
      if (statuses.some(s => s.toLowerCase() === "late")) return "late"
      if (statuses.some(s => s.toLowerCase() === "excused")) return "excused"
      return "present"
    }

    return daily?.status?.toLowerCase() || null
  }

  // Visual classes for calendar circles
  const getCalendarDayColor = (status: string | null) => {
    if (!status) return "hover:bg-muted"
    switch (status.toLowerCase()) {
      case "present":
        return "bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-extrabold ring-2 ring-emerald-500/30"
      case "absent":
        return "bg-rose-500/10 border-rose-500 text-rose-700 dark:text-rose-300 font-extrabold ring-2 ring-rose-500/30"
      case "late":
        return "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300 font-extrabold ring-2 ring-amber-500/30"
      case "excused":
        return "bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-300 font-extrabold ring-2 ring-blue-500/30"
      default:
        return "hover:bg-muted"
    }
  }

  const formatTableDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString(language === "am" ? "am-ET" : "en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "Africa/Addis_Ababa"
      })
    } catch {
      return dateStr
    }
  }

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
        return <Badge variant="outline" className="typography-label rounded-lg">{t("unmarked")}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-28 w-full bg-card animate-pulse rounded-3xl" />
        <div className="h-96 w-full bg-card animate-pulse rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* ─── TITLE & MONTH SELECTOR BAR ────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="typography-page-title text-foreground">{t("view_history")}</h1>
          <p className="typography-label text-muted-foreground mt-0.5">{t("attendance_history_desc")}</p>
        </div>

        <div className="flex items-center gap-2 bg-card/60 backdrop-blur-md p-1.5 rounded-2xl border border-border/40 shrink-0">
          <Select 
            value={selectedMonth.toString()} 
            onValueChange={(val) => setSelectedMonth(parseInt(val))}
          >
            <SelectTrigger className="typography-label w-36 h-9 border-none bg-transparent hover:bg-muted rounded-xl focus:ring-0 focus:ring-offset-0">
              <SelectValue placeholder={t("month")} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {months.map((m, idx) => (
                <SelectItem key={m} value={idx.toString()} className="typography-helper rounded-lg">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={selectedYear.toString()} 
            onValueChange={(val) => setSelectedYear(parseInt(val))}
          >
            <SelectTrigger className="typography-label w-24 h-9 border-none bg-transparent hover:bg-muted rounded-xl focus:ring-0 focus:ring-offset-0">
              <SelectValue placeholder={t("year")} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()} className="typography-helper rounded-lg">{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ─── MONTHLY STATS SUMMARY CARD ───────────────────────────────────── */}
      <Card className="border-border/40 shadow-xl rounded-3xl bg-card/60 backdrop-blur-md overflow-hidden">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
            
            {/* Monthly attendance circular rate */}
            <div className="flex items-center gap-4 md:col-span-2 md:border-r border-border/20 md:pr-6">
              <div className="relative w-18 h-18 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" className="stroke-muted dark:stroke-slate-800" strokeWidth="10" fill="transparent" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-emerald-500 dark:stroke-emerald-400 transition-all duration-700"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - monthlyRate / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="typography-label absolute text-foreground">{monthlyRate}%</span>
              </div>
              <div>
                <p className="typography-label text-[10px] text-muted-foreground uppercase">{t("monthly_score")}</p>
                <h3 className="typography-card-title">{language === "am" ? t(months[selectedMonth].toLowerCase() as any) : months[selectedMonth]} {selectedYear}</h3>
                <span className="typography-label text-[10px] text-muted-foreground">{t("active_child")}: {selectedStudent?.fullName.split(" ")[0]}</span>
              </div>
            </div>

            {/* Quick breakdown metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:col-span-3">
              <div className="text-center space-y-0.5">
                <p className="typography-label text-[10px] text-muted-foreground">{t("total_days")}</p>
                <span className="typography-card-title text-foreground">{totalMonthlyDays}</span>
              </div>
              <div className="text-center space-y-0.5">
                <p className="typography-label text-[10px] text-muted-foreground text-emerald-600 dark:text-emerald-400">{t("presents")}</p>
                <span className="typography-card-title text-emerald-600 dark:text-emerald-400">{monthlyPresents}</span>
              </div>
              <div className="text-center space-y-0.5">
                <p className="typography-label text-[10px] text-muted-foreground text-rose-600 dark:text-rose-400">{t("absents")}</p>
                <span className="typography-card-title text-rose-600 dark:text-rose-400">{monthlyAbsents}</span>
              </div>
              <div className="text-center space-y-0.5">
                <p className="typography-label text-[10px] text-muted-foreground text-amber-600 dark:text-amber-400">{t("late_arrivals")}</p>
                <span className="typography-card-title text-amber-600 dark:text-amber-400">{monthlyLates}</span>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* ─── CALENDAR / TABLE TABS DISPLAY ────────────────────────────────── */}
      <Tabs 
        defaultValue="calendar" 
        value={activeTab} 
        onValueChange={(val) => setActiveTab(val as any)}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <TabsList className="bg-card/60 backdrop-blur-md border border-border/40 p-1 rounded-2xl">
            <TabsTrigger value="calendar" className="typography-label gap-1.5 rounded-xl px-4 py-2">
              <CalendarDays className="w-4 h-4" />
              <span>{t("calendar_grid")}</span>
            </TabsTrigger>
            <TabsTrigger value="table" className="typography-label gap-1.5 rounded-xl px-4 py-2">
              <ListOrdered className="w-4 h-4" />
              <span>{t("audit_log_list")}</span>
            </TabsTrigger>
          </TabsList>

          {/* Indicators description */}
          <div className="typography-label hidden lg:flex items-center gap-4 text-[10px] uppercase text-muted-foreground/80">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>{t("presents")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>{t("absents")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>{t("late_arrivals")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>{t("excused")}</span>
            </div>
          </div>
        </div>

        {/* 1. CALENDAR GRID TRIGGER VIEW */}
        <TabsContent value="calendar" className="outline-none">
          <Card className="border-border/40 shadow-xl rounded-3xl bg-card/60 backdrop-blur-md overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/20 py-4 px-6">
              <div className="space-y-0.5">
                <CardTitle className="typography-label uppercase text-foreground">
                  {language === "am" ? t(months[selectedMonth].toLowerCase() as any) : months[selectedMonth]} {selectedYear}
                </CardTitle>
                <CardDescription className="typography-helper">{t("attendance_history_desc")}</CardDescription>
              </div>
              <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/10">
                <button 
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-background rounded-md text-muted-foreground hover:text-foreground transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-background rounded-md text-muted-foreground hover:text-foreground transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              
              {/* Calendar Grid Header */}
              <div className="typography-label grid grid-cols-7 text-center uppercase text-muted-foreground/80 mb-4 pb-2 border-b border-border/20">
                <span>{language === "am" ? "እሁድ" : "Sun"}</span>
                <span>{language === "am" ? "ሰኞ" : "Mon"}</span>
                <span>{language === "am" ? "ማክሰ" : "Tue"}</span>
                <span>{language === "am" ? "ረቡዕ" : "Wed"}</span>
                <span>{language === "am" ? "ሐሙስ" : "Thu"}</span>
                <span>{language === "am" ? "ዓርብ" : "Fri"}</span>
                <span>{language === "am" ? "ቅዳሜ" : "Sat"}</span>
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2.5 md:gap-4">
                {calendarCells.map((cell, idx) => {
                  if (cell.day === null || !cell.dateStr) {
                    return <div key={`empty-${idx}`} className="aspect-square bg-muted/5 rounded-2xl" />
                  }

                  const dayStatus = getDayAttendance(cell.dateStr)
                  return (
                    <div 
                      key={cell.dateStr}
                      className={`aspect-square flex flex-col items-center justify-center border border-border/10 rounded-2xl transition-all relative group select-none ${getCalendarDayColor(dayStatus)}`}
                    >
                      <span className="typography-label">{cell.day}</span>
                      
                      {/* Optional miniature dot indicator */}
                      {dayStatus && (
                        <div className={`w-1.5 h-1.5 rounded-full absolute bottom-1.5 shrink-0 ${
                          dayStatus === "present" ? "bg-emerald-500" :
                          dayStatus === "absent" ? "bg-rose-500" :
                          dayStatus === "late" ? "bg-amber-500" : "bg-blue-500"
                        }`} />
                      )}
                    </div>
                  )
                })}
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. TABLE AUDIT LOG LIST VIEW */}
        <TabsContent value="table" className="outline-none animate-in fade-in duration-300">
          <Card className="border-border/40 shadow-xl rounded-3xl bg-card/60 backdrop-blur-md overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30 border-b border-border/20">
                  <TableRow>
                    <TableHead className="typography-label uppercase text-muted-foreground py-4 px-6">{t("date")}</TableHead>
                    <TableHead className="typography-label uppercase text-muted-foreground py-4 px-6">{t("session")}</TableHead>
                    <TableHead className="typography-label uppercase text-muted-foreground py-4 px-6">{t("status_label")}</TableHead>
                    <TableHead className="typography-label uppercase text-muted-foreground py-4 px-6">{t("remarks")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-16 text-muted-foreground">
                        <CalendarDays className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="typography-label">{t("no_attendance_records")}</p>
                        <span className="typography-label text-[10px] text-muted-foreground/60">{t("verify_month")}</span>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAttendance.map((record) => (
                      <TableRow key={record.id} className="border-b border-border/20 hover:bg-muted/10">
                        <TableCell className="typography-label py-4 px-6">{formatTableDate(record.date)}</TableCell>
                        <TableCell className="typography-label py-4 px-6 text-muted-foreground">
                          {record.session ? (
                            <Badge variant="outline" className="typography-label capitalize text-[10px] rounded-md bg-muted/40">
                              {record.session === "morning" ? t("morning_session") : t("afternoon_session")}
                            </Badge>
                          ) : (
                            <span className="typography-helper italic text-muted-foreground/60">{language === "am" ? "ሙሉ ቀን" : "Full Day"}</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 px-6">{getStatusBadge(record.status)}</TableCell>
                        <TableCell className="typography-label py-4 px-6 text-muted-foreground max-w-xs truncate">
                          {record.remarks || <span className="text-muted-foreground/40 italic text-[11px]">{t("no_notes")}</span>}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

    </div>
  )
}
