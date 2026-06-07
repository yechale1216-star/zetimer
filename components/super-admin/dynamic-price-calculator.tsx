"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ADDON_CATALOG, TIER_CONFIG } from "@/lib/utils/pricing-utils"
import type { AddonId, AddonSelection, BillingPeriod, TierPlan } from "@/lib/utils/subscription-types"
import { parseJsonResponse } from "@/lib/utils/parse-json-response"

const TIERS: TierPlan[] = ["starter", "standard", "premium", "enterprise"]
const PERIODS: BillingPeriod[] = ["monthly", "semester", "yearly"]
const ADDON_IDS = Object.keys(ADDON_CATALOG) as AddonId[]

export function DynamicPriceCalculator() {
  const [students, setStudents] = useState(250)
  const [tier, setTier] = useState<TierPlan>("standard")
  const [billing, setBilling] = useState<BillingPeriod>("monthly")
  const [discount, setDiscount] = useState(0)
  const [addons, setAddons] = useState<Record<AddonId, { on: boolean; qty: number }>>(() => {
    const init = {} as Record<AddonId, { on: boolean; qty: number }>
    for (const id of ADDON_IDS) init[id] = { on: false, qty: 1 }
    return init
  })
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const addonPayload: AddonSelection[] = useMemo(() => {
    const out: AddonSelection[] = []
    for (const id of ADDON_IDS) {
      const a = addons[id]
      if (a?.on) out.push(ADDON_CATALOG[id].perUnit ? { id, quantity: a.qty } : { id })
    }
    return out
  }, [addons])

  useEffect(() => {
    const timer = setTimeout(() => {
      run()
    }, 400)
    return () => clearTimeout(timer)
  }, [students, tier, billing, discount, addonPayload])

  const run = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/subscriptions/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentCount: students,
          tier,
          billingPeriod: billing,
          addons: addonPayload,
          discountPercent: discount,
        }),
      })
      const json = await parseJsonResponse<any>(res)
      setResult(json.calculation)
    } catch {
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle>Dynamic pricing calculator</CardTitle>
        <CardDescription>Live quote based on tier, billing period, active students, add-ons, and discounts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Active students</Label>
            <Input type="number" min={1} max={50000} value={students} onChange={(e) => setStudents(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Product tier</Label>
            <select
              className="typography-body w-full h-10 rounded-md border border-input bg-background px-3"
              value={tier}
              onChange={(e) => setTier(e.target.value as TierPlan)}
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {TIER_CONFIG[t].label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Billing period</Label>
            <select
              className="typography-body w-full h-10 rounded-md border border-input bg-background px-3"
              value={billing}
              onChange={(e) => setBilling(e.target.value as BillingPeriod)}
            >
              {PERIODS.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Platform discount %</Label>
            <Input type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
          </div>
        </div>

        <div className="space-y-3">
          <Label>Optional add-ons</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ADDON_IDS.map((id) => (
              <div key={id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={addons[id].on}
                    onCheckedChange={(on) => setAddons((prev) => ({ ...prev, [id]: { ...prev[id], on } }))}
                  />
                  <span className="typography-label">{ADDON_CATALOG[id].name}</span>
                </div>
                {ADDON_CATALOG[id].perUnit && addons[id].on && (
                  <Input
                    className="w-20 h-8"
                    type="number"
                    min={1}
                    value={addons[id].qty}
                    onChange={(e) =>
                      setAddons((prev) => ({
                        ...prev,
                        [id]: { ...prev[id], qty: Math.max(1, Number(e.target.value)) },
                      }))
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {loading && !result && (
          <div className="h-40 flex items-center justify-center text-muted-foreground animate-pulse">
            Fetching quote…
          </div>
        )}

        {result && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <Badge variant="secondary">Volume discount: {result.volumeDiscountPercent}%</Badge>
              {result.upgrade?.suggestedTier && (
                <Badge variant="outline">Upgrade: {result.upgrade.suggestedTier}</Badge>
              )}
            </div>
            <p className="typography-body text-muted-foreground">{result.upgrade?.reason}</p>
            <div className="space-y-1">
              {result.lineItems?.map((row: { label: string; amount: number }, i: number) => (
                <div key={i} className="typography-body flex justify-between">
                  <span>{row.label}</span>
                  <span className="typography-label">ETB {row.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="typography-card-title flex justify-between border-t border-border pt-3">
              <span>Total ({result.billingMonths} mo)</span>
              <span>ETB {result.total?.toLocaleString()}</span>
            </div>
            <p className="typography-body text-muted-foreground">Effective monthly: ETB {result.effectiveMonthly?.toLocaleString()}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

