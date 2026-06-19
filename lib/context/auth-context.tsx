"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { authService, User } from "@/lib/auth/auth"
import { getApiUrl } from "@/lib/api-config"
import { useRouter, usePathname } from "next/navigation"
import { clearMessageCache } from "@/lib/utils/message-cache"

interface AuthContextValue {
  user: User | null
  features: string[] | null
  authLoading: boolean
  permissionsLoading: boolean
  error: string | null
  isOnline: boolean
  validateSession: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [features, setFeatures] = useState<string[] | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [permissionsLoading, setPermissionsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const wasOfflineRef = useRef(false)
  const router = useRouter()
  const pathname = usePathname()

  const isClient = typeof window !== "undefined"

  // Update online status from browser
  useEffect(() => {
    if (!isClient) return
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      wasOfflineRef.current = true
      console.log("[AuthContext] Connection recovered: online")
    }

    const handleOffline = () => {
      setIsOnline(false)
      console.log("[AuthContext] Connection lost: offline")
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [isClient])

  const logout = useCallback(() => {
    authService.logout()
    if (isClient) {
      localStorage.removeItem("attendance_features")
    }
    // Clear offline message cache on logout
    clearMessageCache().catch(() => {})
    setUser(null)
    setFeatures(null)
    setAuthLoading(false)
    setPermissionsLoading(false)
    setError(null)
  }, [isClient])

  const validateSession = useCallback(async () => {
    if (!isClient) return

    const token = localStorage.getItem("attendance_token")
    const cachedUserStr = localStorage.getItem("attendance_current_user")
    const cachedFeaturesStr = localStorage.getItem("attendance_features")

    if (!token || !cachedUserStr) {
      // No credentials found, user is unauthenticated
      setUser(null)
      setFeatures(null)
      setAuthLoading(false)
      setPermissionsLoading(false)
      return
    }

    let currentUser: User | null = null
    try {
      currentUser = JSON.parse(cachedUserStr)
    } catch {
      logout()
      return
    }

    setAuthLoading(true)
    setPermissionsLoading(true)
    setError(null)

    // 1. Verify / fetch profile from backend
    try {
      const schoolId = localStorage.getItem("x-school-id") || currentUser?.schoolId || ""
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
      if (schoolId) {
        headers["x-school-id"] = schoolId
      }

      // Situational Role Inference
      if (pathname.startsWith('/parent')) {
        headers["x-requested-role"] = 'parent';
      } else if (pathname.startsWith('/school/teacher')) {
        headers["x-requested-role"] = 'teacher';
      } else if (pathname.startsWith('/school/admin')) {
        headers["x-requested-role"] = 'school_admin';
      } else if (pathname.startsWith('/super-admin')) {
        headers["x-requested-role"] = 'super_admin';
      }

      console.log("[AuthContext] Fetching user profile from backend...")
      const profileRes = await fetch(`${getApiUrl()}/api/users/profile`, { headers })

      if (profileRes.status === 401) {
        console.warn("[AuthContext] Token validation failed (401). Logging out.")
        logout()
        return
      }

      if (!profileRes.ok) {
        throw new Error(`Profile fetch returned status ${profileRes.status}`)
      }

      const profileJson = await profileRes.json()
      if (profileJson.success && profileJson.data) {
        const dbUser = profileJson.data
        const updatedUser: User = {
          ...currentUser!,
          name: dbUser.full_name || dbUser.name || currentUser!.name,
          email: dbUser.email || currentUser!.email,
          phone: dbUser.phone || currentUser!.phone || "",
          profile_photo: dbUser.profile_photo || currentUser!.profile_photo || "",
          // Critical: preserve existing role if DB returns something suspicious or generic
          role: dbUser.role || currentUser!.role,
          // Always take schoolId from the fresh profile if available — this is
          // what closes the race window after onboarding completes.
          schoolId: dbUser.schoolId || dbUser.school_id || currentUser!.schoolId,
          schoolName: dbUser.schoolName || currentUser!.schoolName || "",
          schoolLogo: dbUser.schoolLogo || currentUser!.schoolLogo || "",
          onboardingCompleted: dbUser.onboardingCompleted ?? currentUser!.onboardingCompleted
        }
        
        // Log if role changed unexpectedly
        if (currentUser!.role && dbUser.role && currentUser!.role !== dbUser.role) {
          console.warn(`[AuthContext] User role changed from ${currentUser!.role} to ${dbUser.role} during validation`);
        }

        setUser(updatedUser)
        localStorage.setItem("attendance_current_user", JSON.stringify(updatedUser))
        // Always re-sync x-school-id from the validated profile so the fallback
        // path in BaseDatabase.getSchoolId() is always authoritative, never stale.
        if (updatedUser.schoolId) {
          localStorage.setItem("x-school-id", updatedUser.schoolId)
        }
        currentUser = updatedUser
      } else {
        throw new Error("Profile API returned success: false")
      }
    } catch (err) {
      console.warn("[AuthContext] Profile fetch failed:", err)
      if (!navigator.onLine) {
        // Offline: Fall back to cached user details
        console.log("[AuthContext] Offline. Using cached user profile details.")
        setUser(currentUser)
      } else {
        // Online, but server failed (e.g. 500 or DB connection error)
        // Set error but keep cached user so they don't get fully logged out, but we fail permissions guard
        setUser(currentUser)
        setError("Network/Server error during session validation. Please retry.")
      }
    } finally {
      setAuthLoading(false)
    }

    // 2. Fetch permissions / features
    if (currentUser) {
      if (currentUser.role === "super_admin" || currentUser.role === "parent") {
        // Super admins and Parents do not have subscription/feature restrictions in the same way
        setFeatures([])
        localStorage.setItem("attendance_features", JSON.stringify([]))
        setPermissionsLoading(false)
        return
      }

      const schoolId = currentUser.schoolId
      if (!schoolId) {
        setFeatures([])
        setPermissionsLoading(false)
        return
      }

      try {
        console.log(`[AuthContext] Fetching features for school: ${schoolId}`)
        const featRes = await fetch(`${getApiUrl()}/api/subscriptions/schools/${schoolId}/features`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })

        if (!featRes.ok) {
          throw new Error(`Features fetch returned status ${featRes.status}`)
        }

        const featJson = await featRes.json()
        if (featJson.success && Array.isArray(featJson.data)) {
          setFeatures(featJson.data)
          localStorage.setItem("attendance_features", JSON.stringify(featJson.data))
          setError(null)
        } else {
          throw new Error("Features API returned success: false")
        }
      } catch (err) {
        console.warn("[AuthContext] Features fetch failed:", err)
        if (!navigator.onLine) {
          // Offline: use cached features
          if (cachedFeaturesStr) {
            try {
              setFeatures(JSON.parse(cachedFeaturesStr))
              console.log("[AuthContext] Offline. Using cached school features.")
            } catch {
              setFeatures([])
            }
          } else {
            setFeatures([])
          }
          setError(null)
        } else {
          // Online but API failed (e.g. 500)
          setFeatures(null)
          setError("Failed to verify school permissions. Please retry.")
        }
      } finally {
        setPermissionsLoading(false)
      }
    } else {
      setFeatures(null)
      setPermissionsLoading(false)
    }
  }, [isClient, logout])

  // Initial session validation on mount
  useEffect(() => {
    validateSession()
  }, [validateSession])

  // Re-validate when network recovers from offline state
  // Use a ref to track offline->online transition to avoid stale closures
  // Re-validate when network recovers from offline state
  useEffect(() => {
    if (!isOnline) return
    if (!wasOfflineRef.current) return
    wasOfflineRef.current = false
    console.log("[AuthContext] Network recovered from offline. Re-validating session...")
    validateSession()
  }, [isOnline, validateSession])

  // Sync session changes from other tabs or service-level updates
  useEffect(() => {
    const handleSessionChange = () => {
      console.log("[AuthContext] Session changed event detected. Syncing local user...");
      const cached = localStorage.getItem("attendance_current_user")
      if (cached) {
        try {
          setUser(JSON.parse(cached))
        } catch (e) {
          console.error("[AuthContext] Failed to parse session change data", e)
        }
      }
    }

    // When onboarding completes, run a FULL re-validation (profile + features from backend).
    // This prevents any stale features or schoolId from being used during the first
    // Dashboard render after the wizard completes.
    const handleOnboardingCompleted = () => {
      console.log("[AuthContext] Onboarding completed — running full session re-validation...")
      validateSession()
    }

    window.addEventListener("userSessionChanged", handleSessionChange)
    window.addEventListener("storage", handleSessionChange) // Support cross-tab sync too
    window.addEventListener("onboardingCompleted", handleOnboardingCompleted)
    return () => {
      window.removeEventListener("userSessionChanged", handleSessionChange)
      window.removeEventListener("storage", handleSessionChange)
      window.removeEventListener("onboardingCompleted", handleOnboardingCompleted)
    }
  }, [validateSession])

  return (
    <AuthContext.Provider
      value={{
        user,
        features,
        authLoading,
        permissionsLoading,
        error,
        isOnline,
        validateSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
