'use client'

import React, { useState, useEffect } from 'react'
import { db } from '@/lib/db/database'
import { History, PhoneCall, CheckCircle2, PhoneMissed, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils/utils'

export default function CallCenterHistoryPage() {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    db.getCallHistoryApi()
      .then(res => setHistory(res ?? []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-black text-foreground">Call Logs & History</h1>
        <p className="text-sm text-muted-foreground mt-1">Audit log of all placed and received call communications</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 rounded-2xl bg-secondary/50 animate-pulse" />)}
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border/60">
          <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-semibold text-muted-foreground">No call history found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((c, idx) => (
            <div key={c.id || idx} className="flex items-center justify-between p-4 rounded-2xl border border-border/60 bg-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
                  <PhoneCall className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">{c.recipientName || c.recipientId || 'Parent Contact'}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    {new Date(c.createdAt || Date.now()).toLocaleString()}
                  </p>
                </div>
              </div>
              <span className={cn(
                'text-xs font-bold px-3 py-1 rounded-full',
                c.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30'
              )}>
                {c.status || 'LOGGED'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
