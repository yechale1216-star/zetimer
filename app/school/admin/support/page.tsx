'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  MessageSquare,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Send
} from 'lucide-react'
import { getApiUrl } from '@/lib/auth/auth'
import { notifications } from '@/lib/utils/notifications'

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [stats, setStats] = useState({ open: 0, closed: 0, urgent: 0 })
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [formData, setFormData] = useState({
    subject: '',
    category: 'Technical',
    priority: 'normal',
    description: ''
  })

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${getApiUrl()}/api/schools/support`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('attendance_token')}`
        }
      })
      const json = await res.json()
      if (json.success) {
        setTickets(json.data.tickets)
        setStats(json.data.stats)
      } else {
        notifications.error('Error', json.message || 'Failed to load tickets')
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.subject || !formData.description) {
      notifications.error('Error', 'Please fill in all required fields')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch(`${getApiUrl()}/api/schools/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('attendance_token')}`
        },
        body: JSON.stringify(formData)
      })
      const json = await res.json()
      if (json.success) {
        notifications.success('Ticket Submitted', `Your ticket ${json.data.ticketNumber} has been created.`)
        setFormData({ subject: '', category: 'Technical', priority: 'normal', description: '' })
        setShowNewTicket(false)
        fetchTickets()
      } else {
        notifications.error('Error', json.message || 'Failed to submit ticket')
      }
    } catch (error) {
      notifications.error('Error', 'Failed to submit support ticket')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      open: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      urgent: 'bg-red-500/10 text-red-600 border-red-500/20',
      closed: 'bg-green-500/10 text-green-600 border-green-500/20',
      in_progress: 'bg-amber-500/10 text-amber-600 border-amber-500/20'
    }
    return <Badge variant="outline" className={`capitalize ${styles[status] || ''}`}>{status.replace('_', ' ')}</Badge>
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            Help & Support
          </h1>
          <p className="text-muted-foreground mt-1">Get technical assistance or report issues to the platform administrators</p>
        </div>
        <Button onClick={() => setShowNewTicket(!showNewTicket)} className="gap-2 shadow-lg shadow-primary/20">
          {showNewTicket ? (
            'Back to Tickets'
          ) : (
            <>
              <Plus className="w-4 h-4" /> New Request
            </>
          )}
        </Button>
      </div>

      {!showNewTicket ? (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-primary/10">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Open Requests</p>
                  <p className="text-2xl font-bold">{stats.open}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-primary/10">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Urgent</p>
                  <p className="text-2xl font-bold">{stats.urgent}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-primary/10">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Resolved</p>
                  <p className="text-2xl font-bold">{stats.closed}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ticket List */}
          <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>My Support Requests</CardTitle>
                <CardDescription>Track the status of your help requests</CardDescription>
              </div>
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search tickets..." className="pl-9 h-9" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto">
                    <MessageSquare className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground italic">No support requests found.</p>
                  <Button variant="outline" size="sm" onClick={() => setShowNewTicket(true)}>
                    Submit your first request
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-transparent hover:border-primary/20 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg mt-1 ${
                          ticket.status === 'closed' ? 'bg-secondary text-muted-foreground' : 'bg-primary/10 text-primary'
                        }`}>
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-foreground">{ticket.subject}</p>
                            {getStatusBadge(ticket.status)}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono mb-1">{ticket.ticketNumber} • {ticket.category}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1 max-w-md">{ticket.description}</p>
                        </div>
                      </div>
                      <div className="mt-4 sm:mt-0 flex items-center justify-between sm:justify-end gap-6 pl-12 sm:pl-0">
                        <div className="text-right">
                          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Priority</p>
                          <p className={`text-sm font-medium ${
                            ticket.priority === 'urgent' ? 'text-red-500' : 'text-foreground'
                          }`}>
                            {ticket.priority}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Created</p>
                          <p className="text-sm font-medium text-foreground">
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* New Ticket Form */
        <div className="max-w-2xl mx-auto">
          <Card className="overflow-hidden border-none shadow-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
            <div className="h-2 bg-gradient-to-r from-primary to-primary/40 w-full" />
            <CardHeader>
              <CardTitle className="text-2xl">New Support Request</CardTitle>
              <CardDescription>Describe your issue or question in detail</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(v) => setFormData({ ...formData, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Technical">Technical Issue</SelectItem>
                        <SelectItem value="Billing">Billing & Subscription</SelectItem>
                        <SelectItem value="Feature">Feature Request</SelectItem>
                        <SelectItem value="Account">Account Access</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(v) => setFormData({ ...formData, priority: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent / Blocked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Briefly describe the topic..."
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Detailed Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Please provide steps to reproduce or specific questions..."
                    className="min-h-[150px] focus:ring-primary/20"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground italic">
                    Include any specific error messages or IDs if applicable.
                  </p>
                </div>

                <div className="pt-4 flex items-center gap-3">
                  <Button type="submit" disabled={isSubmitting} className="flex-1 gap-2 shadow-lg shadow-primary/20 h-11">
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Submit Request
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewTicket(false)}
                    disabled={isSubmitting}
                    className="h-11 px-6"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
