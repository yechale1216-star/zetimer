'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './auth-context'
import { apiUrl } from '@/lib/api-config'

export interface SuspensionState {
  isSuspended: boolean
  suspendedAt: string | null      // ISO date string
  suspendReason: string | null
  isLoading: boolean
  refetch: () => void
}

const SuspensionContext = createContext<SuspensionState>({
  isSuspended: false,
  suspendedAt: null,
  suspendReason: null,
  isLoading: true,
  refetch: () => {},
})

export function SuspensionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [isSuspended, setIsSuspended] = useState(false)
  const [suspendedAt, setSuspendedAt] = useState<string | null>(null)
  const [suspendReason, setSuspendReason] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const check = useCallback(async () => {
    try {
      let activeSchoolId = user?.schoolId
      if (typeof window !== "undefined") {
        const storedXId = localStorage.getItem("x-school-id")
        if (storedXId) {
          activeSchoolId = storedXId
        }
      }

      if (!activeSchoolId || user?.role === "super_admin") {
        setIsSuspended(false)
        setIsLoading(false)
        return
      }
      const token = localStorage.getItem("attendance_token")
      const res = await fetch(`${apiUrl}/api/schools/${activeSchoolId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const json = await res.json()
      const data = json.data ?? json
      if (data?.subscriptionStatus === "SUSPENDED") {
        setIsSuspended(true)
        setSuspendedAt(data.suspendedAt ?? null)
        setSuspendReason(data.suspendReason ?? null)
      } else {
        setIsSuspended(false)
        setSuspendedAt(null)
        setSuspendReason(null)
      }
    } catch { /* silent */ }
    finally { setIsLoading(false) }
  }, [user])

  useEffect(() => {
    check()
    const handleEvent = () => check()
    if (typeof window !== "undefined") {
      window.addEventListener("schoolSwitched", handleEvent)
      window.addEventListener("studentChanged", handleEvent)
      window.addEventListener("storage", handleEvent)
      return () => {
        window.removeEventListener("schoolSwitched", handleEvent)
        window.removeEventListener("studentChanged", handleEvent)
        window.removeEventListener("storage", handleEvent)
      }
    }
  }, [check])

  return (
    <SuspensionContext.Provider value={{ isSuspended, suspendedAt, suspendReason, isLoading, refetch: check }}>
      {children}
    </SuspensionContext.Provider>
  )
}

export const useSuspension = () => useContext(SuspensionContext)
