"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
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

  const handleAuthSuccess = () => {
    setIsAuthenticated(true)
    const user = authService.getCurrentUser()
    console.log("[RedirectDebug] handleAuthSuccess user:", user?.role)
    
    if (user?.role === "admin") {
      window.location.href = "/school/admin"
    } else if (user?.role === "teacher") {
      window.location.href = "/school/teacher"
    } else if (user?.role === "super_admin") {
      window.location.href = "/super-admin"
    }
  }


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

  // If already authenticated and setup is complete, redirect to dashboard.
  if (typeof window !== "undefined") {
    const user = authService.getCurrentUser()
    console.log("[RedirectDebug] app/page.tsx root redirect triggered for role:", user?.role)
    if (user?.role === "super_admin") {
      window.location.replace("/super-admin")
    } else if (user?.role === "teacher") {
      window.location.replace("/school/teacher")
    } else {
      window.location.replace("/school/admin")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}


