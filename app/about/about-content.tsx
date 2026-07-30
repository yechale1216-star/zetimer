"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  Users, BarChart3, Clock, 
  ArrowRight, ShieldCheck, 
  CheckCircle2, Globe, Heart,
  ShieldAlert, Smartphone, FileText, Lock
} from "lucide-react"
import { PublicNavbar } from "@/components/layout/public-navbar"
import { PublicFooter } from "@/components/layout/public-footer"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-500/20">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/20 dark:bg-indigo-600/10 rounded-full blur-[120px] animate-pulse delay-700"></div>
      </div>

      <PublicNavbar />

      <main className="relative z-10 space-y-24 py-16">
        {/* Modern About Hero */}
        <section className="text-center px-4 sm:px-8 max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">
            <Globe className="w-3.5 h-3.5" /> Next-Generation Educational Technology
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
            Empowering Modern Institutions & <br />
            <span className="text-blue-600 dark:text-blue-400 italic">Connecting Families in Real-Time.</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            Zetime is the leading multi-tenant SaaS platform built to automate attendance tracking, conduct & discipline management, and parent-teacher messaging for schools across Ethiopia.
          </p>
        </section>

        {/* Core Pillars */}
        <section className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <PillarCard 
              icon={<Clock className="w-6 h-6" />}
              color="blue"
              title="Dual Attendance Modes"
              desc="Flexibility for Daily or Session-Based (Morning & Afternoon split) tracking with real-time arrival logs and automated absent alerts."
            />
            <PillarCard 
              icon={<ShieldAlert className="w-6 h-6" />}
              color="indigo"
              title="Discipline & Conduct"
              desc="Comprehensive incident reporting, investigation follow-ups, audit trails, and parent acknowledgments."
            />
            <PillarCard 
              icon={<Users className="w-6 h-6" />}
              color="violet"
              title="Parent-Teacher Hub"
              desc="Direct parent-staff messaging, group announcements, call logs, and FCM mobile push notifications."
            />
            <PillarCard 
              icon={<BarChart3 className="w-6 h-6" />}
              color="emerald"
              title="Institutional Analytics"
              desc="Grade, section, and stream analytics with instant CSV export for administrative compliance."
            />
          </div>
        </section>

        {/* Mission Detail Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-8 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              Built for Educational Excellence
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-tight">
              Eliminating Manual Overhead <br />
              <span className="text-blue-600 dark:text-blue-400">With Automated Precision.</span>
            </h2>
            <div className="space-y-4 text-slate-600 dark:text-slate-400 text-sm md:text-base leading-relaxed font-medium">
              <p>We believe educators should dedicate their focus to academic excellence rather than manual attendance spreadsheets. Zetime automates daily operations with deep multi-tenant isolation and security.</p>
              <p>From instant push warnings for parents when a student is absent, to structured discipline follow-up audit logs, Zetime provides schools with total administrative clarity.</p>
            </div>
            <div className="flex flex-wrap gap-8 pt-2">
              <StatItem value="100%" label="Cloud Reliability" />
              <StatItem value="30 Days" label="Full Free Trial" />
              <StatItem value="AES-256" label="Bank-Grade Security" />
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-blue-600/20 blur-[80px] rounded-full opacity-30 animate-pulse"></div>
            <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-slate-900 text-white p-8 md:p-12 space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">Bridging Home & School</h3>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium">
                "Our mission is to create a seamless digital bridge where parents are actively informed about their children's attendance, safety, and school conduct in real-time."
              </p>
              <div className="pt-4 border-t border-slate-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center font-black text-xs text-blue-400">ZT</div>
                <div>
                  <p className="text-xs font-bold text-white">Zetime Core Engineering</p>
                  <p className="text-[10px] text-slate-400">Institutional SaaS Platform</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security & Multi-Tenant Infrastructure */}
        <section className="bg-slate-900 text-white py-16 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto space-y-10 text-center">
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-widest text-white">Enterprise Security & Multi-Tenancy</h2>
              <p className="text-xs text-slate-400 max-w-xl mx-auto">Engineered to safeguard student privacy and provide seamless institutional management.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-left">
              <TrustBadge 
                icon={<Lock className="w-5 h-5" />}
                title="AES-256 & TLS 1.3"
                desc="Bank-grade encryption for records in transit and at rest."
              />
              <TrustBadge 
                icon={<ShieldCheck className="w-5 h-5" />}
                title="Multi-Tenant Isolation"
                desc="Strict schoolId scoping ensuring data privacy."
              />
              <TrustBadge 
                icon={<Smartphone className="w-5 h-5" />}
                title="Capacitor Mobile App"
                desc="Native Android app with FCM background push notifications."
              />
              <TrustBadge 
                icon={<Globe className="w-5 h-5" />}
                title="Amharic & English Support"
                desc="Multi-language UI for Ethiopian families and staff."
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
            Transform Your Institution <span className="text-blue-600 dark:text-blue-400">Today</span>
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm font-medium">Start your 30-day full feature free trial. No credit card required.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Button size="lg" className="rounded-2xl h-12 px-8 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-blue-500/20" asChild>
              <Link href="/school/admin/signup">Start 30-Day Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-2xl h-12 px-8 border-slate-200 dark:border-slate-800 font-bold text-xs uppercase tracking-wider" asChild>
              <Link href="/pricing">View Subscription Plans</Link>
            </Button>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}

function PillarCard({ icon, color, title, desc }: { icon: React.ReactNode, color: string, title: string, desc: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-600 text-white shadow-blue-500/20",
    indigo: "bg-indigo-600 text-white shadow-indigo-500/20",
    violet: "bg-violet-600 text-white shadow-violet-500/20",
    emerald: "bg-emerald-600 text-white shadow-emerald-500/20",
  }
  
  return (
    <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 backdrop-blur-xl space-y-4 transition-all hover:shadow-xl group">
      <div className={`w-12 h-12 rounded-2xl ${colors[color]} flex items-center justify-center shadow-lg transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{title}</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
          {desc}
        </p>
      </div>
    </div>
  )
}

function StatItem({ value, label }: { value: string, label: string }) {
  return (
    <div>
      <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 leading-none mb-1">{value}</div>
      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</div>
    </div>
  )
}

function TrustBadge({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white/5 border border-slate-800 space-y-3">
      <div className="text-blue-400">{icon}</div>
      <div>
        <h4 className="font-bold text-sm text-white mb-1">{title}</h4>
        <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}
