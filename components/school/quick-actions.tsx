"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { authService } from "@/lib/auth/auth"
import { db } from "@/lib/db/database"
import { useToast } from "@/hooks/use-toast"
import { parseJsonResponse } from "@/lib/utils/parse-json-response"

interface QuickActionsProps {
  onNavigate: (tab: string) => void
}

export function QuickActions({ onNavigate }: QuickActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [studentCount, setStudentCount] = useState(0)
  const { toast } = useToast()
  const [isAdmin, setIsAdmin] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    setIsAdmin(authService.isAdmin())
    setUser(authService.getCurrentUser())
  }, [])

  useEffect(() => {
    const loadStudentCount = async () => {
      try {
        const allStudents = await db.getStudents()
        
        if (user?.role === "teacher") {
          // For teachers, count only assigned class students
          const assignmentsData = await db.getTeacherAssignments(user.schoolId, user.teacherId || user.id)
          const classes = assignmentsData || []

          const filtered = allStudents.filter((student) =>
            classes.some((cls: any) => {
              const studentGrade = (student.grade || "").replace("Grade ", "").trim()
              const classGrade = String(cls.grade || cls.class?.grade || "").trim()
              const gradeMatch = studentGrade === classGrade
              const sectionMatch = (cls.section || cls.class?.section) === student.section
              const streamMatch = !(cls.stream || cls.class?.stream) || (cls.stream || cls.class?.stream) === student.stream
              return gradeMatch && sectionMatch && streamMatch
            }),
          )
          setStudentCount(filtered.length)
          console.log(`[v0] Teacher has ${filtered.length} total assigned students`)
        } else {
          // For admins, count all school students
          setStudentCount(allStudents.length)
          console.log(`[v0] School has ${allStudents.length} total students`)
        }
      } catch (error) {
        console.error("[v0] Error loading student count:", error)
      }
    }

    loadStudentCount()
  }, [user])

  const handleQuickAttendance = async () => {
    setIsLoading(true)
    try {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Addis_Ababa' })
      const existingAttendance = await db.getAttendanceByDate(today)

      if (existingAttendance.length > 0) {
        toast({
          title: "Attendance Already Taken",
          description: `Attendance for ${today} has already been recorded.`,
          variant: "default",
        })
        onNavigate("attendance")
      } else {
        toast({
          title: "Quick Action",
          description: "Navigating to attendance tracking...",
          variant: "default",
        })
        onNavigate("attendance")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check attendance status",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateReport = async () => {
    setIsLoading(true)
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 7) // Last 7 days

      toast({
        title: "Generating Report",
        description: "Creating weekly attendance report...",
        variant: "default",
      })

      setTimeout(() => {
        onNavigate("reports")
        toast({
          title: "Report Ready",
          description: "Weekly attendance report is ready to view.",
          variant: "default",
        })
      }, 1000)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const teacherActions = [
    {
      title: "Take Attendance",
      description: "Quickly navigate to attendance tracking",
      action: handleQuickAttendance,
      icon: "✅",
      color: "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30",
    },
    {
      title: "Weekly Report",
      description: "Generate last 7 days attendance report",
      action: handleGenerateReport,
      icon: "📊",
      color: "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30",
    },
  ]

  const adminActions = [
    ...teacherActions,
    {
      title: "Manage Teachers",
      description: "Assign teachers to classes and subjects",
      action: () => onNavigate("assignments"),
      icon: "👨‍🏫",
      color: "bg-green-500/10 hover:bg-green-500/20 border-green-500/30",
    },
  ]

  const actions = isAdmin ? adminActions : teacherActions

  return (
    <Card className="border-none shadow-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800 overflow-hidden">
      <CardHeader className="pb-0 border-none">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <span className="text-xl">⚡</span>
              Quick Actions
            </CardTitle>
            <CardDescription className="text-xs font-medium dark:text-slate-400">
              {isAdmin ? "Administrative Controls" : `Teacher Dashboard - ${studentCount} students`}
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-white/50 dark:bg-slate-800/50 border-blue-200 dark:border-slate-700 text-[10px] font-bold uppercase tracking-wider">
            {user?.role === "admin" ? "Admin Mode" : "Teacher Mode"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actions.map((action, index) => (
            <div 
              key={index} 
              onClick={action.action}
              className={`group relative cursor-pointer p-5 rounded-2xl border transition-all duration-300 hover:shadow-lg active:scale-[0.98] ${action.color} backdrop-blur-sm`}
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-white/80 dark:bg-slate-900/80 flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform duration-300">
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm md:text-base text-foreground mb-1">
                    {action.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {action.description}
                  </p>
                </div>
              </div>
              
              <div className="mt-4 flex items-center text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Execute Action 
                <span className="ml-1 text-lg leading-none">→</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-3 bg-white/30 dark:bg-slate-800/30 rounded-xl border border-blue-100/30 dark:border-slate-700/30 backdrop-blur-sm">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-widest font-bold">
            <span className="text-muted-foreground/60">Signed In As</span>
            <span className="text-primary flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              {user?.name}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


