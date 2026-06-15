"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from "react"

import { apiUrl } from "@/lib/api-config"
const API_URL = apiUrl;

export interface School {
  id: string
  name: string
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
}

const SchoolContext = createContext<SchoolContextValue | null>(null)

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("attendance_token") : null
  const schoolId = typeof window !== "undefined" ? localStorage.getItem("x-school-id") : null
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`
  if (schoolId) headers["x-school-id"] = schoolId
  return headers
}

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [activeSchool, setActiveSchool] = useState<School | null>(null)
  const [availableSchools, setAvailableSchools] = useState<School[]>([])
  const [isLoadingSchool, setIsLoadingSchool] = useState(false)

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("active_school")
      const schoolsStored = localStorage.getItem("available_schools")
      if (stored) setActiveSchool(JSON.parse(stored))
      if (schoolsStored) setAvailableSchools(JSON.parse(schoolsStored))
    } catch {}
  }, [])

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
   * Returns true on success, false on failure (e.g. no child in school).
   */
  const switchSchool = useCallback(async (schoolId: string): Promise<boolean> => {
    setIsLoadingSchool(true)
    try {
      const res = await fetch(`${API_URL}/api/parent/me/active-school`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ schoolId }),
      })

      if (!res.ok) return false

      const result = await res.json()
      if (!result.success) return false

      const school: School = result.data
      setActiveSchool(school)
      localStorage.setItem("active_school", JSON.stringify(school))
      localStorage.setItem("x-school-id", school.id)

      // Dispatch event so all components (layout, pages) react
      window.dispatchEvent(new CustomEvent("schoolSwitched", { detail: school }))
      return true
    } catch {
      return false
    } finally {
      setIsLoadingSchool(false)
    }
  }, [])

  /** Fetch fresh school list from backend (used on page refresh) */
  const refreshSchools = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/parent/me/schools`, {
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
