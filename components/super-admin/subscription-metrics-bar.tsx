"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { parseJsonResponse } from "@/lib/utils/parse-json-response"
import { TrendingUp, CreditCard, AlertTriangle, Clock, Users } from "lucide-react"

interface Metrics {
  totalRevenue: number
  monthlyRevenue: number
  mrr: number
  activeSubscriptions: number
  expiringSoon: number
  pendingPayment: number
  suspended: number
  subscriptionGrowthPercent: number
}

export function SubscriptionMetricsBar() {
  const [m, setM] = useState<Metrics | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/super-admin/subscription-metrics")
        const json = await parseJsonResponse<{ success: boolean; data: Metrics }>(res)
        if (json.success) setM(json.data)
        else setErr("Could not load metrics")
      } catch {
        setErr("Could not load metrics")
      }
    })()
  }, [])

  if (err || !m) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6 h-24 bg-muted/30 rounded-lg" />
          </Card>
        ))}
      </div>
    )
  }

  const items = [
    { label: "Total Revenue (billed)", value: `$${m.totalRevenue.toLocaleString()}`, hint: "All-time completed", icon: CreditCard },
    { label: "MRR (estimated)", value: `$${m.mrr.toLocaleString()}`, hint: "From active + trial", icon: TrendingUp },
    { label: "Active + Trial", value: String(m.activeSubscriptions), hint: "Subscriptions", icon: Users },
    { label: "Attention", value: String(m.expiringSoon + m.pendingPayment + m.suspended), hint: "Expiring / pending / suspended", icon: AlertTriangle },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Card key={item.label} className="border-border/80 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="typography-helper text-muted-foreground uppercase">{item.label}</p>
                  <p className="typography-page-title text-foreground mt-1">{item.value}</p>
                  <p className="typography-helper text-muted-foreground mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.hint}
                  </p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

