'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Building2,
  Users,
  CreditCard,
  Shield,
  MessageSquare,
  Settings,
  X,
  Menu,
  Calculator,
  Receipt,
  ArrowLeftRight,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils/utils'
import { authService } from '@/lib/auth/auth'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/logo'

const navigationItems = [
  {
    label: 'Dashboard',
    href: '/super-admin',
    icon: BarChart3,
  },
  {
    label: 'Schools',
    href: '/super-admin/schools',
    icon: Building2,
  },
  {
    label: 'Users',
    href: '/super-admin/users',
    icon: Users,
  },
  {
    label: 'Subscriptions',
    href: '/super-admin/subscriptions',
    icon: CreditCard,
  },
  {
    label: 'Pricing & calculator',
    href: '/super-admin/subscriptions/pricing',
    icon: Calculator,
  },
  {
    label: 'Billing history',
    href: '/super-admin/subscriptions/billing',
    icon: Receipt,
  },
  {
    label: 'Help Desk',
    href: '/super-admin/support',
    icon: MessageSquare,
  },
  {
    label: 'Communication',
    href: '/super-admin/communication',
    icon: Bell,
  },
  {
    label: 'Audit Logs',
    href: '/super-admin/audit-logs',
    icon: Shield,
  },
  {
    label: 'Settings',
    href: '/super-admin/settings',
    icon: Settings,
  },
]

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    authService.logout()
    router.push('/login')
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-primary text-primary-foreground p-2 rounded-lg"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col bg-card border-r border-border transition-all duration-300 w-64',
          'fixed lg:static h-full z-40',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between p-4 border-b border-border mt-12 lg:mt-0">
          <Logo size="sm" href="/super-admin" />
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-secondary rounded-lg transition-colors lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-secondary'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="typography-label">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-border space-y-2">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="typography-label">SA</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="typography-label text-foreground truncate">Super Admin</p>
              <p className="typography-helper text-muted-foreground truncate">admin@zetime.io</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="typography-label">Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm lg:hidden z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}


