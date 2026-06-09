'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Send, Plus, Search, Loader2, MessageSquare, Clock, Users } from 'lucide-react'
import { getApiUrl } from '@/lib/auth/auth'

export default function CommunicationPage() {
  const [broadcasts, setBroadcasts] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [formData, setFormData] = useState({ title: '', content: '', type: 'info' })

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${getApiUrl()}/api/super-admin/broadcast-history?limit=50`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('attendance_token')}` }
      })
      const json = await res.json()
      if (json.success) {
        setBroadcasts(json.data.logs)
        setTotalCount(json.data.total)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchHistory() }, [])

  const handleSend = async () => {
    if (!formData.title || !formData.content) return alert('Please fill title and content')
    setIsSending(true)
    try {
      const res = await fetch(`${getApiUrl()}/api/super-admin/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('attendance_token')}`
        },
        body: JSON.stringify(formData)
      })
      const json = await res.json()
      if (json.success) {
        alert(`Sent to ${json.data.sentCount} admin(s)!`)
        setIsCreateDialogOpen(false)
        setFormData({ title: '', content: '', type: 'info' })
        fetchHistory()
      }
    } finally {
      setIsSending(false)
    }
  }

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      critical: 'bg-red-500/10 text-red-600 border-red-500/20',
      urgent: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      feature: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      info: 'bg-secondary text-muted-foreground',
    }
    return <Badge variant="outline" className={`text-[10px] uppercase ${styles[type] || styles.info}`}>{type}</Badge>
  }

  const filtered = broadcasts.filter(b =>
    !searchQuery ||
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const thisMonth = broadcasts.filter(b => {
    const d = new Date(b.sentAt)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Communication Center</h1>
          <p className="text-muted-foreground mt-1">Broadcast notifications to all school administrators</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />New Broadcast</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Platform Broadcast</DialogTitle>
              <DialogDescription>This message will be sent to all active school administrators.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Type</p>
                <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">ℹ️ Information</SelectItem>
                    <SelectItem value="feature">🚀 New Feature</SelectItem>
                    <SelectItem value="urgent">⚠️ Urgent Maintenance</SelectItem>
                    <SelectItem value="critical">🔴 Critical Update</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Title</p>
                <Input placeholder="e.g. System Maintenance on June 15..." value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Message</p>
                <Textarea placeholder="Full message content for administrators..." className="min-h-[130px]" value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isSending}>Cancel</Button>
              <Button onClick={handleSend} disabled={isSending} className="gap-2">
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Broadcast
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-xs text-muted-foreground uppercase font-semibold">Total Broadcasts</p><p className="text-2xl font-bold">{totalCount}</p></div>
            <MessageSquare className="w-6 h-6 text-muted-foreground/50" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-xs text-muted-foreground uppercase font-semibold">This Month</p><p className="text-2xl font-bold">{thisMonth}</p></div>
            <Clock className="w-6 h-6 text-muted-foreground/50" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Last Sent To</p>
              <p className="text-2xl font-bold">{broadcasts[0]?.sentCount ?? '—'}</p>
              <p className="text-xs text-muted-foreground">admins</p>
            </div>
            <Users className="w-6 h-6 text-muted-foreground/50" />
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search broadcast history..." className="pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Broadcast History */}
      <Card>
        <CardHeader>
          <CardTitle>Broadcast History</CardTitle>
          <CardDescription>All messages sent to school administrators</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground italic">No broadcasts yet. Send your first announcement!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map(b => (
                <div key={b.id} className="p-4 rounded-lg border border-border bg-secondary/20 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {getTypeBadge(b.type)}
                      <p className="font-medium text-sm">{b.title}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-muted-foreground">{new Date(b.sentAt).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">{b.sentCount} admins</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{b.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
