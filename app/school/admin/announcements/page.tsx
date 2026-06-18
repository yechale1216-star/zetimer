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
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="space-y-1.5">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
               <div className="p-3 bg-primary/10 rounded-2xl">
                 <Megaphone className="w-8 h-8 text-primary" />
               </div>
               School Announcements
            </h2>
            <div className="flex items-center gap-3 text-muted-foreground ml-1">
              <p>Broadcast important news and alerts to all parent portals.</p>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Live System • Updated {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
              className="rounded-2xl h-14 px-8 bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 gap-3 font-bold text-lg active:scale-95 transition-all text-sm md:text-base"
            >
              <Plus className="w-6 h-6" />
              Create Announcement
            </Button>
          </div>
        </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-primary/5 dark:bg-primary/10 rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Megaphone className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Published</p>
              <p className="text-2xl font-bold text-foreground">{announcements.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/30">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-100/50 dark:bg-emerald-900/40 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Today</p>
              <p className="text-2xl font-bold text-emerald-600">
                {announcements.filter(a => new Date(a.createdAt).toDateString() === new Date().toDateString()).length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-red-50/50 dark:bg-red-950/20 rounded-2xl border border-red-100/50 dark:border-red-900/30">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-red-100/50 dark:bg-red-900/40 rounded-xl">
              <Bell className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Priority Alerts</p>
              <p className="text-2xl font-bold text-red-600">
                {announcements.filter(a => a.type === 'emergency').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card className="border-none shadow-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-6">
          <div className="space-y-1">
            <CardTitle className="typography-section-title">Broadcast History</CardTitle>
            <CardDescription className="typography-helper">Manage your communication history and active portal alerts.</CardDescription>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search announcements..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <PageSkeleton variant="cards" />
          ) : filteredAnnouncements.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto">
                <Megaphone className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">No announcements found</h3>
              <p className="text-slate-500 max-w-xs mx-auto">Click "Create Announcement" to publish your first update to parents.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAnnouncements.map((announcement) => (
                <div 
                  key={announcement.id}
                  className="group relative flex gap-6 p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-200/40 dark:hover:shadow-none transition-all duration-300"
                >
                  {/* Type Icon Indicator */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${getTypeStyles(announcement.type)}`}>
                    {getTypeIcon(announcement.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-foreground text-lg leading-snug group-hover:text-primary transition-colors truncate">
                        {announcement.title}
                      </h4>
                      <Badge className={`text-[10px] uppercase h-5 px-2 font-bold ${getTypeStyles(announcement.type)} border-none shadow-none`}>
                        {announcement.type}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                      {announcement.message}
                    </p>
                    <div className="flex items-center gap-4 pt-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(announcement.createdAt), 'MMM dd, yyyy')}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        {format(new Date(announcement.createdAt), 'hh:mm a')}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => startEdit(announcement)}
                      className="h-9 w-9 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(announcement.id)}
                      className="h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  )
}
