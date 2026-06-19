"use client"

import React, { useEffect } from "react"
import { useAuth } from "@/lib/context/auth-context"
import { useSchool } from "@/lib/context/school-context"
import { useRouter, usePathname } from "next/navigation"
import { PageSkeleton } from "@/components/ui/page-skeleton"
import { Button } from "@/components/ui/button"
import { AlertCircle, RotateCw, ShieldAlert } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, authLoading, permissionsLoading, error, validateSession, logout } = useAuth()
  const { availableSchools } = useSchool()
  const router = useRouter()
  const pathname = usePathname()

  const isLoading = authLoading || permissionsLoading

  // Helper: get the correct home dashboard for a role
  const getDashboardForRole = (role: string): string => {
    if (role === "super_admin") return "/super-admin"
    if (role === "teacher") return "/school/teacher"
    if (role === "parent") return "/parent/dashboard"
    if (role === "admin" || role === "school_admin") return "/school/admin"
    return "/login"
  }

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      console.log(`[AuthGuard] No user — redirecting to /login from ${pathname}`)
      router.replace("/login")
      return
    }

    console.log(`[AuthGuard] Check | userId: ${user.id} | role: ${user.role} | path: ${pathname} | allowedRoles: ${allowedRoles?.join(",") || "any"}`)

    if (allowedRoles) {
      const isCurrentlyAuthorized = allowedRoles.includes(user.role);
      
      if (!isCurrentlyAuthorized) {
        // CHECK IF POTENTIALLY AUTHORIZED:
        // The current role in AuthContext might be 'teacher' but we're on a '/parent' page.
        // If the user has a 'parent' membership for this school, we should NOT redirect.
        // instead, we wait for validateSession to refresh the situational role.
        const hasPotentialRole = availableSchools.some(m => 
          m.id === user.schoolId && allowedRoles.includes(m.role || '')
        );

        if (hasPotentialRole) {
          console.log(`[AuthGuard] Role mismatch ('${user.role}'), but user has potential role in school. Waiting for session sync...`);
          return; // Stay on the page, the situational role will settle
        }

        // TRULY UNAUTHORIZED: redirect to the correct dashboard for this user's role
        const correctDashboard = getDashboardForRole(user.role)
        console.warn(`[AuthGuard] Role '${user.role}' not in [${allowedRoles.join(",")}] for path '${pathname}'. Redirecting to: ${correctDashboard}`)
        router.replace(correctDashboard)
      }
    }
  }, [user, isLoading, allowedRoles, router, pathname, availableSchools])

  // 1. Show skeleton during startup, reconnect, refresh, token validation
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-6xl w-full space-y-6">
          <div className="flex items-center gap-3 justify-center mb-6">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span className="text-sm font-semibold text-muted-foreground">Securing session...</span>
          </div>
          <PageSkeleton variant="dashboard" />
        </div>
      </div>
    )
  }

  // 2. If token is invalid or missing, redirect is already running via useEffect
  if (!user) {
    return null
  }

  // 3. If role is unauthorized, show loading while redirect runs
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Redirecting to authorized dashboard...</p>
        </div>
      </div>
    )
  }

  // 4. If permissions fetch failed (and we are online but server is broken), show error/retry state.
  // Never fall back to defaults or show the screen when permissions are required but failed.
  if (error && user.role !== "super_admin" && user.role !== "parent") {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md w-full text-center space-y-6 p-8 bg-card rounded-3xl border border-destructive/20 shadow-2xl">
          <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center text-destructive">
            <AlertCircle className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">Permission Fetch Failed</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {error}
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => validateSession()} className="w-full flex items-center justify-center gap-2">
              <RotateCw className="w-4 h-4" />
              Retry Verification
            </Button>
            <Button variant="outline" onClick={() => logout()} className="w-full">
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Everything confirmed and authorized
  return <>{children}</>
}

interface PermissionGuardProps {
  children: React.ReactNode
  requiredFeature: string
  fallback?: React.ReactNode
}

export function PermissionGuard({ children, requiredFeature, fallback }: PermissionGuardProps) {
  const { features, permissionsLoading } = useAuth()

  if (permissionsLoading) {
    return <PageSkeleton variant="dashboard" />
  }

  const hasAccess = features && features.includes(requiredFeature)

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-foreground">Access Restricted</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            This feature requires the '{requiredFeature.replace(/_/g, " ")}' subscription permission which is not enabled for your school.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
