"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { authService } from "@/lib/auth/auth"
import { notifications } from "@/lib/utils/notifications"

interface HeaderProps {
  onLogout: () => void
}

export function Header({ onLogout }: HeaderProps) {
  const user = authService.getCurrentUser()

  const handleLogout = async () => {
    await authService.logout()
    notifications.info("Logged Out", "You have been successfully logged out")
    onLogout()
  }

  if (!user) return null

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  const displaySchoolName =
    user.schoolName && user.schoolName !== "Setup Required" ? user.schoolName : "Smart Attendance Tracker"

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <h1 className="typography-section-title sm:text-2xl text-blue-600 truncate max-w-[200px] sm:max-w-none">
            {displaySchoolName}
          </h1>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                <AvatarFallback className="typography-helper bg-blue-600 text-white sm:text-sm">{initials}</AvatarFallback>
              </Avatar>
              <div className="typography-body">
                <div className="typography-label text-gray-900">{user.name}</div>
                <div className="typography-helper sm:text-sm text-gray-500 capitalize">{user.role}</div>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={handleLogout} className="typography-helper sm:text-sm bg-transparent">
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}


