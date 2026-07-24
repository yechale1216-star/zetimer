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
  ChevronRight,
  Check,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'admin' | 'teacher' | 'parent' | 'discipline'>('discipline');

  useEffect(() => {
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
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[20%] w-[45%] h-[45%] bg-blue-500/10 dark:bg-blue-600/8 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[10%] w-[45%] h-[45%] bg-indigo-500/10 dark:bg-indigo-600/8 rounded-full blur-[140px] animate-pulse delay-1000" />
      </div>

      <PublicNavbar />

      <main className="relative z-10">

        {/* ─── HERO SECTION ─── */}
        <section className="pt-16 pb-20 md:pt-24 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

            {/* Left: Text Content */}
            <div className="flex-1 space-y-6 text-center lg:text-left">
              {/* Pill badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>NEW: Student Discipline Management Module</span>
                <ChevronRight className="w-3 h-3 opacity-60" />
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15] text-slate-900 dark:text-white">
                The Digital Standard for{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400">
                  Connected School Management
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Zetime unifies School Administration, Attendance Tracking, Student Discipline Records, and Real-Time Parent Communication into one seamless multi-tenant platform.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button
                  asChild
                  size="lg"
                  className="h-12 px-7 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all hover:scale-105"
                >
                  <Link href="/login?signup=true">
                    Start 14-Day Free Trial
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 px-7 rounded-xl border-slate-300 dark:border-slate-700 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                  <Link href="/login">Sign In to Dashboard</Link>
                </Button>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-200/70 dark:border-slate-800/70 max-w-lg mx-auto lg:mx-0">
                <div>
                  <p className="text-xl font-black text-blue-600 dark:text-blue-400">99.9%</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">Uptime</p>
                </div>
                <div>
                  <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">100%</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">Multi-Tenant</p>
                </div>
                <div>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">PWA</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">Offline-Ready</p>
                </div>
                <div>
                  <p className="text-xl font-black text-purple-600 dark:text-purple-400">Push</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">Notifications</p>
                </div>
              </div>
            </div>

            {/* Right: Hero Image */}
            <div className="flex-1 w-full max-w-xl lg:max-w-none">
              <div className="relative group">
                {/* Glow behind image */}
                <div className="absolute -inset-3 bg-gradient-to-r from-blue-600/20 via-indigo-500/15 to-purple-600/20 rounded-[32px] blur-2xl opacity-60 dark:opacity-40 group-hover:opacity-80 transition-opacity duration-700" />
                {/* Image card */}
                <div className="relative rounded-[24px] overflow-hidden shadow-2xl border border-white/60 dark:border-white/10 bg-white/30 dark:bg-white/5 backdrop-blur-sm transition-transform duration-500 group-hover:scale-[1.015]">
                  <img
                    src="/school-hero.png"
                    alt="Zetime School Admin Dashboard — the powerful command center for modern school management"
                    className="w-full h-auto object-cover"
                    loading="eager"
                  />
                  {/* Floating badge — bottom left */}
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg border border-white/20 dark:border-white/10">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Admin Portal</div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Full Command Center</div>
                    </div>
                  </div>
                  {/* Floating badge — top right */}
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/90 shadow-lg text-white">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Live System</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── FEATURES SECTION ─── */}
        <section id="features" className="py-20 bg-white/60 dark:bg-slate-900/40 border-y border-slate-200/60 dark:border-slate-800/60 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider border-blue-500/30 text-blue-600 dark:text-blue-400">
                Complete Ecosystem
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
                Built for Modern Schools &amp; Empowered Families
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Everything required to digitize school governance, tracking, and parent engagement in one seamless interface.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border shadow-md hover:shadow-lg transition-all duration-300 group">
                <CardContent className="p-5 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold">Student Discipline Module</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Incident reporting, evidence uploads, color-coded severities, follow-up notes, and parent report acknowledgment.
                  </p>
                </CardContent>
              </Card>

              <Card className="border shadow-md hover:shadow-lg transition-all duration-300 group">
                <CardContent className="p-5 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold">Precision Attendance</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Session-based arrival tracking, grade &amp; section metrics, automated threshold alerts, and instant parent notifications.
                  </p>
                </CardContent>
              </Card>

              <Card className="border shadow-md hover:shadow-lg transition-all duration-300 group">
                <CardContent className="p-5 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold">Parent &amp; Staff Messaging</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Direct messaging between teachers and parents, group announcements, saved messages, and voice/video calling.
                  </p>
                </CardContent>
              </Card>

              <Card className="border shadow-md hover:shadow-lg transition-all duration-300 group">
                <CardContent className="p-5 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold">Analytics &amp; Reports</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Multi-session attendance reports, repeat offender charts, student promotion workflows, and CSV exports.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ─── ROLE PREVIEW SWITCHER ─── */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
              Designed for Every Role
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Tailored interfaces for Administrators, Teachers, and Parents.
            </p>

            {/* Tab Switcher */}
            <div className="flex flex-wrap justify-center gap-2 pt-3">
              <Button
                variant={activeTab === 'discipline' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('discipline')}
                className="rounded-lg font-semibold text-xs"
              >
                <ShieldAlert className="w-3.5 h-3.5 mr-1.5 text-rose-500" />
                Discipline
              </Button>
              <Button
                variant={activeTab === 'admin' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('admin')}
                className="rounded-lg font-semibold text-xs"
              >
                <Users className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                Admin Portal
              </Button>
              <Button
                variant={activeTab === 'teacher' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('teacher')}
                className="rounded-lg font-semibold text-xs"
              >
                <Clock className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                Teacher
              </Button>
              <Button
                variant={activeTab === 'parent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('parent')}
                className="rounded-lg font-semibold text-xs"
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-purple-500" />
                Parent App
              </Button>
            </div>
          </div>

          {/* Dynamic Panel */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 bg-white dark:bg-slate-900 shadow-xl space-y-5">
            {activeTab === 'discipline' && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-500" />
                      Discipline Management Directory
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Real-time incident reporting with evidence attachments</p>
                  </div>
                  <Badge className="bg-rose-500 text-white font-semibold text-xs self-start sm:self-auto">Live Feature</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 border rounded-xl bg-slate-50 dark:bg-slate-950 space-y-1">
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Incident Severity</span>
                    <p className="text-sm font-bold text-rose-600">CRITICAL / HIGH / MEDIUM</p>
                  </div>
                  <div className="p-3.5 border rounded-xl bg-slate-50 dark:bg-slate-950 space-y-1">
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Parent Notification</span>
                    <p className="text-sm font-bold text-emerald-600">Instant Push + Acknowledgment</p>
                  </div>
                  <div className="p-3.5 border rounded-xl bg-slate-50 dark:bg-slate-950 space-y-1">
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Audit Trail</span>
                    <p className="text-sm font-bold text-blue-600">100% Cryptographic Logged</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'admin' && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b pb-4">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    Admin Command Center
                  </h3>
                  <Badge className="bg-blue-600 text-white font-semibold text-xs">Multi-Tenant</Badge>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Manage teachers, assign grades &amp; sections, configure subscription billing, oversee student promotion, and generate official compliance reports.
                </p>
              </div>
            )}

            {activeTab === 'teacher' && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b pb-4">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    Teacher Homeroom Workspace
                  </h3>
                  <Badge className="bg-emerald-600 text-white font-semibold text-xs">Class Scoped</Badge>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Mark daily attendance in seconds, report discipline cases, message linked parents directly, and send class announcements.
                </p>
              </div>
            )}

            {activeTab === 'parent' && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b pb-4">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-purple-500" />
                    Parent Mobile Portal
                  </h3>
                  <Badge className="bg-purple-600 text-white font-semibold text-xs">Mobile App</Badge>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  View child's attendance timeline, receive push notifications for discipline reports, acknowledge conduct notices, and chat with homeroom teachers.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ─── PRICING PREVIEW ─── */}
        <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 relative z-10 text-center">
            <div className="space-y-3 max-w-xl mx-auto">
              <h2 className="text-2xl sm:text-4xl font-bold">Flexible SaaS Pricing</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Transparent per-student pricing with a 14-day free trial. No hidden fees.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <Card className="bg-slate-800/80 border-slate-700 text-white p-5 space-y-4">
                <h3 className="text-base font-bold">Starter Plan</h3>
                <p className="text-xs text-slate-400">For small institutions</p>
                <div className="text-2xl font-black">ETB 15 <span className="text-xs font-medium text-slate-400">/ student / mo</span></div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> Attendance tracking</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> Parent portal access</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> Basic reports</li>
                </ul>
              </Card>

              <Card className="bg-blue-600 border-blue-500 text-white p-5 space-y-4 shadow-2xl relative">
                <Badge className="absolute top-4 right-4 bg-white text-blue-600 font-bold text-xs">Popular</Badge>
                <h3 className="text-base font-bold">Standard Plan</h3>
                <p className="text-xs text-blue-100">For growing schools</p>
                <div className="text-2xl font-black">ETB 25 <span className="text-xs font-medium text-blue-200">/ student / mo</span></div>
                <ul className="space-y-1.5 text-xs text-blue-100">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-white flex-shrink-0" /> Everything in Starter</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-white flex-shrink-0" /> Student Discipline Module</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-white flex-shrink-0" /> Real-time messaging</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-white flex-shrink-0" /> CSV exports</li>
                </ul>
              </Card>

              <Card className="bg-slate-800/80 border-slate-700 text-white p-5 space-y-4">
                <h3 className="text-base font-bold">Enterprise</h3>
                <p className="text-xs text-slate-400">Custom capacity &amp; SLAs</p>
                <div className="text-2xl font-black">Custom</div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> Dedicated account manager</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> Custom contracts</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> White-label option</li>
                </ul>
              </Card>
            </div>

            <Button asChild size="default" className="rounded-xl bg-white text-slate-900 font-semibold hover:bg-slate-100 text-sm px-6">
              <Link href="/pricing">View Complete Pricing &amp; Addons</Link>
            </Button>
          </div>
        </section>

        {/* ─── FINAL CTA ─── */}
        <section className="py-20 text-center px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
            Transform Your School Operations Today
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed max-w-xl mx-auto">
            Join institutions streamlining student discipline, attendance, and parent communication with Zetime.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              size="lg"
              className="h-11 px-8 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/25"
            >
              <Link href="/login?signup=true">Start Free Trial</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-11 px-8 rounded-xl border-slate-300 dark:border-slate-700 font-semibold text-sm"
            >
              <Link href="/about">Learn More About Zetime</Link>
            </Button>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
