"use client"

import type React from "react"
import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { authService, type SignupCredentials } from "@/lib/auth/auth"
import { notifications } from "@/lib/utils/notifications"
import { ArrowLeft, User, Phone, Mail, Lock, ShieldCheck, Loader2, Eye, EyeOff, CheckCircle2, ExternalLink, MapPin, ArrowRight } from "lucide-react"
import { Logo } from "@/components/logo"
import Link from "next/link"

interface AdminSignupFormProps {
  onSignupSuccess: (user?: any) => void
  onBack: () => void
}

type PasswordStrength = "weak" | "medium" | "strong"

function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return "weak"
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecial = /[^A-Za-z0-9]/.test(password)
  const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length
  if (score >= 3 && password.length >= 10) return "strong"
  if (score >= 2) return "medium"
  return "weak"
}

const strengthConfig = {
  weak: { label: "Weak", color: "bg-destructive", textColor: "text-red-500", width: "w-1/3" },
  medium: { label: "Medium", color: "bg-yellow-500", textColor: "text-yellow-600", width: "w-2/3" },
  strong: { label: "Strong", color: "bg-emerald-500", textColor: "text-emerald-600", width: "w-full" },
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
    schoolAddress: "",
  })

  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string>("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [checkingPhone, setCheckingPhone] = useState(false)
  const emailDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const phoneDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const passwordStrength = credentials.password ? getPasswordStrength(credentials.password) : null

  // ─── Field handlers ───────────────────────────────────────────────────────

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

  const handleEmailBlur = useCallback((email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    if (emailDebounce.current) clearTimeout(emailDebounce.current)
    emailDebounce.current = setTimeout(async () => {
      setCheckingEmail(true)
      const { available } = await authService.checkEmailAvailability(email)
      setCheckingEmail(false)
      if (!available) {
        setFieldErrors((prev) => ({ ...prev, email: "This email is already registered" }))
      }
    }, 400)
  }, [])

  const handlePhoneBlur = useCallback((phone: string) => {
    if (!phone || phone.length !== 13) return
    if (phoneDebounce.current) clearTimeout(phoneDebounce.current)
    phoneDebounce.current = setTimeout(async () => {
      setCheckingPhone(true)
      const { available } = await authService.checkPhoneAvailability(phone)
      setCheckingPhone(false)
      if (!available) {
        setFieldErrors((prev) => ({ ...prev, phone: "This phone number is already registered" }))
      }
    }, 400)
  }, [])

  // ─── Validation ────────────────────────────────────────────────────────────

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!credentials.name.trim()) {
      newErrors.name = "Admin name is required"
    } else if (credentials.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters"
    }

    if (!credentials.schoolName?.trim()) {
      newErrors.schoolName = "School name is required"
    }

    if (!credentials.schoolAddress?.trim()) {
      newErrors.schoolAddress = "School address is required"
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
    } else if (credentials.password.length < 8) {
      newErrors.password = "Minimum 8 characters required"
    }

    if (credentials.password !== credentials.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    if (!termsAccepted) {
      newErrors.terms = "You must accept the Terms & Conditions"
    }

    const merged = { ...newErrors }
    if (fieldErrors.email && !newErrors.email) merged.email = fieldErrors.email
    if (fieldErrors.phone && !newErrors.phone) merged.phone = fieldErrors.phone

    setFieldErrors(merged)
    return Object.keys(merged).length === 0
  }

  // ─── Submit ─────────────────────────────────────────────────────────────

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
          `Welcome ${result.user.name}! Let's set up your school.`
        )
        onSignupSuccess(result.user)
      } else {
        const errorMessage = result.error || "Failed to create account"
        setGeneralError(errorMessage)
        notifications.error("Signup Failed", errorMessage)
      }
    } catch {
      setGeneralError("An unexpected error occurred.")
      notifications.error("Signup Error", "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-slate-200 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-2xl bg-white/70 dark:bg-slate-900/40 backdrop-blur-3xl rounded-3xl overflow-hidden border animate-in fade-in duration-500 relative z-10">
      <CardHeader className="space-y-3 pb-6 pt-9 px-8 text-center relative flex flex-col items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="absolute left-4 top-4 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Logo size="md" href="/" withText={true} className="mb-1" />
        <CardTitle className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none pt-2">Create School Account</CardTitle>
        <CardDescription className="typography-label text-slate-600 dark:text-slate-400">
           Enter your school details to get started
        </CardDescription>
      </CardHeader>

      <CardContent className="px-6 sm:px-8 pb-8">
        {generalError && (
          <div className="typography-body bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 animate-in slide-in-from-top-2">
            <p className="typography-label text-red-600 dark:text-red-400 flex items-center gap-2">
              <span className="typography-card-title text-red-600">✕</span>
              {generalError}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Admin Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-slate-800 dark:text-slate-300">Admin Name</Label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-500 group-focus-within:text-blue-700 dark:group-focus-within:text-blue-400 transition-colors">
                <User className="w-4 h-4" />
              </div>
              <Input
                id="name"
                placeholder="Enter your full name"
                value={credentials.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                className={`pl-10 bg-slate-100/50 dark:bg-white/5 border-slate-300 dark:border-white/10 h-11 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all rounded-xl ${
                  fieldErrors.name ? "border-red-500/50 ring-red-500/20" : ""
                }`}
              />
            </div>
            {fieldErrors.name && <p className="text-[10px] text-red-600 dark:text-red-400 ml-1 font-medium">{fieldErrors.name}</p>}
          </div>

          {/* School Name */}
          <div className="space-y-1.5">
            <Label htmlFor="schoolName" className="text-slate-800 dark:text-slate-300">School Name</Label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-500 group-focus-within:text-blue-700 dark:group-focus-within:text-blue-400 transition-colors">
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
                className={`pl-10 bg-slate-100/50 dark:bg-white/5 border-slate-300 dark:border-white/10 h-11 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all rounded-xl ${
                  fieldErrors.schoolName ? "border-red-500/50 ring-red-500/20" : ""
                }`}
              />
            </div>
            {fieldErrors.schoolName && <p className="text-[10px] text-red-600 dark:text-red-400 ml-1 font-medium">{fieldErrors.schoolName}</p>}
          </div>

          {/* School Address */}
          <div className="space-y-1.5">
            <Label htmlFor="schoolAddress" className="text-slate-800 dark:text-slate-300">School Address</Label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-500 group-focus-within:text-blue-700 dark:group-focus-within:text-blue-400 transition-colors">
                <MapPin className="w-4 h-4" />
              </div>
              <Input
                id="schoolAddress"
                placeholder="e.g. Bole, Addis Ababa"
                value={credentials.schoolAddress}
                onChange={(e) => {
                  setCredentials((prev) => ({ ...prev, schoolAddress: e.target.value }))
                  setFieldErrors((prev) => ({ ...prev, schoolAddress: "" }))
                }}
                required
                className={`pl-10 bg-slate-100/50 dark:bg-white/5 border-slate-300 dark:border-white/10 h-11 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all rounded-xl ${
                  fieldErrors.schoolAddress ? "border-red-500/50 ring-red-500/20" : ""
                }`}
              />
            </div>
            {fieldErrors.schoolAddress && <p className="text-[10px] text-red-600 dark:text-red-400 ml-1 font-medium">{fieldErrors.schoolAddress}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-slate-800 dark:text-slate-300">Phone</Label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-500 group-focus-within:text-blue-700 dark:group-focus-within:text-blue-400 transition-colors">
                  <Phone className="w-4 h-4" />
                </div>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+2519..."
                  maxLength={13}
                  value={credentials.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onBlur={(e) => handlePhoneBlur(e.target.value)}
                  required
                  className={`pl-10 bg-slate-100/50 dark:bg-white/5 border-slate-300 dark:border-white/10 h-11 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all rounded-xl ${
                    fieldErrors.phone ? "border-red-500/50 ring-red-500/20" : ""
                  }`}
                />
                {checkingPhone && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                  </div>
                )}
              </div>
              {fieldErrors.phone && <p className="text-[10px] text-red-600 dark:text-red-400 ml-1 font-medium">{fieldErrors.phone}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-800 dark:text-slate-300">Email</Label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-500 group-focus-within:text-blue-700 dark:group-focus-within:text-blue-400 transition-colors">
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
                  onBlur={(e) => handleEmailBlur(e.target.value)}
                  required
                  className={`pl-10 bg-slate-100/50 dark:bg-white/5 border-slate-300 dark:border-white/10 h-11 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all rounded-xl ${
                    fieldErrors.email ? "border-red-500/50 ring-red-500/20" : ""
                  }`}
                />
                {checkingEmail && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                  </div>
                )}
              </div>
              {fieldErrors.email && <p className="text-[10px] text-red-600 dark:text-red-400 ml-1 font-medium">{fieldErrors.email}</p>}
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-slate-800 dark:text-slate-300">Password</Label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-500 group-focus-within:text-blue-700 dark:group-focus-within:text-blue-400 transition-colors">
                <Lock className="w-4 h-4" />
              </div>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Min 8 characters"
                value={credentials.password}
                onChange={(e) => {
                  setCredentials((prev) => ({ ...prev, password: e.target.value }))
                  setFieldErrors((prev) => ({ ...prev, password: "" }))
                }}
                required
                className={`pl-10 pr-10 bg-slate-100/50 dark:bg-white/5 border-slate-300 dark:border-white/10 h-11 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all rounded-xl ${
                  fieldErrors.password ? "border-red-500/50 ring-red-500/20" : ""
                }`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password strength indicator */}
            {credentials.password && passwordStrength && (
              <div className="space-y-1 mt-1">
                <div className="h-1 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strengthConfig[passwordStrength].color} ${strengthConfig[passwordStrength].width}`}
                  />
                </div>
                <p className={`text-[10px] ml-1 font-bold ${strengthConfig[passwordStrength].textColor}`}>
                  Password strength: {strengthConfig[passwordStrength].label}
                </p>
              </div>
            )}
            {fieldErrors.password && <p className="text-[10px] text-red-600 dark:text-red-400 ml-1 font-medium">{fieldErrors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-slate-800 dark:text-slate-300">Confirm Password</Label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-500 group-focus-within:text-blue-700 dark:group-focus-within:text-blue-400 transition-colors">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repeat your password"
                value={credentials.confirmPassword}
                onChange={(e) => {
                  setCredentials((prev) => ({ ...prev, confirmPassword: e.target.value }))
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }))
                }}
                required
                className={`pl-10 pr-10 bg-slate-100/50 dark:bg-white/5 border-slate-300 dark:border-white/10 h-11 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all rounded-xl ${
                  fieldErrors.confirmPassword ? "border-red-500/50 ring-red-500/20" : ""
                }`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.confirmPassword && <p className="text-[10px] text-red-600 dark:text-red-400 ml-1 font-medium">{fieldErrors.confirmPassword}</p>}
          </div>

          {/* Terms & Conditions */}
          <div className="flex items-start space-x-2 pt-2">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => {
                setTermsAccepted(checked as boolean)
                setFieldErrors((prev) => ({ ...prev, terms: "" }))
              }}
              className="mt-1 border-slate-400 dark:border-white/20 data-[state=checked]:bg-blue-600"
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="terms"
                className="text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-normal"
              >
                I agree to the{" "}
                <Link href="/terms" className="text-blue-700 dark:text-blue-400 hover:underline font-bold">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-blue-700 dark:text-blue-400 hover:underline font-bold">
                  Privacy Policy
                </Link>
                .
              </label>
              {fieldErrors.terms && <p className="text-[10px] text-red-600 dark:text-red-400 font-medium">{fieldErrors.terms}</p>}
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={isLoading} 
            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] mt-4"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Create Account <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-300 dark:border-white/5 text-center">
          <p className="typography-body text-slate-600 dark:text-slate-400">
            Already have an account?{" "}
            <Button variant="link" onClick={onBack} className="text-blue-700 dark:text-blue-400 p-0 h-auto font-bold">
              Sign In
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
