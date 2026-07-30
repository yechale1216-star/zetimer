'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, PhoneCall, Users, History,
  User, LogOut, X, ChevronRight, Headphones
} from 'lucide-react'
import { cn } from '@/lib/utils/utils'
import { useAuth } from '@/lib/context/auth-context'
import { AuthGuard } from '@/components/auth/auth-guard'
import { TopNav } from '@/components/layout/top-nav'
import { notifications } from '@/lib/utils/notifications'

const navItems = [
  { href: '/school/call-center', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/school/call-center/queue', icon: PhoneCall, label: 'Call Queue' },
  { href: '/school/call-center/contacts', icon: Users, label: 'Parent Directory' },
  { href: '/school/call-center/history', icon: History, label: 'Call History' },
  { href: '/school/call-center/profile', icon: User, label: 'My Profile' },
]

export default function CallCenterClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => { setIsMounted(true) }, [])
  useEffect(() => { setSidebarOpen(false) }, [pathname])

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href)

  const handleLogout = async () => {
    await logout()
    notifications.info('Logged Out', 'You have been successfully logged out')
  }

  if (!isMounted) return null

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <div className={cn('flex items-center justify-between px-5 py-4 border-b border-border', mobile && 'flex items-center')}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-teal-500/15 flex items-center justify-center flex-shrink-0">
            <Headphones className="w-4 h-4 text-teal-600" />
          </div>
          {(!isCollapsed || mobile) && (
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">Call Center</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.name}</p>
            </div>
          )}
        </div>
        {mobile && (
          <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground ml-auto">
            <X className="w-5 h-5" />
          </button>
        )}
        {!mobile && (
          <button onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn('p-2 rounded-xl text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800', isCollapsed && 'mx-auto mt-2')}>
            <ChevronRight className={cn('w-4 h-4 transition-transform', !isCollapsed && 'rotate-180')} />
          </button>
        )}
      </div>
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {navItems.map(item => (
          <Link key={item.href} href={item.href} title={!mobile && isCollapsed ? item.label : undefined}>
            <div className={cn(
              'flex items-center gap-3 rounded-xl transition-all text-sm font-semibold',
              !mobile && isCollapsed ? 'justify-center p-3' : 'px-4 py-2.5',
              isActive(item.href, item.exact)
                ? 'bg-teal-500/15 text-teal-700 dark:text-teal-400'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}>
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {(mobile || !isCollapsed) && <span className="truncate">{item.label}</span>}
            </div>
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-border">
        <button onClick={handleLogout} title={!mobile && isCollapsed ? 'Sign Out' : undefined}
          className={cn(
            'flex items-center gap-3 w-full rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 text-sm font-semibold',
            !mobile && isCollapsed ? 'justify-center p-3' : 'px-4 py-2.5'
          )}>
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {(mobile || !isCollapsed) && <span>Sign Out</span>}
        </button>
      </div>
    </>
  )

  return (
    <AuthGuard allowedRoles={['call_center']}>
      <div className="flex h-screen bg-background flex-col md:flex-row relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-[120px]" />
        </div>

        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        )}

        <aside className={cn(
          'md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col shadow-2xl transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          <SidebarContent mobile />
        </aside>

        <aside className={cn(
          'hidden md:flex border-r border-border bg-card/80 backdrop-blur-xl flex-col relative z-20 transition-all duration-300',
          isCollapsed ? 'w-20' : 'w-64'
        )}>
          <SidebarContent />
        </aside>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
          <TopNav showMenuButton onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 flex flex-col overflow-auto pb-4">{children}</main>
        </div>
      </div>
    </AuthGuard>
  )
}
