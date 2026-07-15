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
  const [imgError, setImgError] = useState(false)

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

    // Minimum display time for branded loading screen (1.5 seconds)
    const minDisplayTime = 1500;
    const startTime = Date.now();

    const checkStateAndTransit = () => {
      if (sessionReady) {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minDisplayTime - elapsedTime);

        setTimeout(() => {
          setIsFadingOut(true);
          // Allow fade-out transition to complete (500ms) before unmounting
          setTimeout(() => {
            setIsVisible(false);
          }, 500);
        }, remainingTime);
      }
    };

    checkStateAndTransit();
  }, [sessionReady, mounted]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[5000] flex flex-col items-center justify-between pb-8 bg-white dark:bg-slate-950 transition-opacity duration-500 ease-in-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex-1 flex flex-col items-center justify-center space-y-6 px-4">
        {/* Logo container with float & pulse subtle micro-animations */}
        <div className="relative w-28 h-28 flex items-center justify-center animate-in fade-in zoom-in duration-700">
          <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-400/10 rounded-3xl blur-2xl animate-pulse" />
          {imgError ? (
            <svg className="w-24 h-24 rounded-2xl drop-shadow-xl" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F5C542" />
                  <stop offset="100%" stopColor="#D4941C" />
                </linearGradient>
                <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1a2351" />
                  <stop offset="100%" stopColor="#0f1535" />
                </linearGradient>
              </defs>
              <rect width="120" height="120" rx="32" fill="url(#bgGrad)" />
              <path d="M30 30 L90 30 L90 42 L52 82 L90 82 L90 95 L30 95 L30 82 L68 42 L30 42 Z" fill="url(#goldGrad)" opacity="0.9" stroke="url(#goldGrad)" strokeWidth="2" strokeLinejoin="round" />
              <circle cx="65" cy="62" r="22" fill="none" stroke="url(#goldGrad)" strokeWidth="3" />
              <circle cx="65" cy="62" r="1.5" fill="#F5C542" />
              <line x1="65" y1="62" x2="58" y2="50" stroke="#F5C542" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="65" y1="62" x2="76" y2="57" stroke="#F5C542" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <img
              src="/zetime-logo.png"
              alt="Zetime Logo"
              width={96}
              height={96}
              className="object-contain w-24 h-24 relative z-10 drop-shadow-[0_4px_12px_rgba(37,99,235,0.15)] rounded-2xl animate-[pulse_2s_infinite]"
              onError={() => setImgError(true)}
            />
          )}
        </div>

        {/* Brand Information */}
        <div className="text-center space-y-2 animate-in fade-in slide-in-from-bottom-4 delay-200 duration-700">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white drop-shadow-sm select-none">
            ZETIME
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-xs select-none">
            Smart School Management System
          </p>
        </div>

        {/* Premium Loading Indicator: Pulsing Dots */}
        <div className="pt-6 flex justify-center items-center space-x-2 animate-in fade-in duration-500 delay-300">
          <span className="w-2.5 h-2.5 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2.5 h-2.5 bg-blue-500 dark:bg-blue-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2.5 h-2.5 bg-blue-400 dark:bg-blue-200 rounded-full animate-bounce" />
        </div>
      </div>

      {/* Footer text */}
      <div className="text-center text-slate-400 dark:text-slate-600 text-xs font-semibold select-none">
        © 2026 Zetime. All rights reserved.
      </div>
    </div>
  )
}
