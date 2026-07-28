'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/context/auth-context'
import { apiFetch } from '@/lib/utils/fetch-with-timeout'
import { API_URL } from '@/lib/api-config'
import { notifications } from '@/lib/utils/notifications'
import { FilePlus, ArrowLeft, Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils/utils'

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const SEV_COLORS: Record<string, string> = {
  LOW: 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400',
  MEDIUM: 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400',
  HIGH: 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400',
  CRITICAL: 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400',
}

import { db } from '@/lib/db/database'

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="text-sm font-semibold text-foreground block mb-1.5">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
  )
}

export default function NewIncidentPage() {
  const { user } = useAuth()
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [form, setForm] = useState({
    studentId: '', gradeId: '', sectionId: '', severity: 'LOW',
    categoryId: '', categoryName: '', title: '', description: '',
    date: new Date().toISOString().split('T')[0], time: '',
    location: '', immediateAction: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    db.getStudents().then(res => setStudents(res ?? [])).catch(() => {})
    const token = localStorage.getItem('attendance_token')
    const schoolId = localStorage.getItem('x-school-id')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    if (schoolId) headers['x-school-id'] = schoolId
    apiFetch<{ success: boolean; data: any[] }>(`${API_URL}/api/discipline/categories`, { headers })
      .then(r => setCategories(r.data ?? []))
      .catch(() => {})
  }, [])

  const update = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => { const n = { ...e }; delete n[field]; return n })
    if (field === 'studentId' && value) {
      const student = students?.find((s: any) => s.id === value)
      if (student) setForm(f => ({ ...f, studentId: value, gradeId: student.gradeId, sectionId: student.sectionId }))
    }
    if (field === 'categoryId' && value) {
      const cat = categories.find(c => c.id === value)
      if (cat) setForm(f => ({ ...f, categoryId: value, categoryName: cat.name }))
    }
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.studentId) errs.studentId = 'Select a student'
    if (!form.title.trim()) errs.title = 'Title is required'
    if (!form.description.trim()) errs.description = 'Description is required'
    if (!form.categoryName.trim()) errs.categoryName = 'Category is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const token = localStorage.getItem('attendance_token')
      const schoolId = localStorage.getItem('x-school-id')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      if (schoolId) headers['x-school-id'] = schoolId
      await apiFetch(`${API_URL}/api/discipline`, {
        method: 'POST', headers,
        body: JSON.stringify({
          studentId: form.studentId,
          gradeId: form.gradeId,
          sectionId: form.sectionId,
          severity: form.severity,
          categoryId: form.categoryId || undefined,
          categoryName: form.categoryName,
          title: form.title,
          description: form.description,
          date: form.date,
          time: form.time || undefined,
          location: form.location || undefined,
          immediateAction: form.immediateAction || undefined,
          reportedByName: user?.name,
        }),
      })
      setSuccess(true)
      notifications.success('Incident Reported', 'The discipline case has been created successfully.')
      setForm({ studentId: '', gradeId: '', sectionId: '', severity: 'LOW', categoryId: '', categoryName: '', title: '', description: '', date: new Date().toISOString().split('T')[0], time: '', location: '', immediateAction: '' })
      setTimeout(() => setSuccess(false), 5000)
    } catch (err: any) {
      notifications.error('Failed', err.message || 'Could not create incident')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto w-full space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/school/discipline-officer">
          <button className="p-2 rounded-xl border border-border hover:bg-secondary transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-foreground">Report New Incident</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Document a student discipline or conduct case</p>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Incident reported successfully and case created.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Student + Classification */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <FilePlus className="w-4 h-4 text-amber-500" /> Incident Details
          </h2>

          {/* Severity Selector */}
          <div>
            <FieldLabel label="Severity Level" required />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SEVERITIES.map(s => (
                <button type="button" key={s} onClick={() => update('severity', s)}
                  className={cn('px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition-all', form.severity === s ? SEV_COLORS[s] : 'border-border bg-background text-muted-foreground hover:border-muted-foreground/40')}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel label="Involved Student" required />
              <select className={cn('w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30', errors.studentId ? 'border-rose-400' : 'border-border')}
                value={form.studentId} onChange={e => update('studentId', e.target.value)}>
                <option value="">Select student</option>
                {(students ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
              </select>
              {errors.studentId && <p className="text-xs text-rose-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.studentId}</p>}
            </div>
            <div>
              <FieldLabel label="Category" required />
              {categories.length > 0 ? (
                <select className={cn('w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30', errors.categoryName ? 'border-rose-400' : 'border-border')}
                  value={form.categoryId} onChange={e => update('categoryId', e.target.value)}>
                  <option value="">Select category</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              ) : (
                <input className={cn('w-full px-4 py-2.5 rounded-xl border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30', errors.categoryName ? 'border-rose-400' : 'border-border')}
                  placeholder="e.g. Physical Altercation" value={form.categoryName} onChange={e => update('categoryName', e.target.value)} />
              )}
              {errors.categoryName && <p className="text-xs text-rose-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.categoryName}</p>}
            </div>
          </div>

          <div>
            <FieldLabel label="Incident Title" required />
            <input className={cn('w-full px-4 py-2.5 rounded-xl border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30', errors.title ? 'border-rose-400' : 'border-border')}
              placeholder="Brief summary of the incident" value={form.title} onChange={e => update('title', e.target.value)} />
            {errors.title && <p className="text-xs text-rose-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.title}</p>}
          </div>

          <div>
            <FieldLabel label="Description" required />
            <textarea rows={4} className={cn('w-full px-4 py-2.5 rounded-xl border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none', errors.description ? 'border-rose-400' : 'border-border')}
              placeholder="Detailed description of what occurred..." value={form.description} onChange={e => update('description', e.target.value)} />
            {errors.description && <p className="text-xs text-rose-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.description}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FieldLabel label="Date" />
              <input type="date" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                value={form.date} onChange={e => update('date', e.target.value)} />
            </div>
            <div>
              <FieldLabel label="Time" />
              <input type="time" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                value={form.time} onChange={e => update('time', e.target.value)} />
            </div>
            <div>
              <FieldLabel label="Location" />
              <input className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                placeholder="e.g. Classroom 3B" value={form.location} onChange={e => update('location', e.target.value)} />
            </div>
          </div>

          <div>
            <FieldLabel label="Immediate Action Taken" />
            <textarea rows={3} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none"
              placeholder="What was done immediately after the incident..." value={form.immediateAction} onChange={e => update('immediateAction', e.target.value)} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/school/discipline-officer">
            <button type="button" className="px-5 py-2.5 rounded-xl border border-border hover:bg-secondary text-sm font-semibold transition-colors">Cancel</button>
          </Link>
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-amber-500/20">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? 'Submitting...' : 'Submit Incident Report'}
          </button>
        </div>
      </form>
    </div>
  )
}
