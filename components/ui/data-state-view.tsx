"use client"

/**
 * data-state-view.tsx
 * ───────────────────
 * Reusable presentational components for consistent loading / error / empty
 * states across every data-fetching component in the application.
 * Matches design mockup specs for Zetime (Empty State, No Internet, Server Error, Timeout).
 */

import React from "react"
import { 
  RefreshCw, 
  WifiOff, 
  AlertTriangle, 
  ServerCrash, 
  Clock, 
  ChevronLeft, 
  Filter, 
  Headphones, 
  ArrowLeft, 
  Plus, 
  Wifi 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageSkeleton } from "@/components/ui/page-skeleton"
import { RequestError } from "@/lib/utils/fetch-with-timeout"
import { cn } from "@/lib/utils/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DataStateViewProps {
  /** Show skeleton loading while true (and no data yet). */
  isLoading: boolean
  /** Show background loading spinner while true (data already loaded). */
  isRefreshing?: boolean
  /** Human-readable error message. When set, shows the error view. */
  error: string | null
  /** Error type for better image/message selection. */
  errorType?: RequestError["type"] | null
  /** When true and not loading/error, shows the empty state. */
  isEmpty: boolean
  /** Called when the user clicks Retry. */
  onRetry?: () => void
  /** Called when the user clicks Work Offline. */
  onWorkOffline?: () => void
  /** Called when the user clicks Contact Support. */
  onContactSupport?: () => void
  /** Called when the user clicks Go Back (for timeout / header). */
  onGoBack?: () => void
  /** Icon to show in the empty state. If omitted, a beautiful 3D-like filing cabinet SVG is rendered. */
  emptyIcon?: React.ReactNode
  /** Title for the empty state. Default: "No Students Yet" */
  emptyTitle?: string
  /** Subtitle for the empty state. Default: "There are no students available. Add students to get started." */
  emptyDescription?: string
  /** Optional CTA button or actions node shown below the empty state description. */
  emptyAction?: React.ReactNode
  /** Click handler for default empty action button. */
  onEmptyActionClick?: () => void
  /** Text for default empty action button. Default: "+ Add Student" */
  emptyActionText?: string
  /** Optional navigation crumbs title to display at the top of the empty state header. Default: "Students" */
  crumbsTitle?: string
  /** Skeleton variant to use while loading. Default: "table". */
  skeletonVariant?: "dashboard" | "table" | "form" | "cards"
  /** Extra class applied to the wrapper. */
  className?: string
  children?: React.ReactNode
}

// ─── Visual Vector Illustrations (SVG) ────────────────────────────────────────

function FilingCabinetIllustration() {
  return (
    <svg 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className="w-48 h-48 drop-shadow-[0_10px_20px_rgba(99,102,241,0.15)] animate-[bounce_5s_infinite_ease-in-out]"
    >
      <defs>
        <linearGradient id="boxGrad" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#c084fc" />
          <stop offset="1" stopColor="#818cf8" />
        </linearGradient>
        <linearGradient id="folderGrad" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#eff6ff" />
          <stop offset="1" stopColor="#dbeafe" />
        </linearGradient>
      </defs>
      {/* Small floating sparkles/shapes of Mockup 2 */}
      <path d="M25 60 L31 68 L21 67 Z" fill="#c084fc" opacity="0.6" className="animate-pulse" />
      <circle cx="160" cy="50" r="3.5" fill="#a78bfa" opacity="0.5" />
      <path d="M175 110 L168 117 L182 117 Z" fill="#818cf8" opacity="0.5" />
      <circle cx="45" cy="140" r="4.5" fill="#f472b6" opacity="0.4" />
      
      {/* Box details */}
      <path d="M50 85 L150 85 L160 140 L40 140 Z" fill="url(#boxGrad)" />
      {/* Drawer Papers standard 3D look */}
      <path d="M60 62 C60 59 62 57 65 57 L135 57 C138 57 140 59 140 62 L140 90 L60 90 Z" fill="url(#folderGrad)" />
      <line x1="75" y1="67" x2="125" y2="67" stroke="#bfdbfe" strokeWidth="3" strokeLinecap="round" />
      <line x1="75" y1="75" x2="115" y2="75" stroke="#bfdbfe" strokeWidth="3" strokeLinecap="round" />
      
      {/* Outer panel of open drawer */}
      <path d="M35 90 H165 V145 H35 Z" fill="#818cf8" rx="8" />
      <path d="M40 95 H160 V140 H40 Z" fill="#6366f1" rx="6" />
      
      {/* Drawer label */}
      <rect x="80" y="108" width="40" height="12" rx="3" fill="#4f46e5" />
      <path d="M90 122 H110" stroke="#eff6ff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function WifiCloudIllustration() {
  return (
    <svg 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className="w-48 h-48 drop-shadow-[0_12px_24px_rgba(99,102,241,0.15)] animate-[bounce_4.5s_infinite_ease-in-out]"
    >
      <defs>
        <linearGradient id="cloudGrad" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#eff6ff" />
          <stop offset="1" stopColor="#c7d2fe" />
        </linearGradient>
        <linearGradient id="wifiGrad" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#818cf8" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      {/* Background shadow */}
      <circle cx="100" cy="110" r="50" fill="#a5b4fc" opacity="0.3" filter="blur(20px)" />
      
      {/* Cloud shape */}
      <path d="M60 130 C45 130 35 120 35 105 C35 91 46 81 60 80 C65 60 81 45 100 45 C119 45 135 60 140 80 C154 81 165 91 165 105 C165 120 155 130 140 130 Z" fill="url(#cloudGrad)" />
      
      {/* Wifi rays in cloud center */}
      <path d="M85 92 A 20 20 0 0 1 115 92" stroke="url(#wifiGrad)" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M75 80 A 35 35 0 0 1 125 80" stroke="url(#wifiGrad)" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="100" cy="104" r="5" fill="#4f46e5" />
      
      {/* X Overlapping circular badge */}
      <circle cx="140" cy="130" r="22" fill="#4f46e5" />
      <circle cx="140" cy="130" r="18" fill="#6366f1" />
      <path d="M133 123 L147 137 M147 123 L133 137" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function ServerErrorIllustration() {
  return (
    <svg 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className="w-48 h-48 drop-shadow-[0_12px_24px_rgba(99,102,241,0.15)] animate-[bounce_4.2s_infinite_ease-in-out]"
    >
      <defs>
        <linearGradient id="serverBase" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="shieldGrad" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f43f5e" />
          <stop offset="1" stopColor="#be123c" />
        </linearGradient>
      </defs>
      {/* Background shadow */}
      <circle cx="100" cy="110" r="50" fill="#a78bfa" opacity="0.25" filter="blur(25px)" />
      
      {/* Server 1 - Top Rack */}
      <rect x="40" y="45" width="120" height="28" rx="8" fill="url(#serverBase)" />
      <rect x="44" y="49" width="112" height="20" rx="6" fill="#818cf8" />
      <circle cx="56" cy="59" r="3" fill="#34d399" />
      <line x1="70" y1="59" x2="130" y2="59" stroke="#eff6ff" strokeWidth="3" strokeLinecap="round" />
      
      {/* Server 2 - Middle Rack */}
      <rect x="40" y="80" width="120" height="28" rx="8" fill="url(#serverBase)" />
      <rect x="44" y="84" width="112" height="20" rx="6" fill="#6366f1" />
      <circle cx="56" cy="94" r="3" fill="#34d399" />
      <line x1="70" y1="94" x2="130" y2="94" stroke="#eff6ff" strokeWidth="3" strokeLinecap="round" />
      
      {/* Server 3 - Bottom Rack */}
      <rect x="40" y="115" width="120" height="28" rx="8" fill="url(#serverBase)" />
      <rect x="44" y="119" width="112" height="20" rx="6" fill="#4f46e5" />
      <circle cx="56" cy="129" r="3" fill="#fb7185" />
      <line x1="70" y1="129" x2="130" y2="129" stroke="#eff6ff" strokeWidth="3" strokeLinecap="round" />
      
      {/* Red Warning Shield Badge */}
      <g filter="drop-shadow(0px 8px 16px rgba(244, 63, 94, 0.45))">
        <polygon points="120,165 170,165 145,120" fill="url(#shieldGrad)" />
        <circle cx="145" cy="157" r="2.5" fill="white" />
        <line x1="145" y1="135" x2="145" y2="150" stroke="white" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  )
}

function RequestTimeoutIllustration() {
  return (
    <svg 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className="w-48 h-48 drop-shadow-[0_12px_24px_rgba(99,102,241,0.15)] animate-[bounce_5s_infinite_ease-in-out]"
    >
      <defs>
        <linearGradient id="clockGrad" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#c7d2fe" />
          <stop offset="1" stopColor="#818cf8" />
        </linearGradient>
        <linearGradient id="alertGrad" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f97316" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      
      {/* Background shadow */}
      <circle cx="100" cy="110" r="50" fill="#a78bfa" opacity="0.3" filter="blur(20px)" />
      
      {/* Clock case */}
      <circle cx="100" cy="110" r="48" fill="url(#clockGrad)" stroke="#6366f1" strokeWidth="4" />
      <circle cx="100" cy="110" r="40" fill="#eff6ff" />
      
      {/* Top Stopwatch Buttons */}
      <rect x="94" y="50" width="12" height="12" rx="2" fill="#4f46e5" />
      <rect x="90" y="44" width="20" height="6" rx="1" fill="#6366f1" />
      <path d="M125 72 L133 65 L138 70 L130 77" fill="#6366f1" />
      
      {/* Dial marks */}
      <circle cx="100" cy="78" r="1.5" fill="#818cf8" />
      <circle cx="132" cy="110" r="1.5" fill="#818cf8" />
      <circle cx="100" cy="142" r="1.5" fill="#818cf8" />
      <circle cx="68" cy="110" r="1.5" fill="#818cf8" />
      
      {/* Hands */}
      <circle cx="100" cy="110" r="4" fill="#4f46e5" />
      <line x1="100" y1="110" x2="100" y2="84" stroke="#4f46e5" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="100" y1="110" x2="118" y2="110" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" />
      
      {/* Orange Warning Shield Badge */}
      <g filter="drop-shadow(0px 8px 16px rgba(249, 115, 22, 0.455))">
        <circle cx="145" cy="140" r="20" fill="url(#alertGrad)" />
        <circle cx="145" cy="140" r="17" fill="#f97316" />
        <line x1="145" y1="129" x2="145" y2="141" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="145" cy="149" r="2.5" fill="white" />
      </g>
    </svg>
  )
}

// ─── Error Screen Components ──────────────────────────────────────────────────

function ErrorView({
  message,
  type,
  onRetry,
  onWorkOffline,
  onContactSupport,
  onGoBack,
}: {
  message: string
  type?: RequestError["type"] | null
  onRetry?: () => void
  onWorkOffline?: () => void
  onContactSupport?: () => void
  onGoBack?: () => void
}) {
  const isOffline = type === "offline"
  const isTimeout = type === "timeout"
  const isServer = type === "server"

  // 1. Screen 3: No Internet
  if (isOffline) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] py-12 px-6 text-center animate-in fade-in duration-300">
        <div className="mb-6 flex justify-center">
          <WifiCloudIllustration />
        </div>
        <div className="space-y-2.5 max-w-sm mb-8">
          <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            No Internet Connection
          </h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed px-4">
            Please check your internet connection and try again.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full items-center">
          {onRetry && (
            <Button
              onClick={onRetry}
              className="bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold rounded-2xl h-12 w-full max-w-[280px] transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20"
            >
              <RefreshCw className="w-4 h-4 animate-spin-hover" />
              Try Again
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onWorkOffline || (() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("zetime:workoffline"))
              }
            })}
            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 font-bold rounded-2xl h-12 w-full max-w-[280px] transition-all hover:bg-slate-50 dark:hover:bg-slate-900/50 active:scale-[0.98] flex items-center justify-center gap-2 shadow-xs"
          >
            <Wifi className="w-4 h-4" />
            Work Offline
          </Button>
        </div>
      </div>
    )
  }

  // 2. Screen 5: Timeout
  if (isTimeout) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] py-12 px-6 text-center animate-in fade-in duration-300">
        <div className="mb-6 flex justify-center">
          <RequestTimeoutIllustration />
        </div>
        <div className="space-y-2.5 max-w-sm mb-8">
          <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Request Timeout
          </h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed px-4">
            The request took too long to complete. Please try again.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full items-center">
          {onRetry && (
            <Button
              onClick={onRetry}
              className="bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold rounded-2xl h-12 w-full max-w-[280px] transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onGoBack || (() => {
              if (typeof window !== "undefined") {
                window.history.back()
              }
            })}
            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 font-bold rounded-2xl h-12 w-full max-w-[280px] transition-all hover:bg-slate-50 dark:hover:bg-slate-900/50 active:scale-[0.98] flex items-center justify-center gap-2 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  // 3. Screen 4: Server Error (fallback for general server / unknown database errors)
  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] py-12 px-6 text-center animate-in fade-in duration-300">
      <div className="mb-6 flex justify-center">
        <ServerErrorIllustration />
      </div>
      <div className="space-y-2.5 max-w-sm mb-8">
        <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Server Error
        </h3>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed px-4">
          {message || "Something went wrong on our end. Our team has been notified."}
        </p>
      </div>
      <div className="flex flex-col gap-3 w-full items-center">
        {onRetry && (
          <Button
            onClick={onRetry}
            className="bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold rounded-2xl h-12 w-full max-w-[280px] transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        )}
        <Button
          variant="outline"
          onClick={onContactSupport || (() => {
            if (typeof window !== "undefined") {
              window.open("mailto:support@zetime.com?subject=Zetime%20App%20Server%20Error", "_blank")
            }
          })}
          className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 font-bold rounded-2xl h-12 w-full max-w-[280px] transition-all hover:bg-slate-50 dark:hover:bg-slate-900/50 active:scale-[0.98] flex items-center justify-center gap-2 shadow-xs"
        >
          <Headphones className="w-4 h-4" />
          Contact Support
        </Button>
      </div>
    </div>
  )
}

// ─── Screen 2: Empty View Component ──────────────────────────────────────────

function EmptyView({
  icon,
  title,
  description,
  action,
  onActionClick,
  actionText,
  crumbsTitle = "Students",
  onGoBack,
}: {
  icon?: React.ReactNode
  title?: string
  description?: string
  action?: React.ReactNode
  onActionClick?: () => void
  actionText?: string
  crumbsTitle?: string
  onGoBack?: () => void
}) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50/10 dark:bg-slate-950/10 animate-in fade-in duration-300">
      
      {/* Crumbs / Header Bar matching Mockup 2 */}
      <header className="flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-900 z-10 w-full pt-safe">
        <button 
          onClick={onGoBack || (() => {
            if (typeof window !== "undefined") {
              window.history.back()
            }
          })}
          className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-[#4f46e5]" />
          <span className="text-sm font-semibold">{crumbsTitle}</span>
        </button>
        
        {/* Decorative header title */}
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest hidden md:block">
          {crumbsTitle} Section
        </h2>

        {/* Filter icon placeholder */}
        <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <Filter className="w-4.5 h-4.5" />
        </button>
      </header>

      {/* Main Body Center */}
      <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="mb-6 flex justify-center">
          {icon || <FilingCabinetIllustration />}
        </div>
        <div className="space-y-2 max-w-sm mb-8">
          <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {title || "No Students Yet"}
          </h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed px-2">
            {description || "There are no students available. Add students to get started."}
          </p>
        </div>

        {/* CTAs */}
        {action ? (
          action
        ) : (
          onActionClick && (
            <Button
              onClick={onActionClick}
              className="bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold rounded-2xl h-12 w-full max-w-[240px] transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-4.5 h-4.5" />
              {actionText || "+ Add Student"}
            </Button>
          )
        )}
      </div>
    </div>
  )
}

// ─── Main Controller Component ────────────────────────────────────────────────

export function DataStateView({
  isLoading,
  isRefreshing,
  error,
  errorType,
  isEmpty,
  onRetry,
  onWorkOffline,
  onContactSupport,
  onGoBack,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onEmptyActionClick,
  emptyActionText,
  crumbsTitle,
  skeletonVariant = "table",
  className,
  children,
}: DataStateViewProps) {
  // 1. First-time loading state (shows themed skeletons)
  if (isLoading) {
    return <PageSkeleton variant={skeletonVariant} className={className} />
  }

  // 2. Error states (Timeout, No Connection, Server breakdown)
  if (error || errorType) {
    return (
      <div className={cn("bg-background", className)}>
        <ErrorView 
          message={error || "An unexpected error occurred."} 
          type={errorType || (error?.toLowerCase().includes("online") || error?.toLowerCase().includes("internet") ? "offline" : "server")} 
          onRetry={onRetry} 
          onWorkOffline={onWorkOffline}
          onContactSupport={onContactSupport}
          onGoBack={onGoBack}
        />
      </div>
    )
  }

  // 3. Empty state screen (Mockup 2 setup)
  if (isEmpty) {
    return (
      <div className={cn("bg-background", className)}>
        <EmptyView
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
          onActionClick={onEmptyActionClick}
          actionText={emptyActionText}
          crumbsTitle={crumbsTitle}
          onGoBack={onGoBack}
        />
      </div>
    )
  }

  // 4. Data hydrated successfully — show application components
  return (
    <div className={cn("relative", className)}>
      {isRefreshing && (
        <div className="absolute top-3 right-3 z-30">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/80 shadow-sm animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Updating…
          </div>
        </div>
      )}
      {children}
    </div>
  )
}

// ─── Unified Inline Error Notification banner ──────────────────────────────────

export function ErrorBanner({
  message,
  type,
  onRetry,
  className,
}: {
  message: string
  type?: RequestError["type"] | null
  onRetry?: () => void
  className?: string
}) {
  if (!message) return null
  const isOffline = type === "offline"
  
  return (
    <div
      className={cn(
        "flex items-start gap-3.5 px-4.5 py-3.5 rounded-2xl border text-sm animate-in fade-in slide-in-from-top-1 duration-300 shadow-sm",
        isOffline
          ? "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/20 dark:border-amber-800/80 dark:text-amber-300"
          : "bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/20 dark:border-rose-800/80 dark:text-rose-300",
        className,
      )}
      role="alert"
    >
      <div className="shrink-0 mt-0.5 text-current">
        {isOffline ? <WifiOff className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-extrabold tracking-tight uppercase text-[10px] opacity-75">
          {isOffline ? "Connection offline" : "Operation Error"}
        </p>
        <p className="text-xs font-semibold leading-relaxed mt-0.5">{message}</p>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 text-[10px] font-black uppercase tracking-wider text-current hover:underline bg-current/5 hover:bg-current/10 px-2.5 py-1 rounded-lg transition-all"
        >
          Retry
        </button>
      )}
    </div>
  )
}
