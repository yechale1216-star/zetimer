"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { authService } from "@/lib/auth/auth"
import { notifications } from "@/lib/utils/notifications"
import { Eye, EyeOff, CheckCircle2, Lock, Loader2, XCircle } from "lucide-react"

interface ResetPasswordFormProps {
  token: string
  onResetSuccess: () => void
}

export function ResetPasswordForm({ token, onResetSuccess }: ResetPasswordFormProps) {
  const [passwords, setPasswords] = useState({
    password: "",
    confirmPassword: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const result = await authService.verifyResetToken(token)
        setTokenValid(result.valid)
        if (!result.valid) {
          notifications.error("Invalid Token", "This reset link is invalid or has expired.")
        }
      } catch (error) {
        setTokenValid(false)
        notifications.error("Error", "Unable to verify reset token.")
      }
    }

    if (token) {
      verifyToken()
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!passwords.password || !passwords.confirmPassword) {
      notifications.error("Validation Error", "Please fill in all fields")
      return
    }

    if (passwords.password !== passwords.confirmPassword) {
      notifications.error("Validation Error", "Passwords do not match")
      return
    }

    if (passwords.password.length < 6) {
      notifications.error("Validation Error", "Password must be at least 6 characters")
      return
    }

    setIsLoading(true)

    try {
      const result = await authService.resetPassword(token, passwords.password)

      if (result.success) {
        notifications.success("Password Reset", "Your password has been successfully reset!")
        onResetSuccess()
      } else {
        notifications.error("Reset Failed", result.error || "Failed to reset password")
      }
    } catch (error) {
      notifications.error("Error", "An unexpected error occurred.")
    } finally {
      setIsLoading(false)
    }
  }

  if (tokenValid === null) {
    return (
      <Card className="border-border/40 shadow-2xl bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden border animate-pulse">
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="typography-label text-muted-foreground">Verifying reset token...</p>
        </CardContent>
      </Card>
    )
  }

  if (tokenValid === false) {
    return (
      <Card className="border-border/40 shadow-2xl bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden border">
        <CardHeader className="text-center pt-8 pb-4">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mb-4 border border-destructive/20">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="typography-page-title text-destructive">Invalid Reset Link</CardTitle>
          <CardDescription>This link is invalid or has expired</CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8 text-center space-y-6">
          <p className="typography-body text-muted-foreground">
            Password reset links expire after 1 hour for security reasons. Please request a new link if needed.
          </p>
          <Button onClick={() => (window.location.href = "/login")} className="w-full h-11 rounded-xl shadow-lg shadow-primary/10">
            Request New Reset Link
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/40 shadow-2xl bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden border">
      <CardHeader className="space-y-1 pb-6 pt-8 px-8 text-center relative">
        <CardTitle className="typography-page-title">Set New Password</CardTitle>
        <CardDescription className="text-muted-foreground">
          Create a secure new password for your account
        </CardDescription>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                <Lock className="w-4 h-4" />
              </div>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={passwords.password}
                onChange={(e) => setPasswords((prev) => ({ ...prev, password: e.target.value }))}
                required
                minLength={6}
                className="pl-10 pr-10 bg-background/50 border-border/50 h-12 focus:ring-2 focus:ring-primary/20 transition-all rounded-xl"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                <Lock className="w-4 h-4" />
              </div>
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your new password"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                required
                minLength={6}
                className="pl-10 pr-10 bg-background/50 border-border/50 h-12 focus:ring-2 focus:ring-primary/20 transition-all rounded-xl"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {passwords.password && passwords.confirmPassword && (
            <div className="animate-in fade-in duration-300">
              {passwords.password === passwords.confirmPassword ? (
                <div className="typography-helper flex items-center text-green-600 bg-green-500/10 p-2 rounded-lg border border-green-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Passwords match
                </div>
              ) : (
                <div className="typography-helper flex items-center text-destructive bg-destructive/10 p-2 rounded-lg border border-destructive/20">
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  Passwords do not match
                </div>
              )}
            </div>
          )}

          <Button 
            type="submit" 
            className="typography-card-title w-full h-12 rounded-xl shadow-lg shadow-primary/10 transition-all active:scale-[0.98]" 
            disabled={isLoading || passwords.password !== passwords.confirmPassword}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}



