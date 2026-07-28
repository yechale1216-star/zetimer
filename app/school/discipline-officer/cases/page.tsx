'use client'

import React, { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/utils/fetch-with-timeout'
import { API_URL } from '@/lib/api-config'
import { ShieldAlert, Search, Filter, Eye, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils/utils'
import Link from 'next/link'

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  UNDER_REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  RESOLVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  CLOSED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}
const SEV_COLORS: Record<string, string> = {
  CRITICAL: 'bg-rose-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-amber-500',
  LOW: 'bg-blue-500',
}

export default function DisciplineCasesPage() {
  const [cases, setCases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sevFilter, setSevFilter] = useState('')

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

  const filtered = cases.filter(c => {
    const matchSearch = !search || c.title?.toLowerCase().includes(search.toLowerCase()) || c.student?.fullName?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || c.status === statusFilter
    const matchSev = !sevFilter || c.severity === sevFilter
    return matchSearch && matchStatus && matchSev
  })

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Active Cases</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and review all discipline cases</p>
        </div>
        <Link href="/school/discipline-officer/new-incident">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-sm transition-all">
            <ShieldAlert className="w-4 h-4" /> New Incident
          </button>
        </Link>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            placeholder="Search by student name or case title..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-3">
          <select className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
          <select className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            value={sevFilter} onChange={e => setSevFilter(e.target.value)}>
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} case{filtered.length !== 1 ? 's' : ''} found</p>
      </div>

      {/* Cases List */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-secondary/40 animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <ShieldAlert className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-semibold text-muted-foreground">No cases found</p>
          </div>
        ) : (
          filtered.map(c => (
            <div key={c.id} className="flex items-start gap-4 p-4 rounded-2xl border border-border/60 bg-card hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className={cn('w-3 h-3 rounded-full mt-1.5 flex-shrink-0', SEV_COLORS[c.severity] ?? 'bg-slate-400')} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-foreground text-sm">{c.title}</p>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0', STATUS_COLORS[c.status] ?? STATUS_COLORS.OPEN)}>
                    {c.status?.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {c.student?.fullName ?? 'Unknown'} · {c.categoryName} · {new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-1">{c.description}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
