"use client"

/**
 * data-state-view.tsx
 * ───────────────────
 * Reusable presentational components for consistent loading / error / empty
 * states across every data-fetching component in the application.
 *
 * Usage:
 *   <DataStateView
 *     isLoading={isLoading}
 *     error={error}
 *     isEmpty={students.length === 0}
 *     onRetry={refetch}
 *     emptyIcon={<Users />}
 *     emptyTitle="No students found"
 *     emptyDescription="Add your first student to get started."
 *   >
 *     {children}
 *   </DataStateView>
 */

import React from "react"
import { RefreshCw, WifiOff, AlertTriangle, ServerCrash, Clock } from "lucide-react"
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
  /** Error type for better icon/message selection. */
  errorType?: RequestError["type"] | null
  /** When true and not loading/error, shows the empty state. */
  isEmpty: boolean
  /** Called when the user clicks Retry. */
  onRetry?: () => void
  /** Icon to show in the empty state. */
  emptyIcon?: React.ReactNode
  /** Title for the empty state. */
  emptyTitle?: string
  /** Subtitle for the empty state. */
  emptyDescription?: string
  /** Optional CTA shown below the empty state description. */
  emptyAction?: React.ReactNode
  /** Skeleton variant to use while loading. Default: "table". */
  skeletonVariant?: "dashboard" | "table" | "form" | "cards"
  /** Extra class applied to the wrapper. */
  className?: string
  children?: React.ReactNode
}

// ─── Error icon map ────────────────────────────────────────────────────────────

function ErrorIcon({ type }: { type?: RequestError["type"] | null }) {
  const cls = "w-8 h-8"
  switch (type) {
    case "offline":
      return <WifiOff className={cls} />
    case "timeout":
      return <Clock className={cls} />
    case "server":
      return <ServerCrash className={cls} />
    default:
      return <AlertTriangle className={cls} />
  }
}

// ─── Error View ───────────────────────────────────────────────────────────────

function ErrorView({
  message,
  type,
  onRetry,
}: {
  message: string
  type?: RequestError["type"] | null
  onRetry?: () => void
}) {
  const isOffline = type === "offline"
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center space-y-5 animate-in fade-in duration-300">
      <div
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center",
          isOffline
            ? "bg-amber-500/10 text-amber-500"
            : "bg-rose-500/10 text-rose-500",
        )}
      >
        <ErrorIcon type={type} />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-base font-bold text-foreground">
          {isOffline ? "You're offline" : "Something went wrong"}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="rounded-xl flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try again
        </Button>
      )}
    </div>
  )
}

// ─── Empty View ───────────────────────────────────────────────────────────────

function EmptyView({
  icon,
  title = "No data",
  description,
  action,
}: {
  icon?: React.ReactNode
  title?: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center space-y-4 animate-in fade-in duration-300">
      {icon && (
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground/40">
          {icon}
        </div>
      )}
      <div className="space-y-1.5 max-w-xs">
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DataStateView({
  isLoading,
  isRefreshing,
  error,
  errorType,
  isEmpty,
  onRetry,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  skeletonVariant = "table",
  className,
  children,
}: DataStateViewProps) {
  // 1. First-time loading (no data yet) — show skeleton
  if (isLoading) {
    return <PageSkeleton variant={skeletonVariant} className={className} />
  }

  // 2. Error state — show error view with retry
  if (error) {
    return (
      <div className={className}>
        <ErrorView message={error} type={errorType} onRetry={onRetry} />
      </div>
    )
  }

  // 3. Empty state
  if (isEmpty) {
    return (
      <div className={className}>
        <EmptyView
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      </div>
    )
  }

  // 4. Data — render children with optional background-refresh indicator
  return (
    <div className={cn("relative", className)}>
      {isRefreshing && (
        <div className="absolute top-2 right-2 z-10">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-background/80 backdrop-blur-sm px-2.5 py-1 rounded-full border border-border/60 shadow-sm">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Updating…
          </div>
        </div>
      )}
      {children}
    </div>
  )
}

// ─── Inline Error Banner (for non-full-page errors) ──────────────────────────

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
        "flex items-start gap-3 px-4 py-3 rounded-2xl border text-sm animate-in fade-in slide-in-from-top-1 duration-300",
        isOffline
          ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300"
          : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300",
        className,
      )}
      role="alert"
    >
      <div className="shrink-0 mt-0.5">
        <ErrorIcon type={type} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold">{isOffline ? "Offline" : "Error"}</p>
        <p className="text-xs mt-0.5 opacity-80">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 text-[11px] font-bold uppercase tracking-wide hover:underline"
        >
          Retry
        </button>
      )}
    </div>
  )
}
