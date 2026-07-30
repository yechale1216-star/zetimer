"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Scale, ArrowLeft, ShieldCheck, AlertCircle, Clock, CheckCircle2, FileText, Users, Award, ShieldAlert } from "lucide-react"
import { PublicNavbar } from "@/components/layout/public-navbar"
import { PublicFooter } from "@/components/layout/public-footer"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-500/20">
      <PublicNavbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-16 relative z-10 space-y-16">
        <div>
          <Link href="/" className="inline-flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 mb-8 hover:translate-x-[-4px] transition-transform">
            <ArrowLeft className="mr-2 w-4 h-4" /> Back to Home
          </Link>
          
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-500/20">
              <Scale className="w-7 h-7" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-tight">
              Terms of <span className="text-indigo-600 dark:text-indigo-400">Service</span>
            </h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
              Institutional Master Agreement &bull; Last updated: July 2026
            </p>
          </div>
        </div>

        <div className="space-y-12 text-slate-600 dark:text-slate-400">
          
          {/* Section 1 */}
          <section className="space-y-4">
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              1. Institutional Binding Agreement
            </h2>
            <p className="text-sm font-medium leading-relaxed">
              By registering an institution or accessing Zetime (via web portal or mobile application), you agree to these Terms of Service on behalf of your school, academy, or university. These terms govern access to Zetime's multi-tenant cloud platform, messaging network, attendance services, and discipline tracking modules.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              2. Roles & Administrative Responsibilities
            </h2>
            <p className="text-sm font-medium leading-relaxed">
              Subscribers must assign a Primary School Administrator who holds operational responsibility for account integrity and user role validation:
            </p>
            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <PolicyCard 
                icon={<ShieldCheck className="w-4 h-4" />}
                title="Educator & Staff Verification"
                desc="Ensuring only authorized homeroom teachers and staff receive credentials to record attendance and discipline notes."
              />
              <PolicyCard 
                icon={<Clock className="w-4 h-4" />}
                title="Student & Parent Linking"
                desc="Maintaining accurate student rosters, section assignments, and parent phone/email contact links for high-priority alerts."
              />
            </div>
          </section>

          {/* Alert Box */}
          <div className="p-6 md:p-8 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-2xl relative overflow-hidden space-y-3">
             <div className="flex items-center gap-3 text-amber-400">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <h3 className="text-sm font-black uppercase tracking-wider">Acceptable Use & Messaging Policy</h3>
             </div>
             <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium">
                The Parent-Teacher Messaging Center, group broadcasts, and mobile notification channels are reserved strictly for official educational coordination, academic updates, and urgent school announcements. Misuse of the messaging system for unauthorized commercial solicitation, harassment, or unverified communications will result in immediate suspension of messaging privileges.
             </p>
          </div>

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-600" />
              3. Attendance, Discipline & Audit Integrity
            </h2>
            <p className="text-sm font-medium leading-relaxed">
              Zetime maintains automated audit logging for attendance submissions, discipline report follow-ups, and parent acknowledgments. Institutions are responsible for ensuring that reported attendance data and discipline records are accurate, objective, and compliant with institutional guidelines.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              4. Subscription Tiers, Billing & Quotas
            </h2>
            <div className="space-y-3 pt-2">
              <ListItem text="Subscriptions are billed based on selected plans (Monthly, 6-Month Semester, or Yearly) in Ethiopian Birr (ETB)." />
              <ListItem text="Free Trial tiers provide 30 days of full feature access. Upon trial expiration, accounts may be upgraded to preserve feature access." />
              <ListItem text="Soft quota enforcement allows schools to adjust student capacity without abrupt service interruption." />
            </div>
          </section>

        </div>

        <div className="pt-12 border-t border-slate-200 dark:border-slate-800 text-center space-y-4">
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
            Need clarification on institutional compliance terms?
          </p>
          <Button asChild className="rounded-2xl h-11 px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:bg-slate-800">
            <Link href="mailto:legal@zetime.app">Contact Legal & Compliance</Link>
          </Button>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}

function PolicyCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 backdrop-blur-xl space-y-2">
      <div className="text-indigo-600 dark:text-indigo-400">{icon}</div>
      <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-wider">{title}</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{desc}</p>
    </div>
  )
}

function ListItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 text-xs md:text-sm font-medium">
      <div className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5" />
      <span className="leading-relaxed">{text}</span>
    </div>
  )
}
