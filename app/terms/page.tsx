"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Scale, ArrowLeft, ShieldCheck, AlertCircle, Clock } from "lucide-react"
import { PublicNavbar } from "@/components/layout/public-navbar"
import { PublicFooter } from "@/components/layout/public-footer"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-500/20">
      <PublicNavbar />

      <main className="max-w-4xl mx-auto px-8 py-20 relative z-10">
        <Link href="/" className="inline-flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-12 hover:translate-x-[-4px] transition-transform">
          <ArrowLeft className="mr-2 w-4 h-4" /> Back to Home
        </Link>
        
        <div className="space-y-6 mb-16">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-500/20">
            <Scale className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-[1.15]">Terms of <br /><span className="text-indigo-600">Service.</span></h1>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-relaxed">System Agreement &middot; Last updated: June 13, 2026</p>
        </div>

        <div className="space-y-12 text-slate-600 dark:text-slate-400">
          <section>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight">1. Core Agreement</h2>
            <p className="leading-relaxed font-medium">
              By accessing and using Zetime, you agree to be bound by these Terms of Service. These terms govern the relationship between your institution and Zetime's technical infrastructure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight">2. Institutional Onboarding</h2>
            <p className="mb-6 leading-relaxed">
              Account activation requires official school verification. The Primary Administrator holds sole responsibility for:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <PolicyCard 
                icon={<ShieldCheck className="w-4 h-4" />}
                title="Staff Validation"
                desc="Ensuring only authorized educators access student attendance data."
              />
              <PolicyCard 
                icon={<Clock className="w-4 h-4" />}
                title="Audit Accuracy"
                desc="Maintaining precise records for legal and institutional compliance."
              />
            </div>
          </section>

          <div className="p-8 rounded-[32px] bg-slate-950 text-white border border-white/10 shadow-2xl relative overflow-hidden">
             <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                   <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-widest">Communication Policy</h3>
             </div>
             <p className="text-slate-400 leading-relaxed font-medium">
                The Messaging Center and high-priority notification system are strictly for professional educational coordination. 
                Any misuse of these channels for non-academic solicitation or unverified document sharing will lead to 
                immediate institutional account suspension.
             </p>
          </div>

          <section>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight">3. System Rights</h2>
            <p className="leading-relaxed">
              Zetime provides the platform on an institutional subscription basis. Service levels, including offline sync and advanced analytics, are dependent on maintaining an active tier. Unauthorized attempts to manipulate audit logs or bypass system security are strictly prohibited.
            </p>
          </section>
        </div>

        <div className="mt-24 pt-12 border-t border-white/40 dark:border-white/10 text-center">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">
            Legal or Compliance Questions?
          </p>
          <Button asChild className="rounded-xl h-12 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold hover:bg-slate-50">
            <Link href="/contact">Contact Compliance</Link>
          </Button>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}

function PolicyCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/60 dark:border-white/10 backdrop-blur-xl transition-all hover:bg-white/60">
      <div className="text-indigo-600 dark:text-indigo-400 mb-3">{icon}</div>
      <h4 className="font-bold text-slate-900 dark:text-white mb-1 uppercase text-xs tracking-widest">{title}</h4>
      <p className="text-xs text-slate-500/80 dark:text-slate-400 leading-relaxed font-medium">{desc}</p>
    </div>
  )
}
