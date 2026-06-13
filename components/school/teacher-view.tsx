"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { PageSkeleton } from "@/components/ui/page-skeleton"
import { useToast } from "@/hooks/use-toast"
import { BookOpen, Users } from "lucide-react"
import { db, type Student } from "@/lib/db/database"
import { authService } from "@/lib/auth/auth"

interface TeacherAssignment {
  id: string
  class_id: string
  class_name: string
  grade: { id: string; name: string }
  section: { id: string; name: string }
  stream?: { id: string; name: string }
  subject?: string
}


export function TeacherView() {
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<TeacherAssignment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadAssignmentsAndStudents()
  }, [])

  const loadAssignmentsAndStudents = async () => {
    setIsLoading(true)
    try {
      const currentUser = authService.getCurrentUser()

      if (!currentUser || !currentUser.id || !currentUser.schoolId) {
        console.error("[v0] Missing essential user data in localStorage")
        toast({
          title: "Session Error",
          description: "Please log out and log back in to refresh your session.",
          variant: "destructive",
        })
        return
      }

      // Use teacherId if available, otherwise fallback to the user id
      // The backend service is capable of resolving user.id to teacher.id
      const targetId = currentUser.teacherId || currentUser.id
      
      const assignmentsData = await db.getTeacherAssignments(currentUser.schoolId, targetId)
      setAssignments(assignmentsData as any)

      const allStudents = await db.getStudents()
      
      // Filter students only for classes assigned to this teacher
      const filteredStudents = allStudents.filter((student: Student) =>
        assignmentsData.some((cls: any) => {
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
        }),
      )
      setStudents(filteredStudents as any)

      console.log("[v0] Loaded assignments:", assignmentsData.length)
      console.log("[v0] Loaded students for assigned classes:", filteredStudents.length)
    } catch (error) {
      console.error("[v0] Error loading teacher data:", error)
      toast({
        title: "Error",
        description: "Failed to load your assignments and students",
        variant: "destructive",
      })
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

  const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("attendance_current_user") || "{}") : {}
  const firstName = currentUser?.name?.split(' ')[0] || currentUser?.full_name?.split(' ')[0] || "Teacher"

  const getStudentsForClass = (classId: string | undefined) => {
    if (!classId) return []
    return students.filter((s) => s.grade === assignments.find((a) => a.class_id === classId)?.grade)
  }

  if (isLoading) {
    return <PageSkeleton variant="cards" />
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="typography-page-title text-foreground">
          {getGreeting()}, <span className="text-primary">{firstName}</span>
        </h2>
        <p className="typography-body text-muted-foreground mt-1">Manage your assigned classes and student attendance</p>
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">You have no class assignments yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Assignments Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignments.map((assignment) => (
              <Card
                key={assignment.id}
                className={`group cursor-pointer rounded-3xl border transition-all duration-300 overflow-hidden relative ${
                  selectedAssignment?.id === assignment.id 
                    ? "border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/10 shadow-lg" 
                    : "border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/60 hover:border-blue-400/30 hover:shadow-md"
                }`}
                onClick={() => setSelectedAssignment(assignment)}
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full transition-opacity duration-500 ${selectedAssignment?.id === assignment.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
                
                <CardContent className="p-6 relative z-10">
                  <div className="flex items-start justify-between mb-5">
                    <div className="space-y-1">
                      <h3 className="typography-card-title text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                        Grade {assignment.grade?.name || ""} {assignment.section?.name || ""}
                      </h3>
                      <p className="typography-helper text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider text-[10px]">
                        Assigned Class
                      </p>
                    </div>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${selectedAssignment?.id === assignment.id ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 rotate-12" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-blue-500/10 group-hover:text-blue-600"}`}>
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="space-y-1">
                      <p className="typography-helper text-slate-500">Subject</p>
                      <p className="typography-label text-slate-800 dark:text-slate-200">{assignment.subject || "All Subjects"}</p>
                    </div>
                    {assignment.stream?.name && (
                      <div className="space-y-1">
                        <p className="typography-helper text-slate-500">Stream</p>
                        <p className="typography-label text-slate-800 dark:text-slate-200">{assignment.stream.name}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Students List for Selected Class */}
          {selectedAssignment && (
            <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <h3 className="typography-section-title text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  Students in {selectedAssignment.grade?.name || ""} {selectedAssignment.section?.name || ""}
                </h3>
                <span className="typography-helper bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-600 dark:text-slate-400">
                  {students.length} Total Students
                </span>
              </div>
              
              <Card className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden">
                <CardContent className="p-0">
                  {students.length === 0 ? (
                    <div className="py-20 text-center">
                      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200 dark:border-slate-700">
                        <Users className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="typography-label text-slate-500">No students recorded in this class.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                            <th className="px-6 py-4 typography-label text-[11px] text-slate-500 uppercase tracking-wider">Student</th>
                            <th className="px-6 py-4 typography-label text-[11px] text-slate-500 uppercase tracking-wider">Student ID</th>
                            <th className="px-6 py-4 typography-label text-[11px] text-slate-500 uppercase tracking-wider">Contact Info</th>
                            <th className="px-6 py-4 typography-label text-[11px] text-slate-500 uppercase tracking-wider text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {students.map((student) => (
                            <tr key={student.id} className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors duration-150">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 font-semibold text-sm shadow-sm">
                                    {student.name?.charAt(0) || "?"}
                                  </div>
                                  <div>
                                    <p className="typography-label text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                                      {student.name || "Unknown Student"}
                                    </p>
                                    <p className="typography-helper text-slate-500 dark:text-slate-500">{student.gender || "—"}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="typography-body text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded font-mono text-xs">
                                  {student.student_id || "N/A"}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-0.5">
                                  <p className="typography-helper text-slate-700 dark:text-slate-300 font-medium">{student.parent_phone || "No Phone"}</p>
                                  <p className="typography-helper text-slate-500 text-[10px] truncate max-w-[150px]">{student.parent_email || "No Email"}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase">
                                  Active
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

