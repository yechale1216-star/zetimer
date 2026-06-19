"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { authService, User } from "@/lib/auth/auth"
import { getApiUrl } from "@/lib/api-config"
import { useRouter, usePathname } from "next/navigation"
import { clearMessageCache } from "@/lib/utils/message-cache"

// Key used to mark that a fresh login just occurred — validateSession must
// not overwrite the login-confirmed role with path-inferred stale data.
const FRESH_LOGIN_KEY = "_zt_fresh_login"

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
    if (isClient) {
      const prevUser = authService.getCurrentUser()
      console.log(`[AuthContext][LOGOUT] User: ${prevUser?.id} | Role: ${prevUser?.role} | Email: ${prevUser?.email}`)
      // Clear the fresh-login marker so the next validateSession runs fully
      localStorage.removeItem(FRESH_LOGIN_KEY)
      localStorage.removeItem("_zt_login_role")
    }
    authService.logout()
    // Clear offline message cache on logout
    clearMessageCache().catch(() => {})
    // Immediately wipe ALL in-memory React state so no stale data
    // can leak into the next user's session
    setUser(null)
    setFeatures(null)
    setAuthLoading(false)
    setPermissionsLoading(false)
    setError(null)
    console.log("[AuthContext][LOGOUT] Complete — all React state cleared")
  }, [isClient])

  const validateSession = useCallback(async () => {
    if (!isClient) return

    const token = localStorage.getItem("attendance_token")
    const cachedUserStr = localStorage.getItem("attendance_current_user")
    const cachedFeaturesStr = localStorage.getItem("attendance_features")

    if (!token || !cachedUserStr) {
      // No credentials found, user is unauthenticated
      console.log("[AuthContext][validateSession] No token/user in storage — unauthenticated")
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
      console.warn("[AuthContext][validateSession] Failed to parse cached user — logging out")
      logout()
      return
    }

    console.log(`[AuthContext][validateSession] START | userId: ${currentUser?.id} | role: ${currentUser?.role} | email: ${currentUser?.email}`)

    // FRESH LOGIN GUARD:
    // If a fresh login just happened, we already have the correct, server-confirmed
    // role stored in localStorage by the login API. We must NOT let path-based
    // role inference (x-requested-role from the current URL) overwrite it.
    // We flag this with FRESH_LOGIN_KEY which is set by the login flow and cleared
    // once validateSession has run once post-login.
    const isFreshLogin = localStorage.getItem(FRESH_LOGIN_KEY) === "1"
    const freshLoginRole = localStorage.getItem("_zt_login_role") || ""
    if (isFreshLogin) {
      console.log(`[AuthContext][validateSession] Fresh login detected — preserving confirmed role: ${freshLoginRole}`)
      // Clear the marker so future validate calls work normally
      localStorage.removeItem(FRESH_LOGIN_KEY)
      localStorage.removeItem("_zt_login_role")
      // Null-safety guard (currentUser is always set here, but TypeScript needs explicit confirmation)
      if (!currentUser) {
        setAuthLoading(false)
        setPermissionsLoading(false)
        return
      }
      // Use the cached user (which has the correct role from login) and
      // set React state immediately without hitting the profile endpoint.
      setUser(currentUser)
      setAuthLoading(false)

      // Still need to load features
      if (currentUser.role === "super_admin" || currentUser.role === "parent") {
        setFeatures([])
        localStorage.setItem("attendance_features", JSON.stringify([]))
        setPermissionsLoading(false)
        return
      }

      const schoolIdForFeatures = currentUser.schoolId
      if (!schoolIdForFeatures) {
        setFeatures([])
        setPermissionsLoading(false)
        return
      }

      try {
        const featRes = await fetch(`${getApiUrl()}/api/subscriptions/schools/${schoolIdForFeatures}/features`, {
          headers: { "Authorization": `Bearer ${token}` }
        })
        if (featRes.ok) {
          const featJson = await featRes.json()
          if (featJson.success && Array.isArray(featJson.data)) {
            setFeatures(featJson.data)
            localStorage.setItem("attendance_features", JSON.stringify(featJson.data))
          } else {
            setFeatures([])
          }
        } else {
          setFeatures([])
        }
      } catch {
        setFeatures(cachedFeaturesStr ? JSON.parse(cachedFeaturesStr) : [])
      } finally {
        setPermissionsLoading(false)
      }
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

      // Situational Role Inference — only apply when NOT on a login/neutral page
      // so that navigating to a portal updates the role correctly
      const currentPath = typeof window !== "undefined" ? window.location.pathname : pathname
      if (currentPath.startsWith('/parent')) {
        headers["x-requested-role"] = 'parent';
      } else if (currentPath.startsWith('/school/teacher')) {
        headers["x-requested-role"] = 'teacher';
      } else if (currentPath.startsWith('/school/admin')) {
        headers["x-requested-role"] = 'school_admin';
      } else if (currentPath.startsWith('/super-admin')) {
        headers["x-requested-role"] = 'super_admin';
      }

      console.log(`[AuthContext][validateSession] Fetching profile | path: ${currentPath} | x-requested-role: ${headers['x-requested-role'] || 'none'}`)
      const profileRes = await fetch(`${getApiUrl()}/api/users/profile`, { headers })

      if (profileRes.status === 401) {
        console.warn("[AuthContext][validateSession] Token invalid (401) — logging out")
        logout()
        return
      }

      if (!profileRes.ok) {
        throw new Error(`Profile fetch returned status ${profileRes.status}`)
      }

      const profileJson = await profileRes.json()
      if (profileJson.success && profileJson.data) {
        const dbUser = profileJson.data

        // ROLE PROTECTION: if the DB returns a different role than what the user
        // currently has AND they are on a neutral/login page, preserve the cached role.
        // The role should only change when the user is navigating a specific portal path.
        const currentPath2 = typeof window !== "undefined" ? window.location.pathname : pathname
        const isOnNeutralPage = !currentPath2.startsWith('/parent') &&
          !currentPath2.startsWith('/school/teacher') &&
          !currentPath2.startsWith('/school/admin') &&
          !currentPath2.startsWith('/super-admin')

        let resolvedRole = dbUser.role || currentUser!.role
        if (isOnNeutralPage && currentUser!.role && dbUser.role && currentUser!.role !== dbUser.role) {
          console.warn(`[AuthContext][validateSession] Role mismatch on neutral page — preserving cached role '${currentUser!.role}' over DB role '${dbUser.role}'`)
          resolvedRole = currentUser!.role
        }

        if (currentUser!.role && dbUser.role && currentUser!.role !== dbUser.role) {
          console.warn(`[AuthContext][validateSession] Role: cached='${currentUser!.role}' db='${dbUser.role}' resolved='${resolvedRole}'`)
        }

        const updatedUser: User = {
          ...currentUser!,
          name: dbUser.full_name || dbUser.name || currentUser!.name,
          email: dbUser.email || currentUser!.email,
          phone: dbUser.phone || currentUser!.phone || "",
          profile_photo: dbUser.profile_photo || currentUser!.profile_photo || "",
          role: resolvedRole,
          schoolId: dbUser.schoolId || dbUser.school_id || currentUser!.schoolId,
          schoolName: dbUser.schoolName || currentUser!.schoolName || "",
          schoolLogo: dbUser.schoolLogo || currentUser!.schoolLogo || "",
          onboardingCompleted: dbUser.onboardingCompleted ?? currentUser!.onboardingCompleted
        }

        console.log(`[AuthContext][validateSession] Profile loaded | userId: ${updatedUser.id} | finalRole: ${updatedUser.role}`)
        setUser(updatedUser)
        localStorage.setItem("attendance_current_user", JSON.stringify(updatedUser))
        if (updatedUser.schoolId) {
          localStorage.setItem("x-school-id", updatedUser.schoolId)
        }
        currentUser = updatedUser
      } else {
        throw new Error("Profile API returned success: false")
      }
    } catch (err) {
      console.warn("[AuthContext][validateSession] Profile fetch failed:", err)
      if (!navigator.onLine) {
        console.log("[AuthContext][validateSession] Offline — using cached user")
        setUser(currentUser)
      } else {
        setUser(currentUser)
        setError("Network/Server error during session validation. Please retry.")
      }
    } finally {
      setAuthLoading(false)
    }

    // 2. Fetch permissions / features
    if (currentUser) {
      if (currentUser.role === "super_admin" || currentUser.role === "parent") {
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
        console.log(`[AuthContext][validateSession] Fetching features for school: ${schoolId}`)
        const featRes = await fetch(`${getApiUrl()}/api/subscriptions/schools/${schoolId}/features`, {
          headers: { "Authorization": `Bearer ${token}` }
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
        console.warn("[AuthContext][validateSession] Features fetch failed:", err)
        if (!navigator.onLine) {
          if (cachedFeaturesStr) {
            try {
              setFeatures(JSON.parse(cachedFeaturesStr))
              console.log("[AuthContext][validateSession] Offline — using cached features")
            } catch {
              setFeatures([])
            }
          } else {
            setFeatures([])
          }
          setError(null)
        } else {
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
  }, [isClient, logout, pathname])

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
