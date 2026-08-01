'use client'

import React, { useState, useEffect } from 'react'
import { db } from '@/lib/db/database'
import { apiFetch } from '@/lib/utils/fetch-with-timeout'
import { API_URL } from '@/lib/api-config'
import { GraduationCap, Search, ShieldAlert, CheckCircle2, User, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function DisciplineStudentsPage() {
  const [students, setStudents] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    Promise.all([
      db.getStudents().catch(() => []),
      (() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('attendance_token') : null
        const schoolId = typeof window !== 'undefined' ? localStorage.getItem('x-school-id') : null
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = `Bearer ${token}`
        if (schoolId) headers['x-school-id'] = schoolId
        return apiFetch<{ success: boolean; data: any[] }>(`${API_URL}/api/discipline`, { headers })
          .then(r => r.data ?? []).catch(() => [])
      })()
    ]).then(([st, cs]) => {
      setStudents(st ?? [])
      setCases(cs ?? [])
    }).finally(() => setIsLoading(false))
  }, [])

  const studentWithCases = (students ?? []).map((s: any) => ({
    ...s,
    caseCount: cases.filter(c => c.studentId === s.id).length,
    openCases: cases.filter(c => c.studentId === s.id && (c.status === 'OPEN' || c.status === 'UNDER_REVIEW')).length,
    resolvedCases: cases.filter(c => c.studentId === s.id && (c.status === 'RESOLVED' || c.status === 'CLOSED')).length,
  })).filter((s: any) => s.caseCount > 0)

  const filtered = studentWithCases.filter((s: any) =>
    !search ||
    s.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id?.toLowerCase().includes(search.toLowerCase())
  ).sort((a: any, b: any) => b.openCases - a.openCases || b.caseCount - a.caseCount)

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 text-white p-6 md:p-8 rounded-3xl border border-amber-500/20 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-amber-500/15 text-amber-400 rounded-2xl border border-amber-500/30">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Student Conduct History</h1>
            <p className="text-xs md:text-sm text-slate-300 mt-0.5">
              Comprehensive conduct records and incident logs by student
            </p>
          </div>
        </div>

        <Badge variant="outline" className="border-amber-500/30 text-amber-400 px-3 py-1 text-xs">
          {studentWithCases.length} Students Logged
        </Badge>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="w-full pl-10 pr-4 h-11 rounded-2xl border-slate-200 dark:border-slate-800 bg-card text-sm font-medium focus:ring-2 focus:ring-amber-500/30"
          placeholder="Search student by name or ID (e.g. STU000001)..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Student Conduct List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center">
          <GraduationCap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-bold text-lg">No Student Conduct Records</h3>
          <p className="text-xs text-muted-foreground mt-1">
            No students match your search filter or have recorded discipline cases.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map(s => (
            <Card key={s.id} className="border-slate-200/80 dark:border-slate-800/80 bg-card hover:border-amber-500/40 rounded-2xl transition-all shadow-sm hover:shadow-md">
              <CardContent className="p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-base flex items-center justify-center flex-shrink-0 border border-amber-500/20">
                    {s.fullName?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                      {s.fullName}
                      <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">
                        {s.student_id || 'ID N/A'}
                      </span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Grade {s.grade || 'N/A'} {s.section ? `• Sec ${s.section}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0">
                  <div className="flex items-center gap-3">
                    <div className="text-center px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/60">
                      <p className="text-base font-black text-foreground">{s.caseCount}</p>
                      <p className="text-[10px] text-muted-foreground font-semibold">Total Cases</p>
                    </div>

                    {s.openCases > 0 ? (
                      <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1 px-3 py-1">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        {s.openCases} Open
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 gap-1 px-3 py-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Resolved
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
