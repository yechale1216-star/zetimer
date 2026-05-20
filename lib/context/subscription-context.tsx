"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { authService } from "@/lib/auth/auth"
import { parseJsonResponse } from "@/lib/utils/parse-json-response"

export interface SubscriptionData {
  id: string
  schoolId: string
  tier: string
  billingPeriod: string
  studentCount: number
  status: string
  billingStart: string
  billingEnd: string
  renewalDate: string
  effectiveMonthly?: number
  currentPeriodTotal?: number
  trialEndsAt?: string
  isTrial?: boolean
  [key: string]: any
}

interface SubscriptionContextValue {
  subscription: SubscriptionData | null
  loading: boolean
  error: string | null
  /** Manually re-fetch (e.g. after payment or status change) */
  refresh: () => void
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  subscription: null,
  loading: true,
  error: null,
  refresh: () => {},
})

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const user = authService.getCurrentUser()
      const schoolId = user?.schoolId || "s1" // fallback for demo/dev

      const res = await fetch(`/api/subscriptions/school/${schoolId}`)
      if (!res.ok) {
        if (res.status === 404) {
          setSubscription(null)
          return
        }
        throw new Error(`HTTP ${res.status}`)
      }
      const json = await parseJsonResponse<{ success: boolean; data?: any; error?: string }>(res)
      if (json.success && json.data) {
        setSubscription(json.data as SubscriptionData)
      } else {
        setError(json.error || "Failed to load subscription")
      }
    } catch (err) {
      console.error("[SubscriptionContext] fetch error:", err)
      setError("Failed to load subscription")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  return (
    <SubscriptionContext.Provider
      value={{ subscription, loading, error, refresh: fetchSubscription }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

/** Use anywhere inside the School Admin layout to access subscription data without re-fetching */
export function useSubscription(): SubscriptionContextValue {
  return useContext(SubscriptionContext)
}
