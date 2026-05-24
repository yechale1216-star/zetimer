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
import { LogOut, User, Bell, Menu } from "lucide-react"
import { useSchoolSettings } from "@/hooks/use-school-settings"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils/utils"
import { authService } from "@/lib/auth/auth"

interface TopNavProps {
  onMenuClick?: () => void
  showMenuButton?: boolean
}

export function TopNav({ onMenuClick, showMenuButton = false }: TopNavProps) {
  const router = useRouter()
  const { settings } = useSchoolSettings()
  const [mounted, setMounted] = React.useState(false)
  const [user, setUser] = React.useState<any>(null)

  React.useEffect(() => {
    setMounted(true)
    setUser(authService.getCurrentUser())
  }, [])

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
          <Button variant="ghost" size="icon" className="mr-2 md:hidden" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>
        )}

        <div className="flex items-center gap-4 flex-1 overflow-hidden">
          {/* School Identity */}
          <div className="flex items-center gap-4 overflow-hidden">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0 border border-primary/20 shadow-inner">
              {user?.schoolLogo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={user.schoolLogo} alt="School Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary font-black text-xl">
                  {user?.schoolName?.[0]?.toUpperCase() || "S"}
                </span>
              )}
            </div>
            <div className="flex flex-col overflow-hidden">
              <h1 className="font-black text-primary text-lg sm:text-2xl truncate leading-tight tracking-tight">
                {user?.schoolName || "School Admin"}
              </h1>
              <span className="text-[10px] text-primary/70 uppercase tracking-[0.2em] font-black">
                Management Portal
              </span>
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
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/school/admin/profile")}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
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
