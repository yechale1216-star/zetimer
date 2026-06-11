'use client'

import React, { useState } from 'react'
import { Sidebar } from '@/components/super-admin/sidebar'
import { TopNav } from '@/components/super-admin/top-nav'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SuperAdminClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background flex-col lg:flex-row">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <header className="bg-card/80 backdrop-blur-md border-b border-border px-4 md:px-6 py-2 md:py-3 fixed top-0 left-0 right-0 z-40 lg:static lg:z-auto h-14 md:h-16 flex items-center shrink-0">
          <div className="flex items-center justify-between gap-4 w-full">
            <div className="flex items-center gap-4 flex-1">
              {/* Mobile Toggle Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden shrink-0"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
              
              <TopNav />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-background/50 pt-14 md:pt-16 lg:pt-0">
          {children}
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm lg:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
