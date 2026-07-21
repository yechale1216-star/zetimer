"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/db/database"
import { useAuth } from "@/lib/context/auth-context"
import { queryCache } from "@/lib/utils/query-cache"

export function useSchoolSettings() {
  const { user: authUser } = useAuth()
  const confirmedSchoolId = authUser?.schoolId || ""

  // Seed state synchronously from query cache (0ms load on warm runs)
  const [settings, setSettings] = useState<any>(() => {
    if (!confirmedSchoolId) return null
    return queryCache.get<any>(`settings_${confirmedSchoolId}`) ?? null
  })
  const [isLoading, setIsLoading] = useState(!settings)

  useEffect(() => {
    if (!confirmedSchoolId) {
      setIsLoading(false)
      return
    }

    // If we already have cached settings in state, don't show a loading spinner
    const cached = queryCache.get<any>(`settings_${confirmedSchoolId}`)
    if (cached && !settings) setSettings(cached)

    const loadSettings = async () => {
      try {
        if (!cached) setIsLoading(true)
        const currentSettings = await db.getSettings()
        setSettings(currentSettings)
      } catch (error) {
        console.error("Error loading school settings:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [confirmedSchoolId])

  return { settings, isLoading }
}
