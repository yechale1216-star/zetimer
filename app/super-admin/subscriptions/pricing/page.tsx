"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DynamicPriceCalculator } from "@/components/super-admin/dynamic-price-calculator"
import { getApiUrl } from "@/lib/auth/auth"
import { ChevronLeft, ExternalLink, Loader2 } from "lucide-react"

interface DBAddon {
  id: string
  name: string
  monthlyFlat: number
  perUnit: boolean
  unitLabel: string | null
  isActive: boolean
}

export default function SubscriptionPricingPage() {
  const [addons, setAddons] = useState<DBAddon[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAddons = async () => {
      try {
        const token = localStorage.getItem("attendance_token")
        const res = await fetch(`${getApiUrl()}/api/subscriptions/addons`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const json = await res.json()
        if (json.success) {
          setAddons(json.data.filter((a: DBAddon) => a.isActive))
        }
      } catch (err) {
        console.error("Failed to fetch addons:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchAddons()
  }, [])

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
        <h1 className="text-2xl md:text-3xl font-bold">Pricing & Calculator</h1>
        <p className="text-muted-foreground mt-1">
          Preview quotes with the live calculator. Pricing is managed directly in your catalog.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Plans Management */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base text-primary">Plan management</CardTitle>
            <CardDescription>
              Configure pricing per student, billing cycles, and student limits for each subscription tier.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="gap-2 w-full">
              <Link href="/super-admin/subscriptions?tab=plans">
                <ExternalLink className="w-4 h-4" />
                Go to Plan Manager
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Addons Management */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Add-on management</CardTitle>
            <CardDescription>
              Create and edit optional add-ons like SMS packages, white labeling, and storage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="gap-2 w-full">
              <Link href="/super-admin/subscriptions?tab=features">
                <ChevronLeft className="w-4 h-4 rotate-180" />
                Add-on Manager (Features Tab)
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Add-ons reference */}
      <Card>
        <CardHeader>
          <CardTitle>Live add-on catalog reference</CardTitle>
          <CardDescription>
            Current monthly rates for optional services applied in the calculator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading addons...</span>
            </div>
          ) : addons.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No active add-ons found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {addons.map((addon) => (
                <div key={addon.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{addon.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      {addon.perUnit ? `Per ${addon.unitLabel ?? "unit"}` : "Flat monthly rate"}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-foreground">{Number(addon.monthlyFlat).toLocaleString()} ETB/mo</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live calculator */}
      <DynamicPriceCalculator />
    </div>
  )
}
