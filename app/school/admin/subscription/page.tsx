'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CreditCard, Calendar, Users, AlertCircle, Loader2, ArrowUpCircle } from 'lucide-react'
import { parseJsonResponse } from '@/lib/utils/parse-json-response'
import Link from 'next/link'
import { authService } from '@/lib/auth/auth'
import { getApiUrl } from '@/lib/api-config'

interface Subscription {
  id: string
  schoolId: string
  planId: string
  plan: {
    id: string
    name: string
    slug: string
    description?: string
    maxStudents: number
    maxUsers: number
  }
  billingPeriod: 'monthly' | 'semester' | 'yearly'
  studentCount: number
  status: string
  billingStart: string
  billingEnd: string
  renewalDate: string
  monthlyAmount?: number
  isTrial?: boolean
  trialEndsAt?: string
  currentUsage: {
    students: number
    users: number
  }
}

interface Transaction {
  id: string
  amount: number
  currency: string
  status: string
  description: string
  createdAt: string
  paymentMethod?: string
}

export default function SubscriptionOverviewPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [effectiveMrr, setEffectiveMrr] = useState(0)

  useEffect(() => {
    fetchSubscription()
  }, [])

  const fetchSubscription = async () => {
    try {
      const token = localStorage.getItem('attendance_token')
      const apiUrl = getApiUrl()

      const res = await fetch(`${apiUrl}/api/subscriptions/me/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const json = await parseJsonResponse<any>(res)
      if (json.success) {
        const subData = json.data
        // The backend returns expanded plan and usage metrics
        setSubscription({
          ...subData,
          tier: subData.plan.slug,
          studentCount: subData.studentCount,
          monthlyAmount: subData.effectiveMonthly,
        })
        setEffectiveMrr(Number(subData.effectiveMonthly ?? 0))
      } else {
        setError(json.error || 'Failed to load subscription')
      }

      const txRes = await fetch(`${apiUrl}/api/subscriptions/me/billing`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const txJson = await parseJsonResponse<any>(txRes)
      if (txJson.success) {
        setTransactions(txJson.data)
      }
    } catch (err) {
      console.error('[v0] Error fetching subscription:', err)
      setError('Failed to load subscription')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !subscription) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6 flex flex-col items-center justify-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <p className="text-destructive font-medium">{error || 'No subscription found'}</p>
        </CardContent>
      </Card>
    )
  }

  const isTrial = subscription.status === 'trial' || subscription.status === 'expired'
  const nextRenewalDate = isTrial && subscription.trialEndsAt ? new Date(subscription.trialEndsAt) : new Date(subscription.renewalDate)
  const daysUntilRenewal = Math.ceil((nextRenewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  
  // Use backend plan data for limits and display
  const maxStudents = subscription.plan?.maxStudents || 0
  const activeStudents = subscription.currentUsage?.students || 0
  const isEnterprise = subscription.plan?.slug === 'enterprise'
  
  const usagePercentage = isEnterprise ? 0 : Math.min(100, (activeStudents / maxStudents) * 100)

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Alerts */}
      {subscription.status === 'pending_payment' && (
        <Card className="border-none shadow-sm bg-blue-50/80 dark:bg-blue-950/80 backdrop-blur-md rounded-2xl border border-blue-200/60 dark:border-blue-800">
          <CardContent className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
              <div>
                <p className="font-bold text-blue-900 dark:text-blue-100">
                  Payment Pending Verification
                </p>
                <p className="text-xs font-medium text-blue-800/80 dark:text-blue-200/80 mt-1 uppercase tracking-wider">
                  Awaiting webhook confirmation from Chapa.
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={fetchSubscription} className="shrink-0 bg-white/95 dark:bg-slate-800/90 border-blue-200 dark:border-blue-800 rounded-xl font-bold uppercase tracking-tight text-xs h-10 hover:scale-105 transition-transform">
              Refresh Status
            </Button>
          </CardContent>
        </Card>
      )}

      {subscription.status !== 'active' && subscription.status !== 'pending_payment' && (
        <Card className="border-none shadow-sm bg-yellow-50/80 dark:bg-yellow-950/80 backdrop-blur-md rounded-2xl border border-yellow-200/60 dark:border-yellow-800">
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="font-bold text-yellow-900 dark:text-yellow-100">
                Subscription Status: <span className="capitalize">{subscription.status.replace('_', ' ')}</span>
              </p>
              {(subscription.status === 'expired' || subscription.status === 'cancelled') && (
                <p className="text-xs font-medium text-yellow-800/80 dark:text-yellow-200/80 mt-1 uppercase tracking-wider">
                  Your subscription is inactive. Please upgrade or contact support.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Plan Card */}
        <Card className="border-none shadow-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800 relative overflow-hidden group hover:shadow-lg transition-all active:scale-[0.98] hover:scale-[1.02]">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'} className="capitalize font-black text-[10px] tracking-wider px-2.5 py-0.5">
                {subscription.status}
              </Badge>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Current Plan</p>
            <p className="text-2xl font-black text-foreground capitalize flex items-center gap-2">
              {isTrial ? 'Free Trial' : (subscription.plan?.name || subscription.plan?.slug)}
            </p>
            <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-widest opacity-70">
              {isTrial ? 'Expires automatically' : `${subscription.billingPeriod} Billing`}
            </p>
          </CardContent>
        </Card>

        {/* Monthly Cost Card */}
        <Card className="border-none shadow-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800 relative overflow-hidden group hover:shadow-lg transition-all active:scale-[0.98] hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-green-500/10 rounded-xl">
                <span className="text-green-600 font-black text-sm">ETB</span>
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Effective Monthly</p>
            <p className="text-2xl font-black text-foreground">
              {effectiveMrr.toLocaleString('en-ET', { maximumFractionDigits: 0 })} <span className="text-sm font-bold text-primary">ETB</span>
            </p>
            <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-widest opacity-70">
              Excludes add-ons
            </p>
          </CardContent>
        </Card>

        {/* Renewal Card */}
        <Card className="border-none shadow-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800 relative overflow-hidden group hover:shadow-lg transition-all active:scale-[0.98] hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-blue-500/10 rounded-xl">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              {daysUntilRenewal <= 14 && (
                <Badge variant="destructive" className="font-black text-[10px] tracking-wider px-2.5 py-0.5">Renewing Soon</Badge>
              )}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{isTrial ? 'Trial Expires' : 'Renewal Date'}</p>
            <p className="text-2xl font-black text-foreground">
              {Math.max(0, daysUntilRenewal)} <span className="text-sm font-bold text-muted-foreground">days</span>
            </p>
            <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-widest opacity-70">
              On {nextRenewalDate.toLocaleDateString('en-CA', { timeZone: 'Africa/Addis_Ababa' })}
            </p>
          </CardContent>
        </Card>

        {/* Active Students Card */}
        <Card className="border-none shadow-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800 relative overflow-hidden group hover:shadow-lg transition-all active:scale-[0.98] hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-orange-500/10 rounded-xl">
                <Users className="w-5 h-5 text-orange-500" />
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{isTrial ? 'Student Capacity' : 'Active Students'}</p>
            <p className="text-2xl font-black text-foreground">
              {activeStudents.toLocaleString()}
            </p>
            {!isEnterprise ? (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">
                   <span>{isTrial ? 'Trial Limit' : 'Usage Limit'}</span>
                  <span>{maxStudents.toLocaleString()}</span>
                </div>
                <Progress value={usagePercentage} className="h-1 bg-slate-100 dark:bg-slate-800" />
              </div>
            ) : (
              <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-widest opacity-70">Unlimited usage</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action / Upgrade Section */}
      <Card className="border-none shadow-sm bg-gradient-to-r from-primary/10 via-primary/5 to-white/40 dark:to-slate-900/40 backdrop-blur-md rounded-2xl border border-primary/20 transition-all hover:shadow-md">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-xl font-bold tracking-tight">Ready to unlock more features?</h3>
            <p className="text-muted-foreground text-sm max-w-xl font-medium">
              Upgrade your plan to access advanced analytics, custom SLAs, and higher student capacities. Scale seamlessly as your school grows.
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0 gap-2 rounded-xl font-bold tracking-wide hover:scale-105 transition-transform shadow-md">
            <Link href="/school/admin/subscription/upgrade">
              <ArrowUpCircle className="w-5 h-5" />
              Upgrade Plan
            </Link>
          </Button>
        </CardContent>
      </Card>
      
      {/* Plan Details Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <Card className="border-none shadow-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800">
          <CardHeader className="pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
            <CardTitle className="text-lg font-bold">Subscription Details</CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-70">Comprehensive view of your active period</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-200/60 dark:border-slate-800/60">
              <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Billing Period</span>
              <span className="font-bold text-sm">{subscription.billingStart} - {subscription.billingEnd}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-200/60 dark:border-slate-800/60">
              <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Student Limit</span>
              <span className="font-bold text-sm">{isEnterprise ? 'Unlimited' : maxStudents.toLocaleString()}</span>
            </div>
             <div className="flex justify-between items-center py-2 border-b border-slate-200/60 dark:border-slate-800/60">
              <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Included Features</span>
              <span className="font-bold text-sm text-right max-w-[200px] truncate">{subscription.plan?.description || subscription.plan?.name}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-1 border-none shadow-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800 flex flex-col">
          <CardHeader className="pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
            <CardTitle className="text-lg font-bold">Recent Transactions</CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-70">Latest billing payments and statuses</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 flex-1 flex flex-col">
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm flex-1 flex flex-col items-center justify-center">
                <HistoryIcon className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p className="font-bold uppercase tracking-widest text-[10px]">No transaction history found.</p>
              </div>
            ) : (
              <div className="space-y-4 flex-1">
                {transactions.slice(0, 4).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-white/95 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
                    <div>
                      <p className="font-bold text-sm">{tx.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{new Date(tx.createdAt).toLocaleDateString('en-ET', { timeZone: 'Africa/Addis_Ababa' })}</span>
                        {tx.paymentMethod && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 uppercase tracking-tighter bg-secondary/50 border-slate-300 dark:border-slate-600">
                            {tx.paymentMethod}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sm">{tx.amount.toLocaleString('en-ET')} ETB</p>
                      <Badge 
                        variant={tx.status === 'completed' ? 'default' : tx.status === 'failed' ? 'destructive' : 'secondary'}
                        className="text-[9px] h-4 mt-1 capitalize tracking-tighter font-black"
                      >
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" asChild className="w-full mt-6 bg-white/95 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 rounded-xl font-bold uppercase tracking-tight text-xs h-10 hover:scale-[1.02] transition-transform">
              <Link href="/school/admin/subscription/billing">View All History &rarr;</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}

function HistoryIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  )
}

