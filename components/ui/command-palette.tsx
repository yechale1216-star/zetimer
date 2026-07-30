"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import { 
  Search, 
  LayoutDashboard, 
  Users, 
  User, 
  CheckSquare, 
  BarChart2, 
  BookOpen, 
  Settings, 
  Megaphone, 
  MessageSquare, 
  Phone, 
  TrendingUp, 
  ShieldAlert, 
  CreditCard, 
  HeadphonesIcon,
  LogOut,
  Moon,
  Sun
} from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/lib/context/auth-context"
import { useTheme } from "@/components/theme-provider"

import { usePermissions } from "@/lib/hooks/use-permissions"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const { hasModulePermission } = usePermissions()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, onOpenChange])

  const runCommand = React.useCallback((command: () => void) => {
    onOpenChange(false)
    command()
  }, [onOpenChange])

  const role = user?.role || "admin"

  const navItems = [
    { title: "Dashboard", href: role === "parent" ? "/parent/dashboard" : role === "teacher" ? "/school/teacher" : "/school/admin", icon: LayoutDashboard, module: "dashboard" },
    { title: "Announcements", href: role === "parent" ? "/parent/announcements" : "/school/admin/announcements", icon: Megaphone, module: "announcements" },
    { title: "Communication & Chat", href: role === "parent" ? "/parent/communication" : role === "teacher" ? "/school/teacher/communication" : "/school/admin/communication", icon: MessageSquare, module: "communication" },
    { title: "Students", href: "/school/admin/students", icon: Users, module: "students" },
    { title: "Teachers", href: "/school/admin/teachers", icon: User, module: "teachers" },
    { title: "Attendance", href: role === "teacher" ? "/school/teacher/attendance" : role === "parent" ? "/parent/attendance" : "/school/admin/attendance", icon: CheckSquare, module: "attendance" },
    { title: "Analytics & Grades", href: "/school/admin/attendance-by-grade", icon: BarChart2, module: "attendance_analytics" },
    { title: "Reports", href: role === "teacher" ? "/school/teacher/reports" : "/school/admin/reports", icon: BookOpen, module: "reports" },
    { title: "Discipline", href: role === "parent" ? "/parent/discipline" : role === "teacher" ? "/school/teacher/discipline" : "/school/admin/discipline", icon: ShieldAlert, module: "discipline" },
    { title: "Settings", href: "/school/admin/settings", icon: Settings, module: "settings" },
    { title: "Subscription", href: "/school/admin/subscription", icon: CreditCard, module: "subscription" },
    { title: "Help Desk", href: "/school/admin/support", icon: HeadphonesIcon, module: "support" },
  ]

  const filteredItems = navItems.filter(item => hasModulePermission(item.module, 'view'))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 max-w-xl shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <DialogTitle className="sr-only">Quick Navigation Command Palette</DialogTitle>
        <Command className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-14 [&_[cmdk-item]]:px-4 [&_[cmdk-item]]:py-3 [&_[cmdk-item]]:rounded-xl [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4">
          <div className="flex items-center border-b border-slate-100 dark:border-slate-800 px-4">
            <Search className="mr-3 h-5 w-5 shrink-0 text-slate-400" />
            <Command.Input
              placeholder="Type a command or search page..."
              className="flex h-14 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
            />
          </div>
          <Command.List className="max-h-[340px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>
            
            <Command.Group heading="Navigation">
              {filteredItems.map((item) => {
                const Icon = item.icon
                return (
                  <Command.Item
                    key={item.href}
                    value={item.title}
                    onSelect={() => runCommand(() => router.push(item.href))}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span>{item.title}</span>
                  </Command.Item>
                )
              })}
            </Command.Group>

            <Command.Group heading="System Preferences">
              <Command.Item
                value="Toggle Light Dark Theme Mode"
                onSelect={() => runCommand(() => setTheme(theme === 'dark' ? 'light' : 'dark'))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </div>
                <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
              </Command.Item>
              <Command.Item
                value="Sign Out Logout"
                onSelect={() => runCommand(() => logout())}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                  <LogOut className="h-4 w-4" />
                </div>
                <span>Sign Out</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
