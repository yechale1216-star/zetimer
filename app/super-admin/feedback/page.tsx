'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import {
  Star,
  Sparkles,
  Search,
  MessageSquare,
  Users,
  CheckCircle2,
  Clock,
  Loader2,
  TrendingUp,
  Building2,
  Filter,
  Eye,
  Heart
} from 'lucide-react'
import { getApiUrl } from '@/lib/api-config'
import { notifications } from '@/lib/utils/notifications'

export default function SuperAdminFeedbackPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'teacher' | 'parent'>('all')
  const [ratingFilter, setRatingFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const fetchFeedbackTickets = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${getApiUrl()}/api/super-admin/support?limit=100`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('attendance_token')}` }
      })
      const json = await res.json()
      if (json.success) {
        // Filter tickets that are feedback items (subject starts with [Feedback], [Parent Feedback], [Teacher Feedback] or category is Feedback)
        const allTickets: any[] = json.data.tickets || []
        const feedbackItems = allTickets.filter((t: any) => 
          t.category === 'Feedback' || 
          t.subject.toLowerCase().includes('feedback')
        )
        setTickets(feedbackItems)
      }
    } catch (err) {
      console.error('Failed to load feedback:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeedbackTickets()
  }, [])

  // Parse rating & role metadata from description if formatted by our feedback collectors
  const parsedFeedbackList = useMemo(() => {
    return tickets.map(t => {
      const desc = t.description || ''
      const isParent = t.subject.includes('[Parent Feedback]')
      const isTeacher = t.subject.includes('[Teacher Feedback]')
      const role = isParent ? 'parent' : isTeacher ? 'teacher' : 'admin'
      
      const ratingMatch = desc.match(/Rating:\s*(\d)\/5/i)
      const rating = ratingMatch ? parseInt(ratingMatch[1]) : 5

      const areaMatch = desc.match(/(?:Feedback Area|Targeted Module):\s*(.+)/i)
      const area = areaMatch ? areaMatch[1].trim() : 'General'

      const npsMatch = desc.match(/Recommend Zetime:\s*(.+)/i)
      const nps = npsMatch ? npsMatch[1].trim() : 'Yes'

      return {
        ...t,
        role,
        rating,
        area,
        nps
      }
    })
  }, [tickets])

  // Analytics Metrics
  const metrics = useMemo(() => {
    if (!parsedFeedbackList.length) {
      return { avgRating: 5.0, total: 0, adminCount: 0, teacherCount: 0, parentCount: 0, recommendPct: 100 }
    }
    const total = parsedFeedbackList.length
    const sumRating = parsedFeedbackList.reduce((acc, f) => acc + f.rating, 0)
    const avgRating = (sumRating / total).toFixed(1)
    
    const adminCount = parsedFeedbackList.filter(f => f.role === 'admin').length
    const teacherCount = parsedFeedbackList.filter(f => f.role === 'teacher').length
    const parentCount = parsedFeedbackList.filter(f => f.role === 'parent').length
    
    const recommendCount = parsedFeedbackList.filter(f => f.nps.toLowerCase().includes('yes') || f.nps.toLowerCase().includes('definitely')).length
    const recommendPct = Math.round((recommendCount / total) * 100)

    return { avgRating, total, adminCount, teacherCount, parentCount, recommendPct }
  }, [parsedFeedbackList])

  // Filtered List
  const filteredFeedback = parsedFeedbackList.filter(f => {
    if (roleFilter !== 'all' && f.role !== roleFilter) return false
    if (ratingFilter !== 'all') {
      if (ratingFilter === '5' && f.rating !== 5) return false
      if (ratingFilter === '4' && f.rating !== 4) return false
      if (ratingFilter === '3' && f.rating !== 3) return false
      if (ratingFilter === 'low' && f.rating > 2) return false
    }
    if (search) {
      const q = search.toLowerCase()
      const matchSub = f.subject.toLowerCase().includes(q)
      const matchSchool = (f.school || '').toLowerCase().includes(q)
      const matchDesc = f.description.toLowerCase().includes(q)
      if (!matchSub && !matchSchool && !matchDesc) return false
    }
    return true
  })

  const handleMarkStatus = async (id: string, status: string) => {
    try {
      setSaving(true)
      await fetch(`${getApiUrl()}/api/super-admin/support/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('attendance_token')}`
        },
        body: JSON.stringify({ status })
      })
      notifications.success('Updated', `Feedback marked as ${status}`)
      setSelectedFeedback(null)
      fetchFeedbackTickets()
    } catch (e) {
      notifications.error('Error', 'Failed to update feedback status')
    } finally {
      setSaving(false)
    }
  }

  const getRoleBadge = (role: string) => {
    if (role === 'admin') return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold">School Admin</Badge>
    if (role === 'teacher') return <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 font-bold">Teacher</Badge>
    return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">Parent</Badge>
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-violet-600" /> Platform Feedback Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Analyze, monitor, and respond to user experience ratings across all school tenants and user roles.
          </p>
        </div>
      </div>

      {/* METRICS & ANALYTICS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20 rounded-3xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-widest">Avg Platform Rating</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-black text-foreground">{metrics.avgRating}</span>
                <span className="text-xs text-muted-foreground font-bold">/ 5.0</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3.5 h-3.5 ${
                      star <= Math.round(Number(metrics.avgRating))
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="p-3 bg-amber-500/20 text-amber-600 rounded-2xl">
              <Star className="w-6 h-6 fill-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-border/40 rounded-3xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Feedback</p>
              <p className="text-4xl font-black text-foreground mt-1">{metrics.total}</p>
              <p className="text-[10px] text-muted-foreground font-bold mt-1">Collected across app</p>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              <MessageSquare className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-border/40 rounded-3xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">NPS Recommendation</p>
              <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{metrics.recommendPct}%</p>
              <p className="text-[10px] text-muted-foreground font-bold mt-1">Would recommend Zetime</p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl">
              <Heart className="w-6 h-6 fill-emerald-500/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-border/40 rounded-3xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Submissions by Role</p>
              <div className="flex items-center gap-2 mt-2 text-xs font-bold">
                <span className="text-blue-600">Admins: {metrics.adminCount}</span>
                <span>•</span>
                <span className="text-indigo-600">Teachers: {metrics.teacherCount}</span>
                <span>•</span>
                <span className="text-emerald-600">Parents: {metrics.parentCount}</span>
              </div>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTER & SEARCH BAR */}
      <Card className="rounded-3xl border-border/40 bg-card/60 backdrop-blur-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Role Filter Tabs */}
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-2xl w-full md:w-auto">
              {[
                { key: 'all', label: 'All Roles' },
                { key: 'admin', label: 'Admins' },
                { key: 'teacher', label: 'Teachers' },
                { key: 'parent', label: 'Parents' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setRoleFilter(tab.key as any)}
                  className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    roleFilter === tab.key
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Rating Filter & Search */}
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by school, subject, or text..."
                  className="pl-10 h-10 rounded-2xl text-xs font-medium"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger className="w-full sm:w-[150px] h-10 rounded-2xl text-xs font-bold">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">⭐ All Ratings</SelectItem>
                  <SelectItem value="5">⭐⭐⭐⭐⭐ (5 Stars)</SelectItem>
                  <SelectItem value="4">⭐⭐⭐⭐ (4 Stars)</SelectItem>
                  <SelectItem value="3">⭐⭐⭐ (3 Stars)</SelectItem>
                  <SelectItem value="low">⭐ 1-2 Stars</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FEEDBACK ENTRIES FEED */}
      <Card className="rounded-3xl border-border/40 overflow-hidden bg-card/60 backdrop-blur-sm shadow-sm">
        <CardHeader className="pb-3 border-b border-border/20">
          <CardTitle className="text-lg font-black uppercase tracking-tight">Feedback Submissions</CardTitle>
          <CardDescription>Review qualitative comments and star ratings submitted by users.</CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 flex justify-center items-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="font-bold text-xs uppercase tracking-wider">Loading feedback...</span>
            </div>
          ) : filteredFeedback.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground space-y-2">
              <Sparkles className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <p className="font-bold text-sm">No feedback entries found matching your filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {filteredFeedback.map((item) => (
                <div
                  key={item.id}
                  className="p-5 hover:bg-muted/10 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                  onClick={() => setSelectedFeedback(item)}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500 shrink-0 mt-0.5">
                      <Star className="w-5 h-5 fill-amber-400" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-sm text-foreground">{item.subject.replace(/^\[.*?\]\s*/, '')}</span>
                        {getRoleBadge(item.role)}
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          {item.area}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= item.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground">• School: {item.school || 'Platform User'}</span>
                        <span className="text-[10px] font-medium text-muted-foreground">• {new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>

                      <p className="text-xs text-muted-foreground font-medium line-clamp-2 mt-1">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-2xl text-xs font-bold h-9 px-4 gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedFeedback(item)
                      }}
                    >
                      <Eye className="w-3.5 h-3.5" /> Inspect
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* FEEDBACK DETAIL INSPECTION DIALOG */}
      <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
        <DialogContent className="max-w-2xl rounded-3xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              {selectedFeedback && getRoleBadge(selectedFeedback.role)}
              <Badge variant="outline" className="text-[10px] font-bold">{selectedFeedback?.area}</Badge>
            </div>
            <DialogTitle className="text-xl font-black">{selectedFeedback?.subject}</DialogTitle>
            <DialogDescription className="text-xs">
              Submitted by {selectedFeedback?.school || 'User'} on {selectedFeedback ? new Date(selectedFeedback.createdAt).toLocaleString() : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-muted/20 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-muted-foreground">Rating Score</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        s <= selectedFeedback.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20'
                      }`}
                    />
                  ))}
                  <span className="text-sm font-black ml-1 text-foreground">{selectedFeedback.rating}/5</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Feedback Body & Meta</label>
                <div className="p-4 bg-card border border-border/40 rounded-2xl text-sm font-medium whitespace-pre-wrap leading-relaxed">
                  {selectedFeedback.description}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setSelectedFeedback(null)} className="rounded-2xl text-xs font-bold">
              Close
            </Button>
            <Button
              onClick={() => handleMarkStatus(selectedFeedback.id, 'closed')}
              disabled={saving}
              className="rounded-2xl font-bold text-xs bg-green-600 text-white hover:bg-green-700"
            >
              Mark Reviewed / Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
