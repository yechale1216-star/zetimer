'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { parseJsonResponse } from '@/lib/utils/parse-json-response'
import { Loader2, AlertCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { TIER_CONFIG } from '@/lib/utils/pricing-utils'
import type { TierPlan } from '@/lib/utils/subscription-types'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

const SCHOOL_ID = 's1'

export default function UsageAnalyticsPage() {
  const [currentTier, setCurrentTier] = useState<TierPlan>('starter')
  const [studentCount, setStudentCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSubscription()
  }, [])

  const fetchSubscription = async () => {
    try {
      const res = await fetch(`/api/subscriptions/school/${SCHOOL_ID}`)
      const json = await parseJsonResponse<any>(res)
      if (json.success) {
        const subData = json.data
        setCurrentTier(subData.tier || 'standard')
        setStudentCount(subData.studentCount ?? 0)
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

  const tierConfig = TIER_CONFIG[currentTier]
  const softLimit = tierConfig?.maxStudentsSoft || 0
  const isEnterprise = currentTier === 'enterprise'
  const usagePercentage = isEnterprise ? 0 : Math.min(100, Math.round((studentCount / softLimit) * 100))

  // Mock historical data
  const mockData = [
    { name: 'Jan', students: Math.max(0, studentCount - 150) },
    { name: 'Feb', students: Math.max(0, studentCount - 120) },
    { name: 'Mar', students: Math.max(0, studentCount - 80) },
    { name: 'Apr', students: Math.max(0, studentCount - 50) },
    { name: 'May', students: Math.max(0, studentCount - 20) },
    { name: 'Jun', students: studentCount },
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800">
          <CardHeader className="pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
            <CardTitle className="text-lg font-bold">Capacity Overview</CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-70">Current student license utilization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Active Students</span>
                <span className="text-sm text-muted-foreground">
                  {studentCount.toLocaleString()} / {isEnterprise ? 'Unlimited' : softLimit.toLocaleString()}
                </span>
              </div>
              {!isEnterprise ? (
                <Progress 
                  value={usagePercentage} 
                  className={usagePercentage > 90 ? "bg-red-100 [&>div]:bg-red-500" : ""}
                />
              ) : (
                <Progress value={100} className="bg-primary/20 [&>div]:bg-primary" />
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Remaining Seats</p>
                <p className="text-2xl font-bold text-foreground">
                  {isEnterprise ? '∞' : Math.max(0, softLimit - studentCount).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Tier</p>
                <p className="text-xl font-bold text-foreground capitalize mt-1">
                  {tierConfig?.label || currentTier}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800">
          <CardHeader className="pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
            <CardTitle className="text-lg font-bold">Add-on Usage</CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-70">Consumption of additional services</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>SMS Package</span>
                  <span className="text-muted-foreground">2,450 / 5,000 sent</span>
                </div>
                <Progress value={49} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Storage</span>
                  <span className="text-muted-foreground">45GB / 100GB</span>
                </div>
                <Progress value={45} className="[&>div]:bg-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800">
        <CardHeader className="pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
          <CardTitle className="text-lg font-bold">Growth Trend</CardTitle>
          <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-70">Active students over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[350px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={mockData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="students" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorStudents)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

