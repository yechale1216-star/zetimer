"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSchool, School } from "@/lib/context/school-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GraduationCap, ArrowRight, Loader2, LogOut } from "lucide-react"
import { authService } from "@/lib/auth/auth"
import { notifications } from "@/lib/utils/notifications"

export default function SchoolSelectPage() {
  const router = useRouter()
  const { availableSchools, switchSchool } = useSchool()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [switchingId, setSwitchingId] = useState<string | null>(null)

  useEffect(() => {
    // Check if logged in
    const user = authService.getCurrentUser()
    if (!user || user.role !== "parent") {
      router.push("/login")
      return
    }
    setCurrentUser(user)

    // Check if schools are available in context (restored from localStorage)
    // availableSchools is populated by SchoolProvider from localStorage
  }, [router])

  const handleSelectSchool = async (schoolId: string) => {
    setSwitchingId(schoolId)
    const success = await switchSchool(schoolId)
    if (success) {
      notifications.success("School Selected", "Redirecting to your dashboard...")
      router.push("/parent/dashboard")
    } else {
      setSwitchingId(null)
      notifications.error("Selection Failed", "Could not switch to this school. Please try again.")
    }
  }

  const handleLogout = () => {
    authService.logout()
    router.push("/login")
  }

  // If no schools found after a moment, maybe refresh or logout
  if (!availableSchools || availableSchools.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-none shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">No Schools Found</CardTitle>
            <CardDescription>
              We couldn't find any schools associated with your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button variant="outline" onClick={handleLogout} className="w-full rounded-xl">
              <LogOut className="mr-2 h-4 w-4" /> Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <GraduationCap className="h-12 w-12 text-emerald-600 mx-auto" />
          <h1 className="text-3xl font-bold tracking-tight">Select a School</h1>
          <p className="text-muted-foreground">
            Welcome back, {currentUser?.name}. Please select the school you want to access today.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableSchools.map((school) => (
            <Card 
              key={school.id}
              className="group relative overflow-hidden border-2 border-transparent hover:border-emerald-500/50 transition-all cursor-pointer shadow-md hover:shadow-xl active:scale-[0.98]"
              onClick={() => handleSelectSchool(school.id)}
            >
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div className="h-20 w-20 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center overflow-hidden border border-emerald-100 dark:border-emerald-800">
                  {school.logo ? (
                    <img src={school.logo} alt={school.name} className="h-full w-full object-contain p-2" />
                  ) : (
                    <GraduationCap className="h-10 w-10 text-emerald-600" />
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg leading-tight">{school.name}</h3>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{school.customSchoolId}</p>
                </div>
                <Button 
                  variant="ghost" 
                  className="w-full rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors"
                  disabled={switchingId !== null}
                >
                  {switchingId === school.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Access Portal <ArrowRight className="ml-2 h-4 w-4" /></>}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button variant="link" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
            Log out and use a different account
          </Button>
        </div>
      </div>
    </div>
  )
}
