"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { TIER_CONFIG, recommendPlanUpgrade } from "@/lib/utils/pricing-utils"
import type { TierPlan } from "@/lib/utils/subscription-types"
import { ArrowLeft, FileText, PauseCircle, PlayCircle, Sparkles, PlusCircle } from "lucide-react"
import { parseJsonResponse } from "@/lib/utils/parse-json-response"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function SubscriptionDetailView() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/subscriptions/${id}`)
      const json = await parseJsonResponse<any>(res)
      if (json.success) setData(json.data)
      else setData(null)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/subscriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const json = await parseJsonResponse<any>(res)
    if (json.success) await load()
  }

  const generateInvoice = async () => {
    const res = await fetch("/api/super-admin/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionId: id }),
    })
    await parseJsonResponse(res)
    await load()
  }

  const addAdjustment = async (amount: number, type: string, description: string) => {
    const res = await fetch("/api/super-admin/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscriptionId: id,
        schoolId: data.schoolId,
        amount,
        type,
        description,
      }),
    })
    await parseJsonResponse(res)
    await load()
  }

  if (loading) {
    return (
      <div className="p-6 text-muted-foreground animate-pulse">Loading subscription…</div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-destructive">Subscription not found.</p>
        <Button variant="outline" asChild>
          <Link href="/super-admin/subscriptions">Back to list</Link>
        </Button>
      </div>
    )
  }

  const sub = data
  const tier = sub.tier as TierPlan
  const reco = recommendPlanUpgrade(tier, sub.studentCount ?? sub.userCount)

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/super-admin/subscriptions")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Subscriptions
        </Button>
        <Separator orientation="vertical" className="h-6 hidden sm:block" />
        <h1 className="text-2xl font-bold">{sub.school?.name ?? "School"}</h1>
        <Badge variant="outline" className="capitalize">
          {String(sub.status).replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tier & billing</CardTitle>
            <CardDescription>Product plan and cadence</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tier</span>
              <span className="font-medium">{TIER_CONFIG[tier]?.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Billing</span>
              <span className="font-medium capitalize">{sub.billingPeriod ?? sub.plan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Students</span>
              <span className="font-medium">{sub.studentCount ?? sub.userCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span className="font-medium">{sub.discountPercent ?? 0}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current charge model</CardTitle>
            <CardDescription>Dynamic total for this period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between text-lg font-semibold">
              <span>Period total</span>
              <span>${(sub.priceBreakdown?.total ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Effective monthly</span>
              <span>${(sub.priceBreakdown?.effectiveMonthly ?? 0).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Super admin actions</CardTitle>
            <CardDescription>Suspend, resume, invoice</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="secondary" className="w-full gap-2" onClick={generateInvoice}>
              <FileText className="w-4 h-4" />
              Generate invoice
            </Button>
            {sub.status === "suspended" ? (
              <Button className="w-full gap-2" onClick={() => patch({ status: "active" })}>
                <PlayCircle className="w-4 h-4" />
                Resume subscription
              </Button>
            ) : (
              <Button variant="destructive" className="w-full gap-2" onClick={() => patch({ status: "suspended" })}>
                <PauseCircle className="w-4 h-4" />
                Suspend subscription
              </Button>
            )}
            <Button 
              variant="outline" 
              className="w-full gap-2" 
              onClick={() => {
                const amt = prompt("Amount (negative for credit):")
                const msg = prompt("Reason/Description:")
                if (amt && msg) addAdjustment(Number(amt), Number(amt) < 0 ? "credit" : "adjustment", msg)
              }}
            >
              <PlusCircle className="w-4 h-4" />
              Manual adjustment
            </Button>
          </CardContent>
        </Card>
      </div>

      {reco.suggestedTier && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Sparkles className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-base">Upgrade recommendation</CardTitle>
              <CardDescription>{reco.reason}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button size="sm" variant="outline" onClick={() => patch({ tier: reco.suggestedTier })}>
              Move to {TIER_CONFIG[reco.suggestedTier as TierPlan].label}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Billing history</CardTitle>
            <CardDescription>Posted charges</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(sub.billingHistory || []).map((b: any) => (
              <div key={b.id} className="flex justify-between text-sm border-b border-border/60 py-2 last:border-0">
                <div>
                  <p className="font-medium">${b.amount}</p>
                  <p className="text-muted-foreground text-xs">{b.description}</p>
                </div>
                <span className="text-xs text-muted-foreground">{b.date}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoices & transactions</CardTitle>
            <CardDescription>Platform ledger</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Invoices</p>
              {(sub.invoices || []).map((inv: any) => (
                <div key={inv.id} className="flex justify-between text-sm py-1">
                  <span>{inv.number}</span>
                  <span className="font-medium">${inv.amount}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Transactions</p>
              {(sub.transactions || []).map((t: any) => (
                <div key={t.id} className="flex justify-between text-sm py-1">
                  <span className="capitalize">{t.type}</span>
                  <span className={t.amount < 0 ? "text-green-600" : ""}>${t.amount}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

