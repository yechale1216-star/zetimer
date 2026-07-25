'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PublicNavbar } from '@/components/layout/public-navbar';
import { PublicFooter } from '@/components/layout/public-footer';
import { authService } from '@/lib/auth/auth';
import {
  ShieldAlert,
  CheckCircle2,
  Users,
  Clock,
  MessageSquare,
  BarChart3,
  ArrowRight,
  Sparkles,
  Zap,
  Globe,
  Lock,
  ChevronRight,
  Smartphone,
  Star,
  Check
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'admin' | 'teacher' | 'parent' | 'discipline'>('discipline');

  useEffect(() => {
    // If logged in, automatically redirect to role-specific dashboard
    if (typeof window !== 'undefined' && authService.isAuthenticated()) {
      const user = authService.getCurrentUser();
      const availableStr = localStorage.getItem('available_schools');
      const schools = availableStr ? JSON.parse(availableStr) : [];
      const xSchoolId = localStorage.getItem('x-school-id');

      if (schools.length > 1 && !xSchoolId) {
        router.replace('/auth/school-select');
        return;
      }

      if (user?.role === 'super_admin') {
        router.replace('/super-admin');
      } else if (user?.role === 'teacher') {
        router.replace('/school/teacher');
      } else if (user?.role === 'parent') {
        router.replace('/parent/dashboard');
      } else {
        if (user?.onboardingCompleted === false) {
          router.replace('/onboarding');
        } else {
          router.replace('/school/admin');
        }
      }
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-500/20">
      {/* Background Animated Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[20%] w-[45%] h-[45%] bg-blue-500/15 dark:bg-blue-600/10 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[10%] w-[45%] h-[45%] bg-indigo-500/15 dark:bg-indigo-600/10 rounded-full blur-[140px] animate-pulse delay-1000" />
      </div>

      {/* Standardized Navigation Header */}
      <PublicNavbar />

      <main className="relative z-10">
        {/* HERO SECTION */}
        <section className="pt-10 pb-20 md:pt-16 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            
            {/* Left Content Column */}
            <div className="flex-1 text-center lg:text-left space-y-6 max-w-2xl">
              {/* Pill Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                The Bridge Between Home & School
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-slate-900 dark:text-white">
                Modern School <br className="hidden sm:inline" />
                <span className="text-blue-600 dark:text-blue-400 italic">Attendance & Communication</span> <br className="hidden sm:inline" />
                Platform.
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                The professional platform for schools to master precision attendance management and real-time analytics, while bridging the communication gap between parents and staff through high-priority messaging.
              </p>

              {/* Action Button & Trust Avatars */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <Button
                  asChild
                  size="lg"
                  className="h-12 px-7 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition-all hover:scale-105"
                >
                  <Link href="/login?signup=true">
                    Join Your School
                  </Link>
                </Button>

                <div className="flex items-center -space-x-2 pl-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 overflow-hidden shadow-sm">
                      <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  <div className="pl-4 text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Trusted by 2k+ Families
                  </div>
                </div>
              </div>
            </div>

            {/* Right Image Showcase Column (Clean, Unobscured Image) */}
            <div className="flex-1 w-full max-w-2xl">
              <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 rounded-[40px] blur-3xl opacity-20 dark:opacity-40 group-hover:opacity-60 transition duration-1000"></div>
                <div className="relative rounded-[32px] overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.12)] dark:shadow-2xl border border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/10 backdrop-blur-2xl transition-transform duration-700 group-hover:scale-[1.01]">
                  <img
                    src="/zetime_branding_professional.png"
                    alt="Zetime Communication Dashboard"
                    className="w-full aspect-[4/3] object-cover opacity-95"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Platform Stats Row */}
          <div className="mt-16 pt-10 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto border-t border-slate-200/60 dark:border-slate-800/60 text-center">
            <div>
              <p className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">99.9%</p>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">Uptime Reliability</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">100%</p>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">Multi-Tenant Isolation</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">PWA</p>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">Offline Capability</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">Instant</p>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">Push Notifications</p>
            </div>
          </div>
        </section>

        {/* CORE PLATFORM PILLARS */}
        <section id="features" className="py-24 bg-white/60 dark:bg-slate-900/40 border-y border-slate-200/60 dark:border-slate-800/60 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <Badge variant="outline" className="text-xs font-bold uppercase tracking-widest border-blue-500/30 text-blue-600 dark:text-blue-400">
                Complete Ecosystem
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
                Built for Modern Schools & Empowered Families
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-base font-medium">
                Everything required to digitize school governance, tracking, and parent engagement in one seamless interface.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Feature 1: Discipline */}
              <Card className="border shadow-lg hover:shadow-xl transition-all duration-300 group">
                <CardContent className="p-6 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold">Student Discipline Module</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    Incident reporting, multi-step evidence uploads, color-coded severities, follow-up notes, and parent report acknowledgment.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 2: Attendance */}
              <Card className="border shadow-lg hover:shadow-xl transition-all duration-300 group">
                <CardContent className="p-6 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold">Precision Attendance</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    Session-based arrival tracking, grade & section metrics, automated threshold alerts, and instant parent notifications.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 3: Parent Communication */}
              <Card className="border shadow-lg hover:shadow-xl transition-all duration-300 group">
                <CardContent className="p-6 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold">Parent & Staff Messaging</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    Direct messaging between homeroom teachers and parents, group announcements, saved messages, and voice/video calling integration.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 4: Multi-tenant SaaS */}
              <Card className="border shadow-lg hover:shadow-xl transition-all duration-300 group">
                <CardContent className="p-6 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold">Analytics & Reports</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    Multi-session attendance reports, repeat offender charts, student promotion workflows, and instant CSV exports.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* INTERACTIVE DEMO PREVIEW SWITCHER */}
        <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
              Designed for Every Role
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-base font-medium">
              Explore how Zetime provides tailormade interfaces for Administrators, Teachers, and Parents.
            </p>

            {/* Role Tab Switcher */}
            <div className="flex flex-wrap justify-center gap-2 pt-4">
              <Button
                variant={activeTab === 'discipline' ? 'default' : 'outline'}
                onClick={() => setActiveTab('discipline')}
                className="rounded-xl font-bold"
              >
                <ShieldAlert className="w-4 h-4 mr-2 text-rose-500" />
                Discipline Module
              </Button>
              <Button
                variant={activeTab === 'admin' ? 'default' : 'outline'}
                onClick={() => setActiveTab('admin')}
                className="rounded-xl font-bold"
              >
                <Users className="w-4 h-4 mr-2 text-blue-500" />
                School Admin Portal
              </Button>
              <Button
                variant={activeTab === 'teacher' ? 'default' : 'outline'}
                onClick={() => setActiveTab('teacher')}
                className="rounded-xl font-bold"
              >
                <Clock className="w-4 h-4 mr-2 text-emerald-500" />
                Teacher Workspace
              </Button>
              <Button
                variant={activeTab === 'parent' ? 'default' : 'outline'}
                onClick={() => setActiveTab('parent')}
                className="rounded-xl font-bold"
              >
                <MessageSquare className="w-4 h-4 mr-2 text-purple-500" />
                Parent Mobile App
              </Button>
            </div>
          </div>

          {/* Dynamic Mock View Preview */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 bg-white dark:bg-slate-900 shadow-2xl space-y-6">
            {activeTab === 'discipline' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-rose-500" />
                      Discipline Management Directory
                    </h3>
                    <p className="text-xs text-slate-500">Real-time incident reporting with evidence attachments</p>
                  </div>
                  <Badge className="bg-rose-500 text-white font-bold self-start sm:self-auto">Live Feature</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-950 space-y-1">
                    <span className="text-xs text-slate-500">Incident Severity</span>
                    <p className="font-bold text-rose-600">CRITICAL / HIGH</p>
                  </div>
                  <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-950 space-y-1">
                    <span className="text-xs text-slate-500">Parent Notification</span>
                    <p className="font-bold text-emerald-600">Instant Push & Report Acknowledgment</p>
                  </div>
                  <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-950 space-y-1">
                    <span className="text-xs text-slate-500">Audit Trail</span>
                    <p className="font-bold text-blue-600">100% Cryptographic Logged</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'admin' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b pb-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    Institutional Admin Command Center
                  </h3>
                  <Badge className="bg-blue-600 text-white font-bold">Multi-Tenant</Badge>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  Manage teachers, assign grades & sections, configure subscription billing, oversee student promotion, and generate official compliance reports.
                </p>
              </div>
            )}

            {activeTab === 'teacher' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b pb-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-500" />
                    Teacher Homeroom Workspace
                  </h3>
                  <Badge className="bg-emerald-600 text-white font-bold">Class Scoped</Badge>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  Mark daily attendance in seconds, report discipline cases for homeroom students, message linked parents directly, and send class announcements.
                </p>
              </div>
            )}

            {activeTab === 'parent' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b pb-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-purple-500" />
                    Parent Mobile Portal
                  </h3>
                  <Badge className="bg-purple-600 text-white font-bold">Mobile App</Badge>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  View child's attendance timeline, receive instant push notifications for discipline reports, acknowledge conduct notices, and chat with homeroom teachers.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* PRICING LINK PREVIEW SECTION */}
        <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10 text-center">
            <div className="space-y-4 max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-5xl font-black">Flexible SaaS Pricing Plans</h2>
              <p className="text-slate-400 text-base font-medium">
                Transparent per-student pricing with a 14-day free trial. No hidden fees.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
              <Card className="bg-slate-800/80 border-slate-700 text-white p-6 space-y-4">
                <h3 className="text-xl font-bold">Starter Plan</h3>
                <p className="text-xs text-slate-400">For small institutions</p>
                <div className="text-3xl font-black">ETB 15 <span className="text-xs font-semibold text-slate-400">/ student / mo</span></div>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Attendance tracking</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Parent portal access</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Basic reports</li>
                </ul>
              </Card>

              <Card className="bg-blue-600 border-blue-500 text-white p-6 space-y-4 shadow-2xl relative">
                <Badge className="absolute top-4 right-4 bg-white text-blue-600 font-bold">Popular</Badge>
                <h3 className="text-xl font-bold">Standard Plan</h3>
                <p className="text-xs text-blue-100">For growing schools</p>
                <div className="text-3xl font-black">ETB 25 <span className="text-xs font-semibold text-blue-200">/ student / mo</span></div>
                <ul className="space-y-2 text-xs text-blue-100">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-white" /> Everything in Starter</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-white" /> Student Discipline Module</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-white" /> Real-time messaging</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-white" /> CSV exports</li>
                </ul>
              </Card>

              <Card className="bg-slate-800/80 border-slate-700 text-white p-6 space-y-4">
                <h3 className="text-xl font-bold">Enterprise</h3>
                <p className="text-xs text-slate-400">Custom capacity & SLAs</p>
                <div className="text-3xl font-black">Custom</div>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Dedicated account manager</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Custom contracts</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> White-label option</li>
                </ul>
              </Card>
            </div>

            <div className="pt-4">
              <Button asChild size="lg" className="rounded-2xl bg-white text-slate-900 font-bold hover:bg-slate-100">
                <Link href="/pricing">View Complete Pricing & Addons</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* FINAL CALL TO ACTION BANNER */}
        <section className="py-24 text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
            Transform Your School Operations Today
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg font-medium max-w-2xl mx-auto">
            Join institutions streamlining student discipline, attendance, and parent communication with Zetime.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="h-14 px-10 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg shadow-xl shadow-blue-500/25"
            >
              <Link href="/login?signup=true">Start Free Trial</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 px-10 rounded-2xl border-slate-300 dark:border-slate-800 font-bold text-lg"
            >
              <Link href="/about">Learn More About Zetime</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Standardized Footer */}
      <PublicFooter />
    </div>
  );
}
