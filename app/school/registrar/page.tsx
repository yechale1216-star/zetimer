'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/context/auth-context'
import { db } from '@/lib/db/database'
import {
  ClipboardList, Users, CheckCircle2, Clock, TrendingUp,
  ArrowUpRight, Plus, FileText, AlertCircle, Calendar, Star
} from 'lucide-react'
import { cn } from '@/lib/utils/utils'
import Link from 'next/link'

function StatCard({
  title, value, subtitle, icon: Icon, color, trend, href
}: {
  title: string
  value: string | number
  subtitle: string
  icon: React.ElementType
  color: string
  trend?: { value: number; label: string }
  href?: string
}) {
  const content = (
    <div className={cn(
      'group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 transition-all duration-300',
      href && 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer'
    )}>
      <div className={cn('absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity', `bg-gradient-to-br ${color} opacity-[0.02]`)} />
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', `bg-gradient-to-br ${color}`)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {href && <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />}
      </div>
      <p className="text-2xl font-black text-foreground">{value}</p>
      <p className="text-sm font-semibold text-muted-foreground mt-0.5">{title}</p>
      <p className="text-xs text-muted-foreground/70 mt-1">{subtitle}</p>
      {trend && (
        <div className="mt-3 flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-xs font-semibold text-emerald-600">+{trend.value}% {trend.label}</span>
        </div>
      )}
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

export default function RegistrarDashboard() {
  const { user } = useAuth()
  const [students, setStudents] = useState<any[]>([])
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000)
    db.getStudents().then(res => setStudents(res ?? [])).catch(() => {})
    return () => clearInterval(t)
  }, [])

  const totalStudents = students?.length ?? 0
  const activeStudents = students?.filter((s: any) => s.status === 'ACTIVE').length ?? 0
  const today = time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const stats = [
    {
      title: 'Total Students',
      value: totalStudents.toLocaleString(),
      subtitle: 'All enrolled students',
      icon: Users,
      color: 'from-indigo-500 to-indigo-600',
      href: '/school/registrar/students',
    },
    {
      title: 'Active Students',
      value: activeStudents.toLocaleString(),
      subtitle: 'Currently enrolled & active',
      icon: CheckCircle2,
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      title: 'Pending Records',
      value: Math.max(0, totalStudents - activeStudents),
      subtitle: 'Awaiting completion',
      icon: Clock,
      color: 'from-amber-500 to-amber-600',
    },
    {
      title: "Today's Date",
      value: time.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
      subtitle: today,
      icon: Calendar,
      color: 'from-violet-500 to-violet-600',
    },
  ]

  const quickActions = [
    { label: 'Register New Student', href: '/school/registrar/register', icon: Plus, color: 'bg-indigo-500 hover:bg-indigo-600' },
    { label: 'View Student Records', href: '/school/registrar/students', icon: Users, color: 'bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700' },
    { label: 'Generate Report', href: '/school/registrar/reports', icon: FileText, color: 'bg-violet-500 hover:bg-violet-600' },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest">Registrar Portal</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground">
            Welcome, {user?.name?.split(' ')[0] ?? 'Officer'} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{today}</p>
        </div>
        <Link href="/school/registrar/register">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0">
            <Plus className="w-4 h-4" />
            Register Student
          </button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => <StatCard key={s.title} {...s} />)}
      </div>

      {/* Quick Actions + Responsibilities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">Quick Actions</h2>
          {quickActions.map(a => (
            <Link key={a.href} href={a.href}>
              <div className={cn('flex items-center gap-3 px-4 py-3.5 rounded-xl text-white font-semibold text-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 mt-2', a.color)}>
                <a.icon className="w-5 h-5 flex-shrink-0" />
                {a.label}
                <ArrowUpRight className="w-4 h-4 ml-auto opacity-60" />
              </div>
            </Link>
          ))}
        </div>

        {/* Responsibilities */}
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-indigo-500" />
            <h2 className="font-bold text-foreground">Your Responsibilities</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Student Intake & Enrollment', desc: 'Process new student registrations and intake forms' },
              { label: 'Record Maintenance', desc: 'Keep student profiles accurate and up to date' },
              { label: 'Document Management', desc: 'Manage enrollment documents and official records' },
              { label: 'Registration Reports', desc: 'Generate enrollment statistics and analytics' },
              { label: 'Parent Communication', desc: 'Coordinate with parents during enrollment process' },
              { label: 'Data Accuracy', desc: 'Ensure all student information is complete and verified' },
            ].map(r => (
              <div key={r.label} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{r.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Permissions Info */}
      <div className="rounded-2xl border border-indigo-200/50 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-800/30 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-indigo-800 dark:text-indigo-200 text-sm">Role Permissions Summary</p>
            <p className="text-xs text-indigo-700/70 dark:text-indigo-300/70 mt-1 leading-relaxed">
              As a <strong>Student Registration Officer</strong>, you can: register new students, view and edit student records,
              access attendance data (read-only), generate registration reports, and view communications.
              You do not have access to discipline cases, call center functions, or system settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
