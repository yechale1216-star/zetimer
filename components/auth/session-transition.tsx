"use client"

import React from "react"

interface SessionTransitionProps {
  message?: string
}

/**
 * Full-screen loading overlay shown during all session transitions:
 *   - Login → Dashboard
 *   - Signup → Onboarding
 *   - Onboarding → Dashboard
 *   - Role switch / School switch
 *
 * Rendered by AuthGuard whenever sessionReady=false.
 * This ensures no previous user's data is ever visible — not even for one frame.
 */
export function SessionTransition({ message }: SessionTransitionProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
      {/* Subtle animated gradient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[120px] animate-pulse [animation-delay:1s]" />
      </div>

      <div className="relative flex flex-col items-center justify-center">
        {/* Multi-ring spinner */}
        <div className="relative w-12 h-12 animate-in fade-in zoom-in-95 duration-500">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    </div>
  )
}
