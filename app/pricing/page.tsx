'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'
import {
  getPriceComparison,
  getAvailablePlans,
  formatPlanType,
  type PlanType,
} from '@/lib/utils/pricing-utils'
import Link from 'next/link'
import { ModeToggle } from '@/components/mode-toggle'

const FEATURES = [
  'Student attendance tracking',
  'Real-time notifications',
  'Automated reports',
  'Parent portal access',
  'Multi-class support',
  'Dashboard analytics',
  'API access',
  'Priority support',
  'Custom integrations',
  'Dedicated account manager',
]

export default function PricingPage() {
  const [userCount, setUserCount] = useState(150)
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('monthly')

  const comparison = getPriceComparison(userCount)
  const selectedComparison = comparison.find((c) => c.plan === selectedPlan)

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserCount(Math.min(5000, Math.max(50, Number(e.target.value))))
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Navigation */}
      <nav className="border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-50 w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs sm:text-sm">Z</span>
              </div>
              <span className="text-lg sm:text-xl font-bold tracking-tight">Zetime</span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/about" className="text-xs sm:text-sm font-medium hover:text-primary transition-colors hidden sm:block">
                About
              </Link>
              <div className="scale-90 sm:scale-100">
                <ModeToggle />
              </div>
              <Button asChild size="sm" className="h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm">
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="bg-gradient-to-b from-background to-background/80 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Pay only for what you use. Scale up or down based on your school&apos;s needs.
            </p>
          </div>

          {/* Interactive Calculator */}
          <Card className="mb-12 border-2">
            <CardHeader>
              <CardTitle>Calculate Your Cost</CardTitle>
              <CardDescription>Adjust the number of users to see pricing for different billing cycles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* User Count Slider */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium">Number of Users</label>
                    <span className="text-2xl font-bold text-primary">{userCount}</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="5000"
                    step="10"
                    value={userCount}
                    onChange={handleSliderChange}
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>50</span>
                    <span>5,000</span>
                  </div>
                </div>

                {/* Plan Tabs */}
                <Tabs value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as PlanType)}>
                  <TabsList className="grid w-full grid-cols-3">
                    {getAvailablePlans().map((plan) => (
                      <TabsTrigger key={plan} value={plan}>
                        {formatPlanType(plan).split(' ')[0]}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {getAvailablePlans().map((plan) => {
                    const planComparison = comparison.find((c) => c.plan === plan)!
                    return (
                      <TabsContent key={plan} value={plan} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Price per user per month</p>
                            <p className="text-2xl font-bold">${planComparison.pricePerUser.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Billing cycle</p>
                            <p className="text-2xl font-bold">{planComparison.months} month{planComparison.months > 1 ? 's' : ''}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total cost</p>
                            <p className="text-2xl font-bold">${planComparison.totalCost.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Monthly cost</p>
                            <p className="text-2xl font-bold">${planComparison.monthlyCost.toFixed(2)}</p>
                          </div>
                        </div>

                        {planComparison.discount > 0 && (
                          <div className="bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <p className="text-sm font-medium text-green-700 dark:text-green-400">
                              ✓ Save {planComparison.discount}% with {formatPlanType(plan)}
                            </p>
                          </div>
                        )}
                      </TabsContent>
                    )
                  })}
                </Tabs>

                <Button size="lg" className="w-full" onClick={() => alert('Contact sales or start a trial')}>
                  Get Started
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Comparison Table */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">Plan Comparison</h2>
            
            {/* Mobile Cards */}
            <div className="grid grid-cols-1 md:hidden gap-4">
              {comparison.map((plan) => (
                <Card key={plan.plan} className="border-2">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {plan.displayName}
                      {plan.discount > 0 && <Badge className="bg-green-600">Save {plan.discount}%</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Per user per month</p>
                      <p className="text-3xl font-bold">${plan.pricePerUser.toFixed(2)}</p>
                    </div>
                    <div className="space-y-2 border-t pt-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Billing period:</span>
                        <span className="font-medium">{plan.months} months</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Total for {userCount} users:</span>
                        <span className="font-bold">${plan.totalCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Monthly average:</span>
                        <span className="font-bold">${plan.monthlyCost.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop/Tablet Table */}
            <div className="hidden sm:block overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-4 px-6 font-semibold">Plan</th>
                    <th className="text-right py-4 px-6 font-semibold">Price/User</th>
                    <th className="text-right py-4 px-6 font-semibold">Period</th>
                    <th className="text-right py-4 px-6 font-semibold">Total ({userCount})</th>
                    <th className="text-right py-4 px-6 font-semibold">Monthly</th>
                    <th className="text-center py-4 px-6 font-semibold">Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((plan) => (
                    <tr key={plan.plan} className="border-b border-border hover:bg-muted/50 transition">
                      <td className="py-4 px-6 font-medium">{plan.displayName}</td>
                      <td className="py-4 px-6 text-right">${plan.pricePerUser.toFixed(2)}</td>
                      <td className="py-4 px-6 text-right">{plan.months}m</td>
                      <td className="py-4 px-6 text-right font-semibold">${plan.totalCost.toFixed(2)}</td>
                      <td className="py-4 px-6 text-right font-semibold">${plan.monthlyCost.toFixed(2)}</td>
                      <td className="py-4 px-6 text-center">
                        {plan.discount > 0 ? (
                          <Badge className="bg-green-600/10 text-green-600 border-green-600/20">{plan.discount}% off</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">Included Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FEATURES.map((feature) => (
                <div key={feature} className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 transition">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {[
                {
                  q: 'What happens when I exceed my user limit?',
                  a: 'We&apos;ll notify you when you&apos;re approaching your limit. You can upgrade your plan anytime, and we&apos;ll calculate a pro-rata adjustment for the remainder of your billing cycle.',
                },
                {
                  q: 'Can I change my plan mid-cycle?',
                  a: 'Absolutely! When you upgrade or downgrade, we calculate the difference based on the days remaining in your billing cycle and adjust your next invoice accordingly.',
                },
                {
                  q: 'Do you offer annual contracts?',
                  a: 'Yes! Our yearly plan offers 20% savings compared to monthly billing. Contact our sales team for enterprise pricing and custom contracts.',
                },
                {
                  q: 'Is there a free trial?',
                  a: 'Yes, we offer a 14-day free trial with full access to all features. No credit card required to get started.',
                },
                {
                  q: 'What payment methods do you accept?',
                  a: 'We accept all major credit cards and can arrange bank transfers for larger accounts. We also support invoice-based billing for enterprise customers.',
                },
                {
                  q: 'Can I cancel anytime?',
                  a: 'Yes! There are no long-term contracts required. You can cancel your subscription at any time. We&apos;ll provide a pro-rata refund for unused time.',
                },
              ].map((faq, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle className="text-base">{faq.q}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground">
                    {faq.a}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-16 bg-primary/5 border border-primary/20 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">Ready to streamline your school&apos;s attendance?</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Start with our free 14-day trial. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="default">
                Start Free Trial
              </Button>
              <Button size="lg" variant="outline">
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
