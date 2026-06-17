'use client';

import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Terminal,
  Monitor,
  RefreshCw,
  Wifi,
  Settings,
  ChevronRight,
  Code,
  Copy,
  CheckCircle2,
  Server,
  Globe,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/utils';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="ml-auto shrink-0 text-slate-500 hover:text-white transition-colors"
    >
      {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

function StatRow({
  label,
  value,
  badge,
  pulse,
  color = 'emerald',
}: {
  label: string;
  value?: string;
  badge?: string;
  pulse?: boolean;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
    blue: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]',
    amber: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
    slate: 'bg-slate-500',
  };
  return (
    <div className="flex items-center justify-between p-4 bg-slate-950/40 rounded-2xl border border-slate-800/40">
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <div className="flex items-center gap-2">
        {pulse && (
          <div className={cn('w-2 h-2 rounded-full animate-pulse', colorMap[color])} />
        )}
        {value && <span className={cn('text-xs font-bold uppercase', `text-${color}-500`)}>{value}</span>}
        {badge && (
          <Badge variant="outline" className={cn('border-slate-700 text-slate-400 text-[10px]')}>
            {badge}
          </Badge>
        )}
      </div>
    </div>
  );
}

const ADB_COMMANDS = [
  { label: 'Check devices', cmd: 'adb devices' },
  { label: 'Forward Frontend (port 3000)', cmd: 'adb reverse tcp:3000 tcp:3000' },
  { label: 'Forward Backend (port 5000)', cmd: 'adb reverse tcp:5000 tcp:5000' },
  { label: 'Kill ADB server', cmd: 'adb kill-server' },
  { label: 'Restart ADB server', cmd: 'adb start-server' },
];

export default function DevToolsPage() {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [mounted, setMounted] = useState(false);
  const [systemTime, setSystemTime] = useState('');

  useEffect(() => {
    setMounted(true);
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    setSystemTime(new Date().toLocaleTimeString());

    const handleResize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });

    const timer = setInterval(
      () => setSystemTime(new Date().toLocaleTimeString()),
      1000
    );

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(timer);
    };
  }, []);

  if (!mounted) return null;

  // Guard: production
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white p-6 text-center">
        <div className="space-y-4">
          <Terminal className="w-12 h-12 text-blue-500 mx-auto" />
          <h1 className="text-2xl font-bold">Access Restricted</h1>
          <p className="text-slate-400">Dev Tools are only available in development mode.</p>
          <a
            href="/"
            className="inline-block mt-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-semibold transition"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  const getDeviceType = () => {
    const w = windowSize.width;
    if (w < 640) return 'Mobile (xs)';
    if (w < 768) return 'Mobile (sm)';
    if (w < 1024) return 'Tablet';
    if (w < 1280) return 'Laptop';
    return 'Desktop';
  };

  const getBreakpoint = () => {
    const w = windowSize.width;
    if (w < 640) return 'xs';
    if (w < 768) return 'sm';
    if (w < 1024) return 'md';
    if (w < 1280) return 'lg';
    return 'xl+';
  };

  return (
    <div className="min-h-screen bg-[#060608] text-slate-100 p-4 md:p-8 selection:bg-blue-500/30">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/15 rounded-xl border border-blue-500/20">
                <Code className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tighter text-white">Dev Tools</h1>
                <p className="text-xs text-slate-500 font-medium tracking-widest uppercase mt-0.5">Zetime – Development Only</p>
              </div>
            </div>
          </div>
          <div className="text-right hidden sm:block shrink-0">
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.2em]">System Clock</p>
            <p className="text-2xl font-mono text-blue-400/80 tracking-tighter tabular-nums">{systemTime}</p>
          </div>
        </div>

        {/* ── Row 1: Display + Connectivity ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Display Settings */}
          <Card className="bg-slate-900/40 border border-slate-800/60 backdrop-blur-xl rounded-3xl overflow-hidden hover:border-emerald-500/20 transition-all shadow-2xl">
            <CardHeader className="border-b border-slate-800/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl">
                  <Monitor className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Display &amp; Viewport</CardTitle>
                  <CardDescription className="text-xs">Real-time screen data</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/40 text-center">
                  <p className="text-[9px] uppercase font-bold text-slate-500 mb-1 tracking-widest">Width</p>
                  <p className="text-2xl font-mono text-white tabular-nums">{windowSize.width}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">px</p>
                </div>
                <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/40 text-center">
                  <p className="text-[9px] uppercase font-bold text-slate-500 mb-1 tracking-widest">Height</p>
                  <p className="text-2xl font-mono text-white tabular-nums">{windowSize.height}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">px</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-800/40">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <p className="text-sm font-medium">Device Type</p>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-xs px-3 py-0.5">
                  {getDeviceType()}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-800/40">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <p className="text-sm font-medium">Breakpoint</p>
                </div>
                <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/20 text-xs px-3 py-0.5 font-mono">
                  {getBreakpoint()}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Connectivity / Server Status */}
          <Card className="bg-slate-900/40 border border-slate-800/60 backdrop-blur-xl rounded-3xl overflow-hidden hover:border-amber-500/20 transition-all shadow-2xl">
            <CardHeader className="border-b border-slate-800/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-xl">
                  <Server className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Server Status</CardTitle>
                  <CardDescription className="text-xs">Local dev server &amp; API</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              <StatRow label="Next.js Frontend (:3000)" value="Online" pulse color="emerald" />
              <StatRow label="Express API (:5000)" value="Online" pulse color="emerald" />
              <StatRow label="Node Environment" badge={process.env.NODE_ENV ?? 'development'} />
              <div className="flex items-center justify-between p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-blue-400" />
                  <p className="text-sm font-medium text-blue-300">ADB Port Forwarding</p>
                </div>
                <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/20 text-[10px]">MANUAL STEP</Badge>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* ── ADB Commands ── */}
        <Card className="bg-slate-900/40 border border-slate-800/60 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl">
          <CardHeader className="border-b border-slate-800/40 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-500/10 rounded-xl">
                <Terminal className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">ADB Quick Commands</CardTitle>
                <CardDescription className="text-xs">Click the copy icon to copy each command</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {ADB_COMMANDS.map(({ label, cmd }) => (
              <div key={cmd} className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-slate-800/40 group hover:border-violet-500/20 transition-all">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-0.5">{label}</p>
                  <p className="font-mono text-sm text-violet-300 truncate">{cmd}</p>
                </div>
                <CopyButton text={cmd} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── USB Setup Steps ── */}
        <Card className="bg-slate-900/40 border border-slate-800/60 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl">
          <CardHeader className="border-b border-slate-800/40 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl">
                <Smartphone className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">USB Testing – Quick Steps</CardTitle>
                <CardDescription className="text-xs">Follow in order for first-time setup</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ol className="space-y-3">
              {[
                { step: '01', text: 'Enable Developer Options on Android: Settings → About Phone → tap Build Number 7 times.' },
                { step: '02', text: 'Enable USB Debugging in Settings → System → Developer Options.' },
                { step: '03', text: 'Connect your phone via USB and allow the permissions popup on the phone.' },
                { step: '04', text: 'Run `adb devices` on your PC — your device should appear.' },
                { step: '05', text: 'Run `npm run dev` in the zetimer folder (already running if you see the server).' },
                { step: '06', text: 'Run the port forward commands: `adb reverse tcp:3000 tcp:3000` and `adb reverse tcp:5000 tcp:5000`.' },
                { step: '07', text: 'Open http://localhost:3000 in Chrome on your Android phone.' },
              ].map(({ step, text }) => (
                <li key={step} className="flex items-start gap-4 p-4 bg-slate-950/40 rounded-2xl border border-slate-800/30">
                  <span className="shrink-0 font-mono text-xs font-black text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">{step}</span>
                  <p className="text-sm text-slate-300 leading-relaxed">{text}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* ── Action Buttons ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-between p-5 bg-slate-900/40 border border-slate-800/60 rounded-3xl hover:bg-slate-800/60 hover:border-blue-500/20 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                <RefreshCw className="w-5 h-5 text-blue-500" />
              </div>
              <span className="font-bold text-sm">Force HMR</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
          </button>

          <button
            onClick={() => window.location.href = '/school/admin/communication'}
            className="flex items-center justify-between p-5 bg-slate-900/40 border border-slate-800/60 rounded-3xl hover:bg-slate-800/60 hover:border-emerald-500/20 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
                <Smartphone className="w-5 h-5 text-emerald-500" />
              </div>
              <span className="font-bold text-sm">Messages</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
          </button>

          <button
            onClick={() => window.location.href = '/login'}
            className="flex items-center justify-between p-5 bg-slate-900/40 border border-slate-800/60 rounded-3xl hover:bg-slate-800/60 hover:border-purple-500/20 transition-all text-left group col-span-2 md:col-span-1"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors">
                <Settings className="w-5 h-5 text-purple-500" />
              </div>
              <span className="font-bold text-sm">Test Login</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
          </button>
        </div>

        <p className="text-center text-xs text-slate-700 pb-4">
          This page is only visible in <span className="text-slate-500 font-mono">NODE_ENV=development</span> and is excluded from production builds.
        </p>

      </div>
    </div>
  );
}
