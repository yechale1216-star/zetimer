"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { TIER_CONFIG } from "@/lib/utils/pricing-utils"
import { parseJsonResponse } from "@/lib/utils/parse-json-response"
import { CreditCard, Calendar, Users, ArrowUpRight } from "lucide-react"
import Link from "next/link"

interface Props {
  schoolId: string
}

export function SchoolSubscriptionTab({ schoolId }: Props) {
  const [sub, setSub] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`/api/subscriptions/school/${schoolId}`)
        const json = await parseJsonResponse<any>(res)
        if (json.success) setSub(json.data)
      } catch (err) {
        console.error("Failed to load school subscription:", err)
      } finally {
        setLoading(false)
      }
    })()
  }, [schoolId])

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading subscription details...</div>

  if (!sub) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-10 pb-10 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-lg">No active subscription</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              This school does not have an active subscription plan assigned yet.
            </p>
          </div>
          <Button asChild>
            <Link href="/super-admin/subscriptions">Assign a plan</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const tierInfo = TIER_CONFIG[sub.tier as keyof typeof TIER_CONFIG]
  const studentLimit = tierInfo?.maxStudentsSoft || 0
  const studentCount = sub.studentCount || 0
  const usagePercent = studentLimit > 0 ? (studentCount / studentLimit) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold capitalize">{sub.tier}</p>
                <p className="text-xs text-muted-foreground capitalize">{sub.billingPeriod} billing</p>
              </div>
              <Badge variant={sub.status === 'active' ? 'default' : 'outline'} className="capitalize">
                {sub.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Student Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold">{studentCount}</p>
                <p className="text-xs text-muted-foreground">Limit: {studentLimit === Number.POSITIVE_INFINITY ? 'Unlimited' : studentLimit}</p>
              </div>
              <Progress value={usagePercent} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Next Renewal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{sub.renewalDate}</p>
            <p className="text-xs text-muted-foreground">Auto-renews: Yes</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Billing summary</CardTitle>
              <CardDescription>Most recent transactions and charges.</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/super-admin/subscriptions/${sub.id}`}>
                Full details
                <ArrowUpRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Effective monthly rate</span>
              <span className="font-semibold">${sub.effectiveMonthly?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Total period amount</span>
              <span className="font-semibold">${sub.currentPeriodTotal?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Applied discount</span>
              <span className="text-green-600 font-medium">-{sub.discountPercent || 0}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

