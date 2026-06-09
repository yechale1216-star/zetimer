"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ModeToggle } from "@/components/mode-toggle"
import { Logo } from "@/components/logo"
import {
  Check, Zap, Users, School, ArrowRight, Loader2,
  ChevronDown, ChevronUp, Star, Shield, Clock
} from "lucide-react"
import { getApiUrl } from "@/lib/auth/auth"

// ── Types ──────────────────────────────────────────────────────────────────────
interface DBPlan {
  id: string
  name: string
  slug: string
  description: string | null
  pricePerStudentMonthly: number
  pricePerStudentSemester: number
  pricePerStudentYearly: number
  monthlyTotal: number
  semesterTotal: number
  yearlyTotal: number
  maxStudents: number
  maxUsers: number
  isActive: boolean
  features?: { feature: { name: string } }[]
}

interface DBAddon {
  id: string
  name: string
  description: string | null
  monthlyFlat: number
  perUnit: boolean
  unitLabel: string | null
  isActive: boolean
}

type BillingPeriod = "monthly" | "semester" | "yearly"

const BILLING_PERIODS: { value: BillingPeriod; label: string; badge?: string; months: number }[] = [
  { value: "monthly",  label: "Monthly",   months: 1 },
  { value: "semester", label: "6 Months",  badge: "Save 10%", months: 6 },
  { value: "yearly",   label: "Yearly",    badge: "Save 20%", months: 12 },
]

const PLAN_ICON_MAP: Record<string, React.ReactNode> = {
  starter:      <School className="w-5 h-5" />,
  standard:     <Users className="w-5 h-5" />,
  professional: <Zap className="w-5 h-5" />,
  enterprise:   <Star className="w-5 h-5" />,
}

const PLAN_HIGHLIGHT_MAP: Record<string, boolean> = {
  standard: true,
  professional: true,
}

const STATIC_FEATURES: Record<string, string[]> = {
  starter:      ["Student attendance tracking", "Parent portal access", "Basic reports", "Up to 2 admin users"],
  standard:     ["Everything in Starter", "Session-based attendance", "Grade & stream analytics", "Real-time notifications", "CSV exports", "Teacher portal"],
  professional: ["Everything in Standard", "Multi-campus support", "API access", "Advanced analytics", "Priority support", "Custom integrations"],
  enterprise:   ["Everything in Professional", "Dedicated account manager", "Custom contracts", "SLA guarantee", "White-label option", "Unlimited users"],
}

const FAQS = [
  { q: "Is there a free trial?", a: "Yes! Every plan starts with a 14-day free trial. No credit card required." },
  { q: "Can I change my plan later?", a: "Absolutely. You can upgrade or downgrade at any time. Billing is prorated automatically." },
  { q: "What currency are prices in?", a: "All prices are in Ethiopian Birr (ETB). Enterprise clients can arrange custom billing." },
  { q: "How is 'student count' calculated?", a: "Only active students count against your quota. Archived or graduated students don't count." },
  { q: "What happens if I exceed my student limit?", a: "You'll be notified in advance and can upgrade your plan at any time. We never abruptly shut off access." },
]

export default function PricingPage() {
  const [plans, setPlans] = useState<DBPlan[]>([])
  const [addons, setAddons] = useState<DBAddon[]>([])
  const [billing, setBilling] = useState<BillingPeriod>("monthly")
  const [studentCount, setStudentCount] = useState(150)
  const [loading, setLoading] = useState(true)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, aRes] = await Promise.all([
          fetch(`${getApiUrl()}/api/subscriptions/plans`),
          fetch(`${getApiUrl()}/api/subscriptions/addons`),
        ])
        const pJson = await pRes.json()
        const aJson = await aRes.json()
        if (pJson.success) setPlans(pJson.data.filter((p: DBPlan) => p.isActive))
        if (aJson.success) setAddons(aJson.data.filter((a: DBAddon) => a.isActive))
      } catch (e) {
        console.error("Pricing load error:", e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const getPlanPrice = (plan: DBPlan): number => {
    if (billing === "monthly")  return plan.monthlyTotal  || (plan.pricePerStudentMonthly  * studentCount)
    if (billing === "semester") return plan.semesterTotal || (plan.pricePerStudentSemester * studentCount * 6)
    return plan.yearlyTotal || (plan.pricePerStudentYearly * studentCount * 12)
  }

  const getMonthlyRate = (plan: DBPlan): number => {
    const months = BILLING_PERIODS.find(b => b.value === billing)?.months ?? 1
    return Math.round(getPlanPrice(plan) / months)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Logo size="md" href="/" />
          <div className="flex items-center gap-3">
            <Link href="/about" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors">About</Link>
            <ModeToggle />
            <Button asChild size="sm" variant="outline">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/school/admin/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-20">

        {/* ── Hero ── */}
        <section className="text-center space-y-4">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs font-medium">
            <Shield className="w-3 h-3" /> 14-day free trial · No credit card required
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Pay for what you need. Built for Ethiopian schools of every size.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex p-1 bg-muted/50 rounded-2xl border border-border/40 mt-6">
            {BILLING_PERIODS.map(({ value, label, badge }) => (
              <button
                key={value}
                onClick={() => setBilling(value)}
                className={`relative px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  billing === value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
                {badge && (
                  <span className="ml-1.5 text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* ── Plans Grid ── */}
        <section>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading pricing...</p>
              </div>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p>Pricing plans are being configured. Please check back soon.</p>
            </div>
          ) : (
            <div className={`grid gap-6 ${plans.length <= 3 ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-4"}`}>
              {plans.map((plan) => {
                const highlighted = !!PLAN_HIGHLIGHT_MAP[plan.slug]
                const features = STATIC_FEATURES[plan.slug] ?? []
                const price = getPlanPrice(plan)
                const monthly = getMonthlyRate(plan)
                const billingMonths = BILLING_PERIODS.find(b => b.value === billing)?.months ?? 1
                const icon = PLAN_ICON_MAP[plan.slug] ?? <School className="w-5 h-5" />

                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-3xl border p-6 flex flex-col gap-6 transition-all duration-300 hover:shadow-xl ${
                      highlighted
                        ? "border-primary bg-gradient-to-b from-primary/5 to-background shadow-lg shadow-primary/10 scale-[1.02]"
                        : "border-border/50 bg-card hover:border-border"
                    }`}
                  >
                    {highlighted && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="px-3 py-0.5 text-[11px] font-semibold bg-primary text-primary-foreground shadow">
                          Most Popular
                        </Badge>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        highlighted ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {icon}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold">{plan.name}</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {plan.description || `Up to ${plan.maxStudents === -1 ? "unlimited" : plan.maxStudents.toLocaleString()} students`}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">
                          {price > 0 ? `${monthly.toLocaleString()}` : "Custom"}
                        </span>
                        {price > 0 && <span className="text-muted-foreground text-sm">ETB / mo</span>}
                      </div>
                      {billingMonths > 1 && price > 0 && (
                        <p className="text-[11px] text-muted-foreground">
                          Billed {billing === "semester" ? "every 6 months" : "annually"} · {price.toLocaleString()} ETB total
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        Max {plan.maxStudents === -1 ? "Unlimited" : `${plan.maxStudents.toLocaleString()} students`}
                        {" · "}
                        {plan.maxUsers === -1 ? "Unlimited" : `${plan.maxUsers.toLocaleString()} users`}
                      </p>
                    </div>

                    <ul className="space-y-2 flex-1">
                      {features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className={`w-4 h-4 mt-0.5 shrink-0 ${highlighted ? "text-primary" : "text-muted-foreground"}`} />
                          <span className={highlighted ? "text-foreground" : "text-muted-foreground"}>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      asChild
                      variant={highlighted ? "default" : "outline"}
                      className={`w-full rounded-xl gap-2 ${highlighted ? "shadow-md shadow-primary/20" : ""}`}
                    >
                      <Link href="/school/admin/signup">
                        Start Free Trial <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Add-ons ── */}
        {addons.length > 0 && (
          <section className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Optional Add-ons</h2>
              <p className="text-muted-foreground">Enhance your plan with powerful extras</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {addons.map((addon) => (
                <div key={addon.id} className="rounded-2xl border border-border/50 bg-card p-5 flex gap-4 hover:border-border transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{addon.name}</p>
                    {addon.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{addon.description}</p>
                    )}
                    <p className="text-sm font-bold text-primary mt-2">
                      {Number(addon.monthlyFlat).toLocaleString()} ETB
                      <span className="text-xs text-muted-foreground font-normal">
                        {addon.perUnit ? ` / ${addon.unitLabel ?? "unit"} / mo` : " / mo"}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Interactive Calculator ── */}
        {!loading && plans.length > 0 && (
          <section className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Calculate Your Cost</h2>
              <p className="text-muted-foreground">Adjust your student count to see live pricing across all plans</p>
            </div>
            <div className="rounded-3xl border border-border/50 bg-card p-6 md:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Number of Students</label>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min={20} max={2000} step={10}
                      value={studentCount}
                      onChange={e => setStudentCount(Number(e.target.value))}
                      className="w-full accent-primary h-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>20</span>
                      <span className="text-primary font-bold text-base">{studentCount.toLocaleString()} students</span>
                      <span>2,000+</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-fr">
                {plans.slice(0, 3).map((plan) => {
                  const fits = plan.maxStudents === -1 || studentCount <= plan.maxStudents
                  const total = getPlanPrice(plan)
                  const monthly = getMonthlyRate(plan)
                  return (
                    <div key={plan.id} className={`rounded-2xl p-4 border transition-all ${
                      fits
                        ? "border-primary/30 bg-primary/5"
                        : "border-border/40 bg-muted/30 opacity-60"
                    }`}>
                      <p className="font-bold">{plan.name}</p>
                      <p className="text-2xl font-bold text-primary mt-1">{monthly.toLocaleString()} ETB<span className="text-sm text-muted-foreground font-normal">/mo</span></p>
                      {!fits ? (
                        <p className="text-xs text-destructive mt-1">Exceeds plan limit ({plan.maxStudents.toLocaleString()} max)</p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">
                          {billing !== "monthly" ? `${total.toLocaleString()} ETB total` : `Per student: ~${Math.round(monthly / studentCount).toLocaleString()} ETB`}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── Trust ── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { icon: <Shield className="w-6 h-6 mx-auto text-primary" />, title: "Secure & Private", desc: "School data is encrypted and never shared." },
            { icon: <Clock className="w-6 h-6 mx-auto text-primary" />, title: "14-Day Free Trial", desc: "Full access, no credit card required." },
            { icon: <Users className="w-6 h-6 mx-auto text-primary" />, title: "Dedicated Support", desc: "Our team is here whenever you need help." },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border/40 bg-card p-6 space-y-2">
              {icon}
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </section>

        {/* ── FAQ ── */}
        <section className="max-w-2xl mx-auto space-y-4">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          {FAQS.map((faq, idx) => (
            <div key={idx} className="rounded-2xl border border-border/40 bg-card overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-6 py-4 text-left text-sm font-medium hover:bg-muted/30 transition-colors"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              >
                {faq.q}
                {openFaq === idx ? <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />}
              </button>
              {openFaq === idx && (
                <div className="px-6 pb-4 text-sm text-muted-foreground border-t border-border/30 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </section>

        {/* ── CTA ── */}
        <section className="rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-10 md:p-16 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold">Ready to modernize your school?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Join schools across Ethiopia already using Zetime to manage attendance, parents, and reports — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="gap-2 rounded-xl shadow-lg shadow-primary/20">
              <Link href="/school/admin/signup">
                Start Free Trial <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="rounded-xl">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </section>

      </main>

      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Zetime · Professional School Attendance Management
      </footer>
    </div>
  )
}
