'use client'

import React from 'react'
import { ShieldBan, HeadphonesIcon } from 'lucide-react'
import Link from 'next/link'
import { useSuspension } from '@/lib/context/suspension-context'

interface SuspendedPageShieldProps {
  /** The page portal type for the support link. Defaults to admin. */
  portal?: 'admin' | 'teacher'
  /** Override children: if provided the shield wraps a react node */
  children?: React.ReactNode
}

/**
 * SuspendedPageShield
 *
 * Wraps a page in a read-only overlay when the school is suspended.
 * The underlying content (historical data) is still rendered and visible,
 * but a translucent banner and disabled overlay prevents write interactions.
 *
 * For pages where you ONLY want to block specific buttons, use `useSuspension()`
 * directly instead.
 */
export function SuspendedPageShield({ portal = 'admin', children }: SuspendedPageShieldProps) {
  const { isSuspended, suspendedAt, suspendReason } = useSuspension()

  if (!isSuspended) return <>{children}</>

  const supportLink = portal === 'teacher' ? '/school/teacher/profile' : '/school/admin/support'

  return (
    <div className="relative min-h-full flex flex-col">
      {/* Write-action overlay — pointer-events-none so underlying GETs still render */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        aria-hidden="true"
      />

      {/* Sticky suspension notice at the top of the page */}
      <div className="sticky top-0 z-30 flex items-start gap-3 px-4 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-t-lg mx-4 mt-4 shadow-sm">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
          <ShieldBan className="w-5 h-5 text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-red-800 dark:text-red-300 text-sm">School Account Suspended — Read-Only Mode</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
            You can view your existing data below, but all write operations are disabled until the account is restored.
          </p>
          {suspendedAt && (
            <p className="text-xs text-red-500 dark:text-red-500 mt-0.5">
              Suspended on {new Date(suspendedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              {suspendReason && <> · <span className="italic">&quot;{suspendReason}&quot;</span></>}
            </p>
          )}
        </div>
        <Link
          href={supportLink}
          className="flex-shrink-0 flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white transition px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
        >
          <HeadphonesIcon className="w-3 h-3" />
          Contact Support
        </Link>
      </div>

      {/* Render children: data is still visible */}
      <div className="flex-1 pointer-events-none select-none opacity-60 mt-2">
        {children}
      </div>
    </div>
  )
}

/**
 * SuspendedButton
 *
 * Wraps a button / interactive control.
 * When the school is suspended, the child is rendered as disabled with a tooltip.
 */
export function SuspendedControl({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const { isSuspended } = useSuspension()
  if (!isSuspended) return <>{children}</>

  return (
    <div
      className={`relative inline-flex cursor-not-allowed ${className ?? ''}`}
      title="Disabled: school account is suspended"
    >
      <div className="pointer-events-none opacity-40 select-none">{children}</div>
    </div>
  )
}
