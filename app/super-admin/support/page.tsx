'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Search, MessageSquare, AlertCircle, CheckCircle2, Clock, Loader2, MoreHorizontal } from 'lucide-react'
import { getApiUrl } from '@/lib/api-config'

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [stats, setStats] = useState({ urgent: 0, open: 0, closed: 0 })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [resolution, setResolution] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`${getApiUrl()}/api/super-admin/support?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('attendance_token')}` }
      })
      const json = await res.json()
      if (json.success) {
        setTickets(json.data.tickets)
        setStats(json.data.stats)
        setTotal(json.data.total)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTickets() }, [statusFilter, page])

  const filtered = tickets.filter(t =>
    !search || t.subject.toLowerCase().includes(search.toLowerCase()) ||
    t.school.toLowerCase().includes(search.toLowerCase())
  )

  const handleUpdateStatus = async (id: string, status: string) => {
    setSaving(true)
    const payload: any = { status }
    if (resolution) payload.resolution = resolution
    try {
      await fetch(`${getApiUrl()}/api/super-admin/support/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('attendance_token')}`
        },
        body: JSON.stringify(payload)
      })
      setSelectedTicket(null)
      setResolution('')
      fetchTickets()
    } finally {
      setSaving(false)
    }
  }

  const getStatusStyle = (s: string) => {
    if (s === 'urgent') return 'bg-red-500/10 text-red-600 border-red-500/20'
    if (s === 'open' || s === 'in_progress') return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
    return 'bg-green-500/10 text-green-600 border-green-500/20'
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Support Center</h1>
          <p className="text-muted-foreground mt-1">Manage help desk tickets from all school tenants</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Urgent', count: stats.urgent, color: 'text-red-600', bg: 'bg-red-100', icon: <AlertCircle className="w-5 h-5" />, val: 'urgent' },
          { label: 'Open', count: stats.open, color: 'text-blue-600', bg: 'bg-blue-100', icon: <Clock className="w-5 h-5" />, val: 'open' },
          { label: 'Closed', count: stats.closed, color: 'text-green-600', bg: 'bg-green-100', icon: <CheckCircle2 className="w-5 h-5" />, val: 'closed' },
        ].map(s => (
          <Card
            key={s.val}
            className={`cursor-pointer transition-all hover:border-primary/40 ${statusFilter === s.val ? 'border-primary ring-1 ring-primary/20' : ''}`}
            onClick={() => { setStatusFilter(s.val); setPage(1) }}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
              </div>
              <div className={`p-2 rounded-lg ${s.bg} ${s.color}`}>{s.icon}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by school or subject..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tickets</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Ticket List */}
      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground italic">No tickets found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium uppercase text-[10px] tracking-wider">Ticket #</th>
                    <th className="py-2 pr-4 font-medium uppercase text-[10px] tracking-wider">School</th>
                    <th className="py-2 pr-4 font-medium uppercase text-[10px] tracking-wider">Subject</th>
                    <th className="py-2 pr-4 font-medium uppercase text-[10px] tracking-wider">Category</th>
                    <th className="py-2 pr-4 font-medium uppercase text-[10px] tracking-wider">Status</th>
                    <th className="py-2 pr-4 font-medium uppercase text-[10px] tracking-wider">Assignee</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t.id} className="border-b border-border/70 hover:bg-secondary/20 transition-colors">
                      <td className="py-4 pr-4 font-mono text-xs text-muted-foreground">{t.ticketNumber}</td>
                      <td className="py-4 pr-4 font-medium">{t.school}</td>
                      <td className="py-4 pr-4 max-w-[200px] truncate">{t.subject}</td>
                      <td className="py-4 pr-4"><Badge variant="outline" className="text-[10px]">{t.category}</Badge></td>
                      <td className="py-4 pr-4">
                        <Badge variant="outline" className={`text-[10px] uppercase ${getStatusStyle(t.status)}`}>{t.status.replace('_', ' ')}</Badge>
                      </td>
                      <td className="py-4 pr-4 text-muted-foreground">{t.assignee}</td>
                      <td className="py-4 text-right">
                        <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => { setSelectedTicket(t); setResolution('') }}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > 20 && (
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Showing {Math.min((page-1)*20+1, total)}–{Math.min(page*20, total)} of {total}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p+1)} disabled={page*20 >= total}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket Detail Dialog */}
      {selectedTicket && (
        <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                {selectedTicket.ticketNumber}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div><p className="text-xs text-muted-foreground uppercase font-semibold">School</p><p className="font-medium">{selectedTicket.school}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase font-semibold">Subject</p><p>{selectedTicket.subject}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase font-semibold">Description</p><p className="text-sm text-muted-foreground">{selectedTicket.description || 'No description'}</p></div>
              <div className="flex gap-4">
                <div><p className="text-xs text-muted-foreground uppercase font-semibold">Category</p><p>{selectedTicket.category}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase font-semibold">Priority</p><p>{selectedTicket.priority}</p></div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Resolution / Notes</p>
                <Textarea placeholder="Add a resolution or note..." value={resolution} onChange={e => setResolution(e.target.value)} className="min-h-[80px]" />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => handleUpdateStatus(selectedTicket.id, 'in_progress')} disabled={saving} className="w-full sm:w-auto">Mark In Progress</Button>
              <Button variant="destructive" onClick={() => handleUpdateStatus(selectedTicket.id, 'urgent')} disabled={saving} className="w-full sm:w-auto">Escalate Urgent</Button>
              <Button onClick={() => handleUpdateStatus(selectedTicket.id, 'closed')} disabled={saving} className="w-full sm:w-auto gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Close Ticket
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
