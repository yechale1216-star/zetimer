'use client'

import React, { useState } from 'react'
import { PhoneCall, Clock, CheckCircle, AlertCircle, Phone } from 'lucide-react'
import { notifications } from '@/lib/utils/notifications'

const MOCK_QUEUE = [
  { id: 'q1', parentName: 'Sarah Jenkins', studentName: 'Emma Jenkins', phone: '+1 (555) 234-5678', reason: 'Absence Inquiry', time: '10 mins ago', priority: 'HIGH' },
  { id: 'q2', parentName: 'Michael Brown', studentName: 'David Brown', phone: '+1 (555) 876-5432', reason: 'Registration Follow-up', time: '25 mins ago', priority: 'MEDIUM' },
  { id: 'q3', parentName: 'Elena Rostova', studentName: 'Alex Rostova', phone: '+1 (555) 345-6789', reason: 'General Inquiry', time: '40 mins ago', priority: 'LOW' },
]

export default function CallCenterQueuePage() {
  const [queue, setQueue] = useState(MOCK_QUEUE)

  const handleComplete = (id: string) => {
    setQueue(q => q.filter(item => item.id !== id))
    notifications.success('Callback Handled', 'Call queue item marked as completed.')
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-black text-foreground">Callback Queue</h1>
        <p className="text-sm text-muted-foreground mt-1">Pending parent callback requests requiring officer response</p>
      </div>

      {queue.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border/60">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <p className="font-semibold text-foreground">Queue is Clear!</p>
          <p className="text-sm text-muted-foreground mt-1">No pending parent callbacks at this time.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map(item => (
            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border/60 bg-card">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <PhoneCall className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-foreground text-sm">{item.parentName}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                      Student: {item.studentName}
                    </span>
                  </div>
                  <p className="text-xs text-teal-600 font-semibold mt-0.5">{item.phone} · {item.reason}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Requested {item.time}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => handleComplete(item.id)}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" /> Call & Complete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
