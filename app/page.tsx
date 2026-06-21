"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { AuthWrapper } from "@/components/auth/auth-wrapper"
import { Header } from "@/components/layout/header"
import { Navigation } from "@/components/layout/navigation"
import { Dashboard } from "@/components/school/dashboard"
import { StudentManagement } from "@/components/school/student-management"
import { TeacherManagement } from "@/components/school/teacher-management"
import { AttendanceTracking } from "@/components/school/attendance-tracking"
import { Reports } from "@/components/school/reports"
import { Settings } from "@/components/school/settings"
import { OfflineIndicator } from "@/components/layout/offline-indicator"
import { SyncManager } from "@/components/system/sync-manager"
import { authService } from "@/lib/auth/auth"
import { TeacherAssignmentManagement } from "@/components/school/teacher-assignment-management"
import { UserProfile } from "@/components/school/user-profile"
import { ErrorBoundary } from "@/components/system/error-boundary"



export default function Home() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const registerServiceWorker = async () => {
      if ("serviceWorker" in navigator) {
        try {
          const host = window.location.hostname
          console.log("[v0] Registering service worker:", host)

          const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
            updateViaCache: "none",
          })

          console.log("[v0] Service worker registered successfully:", registration)

          setInterval(() => {
            registration.update()
          }, 60000)
        } catch (error: any) {
          console.error("[v0] Service worker registration error:", error?.message || error)
        }
      }
    }

    registerServiceWorker()
  }, [])

  useEffect(() => {
    // Check authentication status
    const initializeApp = async () => {
      const authenticated = authService.isAuthenticated()
      setIsAuthenticated(authenticated)

      if (authenticated) {
        const user = authService.getCurrentUser()
        console.log("[RedirectDebug] app/page.tsx authenticated user:", user?.role, "schoolId:", user?.schoolId)
      }

      setIsLoading(false)
    }

    initializeApp()
  }, [])

  const handleAuthSuccess = (userData?: any) => {
    setIsAuthenticated(true)
    const user = userData || authService.getCurrentUser()
    console.log(`[RootPage] handleAuthSuccess | userId: ${user?.id} | role: ${user?.role}`)
    
    if (user?.role === "admin" || user?.role === 'school_admin' || user?.role === 'school-admin') {
      if (user?.onboardingCompleted === false) {
        console.log(`[RootPage] Admin onboarding incomplete — redirecting to /onboarding`)
        router.push("/onboarding")
      } else {
        console.log(`[RootPage] School admin — redirecting to /school/admin`)
        router.push("/school/admin")
      }
    } else if (user?.role === "teacher") {
      console.log(`[RootPage] Teacher — redirecting to /school/teacher`)
      router.push("/school/teacher")
    } else if (user?.role === "super_admin") {
      console.log(`[RootPage] Super admin — redirecting to /super-admin`)
      router.push("/super-admin")
    } else if (user?.role === "parent") {
      console.log(`[RootPage] Parent — redirecting to /parent/dashboard`)
      router.push("/parent/dashboard")
    } else {
       if (user?.onboardingCompleted === false) {
         router.push("/onboarding")
       } else {
         router.push("/school/admin")
       }
    }
  }


  useEffect(() => {
    // If already authenticated and setup is complete, redirect to dashboard.
    if (typeof window !== "undefined" && isAuthenticated && !isLoading) {
      const user = authService.getCurrentUser()
      const availableStr = localStorage.getItem("available_schools")
      const schools = availableStr ? JSON.parse(availableStr) : []
      const xSchoolId = localStorage.getItem("x-school-id")

      console.log(`[RootPage] Root redirect | userId: ${user?.id} | role: ${user?.role} | multiSchool: ${schools.length > 1}`)
      
      // If multiple schools and haven't explicitly picked one (or just to be safe)
      if (schools.length > 1 && !xSchoolId) {
        router.replace("/auth/school-select")
        return
      }

      if (user?.role === "super_admin") {
        router.replace("/super-admin")
      } else if (user?.role === "teacher") {
        router.replace("/school/teacher")
      } else if (user?.role === "parent") {
        router.replace("/parent/dashboard")
      } else {
        // Default fallback for admin or other staff roles
        if (user?.onboardingCompleted === false) {
          router.replace("/onboarding")
        } else {
          router.replace("/school/admin")
        }
      }
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AuthWrapper onAuthSuccess={handleAuthSuccess} />
  }



  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}


