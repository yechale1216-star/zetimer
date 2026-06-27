"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSchool } from "@/lib/context/school-context"
import { useAuth } from "@/lib/context/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GraduationCap, ArrowRight, Loader2, LogOut, RotateCw } from "lucide-react"
import { authService } from "@/lib/auth/auth"
import { notifications } from "@/lib/utils/notifications"

export default function SchoolSelectPage() {
  const router = useRouter()
  const { availableSchools, switchSchool, setSchoolsFromLogin } = useSchool()
  const { authLoading } = useAuth()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    const u = authService.getCurrentUser()
    if (u) {
      setCurrentUser(u)
    }

    // If the context is empty but localStorage has schools, re-hydrate from storage
    // This handles the case where we navigated here without calling validateSession
    if (availableSchools.length === 0) {
      try {
        const stored = localStorage.getItem("available_schools")
        if (stored) {
          const schools = JSON.parse(stored)
          if (schools.length > 0) {
            const activeStored = localStorage.getItem("active_school")
            const activeSchoolId = activeStored ? JSON.parse(activeStored)?.id : undefined
            setSchoolsFromLogin(schools, activeSchoolId)
          }
        }
      } catch { /* ignore */ }
    }

    // Wait for context to settle, then check auth
    const timer = setTimeout(() => {
      setIsInitializing(false)
      // Only redirect to login if we have no user AND no stored session
      const storedUser = authService.getCurrentUser()
      if (!storedUser) {
        router.push("/login")
      }
    }, 1000)

    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelectSchool = async (schoolId: string) => {
    setSwitchingId(schoolId)
    const success = await switchSchool(schoolId)
    if (success) {
      // Use a hard redirect (not router.push) so all React contexts re-initialize
      // cleanly from localStorage after the school switch. SPA navigation keeps stale
      // context state alive across the route change, causing the old school to remain
      // in the header and old students to be shown.
      const token = localStorage.getItem("attendance_token")
      const userStr = localStorage.getItem("attendance_current_user")
      const role = userStr ? JSON.parse(userStr).role : "parent"
      console.log(`[SchoolSelect] Switched successfully. Redirecting (hard) for role: ${role}`)

      if (role === "admin" || role === "school_admin") {
        const user = userStr ? JSON.parse(userStr) : null
        window.location.href = user?.onboardingCompleted === false ? "/onboarding" : "/school/admin"
      } else if (role === "teacher") {
        window.location.href = "/school/teacher"
      } else if (role === "parent") {
        window.location.href = "/parent/dashboard"
      } else if (role === "super_admin") {
        window.location.href = "/super-admin"
      } else {
        window.location.href = "/parent/dashboard"
      }
    } else {
      setSwitchingId(null)
      notifications.error("Selection Failed", "Could not switch to this school. Please try again.")
    }
  }

  const handleLogout = () => {
    authService.logout()
    router.push("/login")
  }

  // Priority order for school data:
  // 1. Protected login-time backup (never wiped by clearSchoolContext)
  // 2. Active React context (if hydrated)
  // 3. Standard localStorage key
  const displaySchools = (() => {
    if (typeof window === "undefined") return availableSchools || []
    try {
      // 1 — Protected backup written at login time (most reliable)
      const ts = localStorage.getItem("zt_parent_login_ts")
      const isRecent = ts && (Date.now() - parseInt(ts)) < 30 * 60 * 1000 // 30 min window
      if (isRecent) {
        const backup = localStorage.getItem("zt_parent_login_schools")
        if (backup) {
          const parsed = JSON.parse(backup)
          if (Array.isArray(parsed) && parsed.length > 0) return parsed
        }
      }
    } catch { /* ignore */ }
    // 2 — React context
    if (availableSchools && availableSchools.length > 0) return availableSchools
    // 3 — Standard key fallback
    try {
      const stored = localStorage.getItem("available_schools")
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch { /* ignore */ }
    return []
  })()

  // Show loading spinner during initialization
  if (isInitializing || (authLoading && displaySchools.length === 0)) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse font-bold">Syncing your schools...</p>
        <p className="text-[10px] text-muted-foreground/50 mt-2 uppercase tracking-widest">Checking secure storage</p>
      </div>
    )
  }

  // Error state: still no schools after initialization
  if (!displaySchools || displaySchools.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-none shadow-xl">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-6 h-6 text-amber-600" />
            </div>
            <CardTitle className="text-2xl font-bold">No Schools Found</CardTitle>
            <CardDescription>
              We couldn&apos;t find any schools linked to your account.
              {currentUser?.id && (
                <><br /><span className="text-[10px] opacity-60">ID: {currentUser.id.substring(0, 8)}</span></>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button
              onClick={() => window.location.reload()}
              className="w-full rounded-xl gap-2 font-bold uppercase text-xs tracking-widest bg-emerald-600 hover:bg-emerald-500"
            >
              <RotateCw className="w-3 h-3" /> Retry Sync
            </Button>
            <Button variant="outline" onClick={handleLogout} className="w-full rounded-xl">
              <LogOut className="mr-2 h-4 w-4" /> Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success: show the school selection grid
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <GraduationCap className="h-12 w-12 text-emerald-600 mx-auto" />
          <h1 className="text-3xl font-black tracking-tight">Select a School</h1>
          <p className="text-slate-500">
            Welcome back{currentUser?.name ? `, ${currentUser.name}` : ""}.
            <br />
            <span className="text-xs">Please select the school you want to access.</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displaySchools.map((school: any) => (
            <Card
              key={school.id}
              className="group relative overflow-hidden border-2 border-slate-200 dark:border-white/5 hover:border-emerald-500/50 transition-all cursor-pointer shadow-sm hover:shadow-xl active:scale-[0.98] bg-white dark:bg-slate-900"
              onClick={() => handleSelectSchool(school.id)}
            >
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div className="h-20 w-20 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-white/10 group-hover:bg-emerald-50 transition-colors">
                  {school.logo ? (
                    <img src={school.logo} alt={school.name} className="h-full w-full object-contain p-2" />
                  ) : (
                    <GraduationCap className="h-10 w-10 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  )}
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-black text-lg leading-tight">{school.name}</h3>
                  {school.customSchoolId && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase tracking-widest">
                      {school.customSchoolId}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  className="w-full rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors font-bold text-xs uppercase tracking-widest"
                  disabled={switchingId !== null}
                >
                  {switchingId === school.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <>Access Portal <ArrowRight className="ml-2 h-4 w-4" /></>
                  }
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center pt-4">
          <Button
            variant="link"
            onClick={handleLogout}
            className="text-slate-400 hover:text-rose-500 transition-colors text-xs uppercase tracking-widest"
          >
            Log out and use a different account
          </Button>
        </div>
      </div>
    </div>
  )
}
