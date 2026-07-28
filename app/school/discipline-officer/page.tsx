'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/context/auth-context'
import { apiFetch } from '@/lib/utils/fetch-with-timeout'
import { API_URL } from '@/lib/api-config'
import {
  ShieldAlert, AlertTriangle, CheckCircle2, Clock, FilePlus,
  ArrowUpRight, TrendingUp, Star, AlertCircle, Scale
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils/utils'

const SEVERITIES = [
  { key: 'CRITICAL', label: 'Critical', color: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30' },
  { key: 'HIGH', label: 'High', color: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30' },
  { key: 'MEDIUM', label: 'Medium', color: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  { key: 'LOW', label: 'Low', color: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
]

export default function DisciplineOfficerDashboard() {
  const { user } = useAuth()
  const [cases, setCases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('attendance_token')
    const schoolId = localStorage.getItem('x-school-id')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    if (schoolId) headers['x-school-id'] = schoolId

    apiFetch<{ success: boolean; data: any[] }>(`${API_URL}/api/discipline`, { headers })
      .then(r => setCases(r.data ?? []))
      .catch(() => setCases([]))
      .finally(() => setLoading(false))
  }, [])

  const open = cases.filter(c => c.status === 'OPEN').length
  const underReview = cases.filter(c => c.status === 'UNDER_REVIEW').length
  const resolved = cases.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED').length
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const severityCounts = SEVERITIES.map(s => ({
    ...s,
    count: cases.filter(c => c.severity === s.key && (c.status === 'OPEN' || c.status === 'UNDER_REVIEW')).length
  }))

  const recent = [...cases]
    .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
    .slice(0, 5)

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-widest">Discipline Portal</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground">
            Welcome, {user?.name?.split(' ')[0] ?? 'Officer'} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{today}</p>
        </div>
        <Link href="/school/discipline-officer/new-incident">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-0.5">
            <FilePlus className="w-4 h-4" />
            Report Incident
          </button>
        </Link>
      </div>

      {/* Case Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Open Cases', value: open, icon: AlertTriangle, color: 'from-rose-500 to-rose-600', href: '/school/discipline-officer/cases' },
          { label: 'Under Review', value: underReview, icon: Clock, color: 'from-amber-500 to-amber-600' },
          { label: 'Resolved', value: resolved, icon: CheckCircle2, color: 'from-emerald-500 to-emerald-600' },
        ].map(s => (
          <Link key={s.label} href={s.href ?? '#'}>
            <div className="group rounded-2xl border border-border/60 bg-card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
              <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br', s.color)}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-black text-foreground">
                {loading ? <span className="inline-block w-8 h-6 bg-secondary rounded animate-pulse" /> : s.value}
              </p>
              <p className="text-sm font-semibold text-muted-foreground mt-0.5">{s.label}</p>
              {s.href && <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary mt-1 transition-colors" />}
            </div>
          </Link>
        ))}
      </div>

      {/* Severity Breakdown + Recent Cases */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">Severity Breakdown</h2>
          {severityCounts.map(s => (
            <div key={s.key} className={cn('flex items-center justify-between p-4 rounded-xl border border-border/60', s.bg)}>
              <div className="flex items-center gap-3">
                <div className={cn('w-2.5 h-2.5 rounded-full', s.color)} />
                <span className={cn('text-sm font-bold', s.text)}>{s.label}</span>
              </div>
              <span className="text-lg font-black text-foreground">{s.count}</span>
            </div>
          ))}
          <Link href="/school/discipline-officer/new-incident">
            <div className="flex items-center gap-2 p-4 rounded-xl border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/10 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors cursor-pointer group mt-2">
              <FilePlus className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">Report New Incident</span>
              <ArrowUpRight className="w-4 h-4 text-amber-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        </div>

        {/* Recent Cases */}
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <h2 className="font-bold text-foreground">Recent Cases</h2>
            </div>
            <Link href="/school/discipline-officer/cases" className="text-xs font-semibold text-primary hover:underline">View all →</Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl bg-secondary/50 animate-pulse" />)}
            </div>
          ) : recent.length === 0 ? (
            <div className="text-center py-12">
              <Scale className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No cases recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map(c => {
                const sev = SEVERITIES.find(s => s.key === c.severity) ?? SEVERITIES[3]
                return (
                  <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors">
                    <div className={cn('w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0', sev.color)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground">{c.student?.fullName ?? 'Unknown Student'} · {new Date(c.date).toLocaleDateString()}</p>
                    </div>
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0', sev.bg, sev.text)}>
                      {c.status?.replace('_', ' ')}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Responsibilities */}
      <div className="rounded-2xl border border-amber-200/50 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800/30 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-200 text-sm">Role Permissions Summary</p>
            <p className="text-xs text-amber-700/70 dark:text-amber-300/70 mt-1 leading-relaxed">
              As a <strong>Discipline & Conduct Officer</strong>, you can: create and manage discipline incidents, review and resolve cases,
              view student records (read-only), send communications to parents/staff, and generate conduct reports.
              You do not have access to student registration, call center functions, or system settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
