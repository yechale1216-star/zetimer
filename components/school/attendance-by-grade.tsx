"use client"

import { useState, useEffect } from "react"
import { Users, UserCheck, UserX, Clock, AlertTriangle, TrendingUp, Download, Table as TableIcon, Clock3 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/db/database"
import { AttendanceFilters } from "./attendance-filters"
import { GradeAttendanceTable } from "./grade-attendance-table"
import { AttendanceAnalyticsCharts } from "./attendance-analytics-charts"
import { useToast } from "@/hooks/use-toast"
import { notifications } from "@/lib/utils/notifications"
import { useSchoolSettings } from "@/hooks/use-school-settings"
import { PageSkeleton } from "@/components/ui/page-skeleton"
import { cn } from "@/lib/utils/utils"

export function AttendanceByGrade() {
  const [summary, setSummary] = useState<any>(null)
  const [gradeStats, setGradeStats] = useState<any[]>([])
  const [trends, setTrends] = useState<any[]>([])
  const [rawData, setRawData] = useState<{ attendance: any[], students: any[] } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const { settings, isLoading: settingsLoading } = useSchoolSettings()
  const [filters, setFilters] = useState({
    grade: "all",
    section: "all",
    stream: "all",
    academicYear: new Date().getFullYear().toString(),
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    session: "total"
  })
  const { toast } = useToast()

  useEffect(() => {
    if (!settingsLoading) {
      loadData()
      
      // Setup polling for "instant" updates (every 30 seconds)
      const pollInterval = setInterval(() => {
        loadData(true)
      }, 30000)

      return () => clearInterval(pollInterval)
    }
  }, [filters.startDate, filters.endDate, settingsLoading]) // Only re-fetch date range changes

  useEffect(() => {
    if (rawData) {
      aggregateData()
    }
  }, [rawData, filters.session, filters.grade, filters.section, filters.stream])


  const loadData = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true)
    try {
      // Fetch both attendance and students for the selected date range
      const [attendanceRecords, studentsData] = await Promise.all([
        db.getAttendanceByDateRange(filters.startDate, filters.endDate),
        db.getStudents()
      ])

      setRawData({ attendance: attendanceRecords, students: studentsData })
    } catch (error) {
      notifications.error("Error", "Failed to load raw attendance data")
    } finally {
      setIsLoading(false)
    }
  }

  const aggregateData = () => {
    if (!rawData) return

    const { attendance: allRecords, students: allStudents } = rawData
    const isSessionBased = settings?.attendanceMode === "session_based"
    
    // Status helpers
    const isP = (s: string | undefined) => s?.toLowerCase() === "present"
    const isL = (s: string | undefined) => s?.toLowerCase() === "late"
    const isE = (s: string | undefined) => s?.toLowerCase() === "excused"
    const isA = (s: string | undefined) => s?.toLowerCase() === "absent"
    const isAtt = (s: string | undefined) => isP(s) || isL(s)

    // 1. Filter students by current Grade/Section/Stream
    const filteredStudents = allStudents.filter(s => {
      const gMatch = filters.grade === "all" || s.grade === filters.grade
      const sMatch = filters.section === "all" || s.section === filters.section
      const strMatch = filters.stream === "all" || s.stream === filters.stream
      return gMatch && sMatch && strMatch
    })

    const studentIds = new Set(filteredStudents.map(s => s.id))

    // 2. Filter attendance records by student subset and mode isolation
    let records = allRecords.filter(r => studentIds.has(r.student_id))

    if (!isSessionBased) {
      records = records.filter(r => !r.session)
    } else {
      records = records.filter(r => !!r.session)
      // If a specific session is selected (Daily view narrowed)
      if (filters.session !== "total") {
        records = records.filter(r => r.session?.toLowerCase() === filters.session.toLowerCase())
      }
    }

    // 3. Compute Summary Stats
    let present = 0, late = 0, excused = 0, absent = 0
    
    const isFullDay = filters.session === "total"

    if (isSessionBased && isFullDay) {
      // Group by student + date for Full Day logic
      const grouped: Record<string, { morning?: string; afternoon?: string }> = {}
      records.forEach(r => {
        const key = `${r.student_id}||${r.attendance_date}`
        if (!grouped[key]) grouped[key] = {}
        if (r.session?.toLowerCase() === "morning") grouped[key].morning = r.status
        else if (r.session?.toLowerCase() === "afternoon") grouped[key].afternoon = r.status
      })

      Object.values(grouped).forEach(entry => {
        const { morning: m, afternoon: a } = entry
        if (m && a) {
          if (isP(m) && isP(a)) present++
          else if (isAtt(m) && isAtt(a)) late++
          else if (isE(m) && isE(a)) excused++
          else if (isA(m) && isA(a)) absent++
        } else if (m || a) {
          const r = m || a
          if (isP(r)) present++
          else if (isL(r)) late++
          else if (isE(r)) excused++
          else if (isA(r)) absent++
        }
      })
    } else {
      records.forEach(r => {
        if (isP(r.status)) present++
        else if (isL(r.status)) late++
        else if (isE(r.status)) excused++
        else if (isA(r.status)) absent++
      })
    }

    const totalStats = present + late + excused + absent
    setSummary({
      totalStudents: filteredStudents.length,
      present, late, excused, absent,
      attendanceRate: totalStats > 0 ? Math.round(((present + late + excused) / totalStats) * 100) : 0
    })

    // 4. Compute Grade Stats (Detailed Table)
    const gradeMap: Record<string, any> = {}
    
    // Initialize map with current students to ensure 0-attendance classes show up
    filteredStudents.forEach(student => {
      const key = `${student.grade}-${student.section}-${student.stream || ""}`
      if (!gradeMap[key]) {
        gradeMap[key] = {
          grade: student.grade,
          section: student.section,
          stream: student.stream,
          present: 0, late: 0, excused: 0, absent: 0,
          totalStudents: 0
        }
      }
      gradeMap[key].totalStudents++
    })

    // Process records for grade stats
    if (isSessionBased && isFullDay) {
       // Similar grouping but also keep track of student's grade/section/stream
       const grouped: Record<string, { morning?: string; afternoon?: string; key: string }> = {}
       records.forEach(r => {
         const student = allStudents.find(s => s.id === r.student_id)
         if (!student) return
         const studentKey = `${student.grade}-${student.section}-${student.stream || ""}`
         const dayKey = `${r.student_id}||${r.attendance_date}`
         if (!grouped[dayKey]) grouped[dayKey] = { key: studentKey }
         if (r.session?.toLowerCase() === "morning") grouped[dayKey].morning = r.status
         else if (r.session?.toLowerCase() === "afternoon") grouped[dayKey].afternoon = r.status
       })

       Object.values(grouped).forEach(entry => {
         const { morning: m, afternoon: a, key } = entry
         if (!gradeMap[key]) return
         if (m && a) {
           if (isP(m) && isP(a)) gradeMap[key].present++
           else if (isAtt(m) && isAtt(a)) gradeMap[key].late++
           else if (isE(m) && isE(a)) gradeMap[key].excused++
           else if (isA(m) && isA(a)) gradeMap[key].absent++
         } else if (m || a) {
           const r = m || a
           if (isP(r)) gradeMap[key].present++
           else if (isL(r)) gradeMap[key].late++
           else if (isE(r)) gradeMap[key].excused++
           else if (isA(r)) gradeMap[key].absent++
         }
       })
    } else {
      records.forEach(r => {
        const student = allStudents.find(s => s.id === r.student_id)
        if (!student) return
        const key = `${student.grade}-${student.section}-${student.stream || ""}`
        if (!gradeMap[key]) return

        if (isP(r.status)) gradeMap[key].present++
        else if (isL(r.status)) gradeMap[key].late++
        else if (isE(r.status)) gradeMap[key].excused++
        else if (isA(r.status)) gradeMap[key].absent++
      })
    }

    setGradeStats(Object.values(gradeMap).map(g => {
      const total = g.present + g.late + g.excused + g.absent
      return {
        ...g,
        attendanceRate: total > 0 ? Math.round(((g.present + g.late + g.excused) / total) * 100) : 0
      }
    }))

    // 5. Compute Trends (Chart)
    const trendMap: Record<string, { present: number, total: number }> = {}
    
    // Init trend map for each day in range
    const start = new Date(filters.startDate)
    const end = new Date(filters.endDate)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().split('T')[0]
      trendMap[ds] = { present: 0, total: 0 }
    }

    if (isSessionBased && isFullDay) {
       const grouped: Record<string, { morning?: string; afternoon?: string; date: string }> = {}
       records.forEach(r => {
         const dayKey = `${r.student_id}||${r.attendance_date}`
         if (!grouped[dayKey]) grouped[dayKey] = { date: r.attendance_date }
         if (r.session?.toLowerCase() === "morning") grouped[dayKey].morning = r.status
         else if (r.session?.toLowerCase() === "afternoon") grouped[dayKey].afternoon = r.status
       })

       Object.values(grouped).forEach(entry => {
         const { morning: m, afternoon: a, date } = entry
         if (!trendMap[date]) return
         trendMap[date].total++
         const countsAsPresent = (m && a) 
           ? (isAtt(m) && isAtt(a)) || (isE(m) && isE(a))
           : (isAtt(m || a) || isE(m || a))
         if (countsAsPresent) trendMap[date].present++
       })
    } else {
      records.forEach(r => {
        const ds = r.attendance_date
        if (!trendMap[ds]) return
        trendMap[ds].total++
        if (isAtt(r.status) || isE(r.status)) trendMap[ds].present++
      })
    }

    setTrends(Object.entries(trendMap).map(([date, data]) => ({
      date,
      rate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0
    })).sort((a, b) => a.date.localeCompare(b.date)))
  }


  const handleExport = async () => {
    setIsExporting(true)
    try {
      const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== "all" && v !== "")
      )
      const blob = await db.exportAttendanceReport(activeFilters)
      if (blob) {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `attendance-report-${filters.grade}-${filters.section}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        notifications.success("Success", "Report exported successfully")
      }
    } catch (error) {
      notifications.error("Error", "Failed to export report")
    } finally {
      setIsExporting(false)
    }
  }

  const handleDrillDown = (grade: string, section: string, stream: string | null) => {
    // Navigate to drill down page
    const query = new URLSearchParams({ 
      section, 
      ...(stream ? { stream } : {}),
      session: filters.session
    }).toString()
    window.location.href = `/school/admin/attendance/grade/${grade}?${query}`
  }


  const gradeRateData = gradeStats.map(s => ({
    grade: `${s.grade} ${s.section}`,
    rate: s.attendanceRate
  })).slice(0, 10).sort((a, b) => b.rate - a.rate)

  const isFullDay = !filters.session || filters.session === 'total'

  const distributionData = [
    { name: 'Present', value: summary?.present || 0 },
    { name: 'Late', value: summary?.late || 0 },
    { name: 'Excused', value: summary?.excused || 0 },
    { name: 'Absent', value: summary?.absent || 0 },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/90 dark:bg-slate-900/90 p-4 md:p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 backdrop-blur-sm shadow-sm pt-safe">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Analytics
          </h1>
          <p className="text-[10px] md:text-sm font-bold text-slate-500/60 dark:text-slate-400/60 uppercase tracking-widest mt-1">
            Grade-Wise Participation
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button 
            onClick={handleExport} 
            disabled={isExporting}
            variant="outline"
            className="flex-1 md:flex-none h-11 rounded-2xl border-slate-200 dark:border-slate-800 font-black text-[10px] uppercase tracking-widest"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? "CSV..." : "Export"}
          </Button>
        </div>
      </div>

      <AttendanceFilters 
        onFilterChange={setFilters} 
        initialFilters={filters} 
        attendanceMode={settings?.attendanceMode} 
        hideSession={true}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Students", value: summary?.totalStudents || 0, icon: Users, color: "blue", bg: "bg-blue-500/10", text: "text-blue-600" },
          { label: "Present", value: summary?.present || 0, icon: UserCheck, color: "green", bg: "bg-emerald-500/10", text: "text-emerald-600" },
          { label: "Late", value: summary?.late || 0, icon: Clock, color: "yellow", bg: "bg-amber-500/10", text: "text-amber-600" },
          { label: "Excused", value: summary?.excused || 0, icon: AlertTriangle, color: "indigo", bg: "bg-indigo-500/10", text: "text-indigo-600" },
          { label: "Absent", value: summary?.absent || 0, icon: UserX, color: "red", bg: "bg-rose-500/10", text: "text-rose-600" },
          { label: "Rate", value: `${summary?.attendanceRate || 0}%`, icon: TrendingUp, color: "purple", bg: "bg-violet-500/10", text: "text-violet-600", isRate: true },
        ].map((item, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-[24px] shadow-sm active:scale-95 transition-all">
            <div className={cn("w-10 h-10 flex items-center justify-center rounded-2xl mb-3", item.bg)}>
              <item.icon className={cn("w-5 h-5", item.text)} />
            </div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{item.label}</p>
            <p className={cn("text-xl md:text-2xl font-black uppercase tracking-tight", item.text)}>
              {isLoading ? "..." : item.value}
            </p>
          </div>
        ))}
      </div>

      <AttendanceAnalyticsCharts 
        trendData={trends} 
        distributionData={distributionData} 
        gradeRateData={gradeRateData} 
        isLoading={isLoading}
      />

      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <TableIcon className="w-5 h-5 text-primary" />
          <h3 className="typography-label text-foreground">Detailed Grade Statistics</h3>
        </div>
        <GradeAttendanceTable data={gradeStats} onDrillDown={handleDrillDown} isLoading={isLoading} />
      </div>
    </div>
  )
}
