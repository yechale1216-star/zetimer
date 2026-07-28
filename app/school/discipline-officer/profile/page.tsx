'use client'
import React from 'react'
import { useAuth } from '@/lib/context/auth-context'
import { Mail, Phone, Shield, Scale } from 'lucide-react'

export default function DisciplineOfficerProfile() {
  const { user } = useAuth()
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto w-full space-y-6">
      <h1 className="text-2xl font-black text-foreground">My Profile</h1>
      <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 flex items-center justify-center">
            <span className="text-2xl font-black text-amber-600">{user?.name?.charAt(0)?.toUpperCase()}</span>
          </div>
          <div>
            <p className="text-xl font-black text-foreground">{user?.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-sm font-semibold text-amber-600">Student Discipline & Conduct Officer</span>
            </div>
          </div>
        </div>
        <div className="space-y-3 pt-4 border-t border-border/40">
          {[
            { icon: Mail, label: 'Email', value: user?.email },
            { icon: Phone, label: 'Phone', value: user?.phone || 'Not set' },
            { icon: Shield, label: 'Role', value: 'Discipline Officer' },
            { icon: Scale, label: 'School ID', value: user?.schoolId || 'N/A' },
          ].map(f => (
            <div key={f.label} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
              <f.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{f.label}</p>
                <p className="text-sm font-semibold text-foreground">{f.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
