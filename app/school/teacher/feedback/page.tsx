'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Star, Sparkles, Send, Heart, Loader2, MessageSquare, CheckCircle2 } from 'lucide-react'
import { notifications } from '@/lib/utils/notifications'
import { getApiUrl } from '@/lib/api-config'
import { cn } from '@/lib/utils/utils'
import { useAuth } from '@/lib/context/auth-context'

export default function TeacherFeedbackPage() {
  const { user } = useAuth()
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [category, setCategory] = useState('Marking Attendance')
  const [npsRecommend, setNpsRecommend] = useState('Definitely Yes')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) {
      notifications.error('Required Fields', 'Please enter a title and detailed comments.')
      return
    }

    try {
      setIsSubmitting(true)
      const payload = {
        subject: `[Teacher Feedback] ${subject}`,
        category: 'Feedback',
        priority: 'normal',
        description: `Teacher Feedback Details:
----------------------------
• Teacher Name: ${(user as any)?.full_name || (user as any)?.name || 'Teacher'}
• Rating: ${rating}/5 Stars
• Feedback Area: ${category}
• Would Recommend Zetime: ${npsRecommend}

Comments:
${description}`
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
      if (json.success || res.ok) {
        notifications.success('Thank You!', 'Your teacher feedback has been submitted successfully.')
        setIsSubmitted(true)
      } else {
        notifications.error('Error', json.message || 'Failed to submit feedback')
      }
    } catch (error) {
      notifications.error('Error', 'Could not send feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setRating(5)
    setSubject('')
    setDescription('')
    setCategory('Marking Attendance')
    setNpsRecommend('Definitely Yes')
    setIsSubmitted(false)
  }

  const ratingLabels: Record<number, string> = {
    1: '1 Star — Needs Major Work',
    2: '2 Stars — Needs Improvement',
    3: '3 Stars — Average / Satisfactory',
    4: '4 Stars — Good / Helpful',
    5: '5 Stars — Excellent / Makes Teaching Easier!'
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-primary" /> Teacher Feedback & Ratings
        </h1>
        <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
          Share your daily experience marking attendance, viewing rosters, and using reports.
        </p>
      </div>

      <Card className="border-none shadow-premium bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-primary via-indigo-600 to-violet-600 w-full" />
        
        <CardContent className="p-6 md:p-8">
          {isSubmitted ? (
            <div className="py-12 text-center space-y-6">
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Heart className="w-10 h-10 fill-primary/20" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Thank You For Your Feedback!
                </h3>
                <p className="text-sm text-slate-500 font-medium max-w-md mx-auto">
                  Your feedback helps our team optimize classroom tools for teachers.
                </p>
              </div>
              <Button onClick={handleReset} className="rounded-2xl font-bold text-xs px-6 h-11">
                Submit Another Response
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* STAR RATING COMPONENT */}
              <div className="p-6 bg-slate-50 dark:bg-slate-950/60 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-3 text-center">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Overall Teacher Tool Experience
                </Label>
                
                <div className="flex items-center justify-center gap-2 py-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (hoverRating || rating) >= star
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 transform transition-all hover:scale-125 focus:outline-none cursor-pointer"
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
                  {ratingLabels[hoverRating || rating]}
                </p>
              </div>

              {/* CATEGORY SELECTION */}
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Feedback Area</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-11 rounded-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold text-sm">
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Marking Attendance">✅ Daily Attendance Entry</SelectItem>
                    <SelectItem value="Class Rosters">📚 Class Rosters & Student Info</SelectItem>
                    <SelectItem value="Reports & Analytics">📊 Class Reports & Attendance Summary</SelectItem>
                    <SelectItem value="Communication">💬 Parent & Admin Messaging</SelectItem>
                    <SelectItem value="System Speed">⚡ App Speed & Responsiveness</SelectItem>
                    <SelectItem value="General">💡 General Feature Suggestion</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* NPS QUESTION */}
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Would you recommend Zetime to fellow teachers?
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  {['Definitely Yes', 'Maybe', 'Unlikely'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setNpsRecommend(option)}
                      className={cn(
                        "py-3 px-2 rounded-2xl font-bold text-xs border transition-all active:scale-95 cursor-pointer",
                        npsRecommend === option
                          ? "bg-primary text-white border-primary shadow-md"
                          : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* SUBJECT INPUT */}
              <div className="space-y-2">
                <Label htmlFor="teacher-subject" className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Summary Title
                </Label>
                <Input
                  id="teacher-subject"
                  placeholder="e.g. Quick attendance bulk-select button"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="h-11 rounded-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold text-sm"
                />
              </div>

              {/* DESCRIPTION TEXTAREA */}
              <div className="space-y-2">
                <Label htmlFor="teacher-desc" className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Detailed Feedback & Suggestions
                </Label>
                <Textarea
                  id="teacher-desc"
                  placeholder="Describe your classroom workflow experience or suggestions to make marking attendance faster..."
                  className="min-h-[140px] rounded-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm font-medium"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* SUBMIT BUTTON */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-2xl font-black text-sm gap-2 shadow-lg shadow-primary/20"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit Teacher Feedback
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
