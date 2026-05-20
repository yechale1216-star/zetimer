import React from 'react'
import { Sidebar } from '@/components/super-admin/sidebar'
import { TopNav } from '@/components/super-admin/top-nav'

export const metadata = {
  title: 'Super Admin Dashboard - Zetime',
  description: 'School management super admin dashboard',
}

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-background flex-col lg:flex-row">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <header className="bg-card/80 backdrop-blur-md border-b border-border px-4 md:px-6 py-3 md:py-4 fixed top-0 left-0 right-0 z-40 lg:static lg:z-auto">
          <div className="flex items-center justify-between gap-2 md:gap-4">
            {/* Mobile Toggle Spacer */}
            <div className="w-10 lg:hidden flex-shrink-0" />
            <TopNav />
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-background/50 pt-16 md:pt-20 lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  )
}
