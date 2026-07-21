'use client'

import React, { useEffect, useState } from 'react'
import { SplashScreen } from '@capacitor/splash-screen'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '@/lib/context/auth-context'

export function StartupLoadingScreen() {
  const { sessionReady } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    setMounted(true)

    // Hide native splash screen once web view is hydrated and ready
    const hideNativeSplash = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          // Small delay to ensure browser has rendered our branded screen
          setTimeout(async () => {
            console.log('[StartupLoadingScreen] Hiding native splash screen...');
            await SplashScreen.hide();
          }, 300);
        } catch (err) {
          console.warn('[StartupLoadingScreen] Failed to hide native splash:', err);
        }
      }
    };

    hideNativeSplash();
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (sessionReady) {
      // Fade out as soon as sessionReady is true
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [sessionReady, mounted]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[5000] flex flex-col items-center justify-between pb-12 bg-gradient-to-b from-[#0a052c] via-[#050216] to-[#010008] text-white transition-opacity duration-500 ease-in-out overflow-hidden ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Glows & Stars */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[10%] w-[300px].h-[300px] rounded-full bg-indigo-500/10 blur-[100px] animate-pulse" />
        <div className="absolute bottom-[30%] right-[10%] w-[300px] h-[300px] rounded-full bg-purple-500/10 blur-[100px] animate-pulse [animation-duration:4s]" />
        
        {/* Subtle Starry Particles */}
        <div className="absolute top-[15%] left-[25%] w-1.5 h-1.5 rounded-full bg-white/40 animate-ping" />
        <div className="absolute top-[35%] right-[20%] w-1 h-1 rounded-full bg-white/20" />
        <div className="absolute top-[50%] left-[80%] w-1.5 h-1.5 rounded-full bg-white/30" />
        <div className="absolute bottom-[40%] left-[15%] w-1 h-1 rounded-full bg-white/20" />
        <div className="absolute bottom-[20%] right-[25%] w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-8 px-4 z-10">
        {/* Logo container */}
        <div className="relative w-32 h-32 flex items-center justify-center animate-in fade-in zoom-in duration-700">
          {/* Logo glow background */}
          <div className="absolute inset-0 bg-indigo-500/20 rounded-[32px] blur-3xl opacity-70 animate-pulse" />
          {/* Real Zetime logo */}
          <img
            src="/zetime-logo.png"
            alt="Zetime Logo"
            width={112}
            height={112}
            className="relative z-10 w-28 h-28 object-contain rounded-[28px] drop-shadow-[0_12px_24px_rgba(99,102,241,0.45)] animate-[pulse_3s_infinite_ease-in-out]"
          />
        </div>

        {/* Brand Information */}
        <div className="text-center space-y-2.5 animate-in fade-in slide-in-from-bottom-4 delay-200 duration-700">
          <h1 className="text-4xl font-extrabold tracking-tight text-white select-none">
            Zetime
          </h1>
          <p className="text-sm font-medium text-slate-400 max-w-[280px] select-none tracking-wide leading-relaxed text-center">
            Smart School Attendance Management and Communication System
          </p>
        </div>

        {/* Pulsing loading spinner circle */}
        <div className="pt-8 flex flex-col items-center space-y-4 animate-in fade-in duration-500 delay-300">
          <div className="w-9 h-9 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-semibold tracking-wider animate-pulse pt-1">
            Preparing your workspace...
          </p>
        </div>
      </div>

      {/* SVG bottom curves */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none pointer-events-none opacity-40">
        <svg viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
          <path fill="#6366f1" fillOpacity="0.1" d="M0,192L80,181.3C160,171,320,149,480,160C640,171,800,213,960,229.3C1120,245,1280,235,1360,229.3L1440,224L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"></path>
          <path fill="#a855f7" fillOpacity="0.08" d="M0,96L80,112C160,128,320,160,480,181.3C640,203,800,213,960,192C1120,171,1280,117,1360,90.7L1440,64L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"></path>
        </svg>
      </div>

      {/* Footer text */}
      <div className="text-center text-slate-600 text-xs font-semibold select-none z-10">
        © 2026 Zetime. All rights reserved.
      </div>
    </div>
  )
}
