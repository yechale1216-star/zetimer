"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { PageSkeleton } from "@/components/ui/page-skeleton"
import { useToast } from "@/hooks/use-toast"
import { BookOpen, Users, ChevronRight, Hash, Phone, Mail, User as UserIcon } from "lucide-react"
import { db, type Student } from "@/lib/db/database"
import { authService } from "@/lib/auth/auth"
import { cn } from "@/lib/utils/utils"

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
    <div className="space-y-6 pb-24 md:pb-6">
      <div className="px-1 md:px-0 pt-safe">
        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">{getGreeting()}</p>
        <h2 className="text-3xl md:text-4xl font-black text-foreground uppercase tracking-tight leading-none">
          Hello, <span className="text-primary">{firstName}</span>
        </h2>
        <p className="text-sm font-bold text-muted-foreground/60 mt-2">Manage your classes & attendance</p>
      </div>

      {assignments.length === 0 ? (
        <Card className="rounded-[32px] border-none shadow-sm bg-slate-50 dark:bg-slate-900/50">
          <CardContent className="py-20 text-center">
            <div className="w-20 h-20 bg-background rounded-[28px] shadow-sm flex items-center justify-center mx-auto mb-6 border border-border/50">
              <BookOpen className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="text-lg font-black text-foreground uppercase tracking-tight">No Assignments</p>
            <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mt-2">Your classes will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Assignments Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-1 md:px-0">
            {assignments.map((assignment) => {
              const isSelected = selectedAssignment?.id === assignment.id;
              return (
                <div
                  key={assignment.id}
                  className={cn(
                    "group relative overflow-hidden p-6 rounded-[32px] border-2 transition-all duration-500 cursor-pointer active:scale-[0.98]",
                    isSelected 
                      ? "bg-primary border-primary shadow-2xl shadow-primary/30" 
                      : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-primary/30"
                  )}
                  onClick={() => setSelectedAssignment(assignment)}
                >
                  <div className="flex flex-col h-full justify-between gap-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className={cn(
                          "text-[10px] font-black uppercase tracking-[0.2em]",
                          isSelected ? "text-white/60" : "text-primary"
                        )}>
                          {assignment.subject || "All Subjects"}
                        </p>
                        <h3 className={cn(
                          "text-xl font-black uppercase tracking-tight leading-none",
                          isSelected ? "text-white" : "text-foreground"
                        )}>
                          Grade {assignment.grade?.name || ""} {assignment.section?.name || ""}
                        </h3>
                      </div>
                      <div className={cn(
                        "w-12 h-12 rounded-[20px] flex items-center justify-center transition-all duration-500",
                        isSelected ? "bg-white/20 text-white rotate-6 scale-110" : "bg-primary/10 text-primary group-hover:rotate-6"
                      )}>
                        <Users className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className={cn(
                            "w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-black",
                            isSelected ? "bg-white/20 border-primary text-white" : "bg-slate-100 dark:bg-slate-800 border-white dark:border-slate-900 text-slate-400"
                          )}>
                            {i}
                          </div>
                        ))}
                      </div>
                      <div className={cn(
                        "font-black text-[10px] uppercase tracking-widest flex items-center gap-1",
                        isSelected ? "text-white" : "text-muted-foreground/60"
                      )}>
                        Browse Students <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Decorative background overlay */}
                  <div className={cn(
                    "absolute -bottom-6 -right-6 w-24 h-24 rounded-full blur-3xl transition-opacity duration-500",
                    isSelected ? "bg-white/20 opacity-100" : "bg-primary/10 opacity-0 group-hover:opacity-100"
                  )} />
                </div>
              );
            })}
          </div>

          {/* Students List for Selected Class */}
          {selectedAssignment && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="flex items-end justify-between px-2 md:px-0">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Student Roster</p>
                  <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">
                    {selectedAssignment.grade?.name || ""} {selectedAssignment.section?.name || ""}
                  </h3>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800/50 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 active:scale-95 transition-transform">
                  <span className="text-xs font-black text-foreground uppercase tracking-widest">{students.length} Total</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-3 md:gap-4">
                {students.length === 0 ? (
                  <div className="py-24 text-center bg-slate-50 dark:bg-slate-900/30 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800">
                    <div className="w-20 h-20 bg-background rounded-[28px] shadow-sm flex items-center justify-center mx-auto mb-6">
                      <Users className="w-8 h-8 text-slate-200" />
                    </div>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No students recorded</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile Student List */}
                    <div className="md:hidden space-y-3">
                      {students.map((student) => (
                        <div key={student.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] shadow-sm active:scale-[0.97] transition-all hover:shadow-md">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-primary font-black border border-slate-100 dark:border-slate-700/50 shadow-inner">
                              {student.name?.charAt(0) || <UserIcon className="w-5 h-5 text-slate-300" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-black text-foreground uppercase tracking-tight line-clamp-1">{student.name}</h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tight flex items-center gap-1">
                                  <Hash className="w-3 h-3" /> {student.student_id || "NO-ID"}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-widest",
                                  student.gender?.toLowerCase() === 'female' ? "text-pink-500" : "text-blue-500"
                                )}>
                                  {student.gender || "—"}
                                </span>
                              </div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-400">
                               <ChevronRight className="w-5 h-5" />
                            </div>
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800/50 flex gap-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                <Phone className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[10px] font-black text-foreground">{student.parent_phone || "—"}</span>
                            </div>
                            <div className="flex items-center gap-2 truncate">
                              <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                                <Mail className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[10px] font-black text-foreground truncate">{student.parent_email || "—"}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Student Table */}
                    <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                            <th className="px-8 py-5 text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">Student</th>
                            <th className="px-8 py-5 text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">ID & Gender</th>
                            <th className="px-8 py-5 text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">Contact</th>
                            <th className="px-8 py-5 text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/50">
                          {students.map((student) => (
                            <tr key={student.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all duration-300">
                              <td className="px-8 py-5">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-primary font-black border border-slate-100 dark:border-slate-700/50">
                                    {student.name?.charAt(0) || "?"}
                                  </div>
                                  <p className="text-sm font-black text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">{student.name}</p>
                                </div>
                              </td>
                              <td className="px-8 py-5">
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] font-black text-foreground uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg w-fit">
                                    #{student.student_id || "N/A"}
                                  </span>
                                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">{student.gender || "—"}</span>
                                </div>
                              </td>
                              <td className="px-8 py-5">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                                    <Phone className="w-3 h-3 text-emerald-500" /> {student.parent_phone}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground/60">
                                    <Mail className="w-3 h-3 text-blue-500" /> {student.parent_email}
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-5 text-right">
                                <div className="inline-flex items-center h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-primary group-hover:text-white transition-all duration-300 items-center justify-center">
                                  <ChevronRight className="w-5 h-5" />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

