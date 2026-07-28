'use client'

import React, { useState, useEffect } from 'react'
import { db } from '@/lib/db/database'
import { BarChart2, TrendingUp, Users, GraduationCap, PieChart, FileDown } from 'lucide-react'
import { cn } from '@/lib/utils/utils'

export default function RegistrarReportsPage() {
  const [students, setStudents] = useState<any[]>([])
  const [grades, setGrades] = useState<any[]>([])

  useEffect(() => {
    db.getStudents().then(res => setStudents(res ?? [])).catch(() => {})
    db.getGrades().then(res => setGrades(res ?? [])).catch(() => {})
  }, [])

  const total = students.length
  const active = students.filter((s: any) => s.status === 'ACTIVE').length
  const inactive = total - active

  const byGrade = grades.map((g: any) => {
    const count = students.filter((s: any) => s.gradeId === g.id).length
    const pct = total > 0 ? Math.round((count / total) * 100) : 0
    return { name: g.name, count, pct }
  }).filter((g: any) => g.count > 0).sort((a: any, b: any) => b.count - a.count)

  const byGender = [
    { label: 'Male', count: students?.filter((s: any) => s.gender === 'Male').length ?? 0, color: 'bg-blue-500' },
    { label: 'Female', count: students?.filter((s: any) => s.gender === 'Female').length ?? 0, color: 'bg-pink-500' },
    { label: 'Not Specified', count: students?.filter((s: any) => !s.gender).length ?? 0, color: 'bg-slate-400' },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Registration Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Enrollment statistics and analytics</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-secondary text-sm font-semibold transition-colors">
          <FileDown className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Enrolled', value: total, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
          { label: 'Active Students', value: active, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
          { label: 'Inactive', value: inactive, icon: BarChart2, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
          { label: 'Grade Levels', value: byGrade.length, icon: GraduationCap, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-2xl p-5 border border-border/60', s.bg)}>
            <s.icon className={cn('w-6 h-6 mb-3', s.color)} />
            <p className="text-2xl font-black text-foreground">{s.value}</p>
            <p className="text-xs font-semibold text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Enrollment by Grade */}
      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex items-center gap-2 mb-5">
          <BarChart2 className="w-4 h-4 text-indigo-500" />
          <h2 className="font-bold text-foreground">Enrollment by Grade</h2>
        </div>
        {byGrade.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
        ) : (
          <div className="space-y-3">
            {byGrade.map(g => (
              <div key={g.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-foreground">{g.name}</span>
                  <span className="text-sm text-muted-foreground">{g.count} ({g.pct}%)</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-700"
                    style={{ width: `${g.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gender Breakdown */}
      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex items-center gap-2 mb-5">
          <PieChart className="w-4 h-4 text-indigo-500" />
          <h2 className="font-bold text-foreground">Gender Breakdown</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {byGender.map(g => (
            <div key={g.label} className="text-center space-y-2">
              <div className="text-3xl font-black text-foreground">{g.count}</div>
              <div className={cn('h-1.5 rounded-full mx-auto w-12', g.color)} />
              <p className="text-xs font-semibold text-muted-foreground">{g.label}</p>
              <p className="text-xs text-muted-foreground/60">{total > 0 ? Math.round((g.count / total) * 100) : 0}%</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
