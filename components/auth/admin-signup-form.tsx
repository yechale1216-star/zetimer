"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { authService, type SignupCredentials } from "@/lib/auth/auth"
import { notifications } from "@/lib/utils/notifications"
import { ArrowLeft, User, Phone, Mail, Lock, ShieldCheck, Loader2 } from "lucide-react"

interface AdminSignupFormProps {
  onSignupSuccess: () => void
  onBack: () => void
}

export function AdminSignupForm({ onSignupSuccess, onBack }: AdminSignupFormProps) {
  const [credentials, setCredentials] = useState<SignupCredentials>({
    phone: "+251",
    email: "",
    password: "",
    confirmPassword: "",
    role: "admin",
    name: "",
    schoolName: "",
  })

  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string>("")

  const handleNameChange = (name: string) => {
    setCredentials((prev) => ({ ...prev, name }))
    setFieldErrors((prev) => ({ ...prev, name: "" }))
  }

  const handlePhoneChange = (phone: string) => {
    let cleaned = phone.replace(/[^\d+]/g, "")
    if (cleaned.lastIndexOf("+") > 0) {
      cleaned = "+" + cleaned.replace(/\+/g, "")
    }
    setCredentials((prev) => ({ ...prev, phone: cleaned }))
    setFieldErrors((prev) => ({ ...prev, phone: "" }))
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!credentials.name.trim()) {
      newErrors.name = "Admin name is required"
    }
    
    if (!credentials.schoolName?.trim()) {
      newErrors.schoolName = "School name is required"
    }


    if (!credentials.phone.trim()) {
      newErrors.phone = "Phone number is required"
    } else if (!credentials.phone.startsWith("+251")) {
      newErrors.phone = "Phone must start with +251"
    } else if (credentials.phone.length !== 13) {
      newErrors.phone = "Phone must be exactly 13 characters"
    } else if (!/^\+251[179]/.test(credentials.phone)) {
      newErrors.phone = "Invalid Ethiopian mobile prefix"
    }

    if (!credentials.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
      newErrors.email = "Invalid email format"
    }

    if (!credentials.password) {
      newErrors.password = "Password is required"
    } else if (credentials.password.length < 6) {
      newErrors.password = "Minimum 6 characters"
    }

    if (credentials.password !== credentials.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    setFieldErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneralError("")

    if (!validateForm()) {
      setGeneralError("Please fix the errors below to continue")
      return
    }

    setIsLoading(true)

    try {
      const result = await authService.signup(credentials)

      if (result.success && result.user) {
        notifications.success(
          "Admin Account Created",
          `Welcome ${result.user.name}! Please set up your school information.`
        )
        setTimeout(() => {
          onSignupSuccess()
        }, 1500)
      } else {
        const errorMessage = result.error || "Failed to create account"
        setGeneralError(errorMessage)
        notifications.error("Signup Failed", errorMessage)
      }
    } catch (error) {
      setGeneralError("An unexpected error occurred.")
      notifications.error("Signup Error", "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-border/40 shadow-2xl bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden border">
      <CardHeader className="space-y-1 pb-6 pt-8 px-8 text-center relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="absolute left-4 top-4 text-muted-foreground hover:text-foreground rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <CardTitle className="typography-page-title">Create Admin Account</CardTitle>
        <CardDescription className="text-muted-foreground">
          Register your school and start tracking attendance
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 sm:px-8 pb-8">
        {generalError && (
          <div className="typography-body bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-6 animate-in slide-in-from-top-2">
            <p className="typography-label text-destructive flex items-center gap-2">
              <span className="typography-card-title">✕</span>
              {generalError}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Admin Name</Label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                <User className="w-4 h-4" />
              </div>
              <Input
                id="name"
                placeholder="Enter your full name"
                value={credentials.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                className={`pl-10 bg-background/50 border-border/50 h-11 focus:ring-2 focus:ring-primary/20 transition-all rounded-xl ${
                  fieldErrors.name ? "border-destructive ring-destructive/10" : ""
                }`}
              />
            </div>
            {fieldErrors.name && <p className="text-[10px] text-destructive ml-1">{fieldErrors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="schoolName">School Name</Label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <Input
                id="schoolName"
                placeholder="Enter your school name"
                value={credentials.schoolName}
                onChange={(e) => {
                    setCredentials((prev) => ({ ...prev, schoolName: e.target.value }))
                    setFieldErrors((prev) => ({ ...prev, schoolName: "" }))
                }}
                required
                className={`pl-10 bg-background/50 border-border/50 h-11 focus:ring-2 focus:ring-primary/20 transition-all rounded-xl ${
                  fieldErrors.schoolName ? "border-destructive ring-destructive/10" : ""
                }`}
              />
            </div>
            {fieldErrors.schoolName && <p className="text-[10px] text-destructive ml-1">{fieldErrors.schoolName}</p>}
          </div>


          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                <Phone className="w-4 h-4" />
              </div>
              <Input
                id="phone"
                type="tel"
                placeholder="+251911234567"
                maxLength={13}
                value={credentials.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                required
                className={`pl-10 bg-background/50 border-border/50 h-11 focus:ring-2 focus:ring-primary/20 transition-all rounded-xl ${
                  fieldErrors.phone ? "border-destructive ring-destructive/10" : ""
                }`}
              />
            </div>
            <p className="text-[10px] text-muted-foreground ml-1">Format: +251 911 223344</p>
            {fieldErrors.phone && <p className="text-[10px] text-destructive ml-1">{fieldErrors.phone}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                <Mail className="w-4 h-4" />
              </div>
              <Input
                id="email"
                type="email"
                placeholder="name@school.com"
                value={credentials.email}
                onChange={(e) => {
                  setCredentials((prev) => ({ ...prev, email: e.target.value }))
                  setFieldErrors((prev) => ({ ...prev, email: "" }))
                }}
                required
                className={`pl-10 bg-background/50 border-border/50 h-11 focus:ring-2 focus:ring-primary/20 transition-all rounded-xl ${
                  fieldErrors.email ? "border-destructive ring-destructive/10" : ""
                }`}
              />
            </div>
            {fieldErrors.email && <p className="text-[10px] text-destructive ml-1">{fieldErrors.email}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min 6 chars"
                  value={credentials.password}
                  onChange={(e) => {
                    setCredentials((prev) => ({ ...prev, password: e.target.value }))
                    setFieldErrors((prev) => ({ ...prev, password: "" }))
                  }}
                  required
                  className={`pl-10 bg-background/50 border-border/50 h-11 focus:ring-2 focus:ring-primary/20 transition-all rounded-xl ${
                    fieldErrors.password ? "border-destructive ring-destructive/10" : ""
                  }`}
                />
              </div>
              {fieldErrors.password && <p className="text-[10px] text-destructive ml-1">{fieldErrors.password}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm</Label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repeat"
                  value={credentials.confirmPassword}
                  onChange={(e) => {
                    setCredentials((prev) => ({ ...prev, confirmPassword: e.target.value }))
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }))
                  }}
                  required
                  className={`pl-10 bg-background/50 border-border/50 h-11 focus:ring-2 focus:ring-primary/20 transition-all rounded-xl ${
                    fieldErrors.confirmPassword ? "border-destructive ring-destructive/10" : ""
                  }`}
                />
              </div>
              {fieldErrors.confirmPassword && <p className="text-[10px] text-destructive ml-1">{fieldErrors.confirmPassword}</p>}
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 flex gap-3 items-start animate-in zoom-in-95 duration-500 delay-150">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="typography-helper text-muted-foreground">
              <strong className="text-foreground">Full Admin Control:</strong> You will be able to manage students, teachers, and generate comprehensive school reports.
            </p>
          </div>

          <Button type="submit" className="typography-card-title w-full h-11 rounded-xl shadow-lg shadow-primary/10 transition-all active:scale-[0.98] mt-2" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              "Create Admin Account"
            )}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-border/50 text-center">
          <p className="typography-helper text-muted-foreground">
            Already have an account?{" "}
            <Button variant="link" onClick={onBack} className="typography-label h-auto p-0 text-primary">
              Sign In
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}



