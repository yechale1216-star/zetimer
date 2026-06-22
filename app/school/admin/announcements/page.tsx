"use client"

import { useState, useEffect } from "react"
import { 
  Megaphone, 
  Plus, 
  Search, 
  Trash2, 
  Clock, 
  Bell, 
  AlertTriangle,
  Info,
  MoreVertical,
  CheckCircle2,
  Calendar,
  Edit2,
  RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils/utils"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { notifications } from "@/lib/utils/notifications"
import { PageSkeleton } from "@/components/ui/page-skeleton"
import { format } from "date-fns"
import { useAuth } from "@/lib/context/auth-context"

import { apiUrl } from "@/lib/api-config"
const API_URL = apiUrl;

interface Announcement {
  id: string
  title: string
  message: string
  type: "announcement" | "emergency" | "info"
  createdAt: string
  isRead: boolean
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Use AuthContext as the single source of truth for tenant identity.
  // NEVER read x-school-id or attendance_token directly from localStorage in page
  // components — those values can be stale immediately after onboarding.
  const { user: authUser } = useAuth()
  const confirmedSchoolId = authUser?.schoolId || ""

  // Derive auth headers from the confirmed context — not raw localStorage.
  const getAuthHeaders = (): Record<string, string> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("attendance_token") : ""
    return {
      "Accept": "application/json",
      Authorization: `Bearer ${token || ""}`,
      "x-school-id": confirmedSchoolId,
    }
  }

  // Form State
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    message: "",
    type: "announcement" as "announcement" | "emergency" | "info"
  })

  useEffect(() => {
    // Do not fetch until the authenticated tenant context is confirmed.
    // This is the primary guard against cross-tenant announcement leaks.
    if (!confirmedSchoolId) return

    fetchAnnouncements()

    // Background polling for "instant" updates (every 10 seconds)
    const pollInterval = setInterval(() => {
      fetchAnnouncements(true)
    }, 10000)

    return () => clearInterval(pollInterval)
  }, [confirmedSchoolId])

  const fetchAnnouncements = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true)
    // Safety net: never fetch if schoolId is not yet confirmed.
    if (!confirmedSchoolId) {
      console.warn("[Announcements] fetchAnnouncements skipped — no confirmed schoolId")
      setIsLoading(false)
      return
    }
    try {
      const res = await fetch(`${API_URL}/api/announcements`, {
        headers: getAuthHeaders()
      })
      
      if (!res.ok) {
        if (res.status === 401) {
          console.warn("[fetchAnnouncements] Unauthorized - Redirecting to login");
          const { authService } = await import("@/lib/auth/auth");
          authService.handleUnauthorized();
          return;
        }
        const text = await res.text()
        console.error(`[fetchAnnouncements] Server returned ${res.status}:`, text)
        throw new Error(text || `HTTP ${res.status}`)
      }

      const data = await res.json()
      if (data.success) {
        setAnnouncements(data.data)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error("Failed to fetch announcements:", error)
      if (!isBackground) {
        notifications.error("Error", "Failed to load announcements")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAnnouncement.title || !newAnnouncement.message) {
      notifications.warning("Missing Fields", "Please provide both title and message.")
      return
    }

    setIsSubmitting(true)
    try {
      const url = editingId 
        ? `${API_URL}/api/announcements/${editingId}`
        : `${API_URL}/api/announcements`
      
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newAnnouncement)
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }

      const data = await res.json()
      if (data.success) {
        notifications.success(
          editingId ? "Updated" : "Published", 
          editingId ? "Announcement updated successfully." : "Your announcement is now live on the parent portal."
        )
        setIsCreateModalOpen(false)
        resetForm()
        fetchAnnouncements()
      }
    } catch (error: any) {
      notifications.error("Error", error.message || "Failed to publish announcement")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setNewAnnouncement({ title: "", message: "", type: "announcement" })
    setEditingId(null)
  }

  const startEdit = (announcement: Announcement) => {
    setNewAnnouncement({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type
    })
    setEditingId(announcement.id)
    setIsCreateModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement? This will remove it for all parents.")) return

    try {
      const res = await fetch(`${API_URL}/api/parent/notifications/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      })

      if (res.ok) {
        notifications.success("Deleted", "Announcement removed.")
        setAnnouncements(prev => prev.filter(a => a.id !== id))
      }
    } catch (error) {
      notifications.error("Error", "Failed to delete announcement")
    }
  }

  const filteredAnnouncements = announcements.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.message.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getTypeIcon = (type: string) => {
    switch(type) {
      case "emergency": return <AlertTriangle className="w-4 h-4 text-red-500" />
      case "info": return <Info className="w-4 h-4 text-blue-500" />
      default: return <Megaphone className="w-4 h-4 text-emerald-500" />
    }
  }

  const getTypeStyles = (type: string) => {
    switch(type) {
      case "emergency": return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
      case "info": return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
      default: return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
    }
  }

  return (
    <div className="space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/90 dark:bg-slate-900/90 p-4 md:p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 backdrop-blur-sm shadow-sm pt-safe mx-4 md:mx-0">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Announcements
          </h1>
          <p className="text-[10px] md:text-sm font-bold text-slate-500/60 dark:text-slate-400/60 uppercase tracking-widest mt-1">
            Broadcast & Alerts
          </p>
        </div>
        <div className="hidden md:block">
          <Button 
            onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
            className="h-11 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-[10px] uppercase tracking-widest px-6 shadow-lg shadow-primary/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Broadcast
          </Button>
        </div>
      </div>

      {/* Stats Summary - Mobile Optimized */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 px-4 md:px-0">
        {[
          { label: "Total", value: announcements.length, icon: Megaphone, bg: "bg-primary/10", text: "text-primary" },
          { label: "Active", value: announcements.filter(a => new Date(a.createdAt).toDateString() === new Date().toDateString()).length, icon: CheckCircle2, bg: "bg-emerald-500/10", text: "text-emerald-600" },
          { label: "Priority", value: announcements.filter(a => a.type === 'emergency').length, icon: Bell, bg: "bg-rose-500/10", text: "text-rose-600" }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className={cn("w-10 h-10 flex items-center justify-center rounded-2xl mb-2", stat.bg)}>
              <stat.icon className={cn("w-5 h-5", stat.text)} />
            </div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{stat.label}</p>
            <p className={cn("text-xl font-black uppercase tracking-tight", stat.text)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main Content Card */}
        <div className="px-4 md:px-0">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Broadcast History</h3>
              <p className="text-[10px] font-bold text-slate-500/60 uppercase tracking-widest">Manage active alerts</p>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search alerts..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-11 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-primary/20"
              />
            </div>
          </div>

          {isLoading ? (
            <PageSkeleton variant="cards" />
          ) : filteredAnnouncements.length === 0 ? (
            <div className="py-20 text-center space-y-4 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto">
                <Megaphone className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">No alerts found</h3>
              <p className="text-[10px] uppercase font-bold text-slate-500/60 tracking-widest max-w-xs mx-auto">Broadcast your first message</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAnnouncements.map((announcement) => (
                <div 
                  key={announcement.id}
                  className="group relative flex gap-4 p-5 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm active:scale-[0.98] transition-all"
                >
                  <div className={`flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center ${getTypeStyles(announcement.type)}`}>
                    {getTypeIcon(announcement.type)}
                  </div>

                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight truncate">
                        {announcement.title}
                      </h4>
                      <Badge className={cn("text-[8px] uppercase px-2 py-0 h-4 font-black border-none shadow-none", getTypeStyles(announcement.type))}>
                        {announcement.type}
                      </Badge>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] font-bold leading-relaxed line-clamp-2">
                       {announcement.message}
                    </p>
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-50 dark:border-slate-800/50">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(announcement.createdAt), 'MMM dd')}
                       </span>
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(announcement.createdAt), 'hh:mm a')}
                       </span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => startEdit(announcement)}
                      className="h-9 w-9 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(announcement.id)}
                      className="h-9 w-9 text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="bg-primary p-8 text-white relative">
            <div className="absolute top-0 right-0 p-8 opacity-20">
              <Megaphone className="w-24 h-24 rotate-12" />
            </div>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              {editingId ? <Edit2 className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
              {editingId ? "Edit Announcement" : "New Announcement"}
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/80 mt-2">
              {editingId 
                ? "Modify your existing message to update parents with corrected information."
                : "Broadcast a new message to all parent portals within your school."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAnnouncement} className="p-8 space-y-6 bg-card dark:bg-slate-900">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-semibold ml-1">Announcement Title</Label>
                <Input 
                  id="title"
                  placeholder="e.g. School Resumes Next Week"
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                  className="rounded-xl bg-slate-50 dark:bg-slate-800 border-none h-12 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type" className="text-sm font-semibold ml-1">Priority Level</Label>
                <Select 
                  value={newAnnouncement.type} 
                  onValueChange={(val: any) => setNewAnnouncement(prev => ({ ...prev, type: val }))}
                >
                  <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-800 border-none h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-xl">
                    <SelectItem value="announcement" className="rounded-lg">
                      <div className="flex items-center gap-2">
                        <Megaphone className="w-4 h-4 text-emerald-500" />
                        <span>Standard Announcement</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="info" className="rounded-lg">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-500" />
                        <span>General Information</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="emergency" className="rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span>High Priority Alert</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-sm font-semibold ml-1">Announcement Message</Label>
                <Textarea 
                  id="message"
                  placeholder="Write your announcement here..."
                  value={newAnnouncement.message}
                  onChange={(e) => setNewAnnouncement(prev => ({ ...prev, message: e.target.value }))}
                  className="rounded-xl bg-slate-50 dark:bg-slate-800 border-none min-h-[150px] focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <DialogFooter className="flex items-center gap-4 pt-4 border-t border-border mt-6">
              <Button 
                type="button" 
                variant="ghost" 
                className="rounded-xl h-12 flex-1"
                onClick={() => { setIsCreateModalOpen(false); resetForm(); }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 h-12 flex-1 rounded-xl font-bold"
              >
                {isSubmitting ? "Processing..." : editingId ? "Update Now" : "Publish Announcement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Mobile Floating Action Button */}
      <div className="md:hidden fixed bottom-24 right-6 z-50">
        <Button
          onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
          className="h-14 w-14 rounded-full bg-primary text-white shadow-2xl shadow-primary/40 flex items-center justify-center p-0 active:scale-95 transition-all"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>
    </div>
  )
}
