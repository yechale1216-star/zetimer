'use client'

import React, { useState, useEffect } from 'react'
import { db } from '@/lib/db/database'
import { apiFetch } from '@/lib/utils/fetch-with-timeout'
import { API_URL } from '@/lib/api-config'
import { Users, Search, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils/utils'

export default function DisciplineStudentsPage() {
  const [students, setStudents] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    db.getStudents().then(res => setStudents(res ?? [])).catch(() => {})
    const token = localStorage.getItem('attendance_token')
    const schoolId = localStorage.getItem('x-school-id')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    if (schoolId) headers['x-school-id'] = schoolId
    apiFetch<{ success: boolean; data: any[] }>(`${API_URL}/api/discipline`, { headers })
      .then(r => setCases(r.data ?? [])).catch(() => {})
  }, [])

  const studentWithCases = (students ?? []).map((s: any) => ({
    ...s,
    caseCount: cases.filter(c => c.studentId === s.id).length,
    openCases: cases.filter(c => c.studentId === s.id && c.status === 'OPEN').length,
  })).filter((s: any) => s.caseCount > 0)

  const filtered = studentWithCases.filter((s: any) =>
    !search || s.fullName?.toLowerCase().includes(search.toLowerCase())
  ).sort((a: any, b: any) => b.openCases - a.openCases)

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-black text-foreground">Student Conduct History</h1>
        <p className="text-sm text-muted-foreground mt-1">Students with recorded discipline cases</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="font-semibold text-muted-foreground">No students with discipline records</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => (
            <div key={s.id} className="flex items-center gap-4 p-4 rounded-2xl border border-border/60 bg-card hover:shadow-sm transition-all">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-black text-amber-700">{s.fullName?.charAt(0)?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-sm">{s.fullName}</p>
                <p className="text-xs text-muted-foreground">ID: {s.student_id}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className="text-lg font-black text-foreground">{s.caseCount}</p>
                  <p className="text-[10px] text-muted-foreground">Total</p>
                </div>
                {s.openCases > 0 && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-900/30">
                    <ShieldAlert className="w-3 h-3 text-rose-600" />
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-400">{s.openCases} open</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
