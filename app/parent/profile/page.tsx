"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { PageSkeleton } from "@/components/ui/page-skeleton"
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
import { useSchool } from "@/lib/context/school-context"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://zetimer-ctgw.onrender.com"

export default function ProfilePage() {
  const { t } = useLanguage()
  const { activeSchool } = useSchool()
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [studentDetails, setStudentDetails] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  
  // Parent profile state
  const [parentName, setParentName] = useState("")
  const [parentEmail, setParentEmail] = useState("")
  const [parentAddress, setParentAddress] = useState("")
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

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
    
    const currentUser = authService.getCurrentUser()
    if (currentUser) {
      setUser(currentUser)
      setParentName(currentUser.name || "")
      
      // Filter out only auto-generated internal emails (matches: parent-PHONE@zetime.com)
      const email = currentUser.email || ""
      const phoneDigits = (currentUser.phone || "").replace(/[^\d]/g, "")
      const isInternal = email.includes("@zetime.com") && 
                        email.startsWith("parent-") && 
                        (phoneDigits && email.includes(phoneDigits))

      setParentEmail(isInternal ? "" : email)
      
      // We don't have address in User interface yet, but let's try to get it if it exists in the object
      setParentAddress((currentUser as any).address || "")
    }

    setIsLoading(false)
  }

  // 2. Fetch all student relations (like advisor/teacher details)
  const fetchFullStudentDetails = async (studentId: string) => {
    try {
      const token = localStorage.getItem("attendance_token") || "";
      const schoolId = localStorage.getItem("x-school-id") || "";
      const headers = { 
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        ...(schoolId ? { "x-school-id": schoolId } : {})
      };

      const res = await fetch(`${API_URL}/api/students/${studentId}`, { headers })
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
    if (!name) return "U"
    return name
      .split(" ")
      .map(n => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!parentName) {
      notifications.error(t("validation_error"), t("name_required"))
      return
    }

    setIsUpdatingProfile(true)
    try {
      const res = await authService.updateParentProfile(user.phone, {
        name: parentName,
        email: parentEmail,
        address: parentAddress
      })

      if (res.success) {
        notifications.success(t("success"), t("profile_updated"))
        if (res.user) setUser(res.user)
      } else {
        notifications.error(t("error"), res.message || t("update_failed"))
      }
    } catch (err) {
      notifications.error(t("error"), "An unexpected error occurred.")
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  if (isLoading) {
    return <PageSkeleton variant="form" />
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
        <h1 className="typography-page-title text-foreground">{t("profile_settings")}</h1>
        <p className="typography-label text-muted-foreground mt-0.5">{t("profile_settings_desc")}</p>
      </div>

      {/* ─── PARENT PROFILE SECTION ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Parent Info Form */}
        <Card className="lg:col-span-2 border-border/40 shadow-lg rounded-3xl bg-card/60 backdrop-blur-md">
          <CardHeader className="border-b border-border/20 pb-4">
            <CardTitle className="typography-label uppercase text-muted-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-500" />
              <span>{t("account_info")}</span>
            </CardTitle>
            <CardDescription className="typography-helper mt-0.5">{t("account_info_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="parentName" className="typography-label text-muted-foreground">{t("full_name")}</Label>
                  <Input
                    id="parentName"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder={t("enter_name")}
                    className="typography-body h-11 rounded-xl bg-background/50 border-border/50 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="parentEmail" className="typography-label text-muted-foreground">{t("email")}</Label>
                  <Input
                    id="parentEmail"
                    type="email"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    placeholder={t("enter_email")}
                    className="typography-body h-11 rounded-xl bg-background/50 border-border/50 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parentPhone" className="typography-label text-muted-foreground">{t("phone_number")}</Label>
                <Input
                  id="parentPhone"
                  value={user?.phone || ""}
                  disabled
                  className="typography-body h-11 rounded-xl bg-muted/30 border-border/50 cursor-not-allowed"
                />
                <p className="typography-helper text-muted-foreground text-[10px]">{t("phone_change_not_allowed")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parentAddress" className="typography-label text-muted-foreground">{t("address")}</Label>
                <Input
                  id="parentAddress"
                  value={parentAddress}
                  onChange={(e) => setParentAddress(e.target.value)}
                  placeholder={t("enter_address")}
                  className="typography-body h-11 rounded-xl bg-background/50 border-border/50 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button 
                  type="submit" 
                  disabled={isUpdatingProfile}
                  className="typography-label h-11 px-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-md shadow-emerald-500/10"
                >
                  {isUpdatingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("saving")}
                    </>
                  ) : (
                    t("save_changes")
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Right: Security/Password card moved here for better layout */}
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
                const res = await authService.updateParentPassword(user.phone, currentPassword, newPassword)
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
            }} className="space-y-4">
              
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

      {/* ─── STUDENT INFO SECTION ────────────────────────────────────────── */}
      <div className="pt-4">
        <h2 className="typography-section-title text-foreground mb-4">{t("student_info")}</h2>
        
        {/* Main Hero Card for Student */}
        <Card className="border-border/40 shadow-xl rounded-3xl bg-card/60 backdrop-blur-md overflow-hidden mb-6">
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

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border/40 shadow-lg rounded-3xl bg-card/60 backdrop-blur-md">
            <CardHeader className="border-b border-border/20 pb-4">
              <CardTitle className="typography-label uppercase text-muted-foreground flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-500" />
                <span>{t("enrollment_info")}</span>
              </CardTitle>
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
                <span className="typography-label text-foreground">{activeSchool?.name || "School Portal"}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-lg rounded-3xl bg-card/60 backdrop-blur-md">
            <CardHeader className="border-b border-border/20 pb-4">
              <CardTitle className="typography-label uppercase text-muted-foreground flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-500" />
                <span>{t("faculty_advisor")}</span>
              </CardTitle>
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
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="typography-label text-emerald-700 dark:text-emerald-300">{t("office_hours")}: {advisor.hours}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  )
}
