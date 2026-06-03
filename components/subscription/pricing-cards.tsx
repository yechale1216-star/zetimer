'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Sparkles } from 'lucide-react'
import { TIER_CONFIG, calculateDynamicPrice } from '@/lib/utils/pricing-utils'
import type { TierPlan, BillingPeriod } from '@/lib/utils/subscription-types'
import { cn } from '@/lib/utils/utils'

interface PricingCardsProps {
  currentTier: TierPlan
  studentCount: number
  billingPeriod: BillingPeriod
  onSelectTier: (tier: TierPlan) => void
  isLoading?: boolean
}

export function PricingCards({ currentTier, studentCount, billingPeriod, onSelectTier, isLoading }: PricingCardsProps) {
  const tiers: TierPlan[] = ['starter', 'standard', 'premium', 'enterprise']

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {tiers.map((tier) => {
        const config = TIER_CONFIG[tier]
        const isCurrent = currentTier === tier
        
        // Calculate price for this tier
        const breakdown = calculateDynamicPrice({
          studentCount: Math.max(studentCount, 1), // At least 1 to show base price if empty
          tier,
          billingPeriod,
          addons: []
        })

        const isEnterprise = tier === 'enterprise'

        return (
          <Card 
            key={tier} 
            className={cn(
              "relative flex flex-col transition-all duration-300 border-none shadow-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl active:scale-[0.98] hover:scale-[1.02]",
              isCurrent ? "ring-2 ring-primary border-primary/50 shadow-md bg-white/60 dark:bg-slate-900/60" : "border border-slate-200/60 dark:border-slate-800 hover:shadow-lg"
            )}
          >
            {isCurrent && (
              <div className="absolute -top-3 left-0 right-0 flex justify-center z-10">
                <Badge className="typography-label bg-primary text-primary-foreground text-[10px] uppercase px-3 py-1 shadow-sm">
                  Current Plan
                </Badge>
              </div>
            )}
            
            <CardHeader className={cn("pb-8 pt-8 border-b border-slate-200/60 dark:border-slate-800/60", isCurrent && "pt-10")}>
              <CardTitle className="typography-section-title">{config.label}</CardTitle>
              <CardDescription className="typography-label min-h-[40px] uppercase opacity-70 mt-2">{config.description}</CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 pb-6 pt-6">
              <div className="mb-6 flex items-baseline gap-1">
                {isEnterprise ? (
                  <span className="typography-page-title">Custom</span>
                ) : (
                  <>
                    <span className="typography-page-title">{breakdown.effectiveMonthly.toLocaleString('en-ET', { maximumFractionDigits: 0 })}</span>
                    <span className="typography-card-title text-primary ml-1">ETB</span>
                    <span className="typography-label text-[10px] uppercase text-muted-foreground ml-1">/ mo</span>
                  </>
                )}
              </div>

              {/* Display total based on billing period */}
              {!isEnterprise && billingPeriod !== 'monthly' && (
                <div className="typography-label mb-6 text-[10px] uppercase text-muted-foreground bg-slate-100/50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                  Billed <span className="text-foreground">{breakdown.total.toLocaleString('en-ET', { maximumFractionDigits: 0 })} ETB</span> {billingPeriod === 'yearly' ? 'annually' : 'per semester'}
                </div>
              )}

              <ul className="typography-body space-y-3">
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-primary shrink-0 mr-3 mt-0.5" />
                  <span>
                    Up to <strong className="typography-label">{isEnterprise ? 'Unlimited' : config.maxStudentsSoft.toLocaleString()}</strong> students
                  </span>
                </li>
                {tier === 'standard' || tier === 'premium' || tier === 'enterprise' ? (
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-primary shrink-0 mr-3 mt-0.5" />
                    <span>Advanced analytics</span>
                  </li>
                ) : null}
                {tier === 'premium' || tier === 'enterprise' ? (
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-primary shrink-0 mr-3 mt-0.5" />
                    <span>Priority workflows & API</span>
                  </li>
                ) : null}
                {tier === 'enterprise' ? (
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-primary shrink-0 mr-3 mt-0.5" />
                    <span>Dedicated limits & SLAs</span>
                  </li>
                ) : null}
              </ul>
            </CardContent>
            
            <CardFooter className="pt-2">
              <Button 
                className="typography-label w-full rounded-xl uppercase h-12 transition-all shadow-md active:scale-95" 
                variant={isCurrent ? "outline" : "default"}
                disabled={isCurrent || isLoading}
                onClick={() => onSelectTier(tier)}
              >
                {isCurrent ? 'Current Plan' : isEnterprise ? 'Contact Sales' : 'Upgrade Plan'}
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}


