'use client'

import React, { useState } from 'react'
import { Search, Bell, Settings, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authService } from '@/lib/auth/auth'
import { useRouter } from 'next/navigation'
import { ModeToggle } from '@/components/mode-toggle'

export function TopNav() {
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  const handleLogout = () => {
    authService.logout()
    router.push('/login')
  }

  return (
    <header className="bg-card border-b border-border px-4 md:px-6 py-3 md:py-4 fixed top-0 left-0 right-0 z-30 lg:static lg:z-auto">
      <div className="flex items-center justify-between gap-2 md:gap-4">
        {/* Search Bar - Hidden on mobile */}
        <div className="flex-1 max-w-md relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="typography-body pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1 md:gap-2 ml-auto">
          <ModeToggle />
          
          {/* Notifications */}
          <button className="relative p-2 hover:bg-secondary rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* Settings */}
          <button className="p-2 hover:bg-secondary rounded-lg transition-colors hidden sm:block">
            <Settings className="w-5 h-5 text-foreground" />
          </button>

          {/* Logout */}
          <button 
            onClick={handleLogout}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>
    </header>
  )
}
