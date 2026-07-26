'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { ShieldCheck, Heart, Globe, Lock, ArrowUpRight, ShieldAlert, Clock, Smartphone, MessageSquare } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Brand & Mission Column */}
          <div className="md:col-span-2 space-y-4">
            <Logo size="md" withText={true} href="/" />
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed font-medium">
              Zetime is the complete multi-tenant educational SaaS platform empowering schools with precision session attendance tracking, instant student discipline management, and real-time parent-teacher communication.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                System Operational &bull; Multi-Tenant SaaS
              </div>
            </div>
          </div>

          {/* Column 2: Core Platform Modules */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
              Platform Modules
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/about" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-indigo-500" />
                  Discipline & Conduct
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  Dual Attendance Modes
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-violet-500" />
                  Parent-Teacher Chat
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                  Capacitor Android App
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
              Navigation
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/about" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Subscription Pricing
                </Link>
              </li>
              <li>
                <Link href="/school/admin/signup" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Start 30-Day Free Trial
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  School Admin Login
                </Link>
              </li>
              <li>
                <Link href="/proposal" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Institutional Proposal
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal & Security */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
              Legal & Compliance
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  AES-256 Data Security
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright Row */}
        <div className="mt-12 pt-8 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-500">
          <p>&copy; {new Date().getFullYear()} Zetime Educational SaaS. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/about" className="hover:text-blue-600 transition-colors">About</Link>
            <Link href="/pricing" className="hover:text-blue-600 transition-colors">Pricing</Link>
            <Link href="/privacy" className="hover:text-blue-600 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-blue-600 transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
