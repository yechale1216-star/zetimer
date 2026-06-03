"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Plus, GraduationCap, Users, CheckCircle2, RefreshCw } from "lucide-react"
import { authService } from "@/lib/auth/auth"
import { notifications } from "@/lib/utils/notifications"
import { db } from "@/lib/db/database"

interface Teacher {
  id: string
  full_name: string
  email: string
}

interface Class {
  id: string
  name: string
  grade: string
  section: string
  students: any[]
}

interface TeacherAssignment {
  id: string
  teacher_id: string
  class_id: string
  subject?: string
  grade?: string
  section?: string
  stream?: string
  teacher?: {
    id: string
    full_name: string
    email: string
    profile_photo?: string
  }
}

export function TeacherAssignmentManagement() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([])
  const [selectedTeacher, setSelectedTeacher] = useState("")
  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedSection, setSelectedSection] = useState("")
  const [selectedStream, setSelectedStream] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isAssigning, setIsAssigning] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [schoolId, setSchoolId] = useState<string>("")
  const { toast } = useToast()

  const GRADES = Array.from({ length: 12 }, (_, i) => (i + 1).toString())
  const SECTIONS = ["A", "B", "C", "D", "E"]
  const STREAMS = ["Natural", "Social"]

  const getInitials = (name: string) => {
    if (!name) return "T"
    const parts = name.trim().split(/\s+/)
    return parts.map(p => p[0]).join("").toUpperCase().slice(0, 2)
  }

  const getAvatarGradient = (id: string) => {
    if (!id) return "from-blue-500 to-indigo-600"
    const gradients = [
      "from-blue-500 to-indigo-600",
      "from-emerald-400 to-teal-600",
      "from-violet-500 to-purple-600",
      "from-pink-500 to-rose-600",
      "from-amber-400 to-orange-600",
      "from-cyan-400 to-blue-600",
    ]
    let hash = 0
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash)
    }
    return gradients[Math.abs(hash) % gradients.length]
  }

  useEffect(() => {
    const initializeAndLoad = async () => {
      try {
        const user = authService.getCurrentUser()
        if (!user?.schoolId) throw new Error("School ID not found - please login again")
        setSchoolId(user.schoolId)
        await loadAllData(user.schoolId)
      } catch (error) {
        console.error("[v0] Error initializing teacher assignment:", error)
        toast({ title: "Error", description: "Failed to initialize. Please refresh the page.", variant: "destructive" })
        setIsLoading(false)
      }
    }
    initializeAndLoad()
  }, [toast])

  const loadAllData = async (school: string) => {
    try {
      setIsLoading(true)
      const teachersData = await db.getTeachers()
      const assignmentsData = await db.getTeacherAssignments()
      setTeachers(teachersData)
      setAssignments(assignmentsData as any)
    } catch (error) {
      console.error("[v0] Error loading data:", error)
      notifications.error("Error", "Failed to load data")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedTeacher("")
    setSelectedGrade("")
    setSelectedSection("")
    setSelectedStream("")
    setShowSuccess(false)
  }

  const handleAssignTeacher = async () => {
    const isHighGrade = selectedGrade === "11" || selectedGrade === "12"

    if (!selectedTeacher || !selectedGrade || !selectedSection) {
      notifications.error("Error", "Please select teacher, grade, and section")
      return
    }
    if (isHighGrade && !selectedStream) {
      notifications.error("Error", "Stream is required for Grade 11 and 12")
      return
    }

    // Check if the teacher already has this exact class assigned
    const isDuplicate = assignments.some(
      (assign) =>
        assign.teacher_id === selectedTeacher &&
        assign.grade === selectedGrade &&
        assign.section === selectedSection &&
        (assign.stream || "") === (selectedStream || "")
    )

    if (isDuplicate) {
      notifications.error("Error", "This class is already assigned to this teacher.")
      return
    }

    try {
      setIsAssigning(true)
      const classId = `class-${selectedGrade}-${selectedSection}-${selectedStream || "none"}`
      await db.assignTeacherToClass(selectedTeacher, classId, undefined, selectedGrade, selectedSection, selectedStream || undefined)

      setShowSuccess(true)
      await loadAllData(schoolId)
      setTimeout(() => {
        setShowSuccess(false)
        setIsDialogOpen(false)
        resetForm()
      }, 2500)
    } catch (error: any) {
      notifications.error("Error", error.message)
    } finally {
      setIsAssigning(false)
    }
  }

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm("Remove this assignment?")) return
    try {
      await db.removeTeacherAssignment(assignmentId)
      notifications.success("Assignment Removed", "Teacher assignment has been removed.")
      await loadAllData(schoolId)
    } catch (error: any) {
      notifications.error("Error", error.message)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
          <p className="typography-label mt-4 text-slate-500 animate-pulse">Loading assignments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="typography-page-title text-slate-900 dark:text-white">
            Class Assignments
          </h1>
          <p className="typography-body text-slate-500 dark:text-slate-400 mt-1">
            Assign teachers to grade sections and manage their classes.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => loadAllData(schoolId)}
            variant="outline"
            size="sm"
            className="rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => { resetForm(); setIsDialogOpen(true) }}
            size="sm"
            className="h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow transition-all duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Assign Teacher
          </Button>
        </div>
      </div>

      {/* Assignment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) { setIsDialogOpen(false); setShowSuccess(false) } }}>
        <DialogContent className="sm:max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-2xl p-0 overflow-hidden">
          {showSuccess ? (
            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
              <DialogTitle className="sr-only">Assignment Successful</DialogTitle>
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-bounce mb-5">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h2 className="typography-page-title text-emerald-700 dark:text-emerald-400">Assignment Successful!</h2>
              <p className="typography-body text-slate-500 dark:text-slate-400 mt-1">The teacher has been assigned to the class.</p>
            </div>
          ) : (
            <>
              <DialogHeader className="bg-gradient-to-r from-blue-50/60 to-indigo-50/20 dark:from-slate-800/60 dark:to-slate-900/20 border-b border-slate-100 dark:border-slate-800/50 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-400/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <DialogTitle className="typography-section-title">New Class Assignment</DialogTitle>
                    <p className="typography-helper text-slate-500 dark:text-slate-400 mt-0.5">Select a teacher and assign them to a grade section.</p>
                  </div>
                </div>
              </DialogHeader>

              <div className="px-6 py-6 space-y-5">
                {/* Teacher */}
                <div className="space-y-2">
                  <label className="typography-label text-slate-700 dark:text-slate-300 uppercase">
                    Select Teacher <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedTeacher}
                    onChange={(e) => setSelectedTeacher(e.target.value)}
                    className="typography-body w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  >
                    <option value="">-- Choose a Teacher --</option>
                    {teachers.length > 0 ? (
                      teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)
                    ) : (
                      <option disabled>No teachers available</option>
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Grade */}
                  <div className="space-y-2">
                    <label className="typography-label text-slate-700 dark:text-slate-300 uppercase">
                      Grade <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedGrade}
                      onChange={(e) => { setSelectedGrade(e.target.value); setSelectedStream("") }}
                      className="typography-body w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      <option value="">-- Grade --</option>
                      {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
                    </select>
                  </div>

                  {/* Section */}
                  <div className="space-y-2">
                    <label className="typography-label text-slate-700 dark:text-slate-300 uppercase">
                      Section <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      className="typography-body w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      <option value="">-- Section --</option>
                      {SECTIONS.map((s) => <option key={s} value={s}>Section {s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Stream */}
                <div className="space-y-2">
                  <label className="typography-label text-slate-700 dark:text-slate-300 uppercase">
                    Stream {(selectedGrade === "11" || selectedGrade === "12") && <span className="text-red-500 ml-1">*</span>}
                    {selectedGrade && selectedGrade !== "11" && selectedGrade !== "12" && (
                      <span className="typography-body text-slate-400 normal-case ml-1">(optional)</span>
                    )}
                  </label>
                  <select
                    value={selectedStream}
                    onChange={(e) => setSelectedStream(e.target.value)}
                    disabled={!selectedGrade}
                    className="typography-body w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                  >
                    <option value="">
                      {selectedGrade === "11" || selectedGrade === "12" ? "-- Choose Stream (Required) --" : "-- Choose Stream (Optional) --"}
                    </option>
                    {STREAMS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Preview */}
                {selectedGrade && selectedSection && (
                  <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/40">
                    <p className="typography-label text-blue-700 dark:text-blue-400">
                      Assigning to: <strong>Grade {selectedGrade}</strong> - <strong>Section {selectedSection}</strong>
                      {selectedStream && <> - <strong>{selectedStream}</strong></>}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/50">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAssignTeacher}
                    disabled={
                      isAssigning ||
                      !selectedTeacher ||
                      !selectedGrade ||
                      !selectedSection ||
                      ((selectedGrade === "11" || selectedGrade === "12") && !selectedStream)
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md px-6 min-w-[140px] flex items-center justify-center"
                  >
                    {isAssigning ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <><Plus className="w-4 h-4 mr-2" />Assign Teacher</>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Assignments Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="typography-section-title text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Active Assignments ({assignments.length})
          </h2>
        </div>

        {assignments.length === 0 ? (
          <Card className="rounded-3xl border border-dashed border-slate-200/80 dark:border-slate-800/80 p-12 bg-white/40 dark:bg-slate-900/40 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="typography-card-title text-slate-800 dark:text-slate-200">No assignments yet</h3>
            <p className="typography-body text-slate-500 mt-1 max-w-sm mx-auto">Click "Assign Teacher" to create your first class assignment.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignments.map((assignment) => {
              const teacherName = assignment.teacher?.full_name || "Unknown Teacher"
              const bgGradient = getAvatarGradient(assignment.teacher?.id || assignment.teacher_id)
              return (
                <Card
                  key={assignment.id}
                  className="group hover:border-blue-500/30 hover:shadow-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 bg-white/90 dark:bg-slate-900/90 shadow-sm overflow-hidden transition-all duration-300 flex flex-col justify-between"
                >
                  <CardContent className="p-4 space-y-2.5">
                    {/* Avatar + Delete */}
                    <div className="flex justify-between items-start gap-3">
                      {assignment.teacher?.profile_photo ? (
                        <img
                          src={assignment.teacher.profile_photo}
                          alt={teacherName}
                          className="w-10 h-10 rounded-full object-cover shadow-sm group-hover:scale-105 transition-transform duration-300 ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900"
                        />
                      ) : (
                        <div className={`typography-label w-10 h-10 rounded-full bg-gradient-to-br ${bgGradient} flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                          {getInitials(teacherName)}
                        </div>
                      )}
                      <Button
                        onClick={() => handleRemoveAssignment(assignment.id)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-full"
                        title="Remove Assignment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Name */}
                    <div>
                      <h3 className="typography-card-title text-slate-900 dark:text-slate-100 group-hover:text-blue-600 truncate transition-colors duration-200" title={teacherName}>
                        {teacherName}
                      </h3>
                    </div>

                    {/* Class Details */}
                    <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/50 space-y-1.5">
                      <div className="typography-helper flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <Users className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>Grade {assignment.grade} - Section {assignment.section}</span>
                      </div>
                      {assignment.stream && (
                        <div className="typography-helper flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          <GraduationCap className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{assignment.stream} Stream</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
