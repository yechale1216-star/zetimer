'use client'

import React, { useState, useEffect } from 'react'
import { db } from '@/lib/db/database'
import { Search, Users, GraduationCap, Filter } from 'lucide-react'
import { cn } from '@/lib/utils/utils'

export default function RegistrarStudentsPage() {
  const [students, setStudents] = useState<any[]>([])
  const [grades, setGrades] = useState<any[]>([])
  const [sections, setSections] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    db.getStudents().then(res => setStudents(res ?? [])).catch(() => {})
    db.getGrades().then(res => setGrades(res ?? [])).catch(() => {})
    db.getSections().then(res => setSections(res ?? [])).catch(() => {})
  }, [])

  const filtered = (students ?? []).filter((s: any) => {
    const matchSearch = !search || s.fullName?.toLowerCase().includes(search.toLowerCase()) || s.student_id?.toLowerCase().includes(search.toLowerCase())
    const matchGrade = !gradeFilter || s.gradeId === gradeFilter
    const matchStatus = !statusFilter || s.status === statusFilter
    return matchSearch && matchGrade && matchStatus
  })

  const getGradeName = (gradeId: string) => (grades ?? []).find((g: any) => g.id === gradeId)?.name ?? '-'
  const getSectionName = (sectionId: string) => (sections ?? []).find((s: any) => s.id === sectionId)?.name ?? '-'

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-black text-foreground">Student Records</h1>
        <p className="text-sm text-muted-foreground mt-1">Browse and verify student enrollment data</p>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              placeholder="Search by name or student ID..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
          >
            <option value="">All Grades</option>
            {(grades ?? []).map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select
            className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{filtered.length} student{filtered.length !== 1 ? 's' : ''} found</p>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="font-semibold text-muted-foreground">No students found</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/30">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Student</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Grade</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Section</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map((s: any) => (
                  <tr key={s.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-indigo-600">
                            {s.fullName?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{s.fullName}</p>
                          <p className="text-xs text-muted-foreground">{s.parent_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="font-mono text-xs text-muted-foreground">{s.student_id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-sm font-medium">{getGradeName(s.gradeId)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-sm text-muted-foreground">{getSectionName(s.sectionId)}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
                        s.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      )}>
                        {s.status ?? 'ACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
