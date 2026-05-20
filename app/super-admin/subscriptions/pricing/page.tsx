"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DynamicPriceCalculator } from "@/components/super-admin/dynamic-price-calculator"
import { parseJsonResponse } from "@/lib/utils/parse-json-response"
import { TIER_CONFIG } from "@/lib/utils/pricing-utils"
import type { TierPlan } from "@/lib/utils/subscription-types"
import { ChevronLeft, Plus, Trash2 } from "lucide-react"
import { ADDON_CATALOG } from "@/lib/utils/pricing-utils"

const TIERS: TierPlan[] = ["starter", "standard", "premium", "enterprise"]

export default function SubscriptionPricingPage() {
  const [overrides, setOverrides] = useState<Partial<Record<TierPlan, number>>>({})
  const [addonOverrides, setAddonOverrides] = useState<any[]>([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    ;(async () => {
      const res = await fetch("/api/super-admin/pricing-config")
      const json = await parseJsonResponse<{ 
        success: boolean; 
        data: { 
          overrides: Partial<Record<TierPlan, number>>,
          addonOverrides: any[] 
        } 
      }>(res)
      if (json.success) {
        setOverrides(json.data.overrides || {})
        setAddonOverrides(json.data.addonOverrides || [])
      }
    })()
  }, [])

  const save = async () => {
    const res = await fetch("/api/super-admin/pricing-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tierBaseOverrides: overrides }),
    })
    const json = await parseJsonResponse<any>(res)
    if (json.success) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const saveAddon = async (id: string, monthlyFlat: number) => {
    const res = await fetch("/api/super-admin/pricing-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addonOverride: { id, monthlyFlat } }),
    })
    const json = await parseJsonResponse<any>(res)
    if (json.success) {
      setAddonOverrides(json.data.addonOverrides)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/super-admin/subscriptions">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Subscriptions
          </Link>
        </Button>
      </div>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Pricing management</h1>
        <p className="text-muted-foreground mt-1">Edit per-student rates and preview quotes with the live calculator.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tier base rates ($ / student / month)</CardTitle>
          <CardDescription>Overrides apply to new calculations across the platform (mock store).</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TIERS.map((t) => (
            <div key={t} className="space-y-2">
              <Label>{TIER_CONFIG[t].label}</Label>
              <Input
                type="number"
                step="0.01"
                value={overrides[t] ?? TIER_CONFIG[t].basePerStudentMonth}
                onChange={(e) =>
                  setOverrides((prev) => ({
                    ...prev,
                    [t]: Number(e.target.value),
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">{TIER_CONFIG[t].description}</p>
            </div>
          ))}
        </CardContent>
        <CardContent className="flex items-center gap-3">
          <Button onClick={save}>{saved ? "Saved" : "Save pricing"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Optional add-ons (monthly flat rates)</CardTitle>
          <CardDescription>Configure pricing for additional features.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(ADDON_CATALOG).map(([id, def]) => {
            const override = addonOverrides.find((o) => o.id === id)
            return (
              <div key={id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 border border-border rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium">{def.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {def.perUnit ? `Per ${def.unitLabel ?? "unit"}` : "Flat rate"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Rate ($)</Label>
                  <Input
                    className="w-32 h-9"
                    type="number"
                    defaultValue={override?.monthlyFlat ?? def.monthlyFlat}
                    onBlur={(e) => saveAddon(id, Number(e.target.value))}
                  />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <DynamicPriceCalculator />
    </div>
  )
}

