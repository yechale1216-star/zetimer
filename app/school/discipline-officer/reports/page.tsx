'use client'

import React, { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/utils/fetch-with-timeout'
import { API_URL } from '@/lib/api-config'
import { BarChart2, PieChart, TrendingDown, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils/utils'

export default function DisciplineReportsPage() {
  const [cases, setCases] = useState<any[]>([])

  useEffect(() => {
    const token = localStorage.getItem('attendance_token')
    const schoolId = localStorage.getItem('x-school-id')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    if (schoolId) headers['x-school-id'] = schoolId
    apiFetch<{ success: boolean; data: any[] }>(`${API_URL}/api/discipline`, { headers })
      .then(r => setCases(r.data ?? [])).catch(() => {})
  }, [])

  const total = cases.length
  const open = cases.filter(c => c.status === 'OPEN').length
  const resolved = cases.filter(c => ['RESOLVED', 'CLOSED'].includes(c.status)).length
  const bySeverity = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => ({
    label: s,
    count: cases.filter(c => c.severity === s).length,
    pct: total > 0 ? Math.round((cases.filter(c => c.severity === s).length / total) * 100) : 0,
    color: { CRITICAL: 'from-rose-500 to-rose-600', HIGH: 'from-orange-500 to-orange-600', MEDIUM: 'from-amber-500 to-amber-600', LOW: 'from-blue-500 to-blue-600' }[s] ?? 'from-slate-400 to-slate-500'
  }))

  const byCategory: Record<string, number> = {}
  cases.forEach(c => { byCategory[c.categoryName] = (byCategory[c.categoryName] || 0) + 1 })
  const categoryList = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 6)

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-black text-foreground">Conduct Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Discipline analytics and case breakdowns</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Cases', value: total, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
          { label: 'Open', value: open, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/30' },
          { label: 'Resolved', value: resolved, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
          { label: 'Resolution Rate', value: total > 0 ? `${Math.round((resolved / total) * 100)}%` : '—', color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-2xl p-5 border border-border/60', s.bg)}>
            <p className={cn('text-2xl font-black', s.color)}>{s.value}</p>
            <p className="text-xs font-semibold text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-amber-500" />
            <h2 className="font-bold text-foreground">Cases by Severity</h2>
          </div>
          <div className="space-y-3">
            {bySeverity.map(s => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">{s.label}</span>
                  <span className="text-sm text-muted-foreground">{s.count} ({s.pct}%)</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', s.color)} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-4 h-4 text-amber-500" />
            <h2 className="font-bold text-foreground">Top Categories</h2>
          </div>
          {categoryList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
          ) : (
            <div className="space-y-3">
              {categoryList.map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-foreground truncate max-w-[200px]">{cat}</span>
                  </div>
                  <span className="text-sm font-bold text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
