'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MessageSquare,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Send,
  Star,
  Sparkles,
  Headphones,
  Heart,
  HelpCircle
} from 'lucide-react'
import { getApiUrl } from '@/lib/api-config'
import { notifications } from '@/lib/utils/notifications'
import { cn } from '@/lib/utils/utils'

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<'tickets' | 'new_ticket' | 'feedback'>('tickets')
  const [tickets, setTickets] = useState<any[]>([])
  const [stats, setStats] = useState({ open: 0, closed: 0, urgent: 0 })
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFeedbackSubmitted, setIsFeedbackSubmitted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Support Ticket Form State
  const [ticketFormData, setTicketFormData] = useState({
    subject: '',
    category: 'Technical',
    priority: 'normal',
    description: ''
  })

  // Feedback Form State
  const [feedbackRating, setFeedbackRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [feedbackCategory, setFeedbackCategory] = useState('Feature Request')
  const [feedbackModule, setFeedbackModule] = useState('Attendance Tracking')
  const [feedbackNps, setFeedbackNps] = useState('Definitely Yes')
  const [feedbackSubject, setFeedbackSubject] = useState('')
  const [feedbackDescription, setFeedbackDescription] = useState('')

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
        setTickets(json.data.tickets || [])
        setStats(json.data.stats || { open: 0, closed: 0, urgent: 0 })
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

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticketFormData.subject || !ticketFormData.description) {
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
        body: JSON.stringify(ticketFormData)
      })
      const json = await res.json()
      if (json.success) {
        notifications.success('Ticket Submitted', `Your ticket ${json.data.ticketNumber} has been created.`)
        setTicketFormData({ subject: '', category: 'Technical', priority: 'normal', description: '' })
        setActiveTab('tickets')
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

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedbackSubject.trim() || !feedbackDescription.trim()) {
      notifications.error('Missing Required Fields', 'Please enter a title and description for your feedback.')
      return
    }

    try {
      setIsSubmitting(true)
      const payload = {
        subject: `[Feedback] ${feedbackSubject}`,
        category: 'Feedback',
        priority: 'normal',
        description: `Feedback Details:
----------------------------
• Satisfaction Rating: ${feedbackRating}/5 Stars
• Category: ${feedbackCategory}
• Targeted Module: ${feedbackModule}
• Would Recommend Zetime: ${feedbackNps}

Comments:
${feedbackDescription}`
      }

      const res = await fetch(`${getApiUrl()}/api/schools/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('attendance_token')}`
        },
        body: JSON.stringify(payload)
      })

      const json = await res.json()
      if (json.success) {
        notifications.success('Feedback Received', 'Thank you! Your feedback has been sent to our team.')
        setIsFeedbackSubmitted(true)
        fetchTickets()
      } else {
        notifications.error('Error', json.message || 'Failed to submit feedback')
      }
    } catch (error) {
      notifications.error('Error', 'Failed to submit feedback')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetFeedbackForm = () => {
    setFeedbackRating(5)
    setFeedbackSubject('')
    setFeedbackDescription('')
    setFeedbackCategory('Feature Request')
    setFeedbackModule('Attendance Tracking')
    setFeedbackNps('Definitely Yes')
    setIsFeedbackSubmitted(false)
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

  const filteredTickets = tickets.filter(t => 
    t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const ratingLabels: Record<number, string> = {
    1: '1 Star — Poor / Dissatisfied',
    2: '2 Stars — Needs Improvement',
    3: '3 Stars — Average / Satisfactory',
    4: '4 Stars — Good / Happy',
    5: '5 Stars — Excellent / Highly Satisfied!'
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm backdrop-blur-sm">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Headphones className="w-7 h-7 text-primary" /> Help Desk & Feedback
          </h1>
          <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Submit technical support tickets or share feedback to help us improve Zetime
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeTab === 'tickets' ? 'default' : 'outline'}
            onClick={() => setActiveTab('tickets')}
            className="rounded-2xl font-bold text-xs h-11 px-5"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Support Requests
          </Button>
          <Button
            variant={activeTab === 'feedback' ? 'default' : 'outline'}
            onClick={() => {
              setActiveTab('feedback')
              setIsFeedbackSubmitted(false)
            }}
            className="rounded-2xl font-bold text-xs h-11 px-5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-none shadow-md shadow-violet-500/20"
          >
            <Sparkles className="w-4 h-4 mr-2 text-amber-300" />
            Give Feedback
          </Button>
          {activeTab !== 'new_ticket' && (
            <Button
              variant="outline"
              onClick={() => setActiveTab('new_ticket')}
              className="rounded-2xl font-bold text-xs h-11 px-4 border-slate-200 dark:border-slate-800"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Ticket
            </Button>
          )}
        </div>
      </div>

      {/* VIEW 1: SUPPORT TICKETS LIST */}
      {activeTab === 'tickets' && (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-100 dark:border-slate-800 rounded-3xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Open Requests</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.open}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-100 dark:border-slate-800 rounded-3xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-red-500/10 text-red-600">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Urgent Priority</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.urgent}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-100 dark:border-slate-800 rounded-3xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-green-500/10 text-green-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Resolved Tickets</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.closed}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ticket List Card */}
          <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-xl font-black uppercase tracking-tight">Support & Feedback History</CardTitle>
                <CardDescription>Track status updates on your requests and feedback.</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Search tickets..." 
                  className="pl-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-10 rounded-2xl text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-16 flex justify-center items-center gap-2 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="font-bold text-xs uppercase tracking-wider">Loading tickets...</span>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="py-20 text-center space-y-3 px-4">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                    <MessageSquare className="w-8 h-8 text-slate-400/60" />
                  </div>
                  <p className="text-slate-400 font-bold text-sm">No support requests or feedback found.</p>
                  <div className="flex justify-center gap-3 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('new_ticket')} className="rounded-2xl text-xs font-bold">
                      Create Support Request
                    </Button>
                    <Button size="sm" onClick={() => setActiveTab('feedback')} className="rounded-2xl text-xs font-bold bg-violet-600 text-white hover:bg-violet-700">
                      Give Feedback
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-2.5 rounded-2xl mt-0.5 ${
                          ticket.category === 'Feedback'
                            ? 'bg-violet-500/10 text-violet-600'
                            : ticket.status === 'closed' 
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' 
                              : 'bg-primary/10 text-primary'
                        }`}>
                          {ticket.category === 'Feedback' ? <Sparkles className="w-4 h-4 text-violet-600" /> : <MessageSquare className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-slate-900 dark:text-white leading-tight">{ticket.subject}</p>
                            {getStatusBadge(ticket.status)}
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono font-bold mb-1 uppercase tracking-tight">
                            {ticket.ticketNumber} • Category: <span className="text-primary">{ticket.category}</span>
                          </p>
                          <p className="text-xs text-slate-500 font-medium line-clamp-2 max-w-lg">{ticket.description}</p>
                        </div>
                      </div>

                      <div className="mt-4 sm:mt-0 flex items-center justify-between sm:justify-end gap-6 pl-12 sm:pl-0">
                        <div className="text-right">
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Priority</p>
                          <p className={`text-xs font-bold ${
                            ticket.priority === 'urgent' ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'
                          }`}>
                            {ticket.priority}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Created</p>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* VIEW 2: FEEDBACK COLLECTOR FORM */}
      {activeTab === 'feedback' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <Card className="overflow-hidden border-none shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl">
            <div className="h-2 bg-gradient-to-r from-violet-600 via-indigo-600 to-primary w-full" />
            <CardHeader className="p-6 md:p-8 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-violet-500/10 text-violet-600 rounded-2xl">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                    Share Product Feedback
                  </CardTitle>
                  <CardDescription className="text-xs font-medium">
                    Help us shape Zetime. Your thoughts, feature ideas, and ratings go directly to our engineering & product team.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 md:p-8 pt-0">
              {isFeedbackSubmitted ? (
                <div className="py-12 text-center space-y-6">
                  <div className="w-20 h-20 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <Heart className="w-10 h-10 fill-green-500/20" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      Thank You For Your Feedback!
                    </h3>
                    <p className="text-sm text-slate-500 font-medium max-w-md mx-auto">
                      Your input has been collected and logged. We review school feedback continuously to improve our application.
                    </p>
                  </div>
                  <div className="flex justify-center gap-3 pt-4">
                    <Button onClick={resetFeedbackForm} className="rounded-2xl font-bold text-xs px-6 h-11">
                      Submit Another Feedback
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab('tickets')} className="rounded-2xl font-bold text-xs px-6 h-11 border-slate-200 dark:border-slate-800">
                      View My Requests
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit} className="space-y-6">
                  {/* STAR RATING COMPONENT */}
                  <div className="p-6 bg-slate-50 dark:bg-slate-950/60 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-3 text-center">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
                      Overall Platform Experience Rating
                    </Label>
                    
                    <div className="flex items-center justify-center gap-2 py-2">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isFilled = (hoverRating || feedbackRating) >= star
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setFeedbackRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1 transform transition-all hover:scale-125 focus:outline-none"
                          >
                            <Star
                              className={cn(
                                "w-9 h-9 transition-colors",
                                isFilled
                                  ? "fill-amber-400 text-amber-400 drop-shadow-md"
                                  : "text-slate-300 dark:text-slate-700"
                              )}
                            />
                          </button>
                        )
                      })}
                    </div>

                    <p className="text-xs font-black text-primary uppercase tracking-wider">
                      {ratingLabels[hoverRating || feedbackRating]}
                    </p>
                  </div>

                  {/* CATEGORY & MODULE SELECT */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Feedback Type</Label>
                      <Select value={feedbackCategory} onValueChange={setFeedbackCategory}>
                        <SelectTrigger className="h-11 rounded-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold text-sm">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Feature Request">💡 Feature Request / Suggestion</SelectItem>
                          <SelectItem value="UI & Design">🎨 UI & User Experience</SelectItem>
                          <SelectItem value="Performance">⚡ Speed & Performance</SelectItem>
                          <SelectItem value="Bug Report">🐛 Bug or Unexpected Behavior</SelectItem>
                          <SelectItem value="General Feedback">💬 General Feedback</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Target Feature / Module</Label>
                      <Select value={feedbackModule} onValueChange={setFeedbackModule}>
                        <SelectTrigger className="h-11 rounded-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold text-sm">
                          <SelectValue placeholder="Select module" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Attendance Tracking">Attendance Tracking</SelectItem>
                          <SelectItem value="Student Promotion Wizard">Student Promotion Wizard</SelectItem>
                          <SelectItem value="Student & Teacher Management">Student & Teacher Roster</SelectItem>
                          <SelectItem value="Parent Portal & Messaging">Parent Portal & Messaging</SelectItem>
                          <SelectItem value="Reports & Analytics">Reports & Analytics</SelectItem>
                          <SelectItem value="Subscriptions & Billing">Subscriptions & Billing</SelectItem>
                          <SelectItem value="Overall Platform">Entire Application</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* RECOMMENDATION NPS */}
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Would you recommend Zetime to other school administrators?
                    </Label>
                    <div className="grid grid-cols-3 gap-3">
                      {['Definitely Yes', 'Maybe', 'Unlikely'].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setFeedbackNps(option)}
                          className={cn(
                            "py-3 px-2 rounded-2xl font-bold text-xs border transition-all active:scale-95",
                            feedbackNps === option
                              ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                              : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                          )}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* TITLE SUBJECT */}
                  <div className="space-y-2">
                    <Label htmlFor="feedback-subject" className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Feedback Summary Title
                    </Label>
                    <Input
                      id="feedback-subject"
                      placeholder="e.g. Add Excel export for monthly attendance summaries"
                      value={feedbackSubject}
                      onChange={(e) => setFeedbackSubject(e.target.value)}
                      className="h-11 rounded-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold text-sm"
                    />
                  </div>

                  {/* DETAILED COMMENTS */}
                  <div className="space-y-2">
                    <Label htmlFor="feedback-desc" className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Detailed Feedback & Suggestions
                    </Label>
                    <Textarea
                      id="feedback-desc"
                      placeholder="Describe what you like, what can be improved, or any specific features you would love to see..."
                      className="min-h-[140px] rounded-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm font-medium"
                      value={feedbackDescription}
                      onChange={(e) => setFeedbackDescription(e.target.value)}
                    />
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="pt-2 flex items-center gap-3">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 h-13 rounded-2xl font-black text-sm gap-2 shadow-lg shadow-violet-500/20 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Submit Feedback
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveTab('tickets')}
                      disabled={isSubmitting}
                      className="h-13 rounded-2xl px-6 font-bold text-slate-500 border-slate-200 dark:border-slate-800"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* VIEW 3: NEW SUPPORT TICKET FORM */}
      {activeTab === 'new_ticket' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="overflow-hidden border-none shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl">
            <div className="h-2 bg-gradient-to-r from-primary to-primary/40 w-full" />
            <CardHeader className="p-6 md:p-8 pb-4">
              <CardTitle className="text-2xl font-black uppercase tracking-tight">New Support Request</CardTitle>
              <CardDescription className="text-xs font-medium">Describe your issue or technical question in detail</CardDescription>
            </CardHeader>

            <CardContent className="p-6 md:p-8 pt-0">
              <form onSubmit={handleTicketSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Category</Label>
                    <Select
                      value={ticketFormData.category}
                      onValueChange={(v) => setTicketFormData({ ...ticketFormData, category: v })}
                    >
                      <SelectTrigger className="h-11 rounded-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold text-sm">
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
                    <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Priority</Label>
                    <Select
                      value={ticketFormData.priority}
                      onValueChange={(v) => setTicketFormData({ ...ticketFormData, priority: v })}
                    >
                      <SelectTrigger className="h-11 rounded-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold text-sm">
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
                  <Label htmlFor="subject" className="text-xs font-black uppercase tracking-wider text-slate-500">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Briefly describe the topic..."
                    value={ticketFormData.subject}
                    onChange={(e) => setTicketFormData({ ...ticketFormData, subject: e.target.value })}
                    className="h-11 rounded-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-xs font-black uppercase tracking-wider text-slate-500">Detailed Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Please provide steps to reproduce or specific questions..."
                    className="min-h-[150px] rounded-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm font-medium"
                    value={ticketFormData.description}
                    onChange={(e) => setTicketFormData({ ...ticketFormData, description: e.target.value })}
                  />
                  <p className="text-[10px] text-slate-400 font-medium italic">
                    Include any specific error messages or IDs if applicable.
                  </p>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <Button type="submit" disabled={isSubmitting} className="flex-1 h-13 rounded-2xl font-black text-sm gap-2 shadow-lg shadow-primary/20">
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Submit Support Request
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab('tickets')}
                    disabled={isSubmitting}
                    className="h-13 rounded-2xl px-6 font-bold text-slate-500 border-slate-200 dark:border-slate-800"
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
