'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { parseJsonResponse } from '@/lib/utils/parse-json-response'
import { PricingCards } from '@/components/subscription/pricing-cards'
import type { TierPlan, BillingPeriod } from '@/lib/utils/subscription-types'
import { recommendPlanUpgrade } from '@/lib/utils/pricing-utils'
import { authService } from '@/lib/auth/auth'

export default function UpgradePlanPage() {
  const [currentTier, setCurrentTier] = useState<TierPlan>('starter')
  const [studentCount, setStudentCount] = useState(0)
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchSubscription()
  }, [])

  const fetchSubscription = async () => {
    try {
      const user = authService.getCurrentUser()
      const schoolId = user?.schoolId || 's1' // fallback for demo/dev
      const res = await fetch(`/api/subscriptions/school/${schoolId}`)
      const json = await parseJsonResponse<any>(res)
      if (json.success) {
        const subData = json.data
        setCurrentTier(subData.tier || 'standard')
        setStudentCount(subData.studentCount ?? 0)
        setBillingPeriod(subData.billingPeriod || 'monthly')
      } else {
        setError(json.error || 'Failed to load subscription')
      }
    } catch (err) {
      console.error('[v0] Error fetching subscription:', err)
      setError('Failed to load subscription')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTier = async (newTier: TierPlan) => {
    router.push(`/school/admin/subscription/payment-method?tier=${newTier}&period=${billingPeriod}`)
  }

  const handleBillingPeriodChange = async (newPeriod: BillingPeriod) => {
    setBillingPeriod(newPeriod)
    // Optional: Auto-save billing period or require user to confirm
    // For this implementation, we just update the local state to see the new pricing
    // The user will confirm via selecting a tier, or we can add a 'Save Billing Preferences' button.
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6 flex flex-col items-center justify-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <p className="text-destructive font-medium">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const recommendation = recommendPlanUpgrade(currentTier, studentCount)

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Recommendation Alert */}
      {recommendation.suggestedTier && (
        <Card className="border-none shadow-sm bg-primary/10 backdrop-blur-md rounded-2xl border border-primary/20">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
            <div className="p-2.5 bg-primary/20 rounded-xl">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-primary">Upgrade Recommended</CardTitle>
              <CardDescription className="text-primary/80 mt-1 font-bold text-xs uppercase tracking-widest">{recommendation.reason}</CardDescription>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Select your plan</h2>
          <p className="text-muted-foreground mt-1">Scale your features as your school grows.</p>
        </div>

        <div className="bg-secondary/50 p-1 rounded-xl inline-flex w-max shadow-inner">
          <RadioGroup 
            defaultValue={billingPeriod} 
            onValueChange={(val) => handleBillingPeriodChange(val as BillingPeriod)}
            className="flex items-center space-x-0 gap-1"
          >
            {['monthly', 'semester', 'yearly'].map((period) => (
              <div key={period}>
                <RadioGroupItem value={period} id={period} className="sr-only" />
                <Label
                  htmlFor={period}
                  className={`px-4 py-2 rounded-lg cursor-pointer transition-all ${
                    billingPeriod === period
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <span className="capitalize">{period}</span>
                  {period === 'semester' && <span className="ml-1.5 text-xs text-green-500 font-semibold">-10%</span>}
                  {period === 'yearly' && <span className="ml-1.5 text-xs text-green-500 font-semibold">-20%</span>}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </div>

      {/* Pricing Cards */}
      <PricingCards
        currentTier={currentTier}
        studentCount={studentCount}
        billingPeriod={billingPeriod}
        onSelectTier={handleSelectTier}
        isLoading={updating}
      />

    </div>
  )
}

