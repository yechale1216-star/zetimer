'use client'

import React, { useEffect, useState } from 'react'
import { StatCard } from '@/components/super-admin/stat-card'
import { RevenueChart } from '@/components/super-admin/revenue-chart'
import { UserDistributionChart } from '@/components/super-admin/user-distribution-chart'
import { RecentActivity } from '@/components/super-admin/recent-activity'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Users, TrendingUp, CreditCard } from 'lucide-react'
import { parseJsonResponse } from '@/lib/utils/parse-json-response'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

export default function SuperAdminDashboard() {
  const [m, setM] = useState<{
    totalRevenue: number
    mrr: number
    activeSubscriptions: number
    subscriptionGrowthPercent: number
    revenueTrends: { month: string; revenue: number; subscriptions: number }[]
    studentsByTier: Record<string, number>
  } | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/super-admin/subscription-metrics')
        const json = await parseJsonResponse<{ success: boolean; data: typeof m }>(res)
        if (json.success && json.data) setM(json.data)
      } catch {
        setM(null)
      }
    })()
  }, [])

  const stats = [
    {
      title: 'Total Schools',
      value: '45',
      change: '+12% from last month',
      icon: Building2,
      trend: 'up' as const,
    },
    {
      title: 'Billable students (tiers)',
      value: m
        ? Object.values(m.studentsByTier || {})
            .reduce((a, b) => a + b, 0)
            .toLocaleString()
        : '—',
      change: m ? 'Across active subscriptions' : 'Loading…',
      icon: Users,
      trend: 'up' as const,
    },
    {
      title: 'Platform revenue (billed)',
      value: m ? `$${(m.totalRevenue / 1000).toFixed(1)}K` : '—',
      change: m ? `MRR ~ $${m.mrr.toLocaleString()}` : 'Loading…',
      icon: CreditCard,
      trend: 'up' as const,
    },
    {
      title: 'Active subscriptions',
      value: m ? String(m.activeSubscriptions) : '—',
      change: m ? `Growth ${m.subscriptionGrowthPercent}%` : 'Loading…',
      icon: TrendingUp,
      trend: 'stable' as const,
    },
  ]

  const tierRows = m
    ? Object.entries(m.studentsByTier || {}).sort((a, b) => b[1] - a[1])
    : []

  return (
    <div className="p-4 md:p-6 space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard overview</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Zetime platform pulse — subscriptions, revenue, and schools.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RevenueChart />
          <Card>
            <CardHeader>
              <CardTitle>Revenue trend (mock telemetry)</CardTitle>
              <CardDescription>Feeds super-admin subscription metrics store</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              {m?.revenueTrends && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={m.revenueTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                    <YAxis stroke="var(--muted-foreground)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem',
                      }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} name="Revenue" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
        <div>
          <UserDistributionChart />
        </div>
      </div>

      <RecentActivity />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Student usage by tier</CardTitle>
            <CardDescription>Weighted by subscription seat counts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tierRows.length === 0 && <p className="text-sm text-muted-foreground">Loading tier mix…</p>}
              {tierRows.map(([tier, count]) => {
                const max = Math.max(...tierRows.map(([, c]) => c), 1)
                const pct = Math.round((count / max) * 100)
                return (
                  <div key={tier}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium capitalize">{tier}</span>
                      <span className="text-sm text-muted-foreground">{count.toLocaleString()} students</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Support tickets</CardTitle>
            <CardDescription>Pending and resolved tickets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <span className="text-sm font-medium">Open tickets</span>
                <span className="text-lg font-bold text-foreground">12</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <span className="text-sm font-medium">Resolved (this month)</span>
                <span className="text-lg font-bold text-foreground">48</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <span className="text-sm font-medium">Avg response time</span>
                <span className="text-lg font-bold text-foreground">2.4h</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

