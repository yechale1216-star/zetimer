"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { PageSkeleton } from "@/components/ui/page-skeleton"
import { useToast } from "@/hooks/use-toast"
import { BookOpen } from "lucide-react"
import { db, type Student } from "@/lib/db/database"

interface TeacherAssignment {
  id: string
  class_id: string
  class_name: string
  grade: string
  section: string
  stream?: string
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
      const currentUser = JSON.parse(localStorage.getItem("attendance_current_user") || "{}")

      if (!currentUser.id || !currentUser.schoolId || !currentUser.teacherId) {
        console.error("[v0] Missing user data in localStorage")
        toast({
          title: "Error",
          description: "User information not found",
          variant: "destructive",
        })
        return
      }

      const assignments = await db.getTeacherAssignments(currentUser.schoolId, currentUser.teacherId)
      setAssignments(assignments as any)

      const allStudents = await db.getStudents()
      
      // Filter students only for classes assigned to this teacher
      const filteredStudents = allStudents.filter((student: Student) =>
        assignments.some((cls: any) => {
          const studentGrade = (student.grade || "").replace("Grade ", "").trim()
          const classGrade = String(cls.grade || cls.class?.grade || "").trim()
          const gradeMatch = studentGrade === classGrade
          const sectionMatch = (cls.section || cls.class?.section) === student.section
          const streamMatch = !(cls.stream || cls.class?.stream) || (cls.stream || cls.class?.stream) === student.stream

          return gradeMatch && sectionMatch && streamMatch
        }),
      )
      setStudents(filteredStudents as any)

      console.log("[v0] Loaded assignments:", assignments.length)
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments.map((assignment) => (
              <Card
                key={assignment.id}
                className={`cursor-pointer transition-all ${
                  selectedAssignment?.id === assignment.id ? "ring-2 ring-primary bg-primary/5" : "hover:shadow-lg"
                }`}
                onClick={() => setSelectedAssignment(assignment)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="typography-label text-foreground">{assignment.class_name}</h3>
                      <p className="typography-body text-muted-foreground">
                        Grade {assignment.grade} - Section {assignment.section}
                      </p>
                    </div>
                  </div>

                  {assignment.subject && (
                    <div className="pt-4 border-t">
                      <p className="typography-body text-muted-foreground">Subject</p>
                      <p className="typography-label text-foreground">{assignment.subject}</p>
                    </div>
                  )}

                  {assignment.stream && (
                    <div className="pt-2">
                      <p className="typography-body text-muted-foreground">Stream</p>
                      <p className="typography-label text-foreground">{assignment.stream}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Students List for Selected Class */}
          {selectedAssignment && (
            <div className="mt-8">
              <h3 className="typography-section-title text-foreground mb-4">Students in {selectedAssignment.class_name}</h3>
              <Card>
                <CardContent className="p-6">
                  {students.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No students assigned to your classes yet</p>
                  ) : (
                    <div className="space-y-3">
                      {students.map((student) => (
                        <div key={student.id} className="flex items-center justify-between p-4 bg-muted/40 rounded-lg">
                          <div>
                            <p className="typography-label text-foreground">{student.name}</p>
                            <p className="typography-body text-muted-foreground">Roll: {student.student_id}</p>
                          </div>
                          <div className="text-right">
                            {student.parent_phone && <p className="typography-body text-muted-foreground">{student.parent_phone}</p>}
                            {student.parent_email && <p className="typography-body text-muted-foreground">{student.parent_email}</p>}
                          </div>
                        </div>
                      ))}
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

