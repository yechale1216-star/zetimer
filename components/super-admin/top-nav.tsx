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
    <div className="flex items-center justify-between gap-2 md:gap-4 w-full">
      {/* Search Bar - Hidden on mobile */}
      <div className="flex-1 max-w-md relative hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          className="typography-body pl-10 h-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1 md:gap-2 ml-auto">
        <ModeToggle />
        
        {/* Notifications */}
        <button className="relative p-1.5 hover:bg-secondary rounded-lg transition-colors" title="Notifications">
          <Bell className="w-5 h-5 text-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-card" />
        </button>

        {/* Settings */}
        <button className="p-1.5 hover:bg-secondary rounded-lg transition-colors hidden sm:block" title="Settings">
          <Settings className="w-5 h-5 text-foreground" />
        </button>

        {/* Logout */}
        <button 
          onClick={handleLogout}
          className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-destructive"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
