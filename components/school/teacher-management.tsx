"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { 
  Trash2, 
  Edit, 
  Download, 
  User, 
  Mail, 
  Phone, 
  BookOpen, 
  GraduationCap, 
  X, 
  Award, 
  Briefcase, 
  Eye, 
  ShieldCheck,
  Plus,
  RefreshCw,
  CheckCircle2,
  Camera
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageSkeleton } from "@/components/ui/page-skeleton"
import { cn } from "@/lib/utils/utils"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { authService } from "@/lib/auth/auth"
import { notifications } from "@/lib/utils/notifications"
import { db } from "@/lib/db/database"

interface Teacher {
  id: string
  full_name: string
  email: string
  phone?: string
  subject?: string
  qualification?: string
  experience_years?: number
  created_at?: string
  teacher_id?: string
  is_active?: boolean
  profile_photo?: string
}

export function TeacherManagement() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "+251",
    subject: "",
    qualification: "",
    experience_years: "",
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  
  // Modal & assignment loading states
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false)

  const loadData = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true)
    try {
      const teachersData = await db.getTeachers()
      setTeachers(teachersData)
      console.log("[v0] Teachers loaded:", teachersData.length)
    } catch (error) {
      console.error("[v0] Error loading teachers:", error)
      notifications.error("Teachers", "Failed to load teachers")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    // Background polling for "instant" updates (every 30 seconds)
    const pollInterval = setInterval(() => {
      loadData(true)
    }, 30000)

    return () => clearInterval(pollInterval)
  }, [])

  // Load teacher assignments when modal opens
  useEffect(() => {
    if (selectedTeacher) {
      const loadAssignments = async () => {
        setIsLoadingAssignments(true)
        try {
          const teacherIdToQuery = selectedTeacher.teacher_id || selectedTeacher.id
          console.log("[v0] Fetching assignments for teacher ID:", teacherIdToQuery)
          const data = await db.getTeacherAssignments(undefined, teacherIdToQuery)
          setAssignments(data)
        } catch (error) {
          console.error("[v0] Error loading assignments:", error)
          notifications.error("Error Loading Assignments", "Could not fetch teacher class assignments.")

        } finally {
          setIsLoadingAssignments(false)
        }
      }
      loadAssignments()
    } else {
      setAssignments([])
    }
  }, [selectedTeacher])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      if (!editingTeacher && !formData.password) {
        notifications.error("Validation Error", "Password is required for new teachers")
        setIsSaving(false)
        return
      }

      const payload = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        subject: formData.subject,
        qualification: formData.qualification,
        experience_years: formData.experience_years ? Number.parseInt(formData.experience_years) : undefined,
        ...(formData.password && { password_hash: formData.password }),
        ...(profilePhoto && { profile_photo: profilePhoto }),
      }

      if (editingTeacher) {
        await db.updateTeacher(editingTeacher.id, payload)
        notifications.success("Teacher Updated Successfully", "The teacher information has been updated.")
        setIsFormVisible(false)
        setEditingTeacher(null)
      } else {
        await db.createTeacher(payload)
        setShowSuccess(true)
        setTimeout(() => {
          setShowSuccess(false)
          setIsFormVisible(false)
          setProfilePhoto(null)
        }, 2500)
      }

      // Refresh teachers list
      await loadData()

      // Reset form
      setFormData({
        full_name: "",
        email: "",
        password: "",
        phone: "+251",
        subject: "",
        qualification: "",
        experience_years: "",
      })
    } catch (error: any) {
      console.error("[v0] Error saving teacher:", error)
      notifications.error("Error", error.message || "Failed to save teacher")
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher)
    setIsFormVisible(true)
    setProfilePhoto(teacher.profile_photo || null)
    setFormData({
      full_name: teacher.full_name,
      email: teacher.email,
      password: "",
      phone: teacher.phone || "+251",
      subject: teacher.subject || "",
      qualification: teacher.qualification || "",
      experience_years: teacher.experience_years ? teacher.experience_years.toString() : "",
    })
    // Scroll smoothly to the form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (teacherId: string) => {
    if (!window.confirm("Are you sure you want to delete this teacher? This will also remove all class assignments linked to them.")) {
      return
    }

    try {
      await db.deleteTeacher(teacherId)
      setTeachers(teachers.filter((t) => t.id !== teacherId))
      notifications.success("Teacher Deleted Successfully", "The teacher has been removed from the system.")
    } catch (error: any) {
      console.error("[v0] Error deleting teacher:", error)
      notifications.error("Error", error.message || "Failed to delete teacher")
    }
  }

  const exportTeacherListToCSV = () => {
    console.log("[v0] Starting teacher list CSV export...")

    try {
      const headers = ["Name", "Email", "Phone", "Subject", "Qualification", "Experience (Years)"]

      const csvData = teachers.map((teacher) => [
        `"${teacher.full_name}"`,
        teacher.email,
        teacher.phone || "",
        `"${teacher.subject || ""}"`,
        `"${teacher.qualification || ""}"`,
        teacher.experience_years || "",
      ])

      const csvContent = [headers, ...csvData].map((row) => row.join(",")).join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `teachers_list_${new Date().toISOString().split("T")[0]}.csv`
      link.style.display = "none"

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setTimeout(() => {
        window.URL.revokeObjectURL(url)
      }, 100)

      notifications.success("Export Complete", `Successfully exported ${teachers.length} teachers to CSV`)

    } catch (error) {
      console.error("[v0] CSV export error:", error)
      notifications.error("Export Failed", "Failed to export teacher list. Please try again.")

    }
  }

  // Visual helper to extract initials
  const getInitials = (name: string) => {
    if (!name) return "T"
    const parts = name.trim().split(/\s+/)
    return parts.map(p => p[0]).join("").toUpperCase().slice(0, 2)
  }

  // Consistent gradient based on teacher ID
  const getAvatarGradient = (id: string) => {
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
    const index = Math.abs(hash) % gradients.length
    return gradients[index]
  }

  if (isLoading) {
    return <PageSkeleton variant="table" />
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/90 dark:bg-slate-900/90 p-4 md:p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 backdrop-blur-sm shadow-sm pt-safe">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Faculty
          </h1>
          <p className="text-[10px] md:text-sm font-bold text-slate-500/60 dark:text-slate-400/60 uppercase tracking-widest mt-1">
            Teacher Directory & Management
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button 
            onClick={() => loadData()} 
            variant="outline" 
            className="flex-1 md:flex-none h-11 rounded-2xl border-slate-200 dark:border-slate-800 font-black text-[10px] uppercase tracking-widest"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync
          </Button>
          <Button 
            onClick={exportTeacherListToCSV} 
            disabled={teachers.length === 0} 
            variant="outline"
            className="flex-1 md:flex-none h-11 rounded-2xl border-slate-200 dark:border-slate-800 font-black text-[10px] uppercase tracking-widest"
          >
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button
            onClick={() => {
              setEditingTeacher(null)
              setFormData({ full_name: "", email: "", password: "", phone: "+251", subject: "", qualification: "", experience_years: "" })
              setShowSuccess(false)
              setIsFormVisible(true)
            }}
            className="hidden md:flex h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest px-6 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Teacher
          </Button>
        </div>
      </div>

      {/* Mobile Floating Add Button */}
      <Button
        onClick={() => {
          setEditingTeacher(null)
          setFormData({ full_name: "", email: "", password: "", phone: "+251", subject: "", qualification: "", experience_years: "" })
          setShowSuccess(false)
          setIsFormVisible(true)
        }}
        className="md:hidden fixed bottom-24 right-6 h-14 w-14 rounded-2xl bg-primary text-white shadow-2xl shadow-primary/40 z-40 flex items-center justify-center active:scale-95 transition-all outline-none"
      >
        <Plus className="w-7 h-7" />
      </Button>

      {/* Register / Edit Dialog */}
      <Dialog open={isFormVisible} onOpenChange={(open) => { if (!open) { setIsFormVisible(false); setShowSuccess(false) } }}>
        <DialogContent className="sm:max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-2xl p-0 overflow-hidden">
          {showSuccess ? (
            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
              <DialogTitle className="sr-only">Registration Successful</DialogTitle>
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-bounce mb-5">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h2 className="typography-page-title text-emerald-700 dark:text-emerald-400">Successfully Registered!</h2>
              <p className="typography-body text-slate-500 dark:text-slate-400 mt-1">The teacher has been added to the system.</p>
            </div>
          ) : (
            <>
              <DialogHeader className="bg-gradient-to-r from-blue-50/60 to-indigo-50/20 dark:from-slate-800/60 dark:to-slate-900/20 border-b border-slate-100 dark:border-slate-800/50 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-400/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <DialogTitle className="typography-section-title">{editingTeacher ? "Update Faculty Member" : "Register Faculty Member"}</DialogTitle>
                    <p className="typography-helper text-slate-500 dark:text-slate-400 mt-0.5">Provide complete personal and academic specialization fields.</p>
                  </div>
                </div>
              </DialogHeader>
              <div className="px-6 py-6 max-h-[80vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Profile Photo Upload */}
            <div className="flex items-center gap-5">
              <div className="relative flex-shrink-0">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt="Profile preview"
                    className="w-20 h-20 rounded-full object-cover shadow-md ring-2 ring-blue-500/80 dark:ring-blue-400/80 ring-offset-2 ring-offset-white dark:ring-offset-slate-900"
                  />
                ) : (
                  <div className={`typography-page-title w-20 h-20 rounded-full bg-gradient-to-br ${getAvatarGradient(formData.full_name || 'T')} flex items-center justify-center text-white shadow-md`}>
                    {getInitials(formData.full_name || 'T')}
                  </div>
                )}
                <label
                  htmlFor="photo-upload"
                  className="absolute -bottom-2 -right-2 w-7 h-7 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center cursor-pointer shadow-md transition-colors duration-200"
                  title="Upload photo"
                >
                  <Camera className="w-3.5 h-3.5 text-white" />
                </label>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onloadend = () => setProfilePhoto(reader.result as string)
                      reader.readAsDataURL(file)
                    }
                  }}
                />
              </div>
              <div>
                <p className="typography-label text-slate-700 dark:text-slate-300">Profile Photo</p>
                <p className="typography-helper text-slate-400 dark:text-slate-500 mt-0.5">Optional · JPG, PNG or WebP</p>
                {profilePhoto && (
                  <button
                    type="button"
                    onClick={() => setProfilePhoto(null)}
                    className="typography-helper text-rose-500 hover:text-rose-600 mt-1 transition-colors"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="typography-label text-slate-700 dark:text-slate-300 uppercase">Full Name <span className="text-red-500">*</span></Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                  required
                  placeholder="e.g. Dr. Abebe Kebede"
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="typography-label text-slate-700 dark:text-slate-300 uppercase">Email Address <span className="text-red-500">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  required
                  placeholder="username@school.com"
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="typography-label text-slate-700 dark:text-slate-300 uppercase">Password {!editingTeacher && <span className="text-red-500">*</span>}</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  required={!editingTeacher}
                  placeholder={editingTeacher ? "Leave empty to keep current password" : "Enter a secure password"}
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="typography-label text-slate-700 dark:text-slate-300 uppercase">Phone (Ethiopia +251)</Label>
                <Input
                  id="phone"
                  placeholder="+251911223344"
                  maxLength={13}
                  value={formData.phone}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^\d+]/g, "")
                    if (val.lastIndexOf("+") > 0) val = "+" + val.replace(/\+/g, "")
                    setFormData((prev) => ({ ...prev, phone: val }))
                  }}
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Format: +251XXXXXXXXX (exactly 13 characters)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <Label htmlFor="subject" className="typography-label text-slate-700 dark:text-slate-300 uppercase">Primary Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  placeholder="e.g. Mathematics, Physics"
                  onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qualification" className="typography-label text-slate-700 dark:text-slate-300 uppercase">Qualification</Label>
                <Input
                  id="qualification"
                  placeholder="e.g. BSc in Education, MA"
                  value={formData.qualification}
                  onChange={(e) => setFormData((prev) => ({ ...prev, qualification: e.target.value }))}
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience_years" className="typography-label text-slate-700 dark:text-slate-300 uppercase">Experience (years)</Label>
                <Input
                  id="experience_years"
                  type="number"
                  placeholder="e.g. 5"
                  value={formData.experience_years}
                  onChange={(e) => setFormData((prev) => ({ ...prev, experience_years: e.target.value }))}
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/50">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsFormVisible(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md px-6 py-2 transition-all duration-200 flex items-center justify-center min-w-[120px]"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : editingTeacher ? (
                  "Update Record"
                ) : (
                  "Register Teacher"
                )}
              </Button>
            </div>
          </form>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Card Grid of Teachers */}
      <div className="space-y-4">
        <h2 className="typography-section-title text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          Active Faculty Members ({teachers.length})
        </h2>

        {teachers.length === 0 ? (
          <div className="py-24 text-center bg-slate-50 dark:bg-slate-900/30 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800 mx-1">
            <div className="w-20 h-20 bg-background rounded-[28px] shadow-sm flex items-center justify-center mx-auto mb-6">
              <User className="w-8 h-8 text-slate-200" />
            </div>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No faculty registered</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-1 md:px-0">
            {teachers.map((teacher) => {
              const bgGradient = getAvatarGradient(teacher.id)
              return (
                <div 
                  key={teacher.id} 
                  className="group relative overflow-hidden bg-white dark:bg-slate-900 p-5 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm active:scale-[0.98] transition-all hover:shadow-md h-[180px] flex flex-col justify-between"
                  onClick={() => setSelectedTeacher(teacher)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      {teacher.profile_photo ? (
                        <img
                          src={teacher.profile_photo}
                          alt={teacher.full_name}
                          className="w-14 h-14 rounded-[20px] object-cover border-2 border-white dark:border-slate-800 shadow-sm"
                        />
                      ) : (
                        <div className={`w-14 h-14 rounded-[20px] bg-gradient-to-br ${bgGradient} flex items-center justify-center text-white text-lg font-black shadow-inner`}>
                          {getInitials(teacher.full_name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 leading-none truncate uppercase tracking-tight">
                          {teacher.full_name}
                        </h3>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            teacher.is_active !== false ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                          )} />
                          {teacher.subject || "No Subject"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleEdit(teacher); }}
                         className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-primary transition-colors"
                       >
                         <Edit className="w-4 h-4" />
                       </button>
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleDelete(teacher.id); }}
                         className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-rose-400 hover:text-rose-600 transition-colors"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800/50">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">Experience</span>
                        <span className="text-xs font-bold text-foreground">{teacher.experience_years ? `${teacher.experience_years} Years` : "—"}</span>
                      </div>
                    </div>
                    <div className="flex -space-x-1.5">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800" />
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Profile Detail modal */}
      {selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-2xl bg-white/95 dark:bg-slate-950/95 border border-slate-200/50 dark:border-slate-900/50 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            
            {/* Elegant Header Banner */}
            <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-8 text-white">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSelectedTeacher(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </Button>
              
              <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
                {selectedTeacher.profile_photo ? (
                  <img
                    src={selectedTeacher.profile_photo}
                    alt={selectedTeacher.full_name}
                    className="w-24 h-24 rounded-full object-cover shadow-lg ring-4 ring-white/30 ring-offset-2 ring-offset-blue-600"
                  />
                ) : (
                  <div className="typography-page-title w-24 h-24 rounded-full bg-white text-slate-800 flex items-center justify-center shadow-lg">
                    {getInitials(selectedTeacher.full_name)}
                  </div>
                )}
                <div className="text-center sm:text-left space-y-1">
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <h2 className="typography-page-title">{selectedTeacher.full_name}</h2>
                    <span className="typography-label text-[10px] uppercase px-2 py-0.5 bg-white/20 text-white border border-white/20 rounded-full">
                      Faculty Member
                    </span>
                  </div>
                  <p className="typography-body text-white/80 flex items-center justify-center sm:justify-start gap-1">
                    <Mail className="w-4 h-4" />
                    {selectedTeacher.email}
                  </p>
                  {selectedTeacher.subject && (
                    <div className="typography-label inline-flex items-center gap-1 mt-2 text-white bg-white/20 px-3 py-1 rounded-full border border-white/10">
                      <BookOpen className="w-3.5 h-3.5" />
                      {selectedTeacher.subject} Teacher
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="overflow-y-auto p-6 space-y-6 flex-1 bg-white dark:bg-slate-950">
              {/* Professional Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-900 flex flex-col items-center justify-center text-center">
                  <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-1" />
                  <span className="typography-label text-[10px] uppercase text-slate-400 dark:text-slate-500">Experience</span>
                  <span className="typography-label text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedTeacher.experience_years ? `${selectedTeacher.experience_years} Years` : "N/A"}
                  </span>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-900 flex flex-col items-center justify-center text-center">
                  <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-1" />
                  <span className="typography-label text-[10px] uppercase text-slate-400 dark:text-slate-500">Qualification</span>
                  <span className="typography-label text-slate-800 dark:text-slate-200 mt-0.5 truncate max-w-full" title={selectedTeacher.qualification || "N/A"}>
                    {selectedTeacher.qualification || "N/A"}
                  </span>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-900 flex flex-col items-center justify-center text-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1" />
                  <span className="typography-label text-[10px] uppercase text-slate-400 dark:text-slate-500">Status</span>
                  <span className="typography-label text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedTeacher.is_active !== false ? "Active Account" : "Suspended"}
                  </span>
                </div>
              </div>

              {/* Personal Details */}
              <div className="space-y-3">
                <h3 className="typography-label uppercase text-slate-400 dark:text-slate-500">Contact Details</h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-900 border border-slate-100 dark:border-slate-900 rounded-2xl overflow-hidden bg-slate-50/30 dark:bg-slate-900/20">
                  <div className="flex justify-between items-center p-4">
                    <span className="typography-body text-slate-500 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      Email Address
                    </span>
                    <span className="typography-label text-slate-800 dark:text-slate-200">{selectedTeacher.email}</span>
                  </div>
                  <div className="flex justify-between items-center p-4">
                    <span className="typography-body text-slate-500 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      Phone Number
                    </span>
                    <span className="typography-label text-slate-800 dark:text-slate-200">{selectedTeacher.phone || "No phone added"}</span>
                  </div>
                </div>
              </div>

              {/* Assignments / Dynamic Section */}
              <div className="space-y-3">
                <h3 className="typography-label uppercase text-slate-400 dark:text-slate-500">Class Assignments</h3>
                
                {isLoadingAssignments ? (
                  <div className="py-8 text-center bg-slate-50/50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span className="typography-helper text-slate-500">Loading assignments...</span>
                  </div>
                ) : assignments.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50/50 dark:bg-slate-900/30 border border-dashed border-slate-200/50 dark:border-slate-800/50 rounded-2xl text-slate-400">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                    <p className="typography-label text-slate-600 dark:text-slate-400">No classes assigned yet</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Use the Assignments panel under school administrator dashboard to allocate classes.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {assignments.map((assignment) => (
                      <div 
                        key={assignment.id} 
                        className="flex items-center gap-3 p-3 bg-blue-50/20 dark:bg-slate-900/50 rounded-xl border border-blue-100/50 dark:border-slate-800/80 hover:bg-blue-50/40 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="typography-label w-8 h-8 rounded-lg bg-blue-600/10 dark:bg-blue-400/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                          {assignment.grade}{assignment.section}
                        </div>
                        <div className="min-w-0">
                          <p className="typography-label text-slate-800 dark:text-slate-200">
                            Grade {assignment.grade} - Section {assignment.section}
                          </p>
                          {assignment.stream && assignment.stream !== "General" && (
                            <p className="typography-label text-[9px] text-slate-400 uppercase mt-0.5">
                              {assignment.stream}
                            </p>
                          )}
                          {assignment.subject && (
                            <p className="typography-label text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">
                              {assignment.subject}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-900/50 p-4 flex justify-end gap-2">
              <Button 
                onClick={() => {
                  setSelectedTeacher(null)
                  handleEdit(selectedTeacher)
                }}
                variant="outline"
                size="sm"
                className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
              <Button 
                onClick={() => setSelectedTeacher(null)}
                className="typography-body bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-1 transition-all duration-200"
              >
                Close Profile
              </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
