"use client"

import React from "react"
import { Logo } from "@/components/logo"
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
import { LogOut, User, Bell, Menu, GraduationCap } from "lucide-react"
import { useSchoolSettings } from "@/hooks/use-school-settings"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils/utils"
import { authService } from "@/lib/auth/auth"
import { useSchool } from "@/lib/context/school-context"

interface TopNavProps {
  onMenuClick?: () => void
  showMenuButton?: boolean
}

export function TopNav({ onMenuClick, showMenuButton = false }: TopNavProps) {
  const router = useRouter()
  const { settings } = useSchoolSettings()
  const { activeSchool } = useSchool()
  const [mounted, setMounted] = React.useState(false)
  const [user, setUser] = React.useState<any>(null)
  const [logoError, setLogoError] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    setUser(authService.getCurrentUser())

    const handleSchoolSwitch = () => {
      setUser(authService.getCurrentUser())
      setLogoError(false) // Reset error state on switch
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

  // Force reactivity by strictly using context first
  // If activeSchool is present, it MUST take absolute priority (even if its logo is an empty string)
  const schoolName = activeSchool ? activeSchool.name : (user?.schoolName || "Zetime Portal")
  const schoolLogo = activeSchool ? (activeSchool.logo || "") : (user?.schoolLogo || "")
  const customId = activeSchool ? activeSchool.customSchoolId : (user?.customSchoolId || "")
  
  const logoUrl = schoolLogo || ""

  // Reset logo error when logo URL changes
  React.useEffect(() => {
    setLogoError(false)
  }, [logoUrl])

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
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container flex h-20 items-center px-4 md:px-8">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 md:hidden hover:bg-primary/10 transition-colors"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        <div className="flex items-center gap-4 flex-1 overflow-hidden">
          <div className="flex items-center gap-4 overflow-hidden">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0 border border-primary/20 shadow-inner">
              {logoUrl && !logoError ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img 
                  src={logoUrl} 
                  alt="School Logo" 
                  className="w-full h-full object-cover" 
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="bg-emerald-50 dark:bg-emerald-950 w-full h-full flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-emerald-600" />
                </div>
              )}
            </div>
            <div className="flex flex-col overflow-hidden">
              <h1 className="typography-card-title text-primary sm:text-2xl truncate">
                {schoolName}
              </h1>
              <div className="flex items-center gap-2">
                <span className="typography-label text-[10px] text-primary/70 uppercase tracking-[0.2em]">
                  {user?.role === "parent" ? "Parent Portal" : user?.role === "teacher" ? "Teacher Portal" : user?.role === "admin" || user?.role === "school_admin" ? "Admin Portal" : "Management Portal"}
                </span>
                {customId && (
                  <span className="typography-label text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                    {customId}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ModeToggle />
          
          <Button variant="ghost" size="icon" className="relative group">
            <Bell className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 border-2 border-background" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 border border-border/50 hover:border-primary/30 transition-all shadow-sm">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.profile_photo || undefined} alt={user?.name} />
                  <AvatarFallback className="typography-label bg-primary/10 text-primary">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="typography-body">
                <div className="flex flex-col space-y-1">
                  <p className="typography-label">{user?.name}</p>
                  <p className="typography-helper text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                const target = user?.role === "parent" ? "/parent/profile" : "/school/admin/profile"
                router.push(target)
              }}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              {user?.role === "parent" && typeof window !== "undefined" && localStorage.getItem("available_schools") && JSON.parse(localStorage.getItem("available_schools") || "[]").length > 1 && (
                <DropdownMenuItem onClick={() => router.push("/parent/school-select")}>
                  <div className="flex items-center text-emerald-600">
                    <LogOut className="mr-2 h-4 w-4 rotate-180" />
                    <span>Switch School</span>
                  </div>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-500 hover:text-red-600 focus:text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
