"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Shield, Lock, ArrowLeft, Globe, Eye } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { Logo } from "@/components/logo"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen premium-mesh-gradient text-slate-900 dark:text-slate-100 selection:bg-blue-500/20">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-white/40 dark:border-white/10 bg-white/40 dark:bg-slate-950/40 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex justify-between h-20 items-center">
            <Logo size="md" withText={true} href="/" />
            <div className="flex items-center gap-6">
              <Link href="/about" className="text-[11px] font-black text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase tracking-widest hidden sm:block">About</Link>
              <ModeToggle />
              <Button asChild size="sm" variant="outline" className="rounded-xl border-slate-200 dark:border-white/10 font-bold">
                <Link href="/login">Login</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-8 py-20 relative z-10">
        <Link href="/" className="inline-flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-12 hover:translate-x-[-4px] transition-transform">
          <ArrowLeft className="mr-2 w-4 h-4" /> Back to Home
        </Link>
        
        <div className="space-y-6 mb-16">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-500/20">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">Privacy <br /><span className="text-blue-600">Protocol.</span></h1>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-relaxed">Last updated: June 13, 2026</p>
        </div>

        <div className="space-y-12 text-slate-600 dark:text-slate-400">
          <section>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight">1. Information Architecture</h2>
            <p className="mb-6 leading-relaxed">
              We collect information to provide better services to our institutions. This data is segregated into three core layers:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <DataLayerCard 
                icon={<Lock className="w-4 h-4" />}
                title="Account Integrity"
                desc="Name, encrypted contacts, and institutional credentials."
              />
              <DataLayerCard 
                icon={<Eye className="w-4 h-4" />}
                title="Academic Logging"
                desc="Real-time attendance, enrollment status, and records."
              />
              <DataLayerCard 
                icon={<Globe className="w-4 h-4" />}
                title="Cloud Sync"
                desc="Offline cached records and local storage metrics."
              />
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight">2. Usage Strategy</h2>
            <p className="leading-relaxed mb-6">
              The data we collect is used solely for maintaining the Zetime educational ecosystem. We never sell or distribute institutional data to third parties.
            </p>
            <ul className="space-y-3">
              <ListItem text="Facilitating secure parent-teacher communication portals." />
              <ListItem text="Generating automated high-precision reports." />
              <ListItem text="Managing SMS and real-time notification stacks." />
            </ul>
          </section>

          <div className="p-8 rounded-[32px] bg-blue-600 text-white shadow-2xl shadow-blue-600/20 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-10">
                <Shield className="w-32 h-32" />
             </div>
             <h3 className="text-xl font-black mb-4 uppercase tracking-widest">Global Encryption Standards</h3>
             <p className="text-blue-100 leading-relaxed font-medium">
               We employ AES-256 encryption at rest and TLS 1.3 for all data in transit. 
               Our multi-tenant architecture ensures complete isolation between different schools, 
               guaranteeing that your data is only ever accessible to authorized personnel.
             </p>
          </div>

          <section>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight">3. Data Sovereignty</h2>
            <p className="leading-relaxed">
              Schools retain full ownership of their data. Bulk exports and permanent deletion requests 
              are processed within 24 hours of account closure. We maintain a 30-day grace period 
              for data recovery before permanent cryptographic purging.
            </p>
          </section>
        </div>

        <div className="mt-24 pt-12 border-t border-white/40 dark:border-white/10 text-center">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">
            Detailed security inquiries?
          </p>
          <Button asChild className="rounded-xl h-12 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold hover:bg-slate-50">
            <Link href="mailto:privacy@zetime.io">Contact Security Team</Link>
          </Button>
        </div>
      </main>

      <footer className="py-12 border-t border-white/40 dark:border-white/10 bg-white/20 dark:bg-slate-950/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-8 text-center">
          <p className="text-[10px] font-bold text-slate-500/60 uppercase tracking-[0.3em]">
            &copy; {new Date().getFullYear()} Zetime &bull; Privacy First Standard
          </p>
        </div>
      </footer>
    </div>
  )
}

function DataLayerCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/60 dark:border-white/10 backdrop-blur-xl">
      <div className="text-blue-600 dark:text-blue-400 mb-3">{icon}</div>
      <h4 className="font-bold text-slate-900 dark:text-white mb-1 uppercase text-xs tracking-widest">{title}</h4>
      <p className="text-xs text-slate-500/80 dark:text-slate-400 leading-relaxed font-medium">{desc}</p>
    </div>
  )
}

function ListItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
      <span className="font-medium text-sm">{text}</span>
    </div>
  )
}
