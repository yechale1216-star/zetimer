"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ModeToggle } from "@/components/mode-toggle"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { authService, type LoginCredentials } from "@/lib/auth/auth"
import { notifications } from "@/lib/utils/notifications"
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Phone } from "lucide-react"

interface LoginFormProps {
  onLoginSuccess: () => void
  onShowForgotPassword: () => void
  onShowAdminSignup?: () => void
}

export function LoginForm({ onLoginSuccess, onShowForgotPassword, onShowAdminSignup }: LoginFormProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"staff" | "parent">("staff")
  const [parentPhone, setParentPhone] = useState("+251")
  const [parentPassword, setParentPassword] = useState("")
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: "",
    password: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showParentPassword, setShowParentPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)

    if (activeTab === "parent") {
      if (!parentPhone || parentPhone === "+251") {
        const errorMsg = "Please enter your registered parent phone number"
        setLoginError(errorMsg)
        notifications.error("Validation Error", errorMsg)
        return
      }

      const cleanPhone = parentPhone.replace(/\s+/g, "")
      const phoneRegex = /^\+2519\d{8}$/
      if (!phoneRegex.test(cleanPhone)) {
        const errorMsg = "Phone number must match format: +2519XXXXXXXX"
        setLoginError(errorMsg)
        notifications.error("Validation Error", errorMsg)
        return
      }

      if (!parentPassword || parentPassword.length < 6) {
        const errorMsg = "Please enter a valid password (min 6 characters)"
        setLoginError(errorMsg)
        notifications.error("Validation Error", errorMsg)
        return
      }

      setIsLoading(true)
      try {
        const result = await authService.loginParent(cleanPhone, parentPassword)
        if (result.success) {
          setLoginError(null)
          notifications.success("Welcome Back, Parent!", `Successfully logged in. Accessing children's profiles.`)
          router.push("/parent/dashboard")
        } else {
          const errorMessage = result.message || "Invalid phone number or password"
          setLoginError(errorMessage)
          notifications.error("Login Failed", errorMessage)
        }
      } catch (error) {
        const errorMsg = "An unexpected error occurred. Please try again."
        setLoginError(errorMsg)
        notifications.error("Login Error", errorMsg)
      } finally {
        setIsLoading(false)
      }
      return
    }

    if (!credentials.email || !credentials.password) {
      const errorMsg = "Please fill in all fields"
      setLoginError(errorMsg)
      notifications.error("Validation Error", errorMsg)
      return
    }

    if (!credentials.email.includes("@")) {
      const errorMsg = "Please enter a valid email address"
      setLoginError(errorMsg)
      notifications.error("Validation Error", errorMsg)
      return
    }

    if (credentials.password.length < 6) {
      const errorMsg = "Password must be at least 6 characters long"
      setLoginError(errorMsg)
      notifications.error("Validation Error", errorMsg)
      return
    }

    setIsLoading(true)

    try {
      const result = await authService.login({
        email: credentials.email,
        password: credentials.password,
      })

      if (result.success) {
        setLoginError(null)
        notifications.success("Welcome Back!", `${result.user?.name || "User"}, you've successfully logged in.`)
        
        if (result.user?.role === "super_admin") {
          router.push("/super-admin")
        } else {
          onLoginSuccess()
        }
      } else {
        const errorMessage = result.error || "Invalid email or password"
        setLoginError(errorMessage)
        notifications.error("Login Failed", errorMessage)
      }
    } catch (error) {
      const errorMsg = "An unexpected error occurred. Please try again."
      setLoginError(errorMsg)
      notifications.error("Login Error", errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-border/40 shadow-2xl bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden border animate-in fade-in duration-300">
      <CardHeader className="space-y-1 pb-6 pt-8 px-8 text-center">
        <div className="md:hidden flex justify-center mb-4">
           {/* Mobile only logo is handled in page.tsx now */}
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Welcome Back</CardTitle>
        <CardDescription className="text-muted-foreground transition-all duration-300">
          {activeTab === "parent" 
            ? "Enter your phone number and password to access the parent portal" 
            : "Enter your credentials to access your school dashboard"}
        </CardDescription>

      </CardHeader>
      <CardContent className="px-8 pb-8">
        {/* Modern Segmented Tab Switcher */}
        <div className="flex p-1 bg-muted/40 dark:bg-slate-900/40 rounded-2xl border border-border/20 mb-6">
          <button
            type="button"
            onClick={() => { setActiveTab("staff"); setLoginError(null); }}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 ${
              activeTab === "staff"
                ? "bg-background text-foreground shadow-sm font-black"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            School Staff
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("parent"); setLoginError(null); }}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 ${
              activeTab === "parent"
                ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-sm font-black"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Parent Portal
          </button>
        </div>

        {loginError && (
          <Alert variant="destructive" className="mb-6 animate-in slide-in-from-top-2 duration-300">
            <AlertDescription className="text-sm font-medium">{loginError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {activeTab === "parent" ? (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="space-y-2">
                <Label htmlFor="parentPhone">Registered Phone Number</Label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-emerald-500 transition-colors">
                    <Phone className="w-4 h-4" />
                  </div>
                  <Input
                    id="parentPhone"
                    type="tel"
                    placeholder="+251 9XX XXX XXX"
                    maxLength={13}
                    value={parentPhone}
                    onChange={(e) => {
                      let val = e.target.value.replace(/[^\d+]/g, "")
                      if (val.lastIndexOf("+") > 0) val = "+" + val.replace(/\+/g, "")
                      if (!val.startsWith("+251") && val.length > 0 && !val.startsWith("+")) val = "+251" + val
                      setParentPhone(val)
                    }}
                    required
                    className="pl-10 bg-background/50 border-border/50 h-12 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all rounded-xl text-sm"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground/60 ml-1">Format: +251 9XXXXXXXX (Ethiopian Phone)</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="parentPassword">Password</Label>
                  <Button
                    variant="link"
                    type="button"
                    onClick={onShowForgotPassword}
                    className="text-xs text-emerald-600 hover:text-emerald-700 h-auto p-0"
                  >
                    Forgot password?
                  </Button>
                </div>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-emerald-500 transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <Input
                    id="parentPassword"
                    type={showParentPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={parentPassword}
                    onChange={(e) => setParentPassword(e.target.value)}
                    required
                    className="pl-10 pr-10 bg-background/50 border-border/50 h-12 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all rounded-xl text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowParentPassword(!showParentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showParentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2 pb-2">
                <Checkbox 
                  id="rememberParent" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className="rounded-md border-emerald-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-primary-foreground"
                />
                <label
                  htmlFor="rememberParent"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Remember me on this device
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in duration-300">
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
                    value={credentials.email}
                    onChange={(e) => setCredentials((prev) => ({ ...prev, email: e.target.value }))}
                    required
                    className="pl-10 bg-background/50 border-border/50 h-12 focus:ring-2 focus:ring-primary/20 transition-all rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Button
                    variant="link"
                    type="button"
                    onClick={onShowForgotPassword}
                    className="text-xs text-primary hover:text-primary/80 h-auto p-0"
                  >
                    Forgot password?
                  </Button>
                </div>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={credentials.password}
                    onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))}
                    required
                    className="pl-10 pr-10 bg-background/50 border-border/50 h-12 focus:ring-2 focus:ring-primary/20 transition-all rounded-xl text-sm"
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

              <div className="flex items-center space-x-2 pb-2">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className="rounded-md"
                />
                <label
                  htmlFor="remember"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Remember me on this device
                </label>
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            className={`w-full h-12 text-base font-semibold rounded-xl shadow-lg transition-all active:scale-[0.98] ${
              activeTab === "parent" 
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10 animate-in fade-in" 
                : "shadow-primary/10"
            }`} 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {activeTab === "parent" ? "Verifying..." : "Signing in..."}
              </>
            ) : (
              <>
                {activeTab === "parent" ? "Sign In to Parent Portal" : "Sign In"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {onShowAdminSignup && (
          <div className="mt-8 pt-6 border-t border-border/50 text-center">
            <p className="text-sm text-muted-foreground mb-4">New to Zetime? Create a school account</p>
            <Button
              variant="outline"
              onClick={onShowAdminSignup}
              className="w-full h-11 rounded-xl border-border/50 hover:bg-muted/50 hover:border-primary/30 transition-all"
            >
              Get Started for Free
            </Button>
          </div>
        )}

        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
            <Link href="/about" className="hover:text-primary transition-colors">About</Link>
            <Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
          </div>
          
          <div className="flex items-center gap-2 bg-muted/30 p-1.5 px-3 rounded-full border border-border/50">
             <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-tight">Theme</span>
             <div className="scale-75">
               <ModeToggle />
             </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

