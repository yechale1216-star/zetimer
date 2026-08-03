"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PublicNavbar } from "@/components/layout/public-navbar"
import { PublicFooter } from "@/components/layout/public-footer"
import {
  Check, Zap, Users, School, ArrowRight, Loader2,
  ChevronDown, ChevronUp, Star, Shield, Clock, ShieldAlert,
  MessageSquare, Smartphone, FileText, Headphones
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
  free:         <School className="w-5 h-5" />,
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
  free:         ["Full Feature Access for 30 Days", "Daily & Session Attendance", "Discipline & Conduct Module", "Parent Portal & Messaging", "Up to 100 Students"],
  starter:      ["Student attendance tracking", "Parent portal access", "Discipline incident reporting", "Basic reports & exports", "Up to 250 Students"],
  standard:     ["Everything in Starter", "Session-based attendance (Morning/Afternoon)", "Discipline follow-up tracking & audit logs", "Real-time parent push notifications", "CSV & PDF exports", "Teacher portal access"],
  professional: ["Everything in Standard", "Advanced discipline analytics & repeat offender tracking", "Multi-campus support", "Direct parent messaging & announcements", "API & webhook access", "Priority 24/7 support"],
  enterprise:   ["Everything in Professional", "Dedicated account manager", "Custom contracts & invoicing", "99.9% SLA guarantee", "White-label custom domain", "Unlimited students & staff"],
}

const FAQS = [
  { q: "Is there a free trial?", a: "Yes! Every new school account starts with a 30-day free trial containing access to all 16 SaaS features, including messaging, discipline tracking, and session attendance." },
  { q: "Can I change my plan or upgrade later?", a: "Prorated upgrades can be made anytime from your School Admin Billing Dashboard. Your student quota updates instantly." },
  { q: "What currency are prices displayed in?", a: "All standard institutional pricing is calculated in Ethiopian Birr (ETB). Custom international arrangements are available for Enterprise tiers." },
  { q: "How is student quota calculated?", a: "Only active enrolled students count toward your tier quota. Archived, graduated, or transferred students do not consume plan capacity." },
  { q: "Does the Discipline module cost extra?", a: "No! Discipline & Conduct management, incident follow-ups, and parent notifications are fully integrated into our core subscription tiers." },
  { q: "How do parents receive notifications?", a: "Parents receive high-priority push notifications directly on the Zetime Mobile App, alongside optional SMS and automated email alerts." },
]

export default function PricingPage() {
  const [plans, setPlans] = useState<DBPlan[]>([])
  const [addons, setAddons] = useState<DBAddon[]>([])
  const [billing, setBilling] = useState<BillingPeriod>("monthly")
  const [studentCount, setStudentCount] = useState(250)
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-500/20">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-400/20 dark:bg-emerald-600/10 rounded-full blur-[120px] animate-pulse delay-700"></div>
      </div>

      <PublicNavbar />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-16 space-y-24">

        {/* ── Hero ── */}
        <section className="text-center space-y-8 py-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">
            <Shield className="w-3.5 h-3.5" /> 30-Day Full Feature Free Trial &bull; No Credit Card Required
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
            Transparent Institutional Pricing <br />
            <span className="text-blue-600 dark:text-blue-400 italic">Built for Modern Schools.</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
            Scalable attendance, discipline tracking, and parent communication tools tailored for schools, academies, and universities across Ethiopia.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex p-1.5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg mt-6">
            {BILLING_PERIODS.map(({ value, label, badge }) => (
              <button
                key={value}
                onClick={() => setBilling(value)}
                className={`relative px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all duration-300 ${
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

        {/* ── Feature Highlights Banner ── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <Clock className="w-5 h-5 text-blue-600" />, title: "Session Attendance", desc: "Split Morning & Afternoon monitoring" },
            { icon: <ShieldAlert className="w-5 h-5 text-indigo-600" />, title: "Discipline Module", desc: "Incident & audit log management" },
            { icon: <Smartphone className="w-5 h-5 text-violet-600" />, title: "Parent Mobile App", desc: "Instant push & SMS notifications" },
            { icon: <FileText className="w-5 h-5 text-emerald-600" />, title: "CSV Reports", desc: "Automated grade & section analytics" },
          ].map((item, idx) => (
            <div key={idx} className="p-5 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl space-y-2">
              <div className="p-2.5 w-max rounded-xl bg-slate-100 dark:bg-slate-800">{item.icon}</div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">{item.title}</h3>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{item.desc}</p>
            </div>
          ))}
        </section>

        {/* ── Plans Grid ── */}
        <section>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Synchronizing Plans...</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-32 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-8">
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Configuration in progress. Please return shortly.</p>
            </div>
          ) : (
            <div className={`grid gap-8 ${plans.length <= 3 ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-4"}`}>
              {plans.map((plan) => {
                const highlighted = !!PLAN_HIGHLIGHT_MAP[plan.slug]
                const dbFeatures = plan.features?.map(f => f.feature.name).filter(Boolean) ?? []
                const features = dbFeatures.length > 0 ? dbFeatures : (STATIC_FEATURES[plan.slug] ?? [])
                const price = getPlanPrice(plan)
                const monthly = getMonthlyRate(plan)
                const billingMonths = BILLING_PERIODS.find(b => b.value === billing)?.months ?? 1
                const icon = PLAN_ICON_MAP[plan.slug] ?? <School className="w-5 h-5" />

                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-3xl border p-8 flex flex-col gap-8 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] group ${
                      highlighted
                        ? "border-blue-500 bg-gradient-to-b from-blue-50/50 to-white dark:from-blue-950/20 dark:to-slate-900 shadow-xl shadow-blue-500/10"
                        : "border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl"
                    }`}
                  >
                    {highlighted && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-blue-600 text-[10px] font-black text-white uppercase tracking-widest shadow-md">
                        Most Popular
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                        highlighted ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      }`}>
                        {icon}
                      </div>
                      <div>
                        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{plan.name}</h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter mt-1">
                          {plan.description || `Max ${plan.maxStudents === -1 ? "Unlimited" : plan.maxStudents.toLocaleString()} Students`}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                          {price > 0 ? `${monthly.toLocaleString()}` : "Free Trial"}
                        </span>
                        {price > 0 && <span className="text-slate-500 font-bold text-xs uppercase">ETB / mo</span>}
                      </div>
                      {billingMonths > 1 && price > 0 && (
                        <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-none">
                          Billed {billing === "semester" ? "Semi-Annually" : "Annually"} &bull; {price.toLocaleString()} ETB total
                        </p>
                      )}
                    </div>

                    <ul className="space-y-3 flex-1">
                      {features.map((f, i) => (
                        <li key={i} className="flex items-start gap-3 text-xs md:text-sm">
                          <Check className={`w-4 h-4 mt-0.5 shrink-0 ${highlighted ? "text-blue-600 dark:text-blue-400" : "text-emerald-500"}`} />
                          <span className={`${highlighted ? "font-bold text-slate-900 dark:text-white" : "font-medium text-slate-600 dark:text-slate-300"}`}>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      asChild
                      className={`w-full h-12 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${
                        highlighted 
                        ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25" 
                        : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100"
                      }`}
                    >
                      <Link href="/school/admin/signup">
                        Start 30-Day Free Trial <ArrowRight className="ml-2 w-4 h-4" />
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
          <section className="py-12 space-y-8">
            <div className="text-center space-y-3">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase text-slate-900 dark:text-white">Estimate Your School Cost</h2>
              <p className="text-slate-500 text-xs sm:text-sm font-medium max-w-xl mx-auto">Adjust the student capacity slider to preview monthly and annual pricing for your institution.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl p-6 md:p-12 space-y-10 shadow-xl">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">Enrolled Student Capacity</label>
                  <span className="text-3xl font-black text-blue-600 dark:text-blue-400">{studentCount.toLocaleString()} Students</span>
                </div>
                <input
                  type="range"
                  min={20} max={2000} step={10}
                  value={studentCount}
                  onChange={e => setStudentCount(Number(e.target.value))}
                  className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.slice(0, 3).map((plan) => {
                  const fits = plan.maxStudents === -1 || studentCount <= plan.maxStudents
                  const monthly = getMonthlyRate(plan)
                  return (
                    <div key={plan.id} className={`rounded-2xl p-6 border transition-all duration-300 ${
                      fits
                        ? "border-blue-500/30 bg-blue-500/5 shadow-md"
                        : "border-slate-200 dark:border-slate-800 opacity-40 grayscale"
                    }`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{plan.name}</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-slate-900 dark:text-white">{monthly.toLocaleString()}</span>
                        <span className="text-[11px] font-bold text-slate-500 uppercase">ETB / mo</span>
                      </div>
                      {!fits && (
                        <p className="text-[10px] font-bold text-rose-500 uppercase mt-3 flex items-center gap-1">
                          Exceeds {plan.maxStudents.toLocaleString()} max capacity
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
        <section className="max-w-3xl mx-auto space-y-8 py-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Frequently Asked Questions</h2>
            <p className="text-xs text-slate-500 font-medium">Everything you need to know about Zetime subscriptions and school onboarding.</p>
          </div>
          <div className="space-y-4">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl transition-all">
                <button
                  className="w-full flex items-center justify-between px-6 py-5 text-left"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                >
                  <span className="text-xs md:text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">{faq.q}</span>
                  {openFaq === idx ? <ChevronUp className="w-4 h-4 text-blue-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-5 text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

      </main>

      <PublicFooter />
    </div>
  )
}
