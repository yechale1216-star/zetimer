'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Sparkles, Loader2 } from 'lucide-react'
import { getApiUrl } from '@/lib/api-config'
import type { TierPlan, BillingPeriod } from '@/lib/utils/subscription-types'
import { cn } from '@/lib/utils/utils'

interface DBPlan {
  id: string
  name: string
  slug: string
  description: string | null
  pricePerStudentMonthly: number
  pricePerStudentSemester: number
  pricePerStudentYearly: number
  monthlyTotal: number
  semesterTotal: number
  yearlyTotal: number
  maxStudents: number
  maxUsers: number
  isActive: boolean
}

interface PricingCardsProps {
  currentTier: TierPlan
  studentCount: number
  billingPeriod: BillingPeriod
  onSelectTier: (tier: TierPlan) => void
  isLoading?: boolean
}

const PERIOD_MONTHS: Record<BillingPeriod, number> = {
  monthly: 1,
  semester: 6,
  yearly: 12,
}

// Per-plan static feature bullets that supplement the DB data
const PLAN_FEATURES: Record<string, string[]> = {
  free:         ["14-day full trial", "Up to 50 students", "Basic attendance", "Mobile app access"],
  starter:      ["Student attendance tracking", "Parent portal", "Basic reports", "2 admin users"],
  standard:     ["Everything in Starter", "Session-based attendance", "Grade analytics", "Teacher portal", "CSV exports"],
  premium:      ["Everything in Standard", "Advanced analytics", "Priority support", "API access"],
  enterprise:   ["Everything in Premium", "Unlimited users", "Dedicated account manager", "Custom SLA"],
}

export function PricingCards({ currentTier, studentCount, billingPeriod, onSelectTier, isLoading }: PricingCardsProps) {
  const [plans, setPlans] = useState<DBPlan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const token = localStorage.getItem('attendance_token')
        const res = await fetch(`${getApiUrl()}/api/subscriptions/plans`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const json = await res.json()
        if (json.success) {
          setPlans(json.data.filter((p: DBPlan) => p.isActive))
        }
      } catch (err) {
        console.error('[PricingCards] Failed to load plans:', err)
      } finally {
        setLoadingPlans(false)
      }
    }
    fetchPlans()
  }, [])

  const getPlanPrice = (plan: DBPlan) => {
    const months = PERIOD_MONTHS[billingPeriod]
    if (billingPeriod === 'monthly')  return plan.monthlyTotal  || (plan.pricePerStudentMonthly  * Math.max(studentCount, 1))
    if (billingPeriod === 'semester') return plan.semesterTotal || (plan.pricePerStudentSemester * Math.max(studentCount, 1) * 6)
    return plan.yearlyTotal || (plan.pricePerStudentYearly * Math.max(studentCount, 1) * 12)
  }

  const getMonthlyRate = (plan: DBPlan) => {
    const months = PERIOD_MONTHS[billingPeriod]
    return Math.round(getPlanPrice(plan) / months)
  }

  if (loadingPlans) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading plans...</p>
        </div>
      </div>
    )
  }

  if (plans.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-20" />
        <p className="text-sm">No active plans found. Please contact your administrator.</p>
      </div>
    )
  }

  return (
    <div className={`grid gap-6 ${plans.length <= 3 ? 'md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
      {plans.map((plan) => {
        const isCurrent = currentTier === plan.slug
        const isEnterprise = plan.maxStudents === -1
        const total = getPlanPrice(plan)
        const monthly = getMonthlyRate(plan)
        const features = PLAN_FEATURES[plan.slug] ?? []
        const exceedsLimit = !isEnterprise && studentCount > plan.maxStudents

        return (
          <Card
            key={plan.id}
            className={cn(
              "relative flex flex-col transition-all duration-300 shadow-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl active:scale-[0.98] hover:scale-[1.02] cursor-pointer",
              "border border-transparent hover:border-primary hover:ring-2 hover:ring-primary/20 hover:shadow-lg hover:shadow-primary/20 dark:hover:shadow-primary/10",
              isCurrent
                ? "ring-2 ring-primary border-primary/50 shadow-md bg-white/60 dark:bg-slate-900/60"
                : "border-slate-200/60 dark:border-slate-800",
              exceedsLimit && "opacity-60"
            )}
            onClick={() => !isCurrent && !isLoading && onSelectTier(plan.slug as TierPlan)}
          >
            {isCurrent && (
              <div className="absolute -top-3 left-0 right-0 flex justify-center z-10">
                <Badge className="typography-label bg-primary text-primary-foreground text-[10px] uppercase px-3 py-1 shadow-sm">
                  Current Plan
                </Badge>
              </div>
            )}

            <CardHeader className={cn("pb-4 pt-4 border-b border-slate-200/60 dark:border-slate-800/60", isCurrent && "pt-6")}>
              <CardTitle className="typography-section-title">{plan.name}</CardTitle>
              <CardDescription className="typography-label min-h-[40px] uppercase opacity-70 mt-2">
                {plan.description || `Up to ${isEnterprise ? 'unlimited' : plan.maxStudents.toLocaleString()} students`}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 pb-3 pt-4 space-y-3">
              {/* Price */}
              <div className="flex items-baseline gap-1 mb-2">
                {isEnterprise ? (
                  <span className="typography-page-title">Custom</span>
                ) : (
                  <>
                    <span className="typography-page-title">{monthly.toLocaleString('en-ET', { maximumFractionDigits: 0 })}</span>
                    <span className="typography-card-title text-primary ml-1">ETB</span>
                    <span className="typography-label text-[10px] uppercase text-muted-foreground ml-1">/ mo</span>
                  </>
                )}
              </div>

              {/* Billing total */}
              {!isEnterprise && billingPeriod !== 'monthly' && (
                <div className="typography-label text-[10px] uppercase text-muted-foreground bg-slate-100/50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                  Billed{' '}
                  <span className="text-foreground font-bold">
                    {total.toLocaleString('en-ET', { maximumFractionDigits: 0 })} ETB
                  </span>{' '}
                  {billingPeriod === 'yearly' ? 'annually' : 'per semester'}
                </div>
              )}

              {/* Over-limit warning */}
              {exceedsLimit && (
                <p className="text-[11px] text-destructive font-bold">
                  ⚠ Exceeds limit of {plan.maxStudents.toLocaleString()} students
                </p>
              )}

              {/* Features */}
              <ul className="typography-body space-y-1.5 text-sm">
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-primary shrink-0 mr-3 mt-0.5" />
                  <span>
                    Up to <strong className="typography-label">{isEnterprise ? 'Unlimited' : plan.maxStudents.toLocaleString()}</strong> students
                  </span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-primary shrink-0 mr-3 mt-0.5" />
                  <span>
                    {isEnterprise ? 'Unlimited' : plan.maxUsers.toLocaleString()} user{plan.maxUsers !== 1 ? 's' : ''}
                  </span>
                </li>
                {features.map((f, i) => (
                  <li key={i} className="flex items-start">
                    <Check className="h-4 w-4 text-primary shrink-0 mr-3 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="pt-2 pb-4">
              <Button
                className="typography-label w-full rounded-xl uppercase h-10 transition-all shadow-md active:scale-95"
                variant={isCurrent ? 'outline' : 'default'}
                disabled={isCurrent || isLoading}
                onClick={() => onSelectTier(plan.slug as TierPlan)}
              >
                {(() => {
                  if (isCurrent) return 'Current Plan'
                  if (isEnterprise) return 'Contact Sales'
                  
                  const tierOrder: TierPlan[] = ['free', 'starter', 'standard', 'premium', 'enterprise']
                  const currentIdx = tierOrder.indexOf(currentTier)
                  const planIdx = tierOrder.indexOf(plan.slug as TierPlan)
                  
                  if (planIdx < currentIdx) return 'Downgrade Plan'
                  return 'Upgrade Plan'
                })()}
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
