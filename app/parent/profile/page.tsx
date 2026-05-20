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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export default function StudentProfile() {
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
    name: "Dr. Aster Kebede",
    email: "aster.k@zetime-academy.com",
    phone: "+251 911 345 678",
    office: "Science Block A, Room 102",
    hours: "Mon & Wed: 2:00 PM - 4:00 PM"
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Student Profile</h1>
        <p className="text-xs text-muted-foreground font-semibold mt-0.5">Official enrollment details and active academic relationships.</p>
      </div>

      {/* ─── MAIN HERO AVATAR CARD ────────────────────────────────────────── */}
      <Card className="border-border/40 shadow-xl rounded-3xl bg-card/60 backdrop-blur-md overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-emerald-600 to-teal-500 opacity-80" />
        <CardContent className="p-6 relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between -mt-16 gap-4">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-4 text-center md:text-left">
              <Avatar className="w-24 h-24 border-4 border-card rounded-2xl ring-2 ring-emerald-600/10 shadow-xl">
                <AvatarFallback className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-2xl rounded-xl">
                  {getInitials(activeStudent?.fullName || activeStudent?.name || "")}
                </AvatarFallback>
              </Avatar>
              <div className="pb-1">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <h2 className="text-xl font-black tracking-tight text-foreground">{activeStudent?.fullName || activeStudent?.name}</h2>
                  <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20 text-[9px] font-black uppercase tracking-wider rounded-md py-0.5">
                    Active
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                  Roll ID: <span className="font-extrabold">{activeStudent?.rollNumber || activeStudent?.id?.slice(0, 8).toUpperCase() || "N/A"}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-xs font-bold text-muted-foreground pt-2">
              <div className="flex items-center gap-1">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Grade {activeStudent?.grade} • Section {activeStudent?.section}</span>
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
            <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-500" />
              <span>Enrollment Information</span>
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">Details regarding current school registration</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs font-semibold">
            
            <div className="flex items-center justify-between py-2 border-b border-border/10">
              <span className="text-muted-foreground">Full Name</span>
              <span className="text-foreground font-bold">{activeStudent?.fullName || activeStudent?.name}</span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-border/10">
              <span className="text-muted-foreground">Registered Class / Section</span>
              <span className="text-foreground font-bold">Grade {activeStudent?.grade} - {activeStudent?.section}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/10">
              <span className="text-muted-foreground">Academic Institution</span>
              <span className="text-foreground font-bold">{activeStudent?.school?.name || "Zetime Academy"}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/10">
              <span className="text-muted-foreground">Tenant Isolation ID</span>
              <span className="text-[10px] text-muted-foreground/80 font-bold truncate max-w-[150px]">{activeStudent?.schoolId || "Global"}</span>
            </div>

          </CardContent>
        </Card>

        {/* Right: Assigned Faculty Advisor */}
        <Card className="border-border/40 shadow-lg rounded-3xl bg-card/60 backdrop-blur-md">
          <CardHeader className="border-b border-border/20 pb-4">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-500" />
              <span>Faculty Advisor Contact</span>
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">Assigned teacher handling reports and leaves</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs font-semibold">
            
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border rounded-xl ring-2 ring-emerald-600/5">
                <AvatarFallback className="bg-emerald-50 text-emerald-700 font-bold text-xs rounded-lg">
                  {getInitials(advisor.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs font-black text-foreground">{advisor.name}</p>
                <span className="text-[10px] text-muted-foreground font-semibold block leading-none mt-0.5">Homeroom Class Advisor</span>
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
                <span className="text-emerald-700 dark:text-emerald-300 font-bold">Office Hours: {advisor.hours}</span>
              </div>
            </div>

          </CardContent>
        </Card>

      </div>

      {/* ─── CONTACTS & EMERGENCY SECTION ────────────────────────────────── */}
      <Card className="border-border/40 shadow-lg rounded-3xl bg-card/60 backdrop-blur-md">
        <CardHeader className="border-b border-border/20 pb-4">
          <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-emerald-500" />
            <span>Emergency Contacts & Authorized Guardians</span>
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">List of verified family contacts with permission to receive reports</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="p-4 bg-muted/20 border border-border/10 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <User className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Primary Parent Guardian</p>
                  <span className="text-[10px] text-muted-foreground font-semibold">{activeStudent?.parentPhone}</span>
                </div>
              </div>
              <Badge className="bg-emerald-600 hover:bg-emerald-700 border-none font-bold text-[9px] uppercase tracking-wide rounded-md">SMS Alerts Active</Badge>
            </div>

            <div className="p-4 bg-muted/20 border border-border/10 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Emergency Hotline Coordinator</p>
                  <span className="text-[10px] text-muted-foreground font-semibold">+251 911 000 999</span>
                </div>
              </div>
              <Badge variant="outline" className="border-rose-500/20 text-rose-600 font-bold text-[9px] uppercase tracking-wide rounded-md">Hotline</Badge>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* ─── SECURITY & SETTINGS ───────────────────────────────────────────── */}
      <Card className="border-border/40 shadow-lg rounded-3xl bg-card/60 backdrop-blur-md">
        <CardHeader className="border-b border-border/20 pb-4">
          <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-500" />
            <span>Account Security</span>
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">Update your Parent Portal login credentials</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={async (e) => {
            e.preventDefault()
            if (newPassword !== confirmPassword) {
              notifications.error("Validation Error", "New passwords do not match")
              return
            }
            if (newPassword.length < 6) {
              notifications.error("Validation Error", "Password must be at least 6 characters")
              return
            }
            setIsChangingPassword(true)
            try {
              const res = await authService.updateParentPassword(userPhone, currentPassword, newPassword)
              if (res.success) {
                notifications.success("Security Update", "Password updated successfully")
                setCurrentPassword("")
                setNewPassword("")
                setConfirmPassword("")
              } else {
                notifications.error("Update Failed", res.message || "Failed to update password")
              }
            } catch (err) {
              notifications.error("Update Failed", "An error occurred while updating password")
            } finally {
              setIsChangingPassword(false)
            }
          }} className="space-y-4 max-w-md">
            
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-xs font-bold text-muted-foreground">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="h-11 rounded-xl bg-background/50 border-border/50 text-sm focus:ring-emerald-500/20"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-xs font-bold text-muted-foreground">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="h-11 rounded-xl bg-background/50 border-border/50 text-sm focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-xs font-bold text-muted-foreground">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-11 rounded-xl bg-background/50 border-border/50 text-sm focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="mt-2 h-11 w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-md shadow-emerald-500/10"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating Security...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 mr-2" />
                  Update Password
                </>
              )}
            </Button>

          </form>
        </CardContent>
      </Card>

    </div>
  )
}
