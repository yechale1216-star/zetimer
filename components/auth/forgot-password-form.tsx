"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { authService } from "@/lib/auth/auth"
import { notifications } from "@/lib/utils/notifications"
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from "lucide-react"

interface ForgotPasswordFormProps {
  onBackToLogin: () => void
}

export function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      notifications.error("Validation Error", "Please enter your email address")
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      notifications.error("Validation Error", "Please enter a valid email address")
      return
    }

    setIsLoading(true)

    try {
      const result = await authService.requestPasswordReset(email)

      if (result.success) {
        setEmailSent(true)
        notifications.success(
          "Reset Email Sent",
          "Password reset instructions have been sent."
        )
      } else {
        setEmailSent(true)
        notifications.success(
          "Reset Email Sent",
          "If an account exists, you'll receive instructions shortly."
        )
      }
    } catch (error) {
      notifications.error("Error", "An unexpected error occurred.")
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <Card className="border-border/40 shadow-2xl bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden border animate-in zoom-in-95 duration-500">
        <CardHeader className="text-center pt-8 pb-4">
          <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mb-4 border border-green-500/20">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <CardTitle className="typography-page-title">Check Your Email</CardTitle>
          <CardDescription>We've sent reset instructions to your inbox</CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8 text-center space-y-6">
          <p className="typography-body text-muted-foreground">
            Instructions have been sent to <strong className="text-foreground">{email}</strong>. 
            Please follow the link in the email to securely reset your password.
          </p>
          <div className="bg-muted/50 p-3 rounded-xl border border-border/50">
             <p className="text-[11px] text-muted-foreground italic">
               Didn't receive the email? Check your spam folder or try again in a few minutes.
             </p>
          </div>
          <Button variant="outline" onClick={onBackToLogin} className="w-full h-11 rounded-xl border-border/50 hover:bg-muted/50 transition-all">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/40 shadow-2xl bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden border">
      <CardHeader className="space-y-1 pb-6 pt-8 px-8 text-center relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBackToLogin}
          className="absolute left-4 top-4 text-muted-foreground hover:text-foreground rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <CardTitle className="typography-page-title">Reset Password</CardTitle>
        <CardDescription className="text-muted-foreground">
          Enter your email and we'll send you recovery instructions
        </CardDescription>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                <Mail className="w-4 h-4" />
              </div>
              <Input
                id="email"
                type="email"
                placeholder="name@school.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10 bg-background/50 border-border/50 h-12 focus:ring-2 focus:ring-primary/20 transition-all rounded-xl"
              />
            </div>
          </div>

          <Button type="submit" className="typography-card-title w-full h-12 rounded-xl shadow-lg shadow-primary/10 transition-all active:scale-[0.98]" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Reset Instructions"
            )}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-border/50 text-center">
          <Button variant="link" onClick={onBackToLogin} className="typography-label text-primary p-0 h-auto">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Login
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}



