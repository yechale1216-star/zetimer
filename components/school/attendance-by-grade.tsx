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
import { PageSkeleton } from "@/components/ui/page-skeleton"

export function AttendanceByGrade() {
  const [summary, setSummary] = useState<any>(null)
  const [gradeStats, setGradeStats] = useState<any[]>([])
  const [trends, setTrends] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [settings, setSettings] = useState<any>(null)
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
    loadData()
  }, [filters])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== "all" && v !== "")
      )
      
      const [summaryData, gradeData, trendData, schoolSettings] = await Promise.all([
        db.getAttendanceSummaryStats(activeFilters),
        db.getAttendanceGradeStats(activeFilters),
        db.getAttendanceTrendStats(activeFilters),
        db.getSettings()
      ])

      setSummary(summaryData)
      setGradeStats(gradeData)
      setTrends(trendData)
      setSettings(schoolSettings)
    } catch (error) {
      notifications.error("Error", "Failed to load attendance analytics")
    } finally {
      setIsLoading(false)
    }
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

  if (isLoading && !summary) {
    return <PageSkeleton variant="table" />
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
              <div className={`h-8 w-8 rounded-lg bg-${item.color}-500/10 flex items-center justify-center mb-3`}>
                <item.icon className={`h-4 w-4 text-${item.color}-600 dark:text-${item.color}-400`} />
              </div>
              <p className="typography-label text-[10px] text-muted-foreground uppercase mb-1">{item.label}</p>
              <p className={`typography-section-title ${item.isRate ? 'text-primary' : 'text-foreground'}`}>{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AttendanceAnalyticsCharts 
        trendData={trends} 
        distributionData={distributionData} 
        gradeRateData={gradeRateData} 
      />

      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <TableIcon className="w-5 h-5 text-primary" />
          <h3 className="typography-label text-foreground">Detailed Grade Statistics</h3>
        </div>
        <GradeAttendanceTable data={gradeStats} onDrillDown={handleDrillDown} />
      </div>
    </div>
  )
}
