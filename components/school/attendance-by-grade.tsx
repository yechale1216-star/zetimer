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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="typography-page-title text-foreground">Attendance by Grade</h2>
          <p className="typography-body text-muted-foreground">Monitor and analyze attendance performance across all grades.</p>
        </div>
        <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto">
          <Button 
            onClick={handleExport} 
            disabled={isExporting}
            className="bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? "Exporting..." : "Export Report"}
          </Button>
          {(settings?.attendanceMode === 'session' || settings?.attendanceMode === 'session_based') && (
            <div className="flex gap-1.5 p-1 bg-white/50 dark:bg-slate-800/50 rounded-full border border-slate-200 dark:border-slate-700">
              <Button 
                variant={filters.session === "total" ? "default" : "ghost"} 
                onClick={() => setFilters(prev => ({ ...prev, session: "total" }))}
                size="sm"
                className="typography-label h-7 px-3 text-[10px] uppercase rounded-full"
              >
                Full Day
              </Button>
              <Button 
                variant={filters.session === "morning" ? "default" : "ghost"} 
                onClick={() => setFilters(prev => ({ ...prev, session: "morning" }))}
                size="sm"
                className="typography-label h-7 px-3 text-[10px] uppercase rounded-full"
              >
                Morning
              </Button>
              <Button 
                variant={filters.session === "afternoon" ? "default" : "ghost"} 
                onClick={() => setFilters(prev => ({ ...prev, session: "afternoon" }))}
                size="sm"
                className="typography-label h-7 px-3 text-[10px] uppercase rounded-full"
              >
                Afternoon
              </Button>
            </div>
          )}
        </div>
      </div>

      <AttendanceFilters 
        onFilterChange={setFilters} 
        initialFilters={filters} 
        attendanceMode={settings?.attendanceMode} 
        hideSession={true}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Total Students", value: summary?.totalStudents || 0, icon: Users, color: "blue" },
          { label: "Present", value: summary?.present || 0, icon: UserCheck, color: "green" },
          { label: "Late", value: summary?.late || 0, icon: Clock, color: "yellow" },
          { label: "Excused", value: summary?.excused || 0, icon: AlertTriangle, color: "indigo" },
          { label: "Absent", value: summary?.absent || 0, icon: UserX, color: "red" },
          { label: "Overall Rate", value: `${summary?.attendanceRate || 0}%`, icon: TrendingUp, color: "purple", isRate: true },
        ].map((item, idx) => (
          <Card key={idx} className="border-none shadow-sm bg-white/95 dark:bg-slate-900/90 rounded-2xl transform transition-all hover:scale-[1.02] cursor-default border border-slate-200 dark:border-slate-800">
            <CardContent className="p-4">
              <div className={`h-10 w-10 rounded-xl bg-${item.color}-500/15 flex items-center justify-center mb-3 shadow-sm border border-${item.color}-500/20`}>
                <item.icon className={`h-5 w-5 text-${item.color}-600 dark:text-${item.color}-400`} />
              </div>
              <p className="typography-label text-[10px] text-muted-foreground uppercase mb-1">{item.label}</p>
              <p className={`typography-section-title flex items-center min-h-[28px] ${item.isRate ? 'text-primary' : `text-${item.color}-600 dark:text-${item.color}-500`}`}>
                {isLoading ? (
                  <span className="inline-block w-12 h-6 bg-current opacity-20 animate-pulse rounded-md" />
                ) : (
                  item.value
                )}
              </p>
            </CardContent>
          </Card>
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
