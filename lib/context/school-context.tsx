"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from "react"
import { useAuth } from "./auth-context"
import { apiUrl } from "@/lib/api-config"
const API_URL = apiUrl;

export interface School {
  id: string
  name: string
  role?: string // Contextual role
  logo: string
  customSchoolId: string
}

interface SchoolContextValue {
  activeSchool: School | null
  availableSchools: School[]
  isLoadingSchool: boolean
  switchSchool: (schoolId: string) => Promise<boolean>
  setSchoolsFromLogin: (schools: School[], initialSchoolId?: string) => void
  clearSchoolContext: () => void
  refreshSchools: () => Promise<void>
}

const SchoolContext = createContext<SchoolContextValue | null>(null)

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("attendance_token") : null
  const schoolId = typeof window !== "undefined" ? localStorage.getItem("x-school-id") : null
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`
  if (schoolId) headers["x-school-id"] = schoolId

  // Situational Role Inference (Frontend)
  if (typeof window !== "undefined") {
    const pathname = window.location.pathname;
    if (pathname.startsWith('/parent')) headers["x-requested-role"] = 'parent';
    else if (pathname.startsWith('/school/teacher')) headers["x-requested-role"] = 'teacher';
    else if (pathname.startsWith('/school/admin')) headers["x-requested-role"] = 'school_admin';
    else if (pathname.startsWith('/super-admin')) headers["x-requested-role"] = 'super_admin';
  }
  
  return headers
}

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [activeSchool, setActiveSchool] = useState<School | null>(null)
  const [availableSchools, setAvailableSchools] = useState<School[]>([])
  const [isLoadingSchool, setIsLoadingSchool] = useState(false)
  const { validateSession, user } = useAuth()

  // Restore from localStorage on mount and on switch events
  const loadStoredData = useCallback(() => {
    try {
      const stored = localStorage.getItem("active_school")
      const schoolsStored = localStorage.getItem("available_schools")
      if (stored) setActiveSchool(JSON.parse(stored))
      if (schoolsStored) setAvailableSchools(JSON.parse(schoolsStored))
    } catch {}
  }, [])

  useEffect(() => {
    loadStoredData()
    window.addEventListener("schoolSwitched", loadStoredData)
    return () => window.removeEventListener("schoolSwitched", loadStoredData)
  }, [loadStoredData])

  /** Called immediately after login with the list of schools from the login response */
  const setSchoolsFromLogin = useCallback((schools: School[], initialSchoolId?: string) => {
    setAvailableSchools(schools)
    localStorage.setItem("available_schools", JSON.stringify(schools))

    const initial = schools.find(s => s.id === initialSchoolId) || schools[0]
    if (initial) {
      setActiveSchool(initial)
      localStorage.setItem("active_school", JSON.stringify(initial))
      localStorage.setItem("x-school-id", initial.id)
    }
  }, [])

  /**
   * Switch the active school — validates with the backend first.
   * Returns true on success.
   */
  const switchSchool = useCallback(async (schoolId: string): Promise<boolean> => {
    setIsLoadingSchool(true)
    try {
      const res = await fetch(`${API_URL}/api/users/me/active-school`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ schoolId }),
      })

      if (!res.ok) {
        // Fallback or retry?
        return false
      }

      const result = await res.json()
      if (!result.success) return false

      const school: School = result.data
      setActiveSchool(school)
      localStorage.setItem("active_school", JSON.stringify(school))
      localStorage.setItem("x-school-id", school.id)

      // CRITICAL: Re-validate session to update role in AuthContext
      await validateSession()

      // Dispatch event so all components reaction
      window.dispatchEvent(new CustomEvent("schoolSwitched", { detail: school }))
      return true
    } catch (err) {
      console.error("[switchSchool] Error:", err)
      return false
    } finally {
      setIsLoadingSchool(false)
    }
  }, [validateSession])

  /** Fetch fresh school list from backend (used on page refresh) */
  const refreshSchools = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/me/schools`, {
        headers: getAuthHeaders(),
      })
      if (!res.ok) return
      const result = await res.json()
      if (result.success) {
        setAvailableSchools(result.data)
        localStorage.setItem("available_schools", JSON.stringify(result.data))
      }
    } catch {}
  }, [])

  const clearSchoolContext = useCallback(() => {
    setActiveSchool(null)
    setAvailableSchools([])
    localStorage.removeItem("active_school")
    localStorage.removeItem("available_schools")
    localStorage.removeItem("x-school-id")
  }, [])

  return (
    <SchoolContext.Provider
      value={{
        activeSchool,
        availableSchools,
        isLoadingSchool,
        switchSchool,
        setSchoolsFromLogin,
        clearSchoolContext,
        refreshSchools
      }}
    >
      {children}
    </SchoolContext.Provider>
  )
}

export function useSchool() {
  const ctx = useContext(SchoolContext)
  if (!ctx) throw new Error("useSchool must be used within SchoolProvider")
  return ctx
}
