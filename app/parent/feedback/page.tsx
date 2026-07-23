"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Star, Sparkles, Send, Heart, Loader2, MessageSquare } from "lucide-react"
import { useLanguage } from "@/lib/context/language-context"
import { notifications } from "@/lib/utils/notifications"
import { getApiUrl } from "@/lib/api-config"
import { cn } from "@/lib/utils/utils"

export default function ParentFeedbackPage() {
  const { t } = useLanguage()
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [category, setCategory] = useState("Portal Experience")
  const [npsRecommend, setNpsRecommend] = useState("Definitely Yes")
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) {
      notifications.error("Required Fields", "Please enter a subject title and detailed comments.")
      return
    }

    try {
      setIsSubmitting(true)
      const userStr = localStorage.getItem("attendance_current_user")
      const user = userStr ? JSON.parse(userStr) : null

      const payload = {
        subject: `[Parent Feedback] ${subject}`,
        category: "Feedback",
        priority: "normal",
        description: `Parent Feedback Details:
----------------------------
• Parent Phone: ${user?.phone || 'N/A'}
• Rating: ${rating}/5 Stars
• Feedback Area: ${category}
• Would Recommend Zetime: ${npsRecommend}

Comments:
${description}`
      }

      const res = await fetch(`${getApiUrl()}/api/schools/support`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("attendance_token")}`
        },
        body: JSON.stringify(payload)
      })

      const json = await res.json()
      if (json.success || res.ok) {
        notifications.success("Thank You!", "Your feedback has been submitted successfully.")
        setIsSubmitted(true)
      } else {
        notifications.error("Error", json.message || "Failed to submit feedback")
      }
    } catch (error) {
      notifications.error("Error", "Could not send feedback. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setRating(5)
    setSubject("")
    setDescription("")
    setCategory("Portal Experience")
    setNpsRecommend("Definitely Yes")
    setIsSubmitted(false)
  }

  const ratingLabels: Record<number, string> = {
    1: "1 Star — Poor",
    2: "2 Stars — Fair",
    3: "3 Stars — Average",
    4: "4 Stars — Very Good",
    5: "5 Stars — Excellent!"
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-500 pb-20 px-2 md:px-0">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-primary" /> Parent Feedback
        </h1>
        <p className="typography-label text-muted-foreground mt-1">
          Tell us about your experience using the Parent Portal and receiving school alerts.
        </p>
      </div>

      <Card className="border-border/40 shadow-xl rounded-3xl bg-card/70 backdrop-blur-md overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-primary w-full" />
        
        <CardContent className="p-6 md:p-8">
          {isSubmitted ? (
            <div className="py-12 text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Heart className="w-10 h-10 fill-emerald-500/20" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">
                  Thank You For Your Feedback!
                </h3>
                <p className="text-sm text-muted-foreground font-medium max-w-md mx-auto">
                  Your response helps us improve Zetime Parent Portal for families and schools across Ethiopia.
                </p>
              </div>
              <Button onClick={handleReset} className="rounded-2xl font-bold text-xs px-6 h-11 bg-emerald-600 hover:bg-emerald-700 text-white">
                Submit Another Response
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* STAR RATING COMPONENT */}
              <div className="p-6 bg-muted/20 rounded-3xl border border-border/10 space-y-3 text-center">
                <Label className="typography-label uppercase text-muted-foreground">
                  Overall Portal Experience Rating
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
                              : "text-muted-foreground/30"
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
                <Label className="typography-label uppercase text-muted-foreground">Feedback Area</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-11 rounded-2xl bg-card border-border/40 font-bold text-sm">
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Portal Experience">📱 Parent Portal Mobile App / Web Experience</SelectItem>
                    <SelectItem value="Attendance Alerts">🔔 Attendance Alerts & Notifications</SelectItem>
                    <SelectItem value="Teacher Communication">💬 Messaging & Teacher Communication</SelectItem>
                    <SelectItem value="Student Information">🎓 Student Profile & Reports</SelectItem>
                    <SelectItem value="General">💭 General Feedback & Ideas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* NPS QUESTION */}
              <div className="space-y-2">
                <Label className="typography-label uppercase text-muted-foreground">
                  Would you recommend Zetime to other parents and schools?
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  {["Definitely Yes", "Maybe", "Unlikely"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setNpsRecommend(option)}
                      className={cn(
                        "py-3 px-2 rounded-2xl font-bold text-xs border transition-all active:scale-95 cursor-pointer",
                        npsRecommend === option
                          ? "bg-primary text-primary-foreground border-primary shadow-md"
                          : "bg-card border-border/40 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* SUBJECT INPUT */}
              <div className="space-y-2">
                <Label htmlFor="parent-subject" className="typography-label uppercase text-muted-foreground">
                  Feedback Title / Summary
                </Label>
                <Input
                  id="parent-subject"
                  placeholder="e.g. Great SMS notifications, easy to use"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="h-11 rounded-2xl bg-card border-border/40 font-bold text-sm"
                />
              </div>

              {/* DESCRIPTION TEXTAREA */}
              <div className="space-y-2">
                <Label htmlFor="parent-desc" className="typography-label uppercase text-muted-foreground">
                  Detailed Comments & Suggestions
                </Label>
                <Textarea
                  id="parent-desc"
                  placeholder="Please share what you enjoy or any suggestions for features that would help you monitor your child's attendance..."
                  className="min-h-[140px] rounded-2xl bg-card border-border/40 text-sm font-medium"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* SUBMIT BUTTON */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-2xl font-black text-sm gap-2 shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit Parent Feedback
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
