"use client"

import React from "react"
import { AlertTriangle, Clock, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useSubscription } from "@/lib/context/subscription-context"

export function TrialBanner() {
  const { subscription, loading } = useSubscription()

  if (loading) return null

  const status = subscription?.status ?? null
  if (status !== "trial" && status !== "expired") return null

  let daysRemaining = 0
  if (subscription?.trialEndsAt) {
    const ends = new Date(subscription.trialEndsAt)
    const diffMs = ends.getTime() - Date.now()
    daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  }

  const isExpired = status === "expired" || daysRemaining <= 0

  return (
    <div className={`w-full px-4 py-3 text-sm font-medium flex flex-col sm:flex-row items-center justify-center sm:justify-between shadow-sm z-50 relative ${isExpired ? "bg-red-50 text-red-900 border-b border-red-200" : "bg-blue-50 text-blue-900 border-b border-blue-200"}`}>
      <div className="flex items-center gap-3 mb-2 sm:mb-0 text-center sm:text-left">
        {isExpired ? (
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 hidden sm:block" />
        ) : (
          <Clock className="w-5 h-5 text-blue-600 shrink-0 hidden sm:block" />
        )}
        <span>
          {isExpired
            ? "Your free trial has expired. Upgrade your plan to restore full access and increase student capacity."
            : `You have ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} left in your free trial.`}
        </span>
      </div>
      <Link href="/school/admin/subscription/upgrade" className="w-full sm:w-auto">
        <Button size="sm" variant={isExpired ? "destructive" : "default"} className="w-full sm:w-auto gap-2 h-8 whitespace-nowrap">
          Upgrade Now <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </Link>
    </div>
  )
}
