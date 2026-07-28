'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/context/auth-context'
import { db } from '@/lib/db/database'
import { notifications } from '@/lib/utils/notifications'
import {
  User, Phone, Mail, MapPin, Calendar, Hash, BookOpen,
  Save, ArrowLeft, Loader2, CheckCircle2, AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils/utils'
import { PhoneInput } from '@/components/ui/phone-input'

function FormField({
  label, required, children, error
}: {
  label: string; required?: boolean; children: React.ReactNode; error?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-foreground">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-rose-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  )
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all',
        className
      )}
      {...props}
    />
  )
}

function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export default function RegisterStudentPage() {
  const { user } = useAuth()
  const [grades, setGrades] = useState<any[]>([])
  const [sections, setSections] = useState<any[]>([])
  const [streams, setStreams] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [nextId, setNextId] = useState('')
  const [form, setForm] = useState({
    fullName: '', gender: '', dateOfBirth: '',
    gradeId: '', sectionId: '', streamId: '',
    parentName: '', parentEmail: '', parentPhone: '',
    address: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    db.getNextStudentId().then(id => setNextId(id)).catch(() => {})
    db.getGrades().then(res => setGrades(res ?? [])).catch(() => {})
    db.getSections().then(res => setSections(res ?? [])).catch(() => {})
    db.getStreams().then(res => setStreams(res ?? [])).catch(() => {})
  }, [])

  const update = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => { const n = { ...e }; delete n[field]; return n })
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.fullName.trim()) errs.fullName = 'Full name is required'
    if (!form.gradeId) errs.gradeId = 'Grade is required'
    if (!form.sectionId) errs.sectionId = 'Section is required'
    if (!form.parentName.trim()) errs.parentName = 'Parent name is required'
    if (!form.parentPhone.trim()) errs.parentPhone = 'Parent phone is required'
    if (!form.parentEmail.trim()) errs.parentEmail = 'Parent email is required'
    else if (!/\S+@\S+\.\S+/.test(form.parentEmail)) errs.parentEmail = 'Invalid email address'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await db.addStudent({
        fullName: form.fullName,
        gender: form.gender || null,
        date_of_birth: form.dateOfBirth || null,
        gradeId: form.gradeId,
        sectionId: form.sectionId,
        streamId: form.streamId || null,
        parent_name: form.parentName,
        parent_email: form.parentEmail,
        parent_phone: form.parentPhone,
        address: form.address || null,
        status: 'ACTIVE',
      } as any)
      setSuccess(true)
      notifications.success('Student Registered', `${form.fullName} has been successfully enrolled.`)
      // Reset form
      setForm({ fullName: '', gender: '', dateOfBirth: '', gradeId: '', sectionId: '', streamId: '', parentName: '', parentEmail: '', parentPhone: '', address: '' })
      db.getNextStudentId().then(id => setNextId(id)).catch(() => {})
      setTimeout(() => setSuccess(false), 5000)
    } catch (err: any) {
      notifications.error('Registration Failed', err.message || 'Could not register student')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/school/registrar">
          <button className="p-2 rounded-xl border border-border hover:bg-secondary transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-foreground">Register New Student</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Complete all required fields to enroll a student</p>
        </div>
        {nextId && (
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/50 rounded-lg">
            <Hash className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">ID: {nextId}</span>
          </div>
        )}
      </div>

      {/* Success Banner */}
      {success && (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Student registered successfully! Records have been saved.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Student Information */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <h2 className="font-bold text-foreground">Student Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <FormField label="Full Name" required error={errors.fullName}>
                <Input placeholder="Enter student's full name" value={form.fullName} onChange={e => update('fullName', e.target.value)} />
              </FormField>
            </div>
            <FormField label="Gender">
              <Select value={form.gender} onChange={e => update('gender', e.target.value)}>
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </Select>
            </FormField>
            <FormField label="Date of Birth">
              <Input type="date" value={form.dateOfBirth} onChange={e => update('dateOfBirth', e.target.value)} />
            </FormField>
          </div>
        </div>

        {/* Academic Placement */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <h2 className="font-bold text-foreground">Academic Placement</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Grade" required error={errors.gradeId}>
              <Select value={form.gradeId} onChange={e => update('gradeId', e.target.value)}>
                <option value="">Select grade</option>
                {(grades ?? []).map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </Select>
            </FormField>
            <FormField label="Section" required error={errors.sectionId}>
              <Select value={form.sectionId} onChange={e => update('sectionId', e.target.value)}>
                <option value="">Select section</option>
                {(sections ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </FormField>
            {(streams ?? []).length > 0 && (
              <FormField label="Stream">
                <Select value={form.streamId} onChange={e => update('streamId', e.target.value)}>
                  <option value="">Select stream (optional)</option>
                  {(streams ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </FormField>
            )}
          </div>
        </div>

        {/* Parent / Guardian */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
              <Phone className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <h2 className="font-bold text-foreground">Parent / Guardian Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Parent/Guardian Name" required error={errors.parentName}>
              <Input placeholder="Full name of parent/guardian" value={form.parentName} onChange={e => update('parentName', e.target.value)} />
            </FormField>
            <FormField label="Phone Number" required error={errors.parentPhone}>
              <PhoneInput
                value={form.parentPhone}
                onChange={(val) => update('parentPhone', val)}
                required
              />
            </FormField>
            <FormField label="Email Address" required error={errors.parentEmail}>
              <Input type="email" placeholder="parent@example.com" value={form.parentEmail} onChange={e => update('parentEmail', e.target.value)} />
            </FormField>
            <FormField label="Home Address">
              <Input placeholder="Street address (optional)" value={form.address} onChange={e => update('address', e.target.value)} />
            </FormField>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/school/registrar">
            <button type="button" className="px-5 py-2.5 rounded-xl border border-border hover:bg-secondary text-sm font-semibold transition-colors">
              Cancel
            </button>
          </Link>
          <button
            type="submit" disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? 'Registering...' : 'Register Student'}
          </button>
        </div>
      </form>
    </div>
  )
}
