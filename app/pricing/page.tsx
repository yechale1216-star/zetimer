"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ModeToggle } from "@/components/mode-toggle"
import { Logo } from "@/components/logo"
import {
  Check, Zap, Users, School, ArrowRight, Loader2,
  ChevronDown, ChevronUp, Star, Shield, Clock
} from "lucide-react"
import { getApiUrl } from "@/lib/api-config"

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
    <div className="min-h-screen premium-mesh-gradient text-slate-900 dark:text-slate-100 selection:bg-blue-500/20">
      {/* Animated Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-400/20 dark:bg-emerald-600/10 rounded-full blur-[120px] animate-pulse delay-700"></div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-white/40 dark:border-white/10 bg-white/40 dark:bg-slate-950/40 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex justify-between h-20 items-center">
            <Logo size="md" withText={true} href="/" />
            
            <div className="hidden md:flex items-center gap-8">
              <Link href="/about" className="text-[11px] font-black text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase tracking-widest">About</Link>
              <Link href="/pricing" className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Pricing</Link>
              <Link href="/terms" className="text-[11px] font-black text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase tracking-widest">Terms</Link>
            </div>

            <div className="flex items-center gap-4">
              <div className="scale-90">
                <ModeToggle />
              </div>
              <Button asChild className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/20 px-6">
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-16 space-y-24">

        {/* ── Hero ── */}
        <section className="text-center space-y-8 py-12">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] mb-4">
              <Shield className="w-3 h-3" /> 14-day free trial · No credit card
            </div>
          <h1 className="text-4xl md:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
            Simple, Transparent <br />
            <span className="text-blue-600 dark:text-blue-400 italic">Institutional Pricing.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
            Pay for what you need. Built for modern schools and universities across Ethiopia.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex p-1.5 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/60 dark:border-white/10 mt-10">
            {BILLING_PERIODS.map(({ value, label, badge }) => (
              <button
                key={value}
                onClick={() => setBilling(value)}
                className={`relative px-6 py-3 rounded-xl text-xs font-black uppercase tracking-tighter transition-all duration-300 ${
                  billing === value
                    ? "bg-blue-600 text-white shadow-xl shadow-blue-500/20"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {label}
                {badge && (
                  <span className="ml-2 py-0.5 px-2 rounded-full bg-emerald-500 text-[9px] text-white">
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
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Synchronizing Plans...</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-32 glass-card rounded-[40px] border-dashed border-2 border-slate-200 dark:border-white/5 mx-8">
              <p className="text-slate-500 font-bold uppercase tracking-widest">Configuration in progress. Please return shortly.</p>
            </div>
          ) : (
            <div className={`grid gap-8 ${plans.length <= 3 ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-4"}`}>
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
                    className={`relative rounded-[32px] border p-8 flex flex-col gap-8 transition-all duration-500 hover:scale-[1.03] group ${
                      highlighted
                        ? "border-blue-600/50 bg-white/60 dark:bg-blue-500/5 shadow-2xl shadow-blue-500/10"
                        : "border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-xl"
                    }`}
                  >
                    {highlighted && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-blue-600 text-[10px] font-black text-white uppercase tracking-widest shadow-xl">
                        Recommended
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center transition-transform group-hover:rotate-12 ${
                        highlighted ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400"
                      }`}>
                        {icon}
                      </div>
                      <div>
                        <h2 className="text-2xl font-black tracking-tight">{plan.name}</h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter mt-1">
                          {plan.description || `Max ${plan.maxStudents === -1 ? "Unlimited" : plan.maxStudents.toLocaleString()} Students`}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                       <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black tracking-tighter">
                          {price > 0 ? `${monthly.toLocaleString()}` : "Custom"}
                        </span>
                        {price > 0 && <span className="text-slate-500 font-bold text-sm uppercase">ETB / mo</span>}
                      </div>
                      {billingMonths > 1 && price > 0 && (
                        <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-none">
                          Billed {billing === "semester" ? "Semi-Annually" : "Annually"} &bull; {price.toLocaleString()} ETB total
                        </p>
                      )}
                    </div>

                    <ul className="space-y-3 flex-1">
                      {features.map((f, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <Check className={`w-4 h-4 mt-0.5 shrink-0 ${highlighted ? "text-blue-600" : "text-slate-400"}`} />
                          <span className={`${highlighted ? "font-bold text-slate-900 dark:text-white" : "font-medium text-slate-600 dark:text-slate-400"}`}>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      asChild
                      className={`w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                        highlighted 
                        ? "bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/20" 
                        : "bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white hover:bg-slate-50"
                      }`}
                    >
                      <Link href="/school/admin/signup">
                        Start Trial <ArrowRight className="ml-2 w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Interactive Calculator ── */}
        {!loading && plans.length > 0 && (
          <section className="py-24 space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-black tracking-tight uppercase">Analyze Your Cost</h2>
              <p className="text-slate-500 font-medium max-w-xl mx-auto">Adjust the scale to visualize live pricing across our core infrastructure tiers.</p>
            </div>
            <div className="rounded-[40px] border border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-2xl p-8 md:p-16 space-y-12 shadow-2xl">
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-black uppercase tracking-widest text-slate-500">Student Capacity</label>
                  <span className="text-4xl font-black text-blue-600">{studentCount.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={20} max={2000} step={10}
                  value={studentCount}
                  onChange={e => setStudentCount(Number(e.target.value))}
                  className="w-full h-3 bg-slate-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.slice(0, 3).map((plan) => {
                  const fits = plan.maxStudents === -1 || studentCount <= plan.maxStudents
                  const total = getPlanPrice(plan)
                  const monthly = getMonthlyRate(plan)
                  return (
                    <div key={plan.id} className={`rounded-3xl p-6 border transition-all duration-500 ${
                      fits
                        ? "border-blue-600/20 bg-blue-600/5 shadow-lg"
                        : "border-slate-200 dark:border-white/5 grayscale opacity-40"
                    }`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{plan.name}</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-slate-900 dark:text-white">{monthly.toLocaleString()}</span>
                        <span className="text-[11px] font-bold text-slate-500 uppercase">ETB / mo</span>
                      </div>
                      {!fits && (
                        <p className="text-[10px] font-bold text-rose-600 uppercase mt-4 flex items-center gap-1">
                          <Check className="rotate-45 w-3 h-3" /> Exceeds {plan.maxStudents.toLocaleString()} max
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── FAQ ── */}
        <section className="max-w-3xl mx-auto space-y-8 py-24">
          <h2 className="text-4xl font-black text-center uppercase tracking-tight">Core Questions</h2>
          <div className="space-y-4">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="rounded-[24px] border border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-xl transition-all hover:bg-white/60">
                <button
                  className="w-full flex items-center justify-between px-8 py-6 text-left"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                >
                  <span className="text-sm font-black uppercase tracking-tight leading-none">{faq.q}</span>
                  {openFaq === idx ? <ChevronUp className="w-5 h-5 text-blue-600" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>
                {openFaq === idx && (
                  <div className="px-8 pb-6 text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed border-t border-white/40 dark:border-white/5 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-white/40 dark:border-white/10 bg-white/20 dark:bg-slate-950/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
            <Link href="/about" className="hover:text-blue-600">About</Link>
            <Link href="/pricing" className="text-blue-600">Pricing</Link>
            <Link href="/privacy" className="hover:text-blue-600">Privacy</Link>
            <Link href="/terms" className="hover:text-blue-600">Terms</Link>
          </div>
          <p className="text-[10px] font-bold text-slate-500/60 uppercase tracking-[0.3em]">
            &copy; {new Date().getFullYear()} Zetime &bull; Financial Standard
          </p>
        </div>
      </footer>
    </div>
  )
}
