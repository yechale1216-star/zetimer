"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Shield, Lock, ArrowLeft, Globe, Eye, ShieldCheck, Database, Bell, FileText, UserCheck } from "lucide-react"
import { PublicNavbar } from "@/components/layout/public-navbar"
import { PublicFooter } from "@/components/layout/public-footer"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-500/20">
      <PublicNavbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-16 relative z-10 space-y-16">
        <div>
          <Link href="/" className="inline-flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-8 hover:translate-x-[-4px] transition-transform">
            <ArrowLeft className="mr-2 w-4 h-4" /> Back to Home
          </Link>
          
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-500/20">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-tight">
              Privacy <span className="text-blue-600 dark:text-blue-400">&</span> Data Protection Policy
            </h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
              Zetime Institutional Platform &bull; Last updated: July 2026
            </p>
          </div>
        </div>

        <div className="space-y-12 text-slate-600 dark:text-slate-400">
          
          {/* Section 1 */}
          <section className="space-y-4">
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              1. Information Architecture & Scope
            </h2>
            <p className="text-sm font-medium leading-relaxed">
              Zetime processes educational and operational data to power attendance tracking, discipline incident management, and parent-teacher communication across educational institutions. Data is partitioned into strict tenant layers:
            </p>
            <div className="grid sm:grid-cols-3 gap-4 pt-2">
              <DataLayerCard 
                icon={<Lock className="w-4 h-4" />}
                title="Account Credentials"
                desc="Encrypted user names, emails, phone contacts, role assignments, and school credentials."
              />
              <DataLayerCard 
                icon={<Eye className="w-4 h-4" />}
                title="Attendance & Discipline"
                desc="Daily/session attendance records, discipline incident reports, follow-up logs, and parent acknowledgments."
              />
              <DataLayerCard 
                icon={<Bell className="w-4 h-4" />}
                title="Communications & Mobile"
                desc="Direct messages, announcement broadcasts, FCM push notification tokens, and Capacitor mobile app device metrics."
              />
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              2. Data Usage & Processing Principles
            </h2>
            <p className="text-sm font-medium leading-relaxed">
              We process data strictly to facilitate institutional operations and parent transparency. Zetime <span className="font-bold text-slate-900 dark:text-white">never sells or monetizes student or institutional data</span> to third parties or advertising networks.
            </p>
            <div className="space-y-3 pt-2">
              <ListItem text="Authenticating school administrators, teachers, parents, and students with strict Role-Based Access Control (RBAC)." />
              <ListItem text="Delivering real-time attendance alerts (Absent/Late notifications) and discipline report updates to linked parent profiles." />
              <ListItem text="Generating high-precision attendance analytics, section breakdown charts, and CSV/PDF compliance reports." />
              <ListItem text="Enabling direct parent-teacher messaging and school-wide announcement channels." />
            </div>
          </section>

          {/* Security Box */}
          <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white shadow-2xl relative overflow-hidden space-y-3">
            <div className="absolute top-0 right-0 p-8 transform translate-x-6 -translate-y-6 opacity-10">
              <Shield className="w-40 h-40" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-200" /> Multi-Tenant Isolation & Encryption Standards
            </h3>
            <p className="text-xs md:text-sm text-blue-100 leading-relaxed font-medium">
              Zetime enforces strict multi-tenant isolation at the database and application levels (<code className="bg-white/20 px-1.5 py-0.5 rounded font-mono text-[11px]">schoolId</code> scoping). All data in transit is encrypted using <strong>TLS 1.3</strong>, and data at rest is secured with <strong>AES-256 encryption</strong>. Discipline audit logs and attendance records are immutably timestamped to ensure audit compliance.
            </p>
          </div>

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              3. Data Retention & Institutional Rights
            </h2>
            <p className="text-sm font-medium leading-relaxed">
              Educational institutions retain full ownership and sovereignty over their data. Upon account closure or subscription termination:
            </p>
            <div className="space-y-3 pt-2">
              <ListItem text="School Admins can export all attendance logs, student records, and discipline reports in standard CSV format." />
              <ListItem text="Data is maintained for a 30-day grace period for recovery, after which permanent cryptographic purging occurs upon request." />
              <ListItem text="Parents may request access or correction of their student link details through their designated School Administrator." />
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              4. Mobile & Push Notification Policies
            </h2>
            <p className="text-sm font-medium leading-relaxed">
              The Zetime Mobile Application (Capacitor for Android & iOS) registers Firebase Cloud Messaging (FCM) push tokens exclusively for operational alerts (e.g., child attendance warnings, new discipline notes, and incoming call notifications). Push tokens are revoked automatically upon user logout.
            </p>
          </section>
        </div>

        <div className="pt-12 border-t border-slate-200 dark:border-slate-800 text-center space-y-4">
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
            Have questions regarding security or data compliance?
          </p>
          <Button asChild className="rounded-2xl h-11 px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:bg-slate-800">
            <Link href="mailto:privacy@zetime.app">Contact Security & Compliance</Link>
          </Button>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}

function DataLayerCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 backdrop-blur-xl space-y-2">
      <div className="text-blue-600 dark:text-blue-400">{icon}</div>
      <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-wider">{title}</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{desc}</p>
    </div>
  )
}

function ListItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 text-xs md:text-sm font-medium">
      <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
      <span className="leading-relaxed">{text}</span>
    </div>
  )
}
