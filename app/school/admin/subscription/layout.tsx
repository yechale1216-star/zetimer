'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, History, FileText, ArrowUpCircle, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils/utils'

const navItems = [
  { name: 'Overview', href: '/school/admin/subscription', icon: LayoutDashboard },
  { name: 'Billing History', href: '/school/admin/subscription/billing', icon: History },
  { name: 'Invoices', href: '/school/admin/subscription/invoices', icon: FileText },
  { name: 'Upgrade Plan', href: '/school/admin/subscription/upgrade', icon: ArrowUpCircle },
  { name: 'Usage Analytics', href: '/school/admin/subscription/analytics', icon: BarChart3 },
]

export default function SubscriptionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col min-h-full space-y-6 p-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Subscription Management</h1>
        <p className="text-muted-foreground">
          Manage your school's plan, billing, and user limits.
        </p>
      </div>

      <div className="flex space-x-1 rounded-xl bg-secondary/20 p-1 w-full max-w-3xl overflow-x-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all",
                isActive 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {item.name}
            </Link>
          )
        })}
      </div>

      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}


