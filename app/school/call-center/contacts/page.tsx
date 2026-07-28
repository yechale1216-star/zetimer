'use client'

import React, { useState, useEffect } from 'react'
import { db } from '@/lib/db/database'
import { Search, Phone, User, MessageCircle, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils/utils'
import Link from 'next/link'
import { notifications } from '@/lib/utils/notifications'

export default function CallCenterContactsPage() {
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    db.getContacts()
      .then(res => setContacts(res ?? []))
      .catch(() => setContacts([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = contacts.filter(c =>
    !search ||
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  )

  const handleCall = async (contact: any) => {
    try {
      await db.logCall({ recipientId: contact.id, type: 'VOICE', status: 'INITIATED' })
      notifications.success('Call Initiated', `Dialing ${contact.full_name}...`)
    } catch (err: any) {
      notifications.error('Call Failed', err.message || 'Could not place call')
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Parent Directory</h1>
          <p className="text-sm text-muted-foreground mt-1">Search parents and staff contacts to initiate calls</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          placeholder="Search by name, phone or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 rounded-2xl bg-secondary/50 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="font-semibold text-muted-foreground">No contacts found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(c => (
            <div key={c.id} className="flex items-center justify-between p-4 rounded-2xl border border-border/60 bg-card hover:shadow-sm transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-black text-teal-700">{c.full_name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-foreground text-sm truncate">{c.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.phone || c.email || 'No contact details'}</p>
                  <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-secondary text-muted-foreground uppercase">
                    {c.role || 'Parent'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleCall(c)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
                >
                  <Phone className="w-3.5 h-3.5" /> Call
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
