"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/db/database"

export function useSchoolSettings() {
  const [settings, setSettings] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
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

