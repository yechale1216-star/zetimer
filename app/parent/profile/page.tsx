"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  User, 
  GraduationCap, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Calendar,
  Layers,
  HeartHandshake,
  ShieldAlert,
  Clock,
  Lock,
  KeyRound,
  Loader2
} from "lucide-react"
import { authService } from "@/lib/auth/auth"
import { notifications } from "@/lib/utils/notifications"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/context/language-context"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export default function StudentProfile() {
  const { t } = useLanguage()
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [studentDetails, setStudentDetails] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userPhone, setUserPhone] = useState("")

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // 1. Initial Load & Auth verification
  const loadData = async () => {
    const studentId = localStorage.getItem("parent_selected_student_id")
    const studentsStr = localStorage.getItem("parent_students")

    if (studentsStr && studentId) {
      const students = JSON.parse(studentsStr)
      const student = students.find((s: any) => s.id === studentId) || students[0]
      if (student) {
        setSelectedStudent(student)
        await fetchFullStudentDetails(student.id)
      }
    }
    
    const user = authService.getCurrentUser()
    if (user && user.phone) {
      setUserPhone(user.phone)
    }

    setIsLoading(false)
  }

  // 2. Fetch all student relations (like advisor/teacher details)
  const fetchFullStudentDetails = async (studentId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/students/${studentId}`)
      const data = await res.json()
      if (data.success && data.data) {
        setStudentDetails(data.data)
      }
    } catch (err) {
      console.error("[Profile] Fetch details error:", err)
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

  const getInitials = (name: string) => {
    if (!name) return "S"
    return name
      .split(" ")
      .map(n => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-40 w-full bg-card animate-pulse rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-60 bg-card animate-pulse rounded-3xl" />
          <div className="h-60 bg-card animate-pulse rounded-3xl" />
        </div>
      </div>
    )
  }

  // Fallback default details if database fields are blank
  const activeStudent = studentDetails || selectedStudent
  const advisor = activeStudent?.school?.teachers?.[0] || {
    name: "School Advisor",
    email: activeStudent?.school?.email || "Not Provided",
    phone: activeStudent?.school?.phone || "Not Provided",
    office: "School Office",
    hours: "Standard Hours"
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Page Header */}
      <div>
        <h1 className="typography-page-title text-foreground">{t("student_profile")}</h1>
        <p className="typography-label text-muted-foreground mt-0.5">{t("profile_desc")}</p>
      </div>

      {/* ─── MAIN HERO AVATAR CARD ────────────────────────────────────────── */}
      <Card className="border-border/40 shadow-xl rounded-3xl bg-card/60 backdrop-blur-md overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-emerald-600 to-teal-500 opacity-80" />
        <CardContent className="p-6 relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between -mt-16 gap-4">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-4 text-center md:text-left">
              <Avatar className="w-24 h-24 border-4 border-card rounded-2xl ring-2 ring-emerald-600/10 shadow-xl">
                <AvatarFallback className="typography-page-title bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl">
                  {getInitials(activeStudent?.fullName || activeStudent?.name || "")}
                </AvatarFallback>
              </Avatar>
              <div className="pb-1">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <h2 className="typography-section-title text-foreground">{activeStudent?.fullName || activeStudent?.name}</h2>
                  <Badge variant="outline" className="typography-label bg-emerald-500/5 text-emerald-600 border-emerald-500/20 text-[9px] uppercase rounded-md py-0.5">
                    {t("active_status")}
                  </Badge>
                </div>
                <p className="typography-label text-muted-foreground mt-0.5">
                  {t("roll_id")}: <span className="typography-label">{activeStudent?.rollNumber || activeStudent?.id?.slice(0, 8).toUpperCase() || "N/A"}</span>
                </p>
              </div>
            </div>

            <div className="typography-label flex flex-wrap justify-center gap-4 text-muted-foreground pt-2">
              <div className="flex items-center gap-1">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>{t("grade_section").replace("{grade}", activeStudent?.grade || "").replace("{section}", activeStudent?.section || "")}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── GRID PROFILE SECTIONS ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: General Academic Information */}
        <Card className="border-border/40 shadow-lg rounded-3xl bg-card/60 backdrop-blur-md">
          <CardHeader className="border-b border-border/20 pb-4">
            <CardTitle className="typography-label uppercase text-muted-foreground flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-500" />
              <span>{t("enrollment_info")}</span>
            </CardTitle>
            <CardDescription className="typography-helper mt-0.5">{t("enrollment_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="typography-label p-6 space-y-4">
            
            <div className="flex items-center justify-between py-2 border-b border-border/10">
              <span className="text-muted-foreground">{t("full_name")}</span>
              <span className="typography-label text-foreground">{activeStudent?.fullName || activeStudent?.name}</span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-border/10">
              <span className="text-muted-foreground">{t("class_section")}</span>
              <span className="typography-label text-foreground">{t("grade_section").replace("{grade}", activeStudent?.grade || "").replace("{section}", activeStudent?.section || "")}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/10">
              <span className="text-muted-foreground">{t("academic_institution")}</span>
              <span className="typography-label text-foreground">{activeStudent?.school?.name || authService.getCurrentUser()?.schoolName || "School Portal"}</span>
            </div>

          </CardContent>
        </Card>

        {/* Right: Assigned Faculty Advisor */}
        <Card className="border-border/40 shadow-lg rounded-3xl bg-card/60 backdrop-blur-md">
          <CardHeader className="border-b border-border/20 pb-4">
            <CardTitle className="typography-label uppercase text-muted-foreground flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-500" />
              <span>{t("faculty_advisor")}</span>
            </CardTitle>
            <CardDescription className="typography-helper mt-0.5">{t("advisor_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="typography-label p-6 space-y-4">
            
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border rounded-xl ring-2 ring-emerald-600/5">
                <AvatarFallback className="typography-label bg-emerald-50 text-emerald-700 rounded-lg">
                  {getInitials(advisor.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="typography-label text-foreground">{advisor.name}</p>
                <span className="typography-label text-[10px] text-muted-foreground block mt-0.5">{t("homeroom_advisor")}</span>
              </div>
            </div>

            <div className="space-y-2 border-t border-border/10 pt-3">
              <div className="flex items-center gap-2.5">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">{advisor.email}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">{advisor.phone}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">{advisor.office}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span className="typography-label text-emerald-700 dark:text-emerald-300">{t("office_hours")}: {advisor.hours}</span>
              </div>
            </div>

          </CardContent>
        </Card>

      </div>

      {/* ─── CONTACTS & EMERGENCY SECTION ────────────────────────────────── */}
      <Card className="border-border/40 shadow-lg rounded-3xl bg-card/60 backdrop-blur-md">
        <CardHeader className="border-b border-border/20 pb-4">
          <CardTitle className="typography-label uppercase text-muted-foreground flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-emerald-500" />
            <span>{t("emergency_contacts")}</span>
          </CardTitle>
          <CardDescription className="typography-helper mt-0.5">{t("emergency_contacts_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="p-4 bg-muted/20 border border-border/10 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <User className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="typography-label text-foreground">{t("primary_guardian")}</p>
                  <span className="typography-label text-[10px] text-muted-foreground">{activeStudent?.parentPhone}</span>
                </div>
              </div>
              <Badge className="typography-label bg-emerald-600 hover:bg-emerald-700 border-none text-[9px] uppercase rounded-md">{t("sms_alerts_active")}</Badge>
            </div>

            <div className="p-4 bg-muted/20 border border-border/10 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="typography-label text-foreground">{activeStudent?.school?.settings?.emergencyContactName || t("emergency_coordinator")}</p>
                  <span className="typography-label text-[10px] text-muted-foreground">{activeStudent?.school?.settings?.emergencyPhone || activeStudent?.school?.phone || "N/A"}</span>
                </div>
              </div>
              <Badge variant="outline" className="typography-label border-rose-500/20 text-rose-600 text-[9px] uppercase rounded-md">{t("hotline")}</Badge>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* ─── SECURITY & SETTINGS ───────────────────────────────────────────── */}
      <Card className="border-border/40 shadow-lg rounded-3xl bg-card/60 backdrop-blur-md">
        <CardHeader className="border-b border-border/20 pb-4">
          <CardTitle className="typography-label uppercase text-muted-foreground flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-500" />
            <span>{t("security_settings")}</span>
          </CardTitle>
          <CardDescription className="typography-helper mt-0.5">{t("security_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={async (e) => {
            e.preventDefault()
            if (newPassword !== confirmPassword) {
              notifications.error(t("validation_error"), t("passwords_not_match"))
              return
            }
            if (newPassword.length < 6) {
              notifications.error(t("validation_error"), t("password_len_error"))
              return
            }
            setIsChangingPassword(true)
            try {
              const res = await authService.updateParentPassword(userPhone, currentPassword, newPassword)
              if (res.success) {
                notifications.success(t("security_update"), t("password_updated"))
                setCurrentPassword("")
                setNewPassword("")
                setConfirmPassword("")
              } else {
                notifications.error(t("update_failed"), res.message || t("invalid_credentials"))
              }
            } catch (err) {
              notifications.error(t("update_failed"), t("unexpected_error"))
            } finally {
              setIsChangingPassword(false)
            }
          }} className="space-y-4 max-w-md">
            
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="typography-label text-muted-foreground">{t("current_password")}</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="typography-body h-11 rounded-xl bg-background/50 border-border/50 focus:ring-emerald-500/20"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="typography-label text-muted-foreground">{t("new_password")}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="typography-body h-11 rounded-xl bg-background/50 border-border/50 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="typography-label text-muted-foreground">{t("confirm_password")}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="typography-body h-11 rounded-xl bg-background/50 border-border/50 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="typography-label mt-2 h-11 w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-md shadow-emerald-500/10"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("updating")}...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 mr-2" />
                  {t("update_password")}
                </>
              )}
            </Button>

          </form>
        </CardContent>
      </Card>

    </div>
  )
}
