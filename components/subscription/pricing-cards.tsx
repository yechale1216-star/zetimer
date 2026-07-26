'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Sparkles, Loader2, AlertTriangle, Zap, Clock, Users, GraduationCap } from 'lucide-react'
import { getApiUrl } from '@/lib/api-config'
import type { TierPlan, BillingPeriod } from '@/lib/utils/subscription-types'
import { cn } from '@/lib/utils/utils'

interface DBPlanFeature {
  feature: {
    id: string
    key: string
    name: string
    description: string | null
  }
}

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
  trialDays: number
  isActive: boolean
  sortOrder: number
  features: DBPlanFeature[]
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

const PERIOD_DISCOUNT: Record<BillingPeriod, number> = {
  monthly: 0,
  semester: 10,
  yearly: 20,
}

// No static fallback — DB is the single source of truth.
// maxStudents, maxUsers and trialDays are already shown from DB fields directly.

/** Compute the total price for the selected billing period using per-student DB rates */
function getPlanPrice(plan: DBPlan, studentCount: number, billingPeriod: BillingPeriod): number {
  const count = Math.max(studentCount, 1)
  const months = PERIOD_MONTHS[billingPeriod]

  if (billingPeriod === 'monthly') {
    // prefer flat total if set, otherwise per-student rate × count
    return plan.monthlyTotal > 0
      ? plan.monthlyTotal
      : plan.pricePerStudentMonthly * count
  }
  if (billingPeriod === 'semester') {
    return plan.semesterTotal > 0
      ? plan.semesterTotal
      : plan.pricePerStudentSemester * count * 6
  }
  // yearly
  return plan.yearlyTotal > 0
    ? plan.yearlyTotal
    : plan.pricePerStudentYearly * count * 12
}

function getMonthlyRate(plan: DBPlan, studentCount: number, billingPeriod: BillingPeriod): number {
  const total = getPlanPrice(plan, studentCount, billingPeriod)
  const months = PERIOD_MONTHS[billingPeriod]
  return Math.round(total / months)
}

const TIER_ORDER: TierPlan[] = ['free', 'starter', 'standard', 'premium', 'enterprise']

export function PricingCards({ currentTier, studentCount, billingPeriod, onSelectTier, isLoading }: PricingCardsProps) {
  const [plans, setPlans] = useState<DBPlan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setFetchError(null)
        const token = localStorage.getItem('attendance_token')
        const res = await fetch(`${getApiUrl()}/api/subscriptions/plans`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          // Only show active plans, sorted by sortOrder
          setPlans(
            json.data
              .filter((p: DBPlan) => p.isActive)
              .sort((a: DBPlan, b: DBPlan) => a.sortOrder - b.sortOrder)
          )
        } else {
          setFetchError(json.error || 'Failed to load plans')
        }
      } catch (err) {
        console.error('[PricingCards] Failed to load plans:', err)
        setFetchError('Network error – could not load plans.')
      } finally {
        setLoadingPlans(false)
      }
    }
    fetchPlans()
  }, [])

  if (loadingPlans) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Loading plans from database…</p>
        </div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-destructive">
        <AlertTriangle className="w-8 h-8" />
        <p className="text-sm font-semibold">{fetchError}</p>
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

  const colClass = plans.length <= 3 ? 'md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'

  return (
    <div className={`grid gap-6 ${colClass}`}>
      {plans.map((plan) => {
        const isCurrent = currentTier === plan.slug
        const isEnterprise = plan.maxStudents <= 0 || plan.maxStudents >= 999999
        const isFree = plan.slug.toLowerCase() === 'free'
        const total = getPlanPrice(plan, studentCount, billingPeriod)
        const monthly = getMonthlyRate(plan, studentCount, billingPeriod)
        const exceedsLimit = !isEnterprise && !isFree && studentCount > plan.maxStudents && plan.maxStudents > 0
        const discount = PERIOD_DISCOUNT[billingPeriod]

        // Features come exclusively from the DB — no static fallbacks that could conflict
        const displayFeatures = plan.features?.map(f => f.feature.name) ?? []

        const currentIdx = TIER_ORDER.indexOf(currentTier)
        const planIdx = TIER_ORDER.indexOf(plan.slug as TierPlan)
        const isDowngrade = planIdx < currentIdx

        return (
          <Card
            key={plan.id}
            className={cn(
              'relative flex flex-col transition-all duration-300 shadow-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl',
              !isCurrent && !exceedsLimit && 'active:scale-[0.98] hover:scale-[1.02] cursor-pointer hover:border-primary hover:ring-2 hover:ring-primary/20 hover:shadow-lg hover:shadow-primary/20 dark:hover:shadow-primary/10',
              isCurrent
                ? 'ring-2 ring-primary border-primary/50 shadow-md'
                : 'border border-slate-200/60 dark:border-slate-800',
              exceedsLimit && 'opacity-60'
            )}
            onClick={() => !isCurrent && !isLoading && !exceedsLimit && onSelectTier(plan.slug as TierPlan)}
          >
            {/* Current plan badge */}
            {isCurrent && (
              <div className="absolute -top-3 left-0 right-0 flex justify-center z-10">
                <Badge className="bg-primary text-primary-foreground text-[10px] uppercase tracking-widest px-3 py-1 shadow-sm font-bold">
                  Current Plan
                </Badge>
              </div>
            )}

            {/* Billing discount badge */}
            {discount > 0 && !isCurrent && (
              <div className="absolute -top-3 right-4 z-10">
                <Badge className="bg-green-500 text-white text-[10px] uppercase tracking-widest px-2 py-1 shadow-sm font-bold">
                  -{discount}%
                </Badge>
              </div>
            )}

            <CardHeader className={cn('pb-4 pt-4 border-b border-slate-200/60 dark:border-slate-800/60', isCurrent && 'pt-6')}>
              <CardTitle className="text-base font-black tracking-tight">{plan.name}</CardTitle>
              <CardDescription className="text-[10px] font-black uppercase tracking-widest opacity-70 mt-1 min-h-[32px]">
                {plan.description || `Up to ${isEnterprise ? 'unlimited' : plan.maxStudents.toLocaleString()} students`}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 pb-3 pt-4 space-y-3">
              {/* Price display */}
              <div className="flex items-baseline gap-1 mb-2">
                {isEnterprise ? (
                  <span className="text-3xl font-black tracking-tight">Custom</span>
                ) : (
                  <>
                    <span className="text-3xl font-black tracking-tight">
                      {monthly.toLocaleString('en-ET', { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-sm font-black text-primary ml-1">ETB</span>
                    <span className="text-[10px] font-black uppercase text-muted-foreground ml-1">/ mo</span>
                  </>
                )}
              </div>

              {/* Billing total for multi-month periods */}
              {!isEnterprise && billingPeriod !== 'monthly' && (
                <div className="text-[10px] font-black uppercase text-muted-foreground bg-slate-100/50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center tracking-widest">
                  Billed{' '}
                  <span className="text-foreground font-black">
                    {total.toLocaleString('en-ET', { maximumFractionDigits: 0 })} ETB
                  </span>{' '}
                  {billingPeriod === 'yearly' ? 'annually' : 'per semester'}
                </div>
              )}

              {/* Per-student rate hint */}
              {!isEnterprise && plan.pricePerStudentMonthly > 0 && (
                <p className="text-[10px] text-muted-foreground font-semibold">
                  {plan.pricePerStudentMonthly.toLocaleString('en-ET')} ETB / student / month
                </p>
              )}

              {/* Exceeds limit warning */}
              {exceedsLimit && (
                <p className="text-[11px] text-destructive font-bold">
                  ⚠ Exceeds limit of {plan.maxStudents.toLocaleString()} students
                </p>
              )}

              {/* Feature list */}
              <ul className="space-y-1.5 text-sm mt-2">

                {/* FREE PLAN: Full-access banner */}
                {isFree && (
                  <li className="flex items-start">
                    <Zap className="h-4 w-4 text-violet-500 shrink-0 mr-2.5 mt-0.5" />
                    <span className="font-semibold text-violet-600 dark:text-violet-400">
                      Full access to <strong>all modules</strong>
                    </span>
                  </li>
                )}

                <li className="flex items-start">
                  <GraduationCap className="h-4 w-4 text-primary shrink-0 mr-2.5 mt-0.5" />
                  <span>
                    Up to{' '}
                    <strong>{isEnterprise ? 'Unlimited' : plan.maxStudents.toLocaleString()}</strong> students
                  </span>
                </li>
                <li className="flex items-start">
                  <Users className="h-4 w-4 text-primary shrink-0 mr-2.5 mt-0.5" />
                  <span>
                    {isEnterprise ? 'Unlimited' : plan.maxUsers.toLocaleString()} user{plan.maxUsers !== 1 ? 's' : ''}
                  </span>
                </li>
                {plan.trialDays > 0 && (
                  <li className="flex items-start">
                    <Clock className="h-4 w-4 text-amber-500 shrink-0 mr-2.5 mt-0.5" />
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      {plan.trialDays}-day {isFree ? 'free access period' : 'free trial'}
                    </span>
                  </li>
                )}
                {displayFeatures.map((f, i) => (
                  <li key={i} className="flex items-start">
                    <Check className="h-4 w-4 text-primary shrink-0 mr-2.5 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="pt-2 pb-4">
              <Button
                className="w-full rounded-xl uppercase h-10 font-black tracking-widest text-xs transition-all shadow-md active:scale-95"
                variant={isCurrent ? 'outline' : isDowngrade ? 'secondary' : 'default'}
                disabled={isCurrent || isLoading || exceedsLimit}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectTier(plan.slug as TierPlan)
                }}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isCurrent ? 'Current Plan'
                  : isEnterprise ? 'Contact Sales'
                  : isDowngrade ? 'Downgrade Plan'
                  : 'Upgrade Plan'}
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
