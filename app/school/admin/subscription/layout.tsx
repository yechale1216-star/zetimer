'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, History, FileText, ArrowUpCircle, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils/utils'

const navItems = [
  { name: 'Overview', href: '/school/admin/subscription', icon: LayoutGrid },
  { name: 'Billing History', href: '/school/admin/subscription/billing', icon: History },
  { name: 'Invoices', href: '/school/admin/subscription/invoices', icon: FileText },
  { name: 'Upgrade Plan', href: '/school/admin/subscription/upgrade', icon: ArrowUpCircle },
  { name: 'Usage Analytics', href: '/school/admin/subscription/analytics', icon: BarChart3 },
]

export default function SubscriptionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col min-h-full space-y-4 max-w-7xl mx-auto w-full p-3 md:p-6">
      {/* Sticky Top Header & Navigation Tabs Bar */}
      <div className="sticky top-0 z-30 bg-background/95 dark:bg-slate-950/95 backdrop-blur-md pt-2 pb-3 space-y-3 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex flex-col space-y-0.5">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Subscription Management
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Manage your school's plan, billing, and user limits.
          </p>
        </div>

        {/* High-Contrast Visible Navigation Tabs matching Screenshot 1 */}
        <div className="w-full overflow-x-auto scrollbar-hide py-1">
          <div className="flex items-center gap-2 sm:gap-3 min-w-max">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/school/admin/subscription' && pathname?.startsWith(item.href))
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-4 py-2 text-xs md:text-sm font-extrabold rounded-xl transition-all whitespace-nowrap select-none border",
                    isActive
                      ? "bg-blue-600 text-white shadow-md border-blue-600 dark:bg-blue-600 dark:text-white"
                      : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                >
                  <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-white" : "text-slate-500 dark:text-slate-400")} />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 pt-2">
        {children}
      </div>
    </div>
  )
}

