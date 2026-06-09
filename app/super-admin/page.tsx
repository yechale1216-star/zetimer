'use client'

import React, { useEffect, useState } from 'react'
import { StatCard } from '@/components/super-admin/stat-card'
import { RevenueChart } from '@/components/super-admin/revenue-chart'
import { UserDistributionChart } from '@/components/super-admin/user-distribution-chart'
import { RecentActivity } from '@/components/super-admin/recent-activity'
import { SystemHealth } from '@/components/super-admin/system-health'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Building2, 
  Users, 
  TrendingUp, 
  CreditCard, 
  UserCheck, 
  Clock, 
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Plus,
  Bell,
  Shield,
  Settings
} from 'lucide-react'
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
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getApiUrl } from '@/lib/auth/auth'

export default function SuperAdminDashboard() {
  const [metrics, setMetrics] = useState<{
    totalRevenue: number
    mrr: number
    activeSubscriptions: number
    subscriptionGrowthPercent: number
    revenueTrends: { month: string; revenue: number; subscriptions: number }[]
    studentsByTier: Record<string, number>
    schoolStats: {
      total: number
      active: number
      trial: number
      suspended: number
      expired: number
    }
    userStats: {
      total: number
      teachers: number
      students: number
      parents: number
    }
  } | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`${getApiUrl()}/api/super-admin/subscription-metrics`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('attendance_token')}`
          }
        })
        const json = await parseJsonResponse<{ success: boolean; data: any }>(res)
        if (json.success && json.data) {
          setMetrics(json.data)
        }
      } catch {
        setMetrics(null)
      }
    })()
  }, [])

  const topStats = [
    {
      title: 'Total Schools',
      value: metrics ? String(metrics.schoolStats.total) : '—',
      change: metrics ? `${metrics.schoolStats.active} active systems` : 'Loading…',
      icon: Building2,
      trend: 'up' as const,
    },
    {
      title: 'Platform Users',
      value: metrics ? (metrics.userStats.teachers + metrics.userStats.parents).toLocaleString() : '—',
      change: metrics ? `${metrics.userStats.teachers} Teachers | ${metrics.userStats.parents} Parents` : 'Loading…',
      icon: Users,
      trend: 'up' as const,
    },
    {
      title: 'Platform MRR',
      value: metrics ? `${metrics.mrr.toLocaleString()} ETB` : '—',
      change: metrics ? `Total billed: ${(metrics.totalRevenue / 1000).toFixed(1)}K ETB` : 'Loading…',
      icon: CreditCard,
      trend: 'up' as const,
    },
    {
      title: 'Active Subscriptions',
      value: metrics ? String(metrics.activeSubscriptions) : '—',
      change: metrics ? `Growth ${metrics.subscriptionGrowthPercent}%` : 'Stable',
      icon: TrendingUp,
      trend: 'stable' as const,
    },
  ]

  const statusIndicators = [
    { label: 'Active', count: metrics?.schoolStats.active || 0, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Trial', count: metrics?.schoolStats.trial || 0, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Suspended', count: metrics?.schoolStats.suspended || 0, color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
    { label: 'Expired', count: metrics?.schoolStats.expired || 0, color: 'text-red-500', bg: 'bg-red-500/10' },
  ]

  const tierRows = metrics
    ? Object.entries(metrics.studentsByTier || {}).sort((a, b) => b[1] - a[1])
    : []

  return (
    <div className="p-4 md:p-6 space-y-6 md:space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Platform Pulse</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Zetime multi-tenant infrastructure monitoring & SaaS metrics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Clock className="w-4 h-4" />
            History
          </Button>
          <Button size="sm" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Performance
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button variant="secondary" className="justify-start gap-2 h-11" asChild>
          <Link href="/super-admin/schools">
            <Plus className="w-4 h-4" />
            New School
          </Link>
        </Button>
        <Button variant="secondary" className="justify-start gap-2 h-11" asChild>
          <Link href="/super-admin/communication">
            <Bell className="w-4 h-4" />
            Broadcast
          </Link>
        </Button>
        <Button variant="secondary" className="justify-start gap-2 h-11" asChild>
          <Link href="/super-admin/audit-logs">
            <Shield className="w-4 h-4" />
            Audit Logs
          </Link>
        </Button>
        <Button variant="secondary" className="justify-start gap-2 h-11" asChild>
          <Link href="/super-admin/settings">
            <Settings className="w-4 h-4" />
            Maintenance
          </Link>
        </Button>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {topStats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Status Breakdown Bar */}
      <Card>
        <CardContent className="p-2">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
            {statusIndicators.map((s) => (
              <div key={s.label} className="p-4 text-center">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{s.label} Schools</p>
                <div className="flex items-center justify-center gap-2">
                  <span className={`text-2xl font-bold ${s.color}`}>{s.count}</span>
                  <div className={`w-2 h-2 rounded-full ${s.bg} border ${s.color.replace('text-', 'border-')}`} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RevenueChart />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Platform Revenue Trend</CardTitle>
                <CardDescription>Aggregate billing across all subscriptions</CardDescription>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary/50 text-[10px] font-bold text-muted-foreground uppercase">
                Last 6 Months
              </div>
            </CardHeader>
            <CardContent className="h-[320px]">
              {metrics?.revenueTrends ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.revenueTrends}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      stroke="var(--muted-foreground)" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="var(--muted-foreground)" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => `${value/1000}k ETB`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem',
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="var(--primary)" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorRev)" 
                      name="Revenue (ETB)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground italic">
                  Loading trend data...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <SystemHealth />
          <UserDistributionChart />
        </div>
      </div>

      <RecentActivity />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Usage by Subscription Tier</CardTitle>
            <CardDescription>Student seat distribution</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-5">
              {tierRows.length === 0 && <p className="text-sm text-muted-foreground italic">Analyzing tier mix…</p>}
              {tierRows.map(([tier, count]) => {
                const max = Math.max(...tierRows.map(([, c]) => c), 1)
                const pct = Math.round((count / max) * 100)
                const colors: Record<string, string> = {
                  premium: 'bg-purple-500',
                  standard: 'bg-blue-500',
                  starter: 'bg-green-500',
                  trial: 'bg-gray-400'
                }
                return (
                  <div key={tier}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium capitalize">{tier}</span>
                      <span className="text-sm text-muted-foreground font-mono">{count.toLocaleString()} seats</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`${colors[tier.toLowerCase()] || 'bg-primary'} rounded-full h-full transition-all duration-1000`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
          <div className="p-4 pt-0">
            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-primary">
              View Detailed Tier Analytics <ArrowRight className="ml-2 w-3 h-3" />
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Support & Requests
              <div className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-[10px] font-bold text-red-600">3 NEW</div>
            </CardTitle>
            <CardDescription>Pending school help desk tickets</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            {[
              { title: 'Billing issue - Ethiopia Intl School', status: 'urgent', time: '20m ago' },
              { title: 'Feature request: Custom reports', status: 'open', time: '2h ago' },
              { title: 'Login failure report - Highland Academy', status: 'urgent', time: '5h ago' },
            ].map((ticket, i) => (
              <div key={i} className="group p-3 rounded-lg border border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-bold uppercase ${ticket.status === 'urgent' ? 'text-red-500' : 'text-blue-500'}`}>
                    {ticket.status}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{ticket.time}</span>
                </div>
                <p className="text-sm font-medium truncate group-hover:text-primary">{ticket.title}</p>
              </div>
            ))}
          </CardContent>
          <div className="p-4 pt-0">
            <Button variant="ghost" size="sm" asChild className="w-full text-xs text-muted-foreground hover:text-primary">
              <Link href="/super-admin/support" className="flex items-center justify-center gap-2">
                Open Support Dashboard <ArrowRight className="w-3 h-3" />
              </Link>
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>System & Maintenance</CardTitle>
            <CardDescription>Platform management tools</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            <Button variant="outline" className="w-full justify-start gap-3 h-12">
              <Clock className="w-5 h-5 text-blue-500" />
              <div className="text-left">
                <p className="text-xs font-semibold">Scheduled Backups</p>
                <p className="text-[10px] text-muted-foreground">Next run: Today 11:00 PM</p>
              </div>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3 h-12">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <div className="text-left">
                <p className="text-xs font-semibold">Maintenance Mode</p>
                <p className="text-[10px] text-muted-foreground">System is currently online</p>
              </div>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3 h-12">
              <HelpCircle className="w-5 h-5 text-green-500" />
              <div className="text-left">
                <p className="text-xs font-semibold">Broadcasting</p>
                <p className="text-[10px] text-muted-foreground">Announce updates to all schools</p>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

