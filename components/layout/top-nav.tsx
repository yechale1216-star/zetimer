"use client"

import React from "react"
import { ModeToggle } from "@/components/mode-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { LogOut, User, Menu, GraduationCap } from "lucide-react"
import { useSchoolSettings } from "@/hooks/use-school-settings"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils/utils"
import { authService } from "@/lib/auth/auth"
import { useSchool } from "@/lib/context/school-context"
import { NotificationPopover } from "@/components/ui/notification-popover"

interface TopNavProps {
  onMenuClick?: () => void
  showMenuButton?: boolean
}

export function TopNav({ onMenuClick, showMenuButton = false }: TopNavProps) {
  const router = useRouter()
  const { settings } = useSchoolSettings()
  const { activeSchool } = useSchool()
  const [user, setUser] = React.useState<any>(null)
  const [logoError, setLogoError] = React.useState(false)

  React.useEffect(() => {
    setUser(authService.getCurrentUser())

    const handleSchoolSwitch = () => {
      setUser(authService.getCurrentUser())
      setLogoError(false)
    }

    const handleProfileUpdate = () => {
      setUser(authService.getCurrentUser())
    }

    window.addEventListener("schoolSwitched", handleSchoolSwitch as any)
    window.addEventListener("userSessionChanged", handleProfileUpdate)
    return () => {
      window.removeEventListener("schoolSwitched", handleSchoolSwitch as any)
      window.removeEventListener("userSessionChanged", handleProfileUpdate)
    }
  }, [])

  const schoolName = activeSchool ? activeSchool.name : (user?.schoolName || "Zetime Portal")
  const schoolLogo = activeSchool ? (activeSchool.logo || "") : (user?.schoolLogo || "")
  const logoUrl = schoolLogo || ""

  const handleLogout = async () => {
    await authService.logout()
    router.push("/login")
  }

  const initials = user?.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U"

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm pt-safe">
      <div className="w-full flex h-16 md:h-20 items-center px-4 md:px-8">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            className="mr-3 md:hidden h-10 w-10 rounded-xl hover:bg-primary/10 transition-all active:scale-90"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        <div className="flex items-center gap-2.5 md:gap-4 flex-1 min-w-0">
          <div className="h-9 w-9 md:h-12 md:w-12 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0 border border-primary/20 shadow-inner">
            {logoUrl && !logoError ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="w-full h-full object-cover" 
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="bg-primary/5 w-full h-full flex items-center justify-center">
                <GraduationCap className="h-4 w-4 md:h-6 md:w-6 text-primary" />
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-sm md:text-xl font-black tracking-tight text-foreground truncate uppercase">
              {schoolName}
            </h1>
            <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest truncate">
              {user?.role?.replace('_', ' ')} Portal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-3">
          <div className="hidden sm:block">
            <ModeToggle />
          </div>
          
          <NotificationPopover />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 w-9 md:h-10 md:w-10 rounded-full p-0 border border-border/50 hover:border-primary/30 transition-all shadow-sm">
                <Avatar className="h-8 w-8 md:h-9 md:w-9">
                  <AvatarImage src={user?.profile_photo || undefined} />
                  <AvatarFallback className="text-[10px] md:text-xs font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 rounded-2xl p-2" align="end" forceMount>
              <DropdownMenuLabel className="p-2 font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-bold truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="opacity-50" />
              <DropdownMenuItem className="rounded-xl h-10 gap-2 font-semibold" onClick={() => {
                const target = user?.role === "parent" ? "/parent/profile" : "/school/admin/profile"
                router.push(target)
              }}>
                <User className="h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="opacity-50" />
              <DropdownMenuItem onClick={handleLogout} className="rounded-xl h-10 gap-2 font-semibold text-rose-500 focus:bg-rose-50 focus:text-rose-600">
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
