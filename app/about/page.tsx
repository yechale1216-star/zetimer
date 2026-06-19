"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  Users, BarChart3, Clock, 
  ArrowRight, ShieldCheck, 
  CheckCircle2, Globe, Heart
} from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { Logo } from "@/components/logo"

export default function AboutPage() {
  return (
    <div className="min-h-screen premium-mesh-gradient text-slate-900 dark:text-slate-100 selection:bg-blue-500/20">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/20 dark:bg-indigo-600/10 rounded-full blur-[120px] animate-pulse delay-700"></div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-white/40 dark:border-white/10 bg-white/40 dark:bg-slate-950/40 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex justify-between h-20 items-center">
            <Logo size="md" withText={true} href="/" />
            
            <div className="hidden md:flex items-center gap-8">
              <Link href="/about" className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">About</Link>
              <Link href="/pricing" className="text-[11px] font-black text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase tracking-widest">Pricing</Link>
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

      <main className="relative z-10">
        {/* Modern About Hero */}
        <section className="py-24 text-center px-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] mb-4">
              <Globe className="w-3 h-3" /> Our Global Mission
            </div>
            <h1 className="text-4xl md:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
              Redefining the <span className="text-blue-600 dark:text-blue-400 italic">Connected School</span> Experience.
            </h1>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
              Zetime isn't just a management tool; it's a social foundation for educational excellence, bridging the gap between institutions and families.
            </p>
          </div>
        </section>

        {/* The Pillars (Synchronized with Landing) */}
        <section className="py-24 bg-white/30 dark:bg-white/[0.02] border-y border-white/40 dark:border-white/10 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-8">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <PillarCard 
                  icon={<Users className="w-8 h-8" />}
                  color="blue"
                  title="Strategic Communication"
                  desc="High-priority messaging and private portals that keep parents and staff in perfect sync."
                />
                <PillarCard 
                  icon={<Clock className="w-8 h-8" />}
                  color="indigo"
                  title="Precision Attendance"
                  desc="Automated tracking and real-time arrival logging designed for modern educational foundations."
                />
                <PillarCard 
                  icon={<BarChart3 className="w-8 h-8" />}
                  color="emerald"
                  title="Advanced Analytics"
                  desc="Multi-session trends and interactive reports that provide actionable insights for school growth."
                />
             </div>
          </div>
        </section>

        {/* Vision Detail Section */}
        <section className="py-32 max-w-7xl mx-auto px-8 grid md:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">
              A Future Without <br />
              <span className="text-blue-600 dark:text-blue-400">Administrative Burden.</span>
            </h2>
            <div className="space-y-6 text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
              <p>We believe that educators should spend more time teaching and less time managing spreadsheets. Zetime solves the manual burden of attendance through deep automation.</p>
              <p>Our platform handles the complexity of student organization, multi-session reporting, and emergency notifications so you don't have to.</p>
            </div>
            <div className="flex flex-wrap gap-8 pt-4">
              <StatItem value="2k+" label="Schools" />
              <StatItem value="98%" label="Success Rate" />
              <StatItem value="24/7" label="Reliability" />
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-blue-600/20 blur-[80px] rounded-full opacity-30 animate-pulse"></div>
            <div className="relative rounded-[40px] overflow-hidden border border-white/60 dark:border-white/10 shadow-2xl glass-card">
              <img 
                src="/zetime_branding_professional.png" 
                alt="Vision" 
                className="w-full aspect-square object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-blue-900/60 to-transparent"></div>
              <div className="absolute bottom-10 left-10 right-10 p-8 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20">
                <Heart className="w-8 h-8 text-rose-400 mb-4" />
                <p className="text-white font-bold italic">"Empowering the next generation starts with better communication."</p>
              </div>
            </div>
          </div>
        </section>

        {/* Trusted By Section */}
        <section className="py-24 bg-slate-950 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent"></div>
          </div>
          <div className="max-w-7xl mx-auto px-8 relative z-10 text-center space-y-12">
            <h2 className="text-3xl font-black uppercase tracking-widest opacity-60">Security & Integrity</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <TrustBadge 
                icon={<ShieldCheck className="w-6 h-6" />}
                title="End-to-End Encryption"
                desc="All school records are encrypted."
              />
              <TrustBadge 
                icon={<Globe className="w-6 h-6" />}
                title="PWA Technology"
                desc="Works offline in remote areas."
              />
              <TrustBadge 
                icon={<CheckCircle2 className="w-6 h-6" />}
                title="Verified Onboarding"
                desc="Strict school institutional checks."
              />
               <TrustBadge 
                icon={<Users className="w-6 h-6" />}
                title="Role Precision"
                desc="Frictionless multi-role switching."
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-32 px-8 text-center space-y-8">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white">
            Ready to <span className="text-blue-600 dark:text-blue-400">Join Us?</span>
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="rounded-2xl h-14 px-10 bg-blue-600 text-white font-black shadow-2xl shadow-blue-500/40 text-lg hover:scale-105 transition-transform" asChild>
              <Link href="/login?signup=true">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-2xl h-14 px-10 border-slate-200 dark:border-white/10 font-bold text-lg hover:bg-white/50 dark:hover:bg-white/10" asChild>
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-white/40 dark:border-white/10 bg-white/20 dark:bg-slate-950/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
            <Link href="/about" className="text-blue-600">About</Link>
            <Link href="/pricing" className="hover:text-blue-600">Pricing</Link>
            <Link href="/privacy" className="hover:text-blue-600">Privacy</Link>
            <Link href="/terms" className="hover:text-blue-600">Terms</Link>
          </div>
          <p className="text-[10px] font-bold text-slate-500/60 uppercase tracking-[0.3em]">
            &copy; {new Date().getFullYear()} Zetime &bull; The Digital Standard
          </p>
        </div>
      </footer>
    </div>
  )
}

function PillarCard({ icon, color, title, desc }: { icon: React.ReactNode, color: string, title: string, desc: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-600 shadow-blue-500/20",
    indigo: "bg-indigo-600 shadow-indigo-500/20",
    emerald: "bg-emerald-600 shadow-emerald-500/20",
  }
  
  return (
    <div className="flex flex-col space-y-6 group">
      <div className={`w-16 h-16 rounded-[22px] ${colors[color]} text-white flex items-center justify-center shadow-xl transition-transform group-hover:scale-110 duration-500`}>
        {icon}
      </div>
      <div>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">{title}</h3>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
          {desc}
        </p>
      </div>
    </div>
  )
}

function StatItem({ value, label }: { value: string, label: string }) {
  return (
    <div>
      <div className="text-4xl font-black text-blue-600 dark:text-blue-400 leading-none mb-1">{value}</div>
      <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{label}</div>
    </div>
  )
}

function TrustBadge({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left space-y-4">
      <div className="text-blue-400">{icon}</div>
      <div>
        <h4 className="font-bold mb-1">{title}</h4>
        <p className="text-sm text-white/60 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}
