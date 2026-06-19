"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/lib/auth/auth"
import { useAuth } from "@/lib/context/auth-context"
import { notifications } from "@/lib/utils/notifications"
import {
  School,
  BookOpen,
  ClipboardList,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Upload,
  Globe,
  MapPin,
  Calendar,
  Clock,
  BarChart3,
  Loader2,
  Sparkles,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Image from "next/image"

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardingData {
  // Step 1 – School Profile
  schoolEmail: string
  logoUrl: string
  logoPreview: string
  // Step 2 – Academic Structure
  academicYear: string
  // Step 3 – Attendance Settings
  attendanceMode: "session_based" | "daily"
  attendanceThreshold: number
  allowLateMark: boolean
}

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 0, label: "Welcome", icon: Sparkles },
  { id: 1, label: "School Profile", icon: School },
  { id: 2, label: "Academic Structure", icon: BookOpen },
  { id: 3, label: "Attendance Settings", icon: ClipboardList },
  { id: 4, label: "All Done!", icon: CheckCircle2 },
]

// ─── Main Wizard Component ────────────────────────────────────────────────────

export default function OnboardingWizard() {
  const router = useRouter()
  const { validateSession } = useAuth()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [skipping, setSkipping] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mounted, setMounted] = useState(false)
  
  const user = authService.getCurrentUser()
  const adminName = mounted ? (user?.name?.split(" ")[0] || "Admin") : "Admin"
  const schoolName = mounted ? (user?.schoolName || "Your School") : "Your School"

  const [data, setData] = useState<OnboardingData>({
    schoolEmail: "",
    logoUrl: "",
    logoPreview: "",
    academicYear: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
    attendanceMode: "session_based",
    attendanceThreshold: 75,
    allowLateMark: true,
  })
  
  // Auth guard: If not logged in as admin, redirect to login
  useEffect(() => {
    setMounted(true)
    if (typeof window !== "undefined") {
      const currentUser = authService.getCurrentUser()
      const isAdmin = authService.isAdmin()
      console.log("[RedirectDebug] OnboardingWizard mount check:", { 
        hasUser: !!currentUser, 
        role: currentUser?.role, 
        isAdmin,
        onboardingCompleted: currentUser?.onboardingCompleted
      })

      if (!currentUser || !isAdmin) {
        console.warn("[RedirectDebug] OnboardingWizard: Not an admin, redirecting to login")
        router.replace("/login")
      }
    }
  }, [router])

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const update = (patch: Partial<OnboardingData>) =>
    setData((prev) => ({ ...prev, ...patch }))

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      update({ logoUrl: base64, logoPreview: base64 })
    }
    reader.readAsDataURL(file)
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const goPrev = () => setStep((s) => Math.max(s - 1, 0))

  const handleSkip = async () => {
    setSkipping(true)
    // Mark onboarding as done even when skipping so they aren't prompted again
    await authService.completeOnboarding({})
    // Re-validate session fully so AuthContext has correct schoolId + features
    // before the Dashboard renders. This prevents any cross-tenant data leak.
    await validateSession()
    notifications.info("Setup Skipped", "You can complete school setup anytime from Settings.")
    router.replace("/school/admin")
  }

  const handleFinish = async () => {
    setSaving(true)
    const result = await authService.completeOnboarding({
      schoolEmail: data.schoolEmail || undefined,
      logoUrl: data.logoUrl || undefined,
      academicYear: data.academicYear || undefined,
      attendanceMode: data.attendanceMode,
      attendanceThreshold: data.attendanceThreshold,
      allowLateMark: data.allowLateMark,
    })
    setSaving(false)

    if (result.success) {
      notifications.success("Setup Complete!", "Your school is ready to go.")
      // Await a full session re-validation (profile + features from backend) before
      // navigating. This is the guarantee that no stale cross-tenant data ever
      // reaches the Dashboard — not even for a single render frame.
      await validateSession()
      router.replace("/school/admin")
    } else {
      notifications.error("Save Failed", result.message)
    }
  }

  // ─── Step panels ──────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      case 0:
        return <WelcomeStep adminName={adminName} schoolName={schoolName} onNext={goNext} />
      case 1:
        return (
          <ProfileStep
            data={data}
            update={update}
            fileInputRef={fileInputRef}
            onLogoUpload={handleLogoUpload}
          />
        )
      case 2:
        return <AcademicStep data={data} update={update} />
      case 3:
        return <AttendanceStep data={data} update={update} />
      case 4:
        return <FinishStep schoolName={schoolName} onFinish={handleFinish} saving={saving} />
      default:
        return null
    }
  }

  // ─── Progress bar ─────────────────────────────────────────────────────────

  const progressPercent = step === 0 ? 0 : Math.round(((step) / (STEPS.length - 1)) * 100)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-sm tracking-tight">Zetime Setup Wizard</span>
        </div>
        {step > 0 && step < STEPS.length - 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            disabled={skipping}
            className="text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            {skipping ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
            Skip Setup
          </Button>
        )}
      </header>

      {/* Progress */}
      {step > 0 && step < STEPS.length - 1 && (
        <div className="px-6 pt-4 pb-2 max-w-2xl mx-auto w-full">
          <div className="flex items-center justify-between mb-2">
            {STEPS.slice(1, -1).map((s, i) => {
              const done = step > s.id
              const active = step === s.id
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      done
                        ? "bg-primary text-primary-foreground"
                        : active
                        ? "bg-primary/20 text-primary border-2 border-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={`text-xs hidden sm:inline ${active ? "text-primary font-medium" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                  {i < STEPS.length - 3 && (
                    <div className={`h-px w-8 sm:w-12 ${done ? "bg-primary" : "bg-border"} mx-1 transition-colors`} />
                  )}
                </div>
              )
            })}
          </div>
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Body */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <div className="bg-card/80 backdrop-blur-xl border border-border/40 rounded-3xl shadow-2xl p-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-400">
            {renderStep()}
          </div>

          {/* Navigation for middle steps */}
          {step > 0 && step < STEPS.length - 1 && (
            <div className="flex items-center justify-between mt-6 px-1">
              <Button variant="outline" onClick={goPrev} className="gap-2 rounded-xl">
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
              <Button onClick={goNext} className="gap-2 rounded-xl shadow-md shadow-primary/10">
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ─── Step 0: Welcome ──────────────────────────────────────────────────────────

function WelcomeStep({ adminName, schoolName, onNext }: { adminName: string; schoolName: string; onNext: () => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mx-auto">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Welcome to Zetime, {adminName}! 🎉</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Your account and school <strong className="text-foreground">{schoolName}</strong> have been created. Let&apos;s take a few minutes to set everything up so your school is ready to go.
        </p>
      </div>

      <div className="space-y-3 text-left">
        {[
          { icon: School, label: "Step 1", desc: "Complete your school profile" },
          { icon: BookOpen, label: "Step 2", desc: "Configure academic structure" },
          { icon: ClipboardList, label: "Step 3", desc: "Set up attendance rules" },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div className="text-sm">
              <span className="font-semibold text-foreground">{label}:</span>{" "}
              <span className="text-muted-foreground">{desc}</span>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={onNext} size="lg" className="w-full rounded-xl shadow-lg shadow-primary/10 gap-2">
        Let&apos;s Get Started <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  )
}

// ─── Step 1: School Profile ───────────────────────────────────────────────────

function ProfileStep({
  data,
  update,
  fileInputRef,
  onLogoUpload,
}: {
  data: OnboardingData
  update: (p: Partial<OnboardingData>) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">School Profile</h2>
        <p className="text-muted-foreground text-sm mt-1">Add your school&apos;s logo, contact email, and address. All fields are optional.</p>
      </div>

      {/* Logo upload */}
      <div className="space-y-2">
        <Label>School Logo <span className="text-muted-foreground text-xs">(Optional)</span></Label>
        <div className="flex items-center gap-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 rounded-2xl border-2 border-dashed border-border/70 hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-center bg-muted/30 overflow-hidden"
          >
            {data.logoPreview ? (
              <Image src={data.logoPreview} alt="Logo preview" width={80} height={80} className="object-cover w-full h-full" />
            ) : (
              <Upload className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Click to upload your school logo</p>
            <p className="text-xs">PNG, JPG or SVG · Max 2MB</p>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onLogoUpload} />
      </div>

      {/* School Email */}
      <div className="space-y-1.5">
        <Label htmlFor="schoolEmail">
          School Email <span className="text-muted-foreground text-xs">(Optional)</span>
        </Label>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="schoolEmail"
            type="email"
            placeholder="info@yourschool.edu.et"
            value={data.schoolEmail}
            onChange={(e) => update({ schoolEmail: e.target.value })}
            className="pl-10 h-11 rounded-xl bg-background/50 border-border/50"
          />
        </div>
        <p className="text-[10px] text-muted-foreground ml-1">Used for school-wide notifications and announcements</p>
      </div>
    </div>
  )
}

// ─── Step 2: Academic Structure ───────────────────────────────────────────────

function AcademicStep({
  data,
  update,
}: {
  data: OnboardingData
  update: (p: Partial<OnboardingData>) => void
}) {
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 4 }, (_, i) => {
    const y = currentYear - 1 + i
    return `${y}/${y + 1}`
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Academic Structure</h2>
        <p className="text-muted-foreground text-sm mt-1">Set your active academic year. You can add grades, streams, and sections from the Admin dashboard after setup.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="academicYear">Active Academic Year</Label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            id="academicYear"
            value={data.academicYear}
            onChange={(e) => update({ academicYear: e.target.value })}
            className="w-full pl-10 h-11 rounded-xl bg-background/50 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none pr-4"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-muted/40 rounded-2xl p-4 space-y-2">
        <p className="text-sm font-medium flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          What you&apos;ll configure in the dashboard
        </p>
        {["Grades (Grade 1–12 or custom)", "Streams (Natural, Social, General)", "Sections (A, B, C, ...)"].map((item) => (
          <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-1 h-1 rounded-full bg-primary/60" />
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Step 3: Attendance Settings ──────────────────────────────────────────────

function AttendanceStep({
  data,
  update,
}: {
  data: OnboardingData
  update: (p: Partial<OnboardingData>) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Attendance Settings</h2>
        <p className="text-muted-foreground text-sm mt-1">Configure how attendance is tracked at your school.</p>
      </div>

      {/* Attendance Mode */}
      <div className="space-y-2">
        <Label>Attendance Mode</Label>
        <div className="grid grid-cols-2 gap-3">
          {(["session_based", "daily"] as const).map((mode) => {
            const label = mode === "session_based" ? "Session-Based" : "Daily"
            const desc = mode === "session_based" ? "Morning & afternoon sessions" : "Single daily check-in"
            const Icon = mode === "session_based" ? Clock : ClipboardList
            const active = data.attendanceMode === mode
            return (
              <button
                key={mode}
                type="button"
                onClick={() => update({ attendanceMode: mode })}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  active ? "border-primary bg-primary/5" : "border-border/50 bg-muted/20 hover:border-primary/30"
                }`}
              >
                <Icon className={`w-5 h-5 mb-2 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <p className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Attendance threshold */}
      <div className="space-y-2">
        <Label htmlFor="threshold" className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          Minimum Attendance Threshold:{" "}
          <span className="text-primary font-bold">{data.attendanceThreshold}%</span>
        </Label>
        <input
          id="threshold"
          type="range"
          min={50}
          max={100}
          step={5}
          value={data.attendanceThreshold}
          onChange={(e) => update({ attendanceThreshold: Number(e.target.value) })}
          className="w-full accent-primary h-2"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>50%</span>
          <span>75% (recommended)</span>
          <span>100%</span>
        </div>
      </div>

      {/* Allow late mark */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20">
        <div>
          <p className="text-sm font-medium">Allow Late Mark</p>
          <p className="text-xs text-muted-foreground">Students arriving late can be marked as &quot;Late&quot; instead of absent</p>
        </div>
        <button
          type="button"
          onClick={() => update({ allowLateMark: !data.allowLateMark })}
          className={`w-11 h-6 rounded-full transition-colors relative ${data.allowLateMark ? "bg-primary" : "bg-muted"}`}
        >
          <div
            className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
              data.allowLateMark ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  )
}

// ─── Step 4: Finish ───────────────────────────────────────────────────────────

function FinishStep({
  schoolName,
  onFinish,
  saving,
}: {
  schoolName: string
  onFinish: () => void
  saving: boolean
}) {
  return (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">You&apos;re All Set! 🎓</h2>
        <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
          <strong className="text-foreground">{schoolName}</strong> is configured and ready. Click below to save your settings and go to the Admin Dashboard.
        </p>
      </div>

      <div className="space-y-2 text-left">
        {[
          "School profile saved",
          "Academic year configured",
          "Attendance rules set",
        ].map((item) => (
          <div key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            {item}
          </div>
        ))}
      </div>

      <Button
        onClick={onFinish}
        disabled={saving}
        size="lg"
        className="w-full rounded-xl shadow-lg shadow-primary/10 gap-2 bg-emerald-600 hover:bg-emerald-700"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4" />
            Save &amp; Go to Dashboard
          </>
        )}
      </Button>
    </div>
  )
}
