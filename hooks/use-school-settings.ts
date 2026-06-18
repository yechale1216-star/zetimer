"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/db/database"
import { useAuth } from "@/lib/context/auth-context"

export function useSchoolSettings() {
  const [settings, setSettings] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Gate on confirmed schoolId from AuthContext so we never fetch
  // another school's settings when x-school-id is stale in localStorage.
  const { user: authUser } = useAuth()
  const confirmedSchoolId = authUser?.schoolId || ""

  useEffect(() => {
    if (!confirmedSchoolId) {
      setIsLoading(false)
      return
    }
    loadSettings()
  }, [confirmedSchoolId])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      const currentSettings = await db.getSettings()
      setSettings(currentSettings)
    } catch (error) {
      console.error("Error loading school settings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return { settings, isLoading }
}
