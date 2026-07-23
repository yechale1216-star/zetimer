"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { parentDb, type ParentNotification, type ParentPreferences } from "@/lib/db/parent-db"
import { useLanguage } from "@/lib/context/language-context"
import { formatLocalizedDate } from "@/lib/utils/date-utils"
import { PageSkeleton } from "@/components/ui/page-skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Bell, Settings, CheckCheck, Trash2, BellOff,
  Smartphone, Mail, Radio, Clock, XCircle, Megaphone,
  AlertTriangle, Info, UserX, X, ChevronRight,
  Filter, RefreshCw, GraduationCap, ShieldAlert,
  LogOut, Loader2
} from "lucide-react"

// ── Auth guard helper ──────────────────────────────────────────────────────────
function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false
  const token = localStorage.getItem("attendance_token")
  const user = localStorage.getItem("attendance_current_user")
  return !!(token && user)
}

// ── Date grouping helper ───────────────────────────────────────────────────────
function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return date.toLocaleDateString(undefined, { weekday: "long" })
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
}

function groupNotificationsByDay(notifications: ParentNotification[]): { label: string; items: ParentNotification[] }[] {
  const groups: { [key: string]: ParentNotification[] } = {}
  for (const n of notifications) {
    const label = getDayLabel(n.createdAt)
    if (!groups[label]) groups[label] = []
    groups[label].push(n)
  }
  return Object.entries(groups).map(([label, items]) => ({ label, items }))
}

// ── Type config map ────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, {
  icon: React.ReactNode
  bg: string
  border: string
  badge: string
  badgeText: string
  accentBar: string
}> = {
  absent: {
    icon: <XCircle className="w-5 h-5 text-rose-400" />,
    bg: "bg-rose-500/10",
    border: "border-rose-500/25",
    badge: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
    badgeText: "ABSENT",
    accentBar: "bg-rose-500",
  },
  late: {
    icon: <Clock className="w-5 h-5 text-amber-400" />,
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
    badge: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    badgeText: "LATE",
    accentBar: "bg-amber-500",
  },
  announcement: {
    icon: <Megaphone className="w-5 h-5 text-blue-400" />,
    bg: "bg-blue-500/10",
    border: "border-blue-500/25",
    badge: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    badgeText: "ANNOUNCEMENT",
    accentBar: "bg-blue-500",
  },
  emergency: {
    icon: <ShieldAlert className="w-5 h-5 text-red-400" />,
    bg: "bg-red-600/15",
    border: "border-red-600/30",
    badge: "bg-red-600/25 text-red-200 border border-red-600/40",
    badgeText: "EMERGENCY",
    accentBar: "bg-red-600",
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5 text-orange-400" />,
    bg: "bg-orange-500/10",
    border: "border-orange-500/25",
    badge: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
    badgeText: "WARNING",
    accentBar: "bg-orange-500",
  },
  info: {
    icon: <Info className="w-5 h-5 text-sky-400" />,
    bg: "bg-sky-500/10",
    border: "border-sky-500/25",
    badge: "bg-sky-500/20 text-sky-300 border border-sky-500/30",
    badgeText: "INFO",
    accentBar: "bg-sky-500",
  },
}

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type?.toLowerCase()] ?? {
    icon: <Bell className="w-5 h-5 text-muted-foreground" />,
    bg: "bg-muted/20",
    border: "border-border/20",
    badge: "bg-muted/30 text-muted-foreground border border-border/20",
    badgeText: (type || "INFO").toUpperCase(),
    accentBar: "bg-muted",
  }
}

// ── Attendance Status Card ─────────────────────────────────────────────────────
function AttendanceStatusBanner({ notifications }: { notifications: ParentNotification[] }) {
  const attendanceNotes = notifications.filter(n =>
    ["absent", "late", "warning"].includes(n.type.toLowerCase())
  )
  if (attendanceNotes.length === 0) return null

  const todayNotes = attendanceNotes.filter(n => getDayLabel(n.createdAt) === "Today")
  const absentToday = todayNotes.filter(n => n.type === "absent").length
  const lateToday = todayNotes.filter(n => n.type === "late").length
  const warningToday = todayNotes.filter(n => n.type === "warning").length

  return (
    <div className="mx-0 mb-3">
      <div className="bg-[#111a28] border border-slate-800/60 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-6 w-6 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Today's Attendance Status
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className={`rounded-xl p-3 text-center ${absentToday > 0 ? "bg-rose-500/15 border border-rose-500/30" : "bg-slate-800/50 border border-slate-700/40"}`}>
            <div className={`text-2xl font-black mb-0.5 ${absentToday > 0 ? "text-rose-400" : "text-slate-500"}`}>
              {absentToday}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-300/70">Absent</div>
          </div>
          <div className={`rounded-xl p-3 text-center ${lateToday > 0 ? "bg-amber-500/15 border border-amber-500/30" : "bg-slate-800/50 border border-slate-700/40"}`}>
            <div className={`text-2xl font-black mb-0.5 ${lateToday > 0 ? "text-amber-400" : "text-slate-500"}`}>
              {lateToday}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300/70">Late</div>
          </div>
          <div className={`rounded-xl p-3 text-center ${warningToday > 0 ? "bg-orange-500/15 border border-orange-500/30" : "bg-slate-800/50 border border-slate-700/40"}`}>
            <div className={`text-2xl font-black mb-0.5 ${warningToday > 0 ? "text-orange-400" : "text-slate-500"}`}>
              {warningToday}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-orange-300/70">Warning</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Signed-Out Wall ────────────────────────────────────────────────────────────
function SignedOutWall() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-[#0a1120] flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center text-center gap-6 max-w-xs">
        {/* Icon */}
        <div className="relative">
          <div className="h-24 w-24 rounded-full bg-slate-800/60 border border-slate-700/50 flex items-center justify-center shadow-2xl">
            <UserX className="h-10 w-10 text-slate-400" />
          </div>
          <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-100">
            You're signed out
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            You received a notification but you are currently not signed in to your Zetime account. Please sign in to view your notifications.
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push("/login")}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] transition-all rounded-2xl font-bold text-white text-sm shadow-lg shadow-emerald-900/30"
        >
          <LogOut className="h-4 w-4 rotate-180" />
          Sign In to View Notifications
        </button>

        <p className="text-xs text-slate-600 px-4">
          Your notifications will appear here once you sign in with your parent account.
        </p>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ParentNotifications() {
  const { t, language } = useLanguage()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [signedOut, setSignedOut] = useState(false)
  const [notificationsList, setNotificationsList] = useState<ParentNotification[]>([])
  const [preferences, setPreferences] = useState<ParentPreferences>({
    smsAlerts: true,
    emailAlerts: false,
    pushAlerts: true
  })
  const [activeTab, setActiveTab] = useState<"inbox" | "preferences">("inbox")
  const [filterType, setFilterType] = useState<"all" | "absent" | "late" | "announcement" | "emergency" | "warning">("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // ── Task 3: Auth Check ──────────────────────────────────────────────────────
  useEffect(() => {
    const loggedIn = isLoggedIn()
    if (!loggedIn) {
      setSignedOut(true)
      setAuthChecked(true)
      setIsLoading(false)
      return
    }
    setAuthChecked(true)
    loadData()
  }, [])

  const fetchNotificationsList = useCallback(async (phone: string) => {
    const list = await parentDb.getNotifications(phone)
    setNotificationsList(list)
  }, [])

  const loadData = async () => {
    const userStr = localStorage.getItem("attendance_current_user")
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setCurrentUser(user)
        await fetchNotificationsList(user.phone)
        const prefs = await parentDb.getPreferences(user.phone)
        if (prefs) setPreferences(prefs)
      } catch (e) {
        console.error("[Notifications] Load error:", e)
      }
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (!authChecked || signedOut) return
    const handler = () => { setIsLoading(true); loadData() }
    window.addEventListener("studentChanged", handler)
    return () => window.removeEventListener("studentChanged", handler)
  }, [authChecked, signedOut])

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleMarkAsRead = async (notificationId: string) => {
    if (!currentUser?.phone) return
    const success = await parentDb.markNotificationAsRead(notificationId)
    if (success) {
      setNotificationsList(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n))
      window.dispatchEvent(new Event("refreshNotifications"))
    }
  }

  const handleDelete = async (notificationId: string) => {
    setNotificationsList(prev => prev.filter(n => n.id !== notificationId))
    window.dispatchEvent(new Event("refreshNotifications"))
    try {
      await parentDb.deleteNotification(notificationId)
    } catch (err) {
      console.error("[Notifications] Delete error:", err)
      if (currentUser?.phone) await fetchNotificationsList(currentUser.phone)
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!currentUser?.phone) return
    const success = await parentDb.markAllNotificationsAsRead(currentUser.phone)
    if (success) {
      setNotificationsList(prev => prev.map(n => ({ ...n, isRead: true })))
      window.dispatchEvent(new Event("refreshNotifications"))
    }
  }

  const handleRefresh = async () => {
    if (!currentUser?.phone) return
    setIsRefreshing(true)
    await fetchNotificationsList(currentUser.phone)
    setIsRefreshing(false)
  }

  const handlePreferenceToggle = async (key: keyof ParentPreferences, value: boolean) => {
    if (!currentUser?.phone) return
    const updated = { ...preferences, [key]: value }
    setPreferences(updated)
    await parentDb.updatePreferences(currentUser.phone, updated)
  }

  const formatNotificationTime = (dateStr: string) => {
    return formatLocalizedDate(dateStr, language, {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const localizeNotification = (notification: ParentNotification): { title: string; message: string } => {
    const studentName = notification.student?.fullName?.split(" ")[0] || ""
    const isFemale = notification.student?.gender?.toLowerCase() === "female"
    const suffix = isFemale ? "_f" : ""
    const formattedDate = formatLocalizedDate(notification.createdAt, language, { month: "short", day: "numeric" })
    switch (notification.type) {
      case "absent":
        return {
          title: t(("alert_absent_title" + suffix) as any, { name: studentName }),
          message: t(("alert_absent_msg" + suffix) as any, { name: studentName, date: formattedDate }),
        }
      case "late":
        return {
          title: t(("alert_late_title" + suffix) as any, { name: studentName }),
          message: t(("alert_late_msg" + suffix) as any, { name: studentName, date: formattedDate }),
        }
      case "warning":
        return {
          title: t(("alert_warning_title" + suffix) as any, { name: studentName }),
          message: t(("alert_warning_msg" + suffix) as any, { name: studentName, date: formattedDate }),
        }
      default:
        return { title: notification.title, message: notification.message }
    }
  }

  // ── Guard: signed-out state ────────────────────────────────────────────────
  if (!authChecked || (authChecked && signedOut)) {
    return <SignedOutWall />
  }

  if (isLoading) {
    return <PageSkeleton variant="cards" />
  }

  const unreadCount = notificationsList.filter(n => !n.isRead).length

  // Filter by type
  const filtered = filterType === "all"
    ? notificationsList
    : notificationsList.filter(n => n.type === filterType)

  // Group by day
  const grouped = groupNotificationsByDay(filtered)

  const filterOptions: { key: typeof filterType; label: string; color: string }[] = [
    { key: "all", label: "All", color: "text-slate-300 border-slate-700" },
    { key: "absent", label: "Absent", color: "text-rose-400 border-rose-500/40" },
    { key: "late", label: "Late", color: "text-amber-400 border-amber-500/40" },
    { key: "announcement", label: "Announce", color: "text-blue-400 border-blue-500/40" },
    { key: "emergency", label: "Emergency", color: "text-red-400 border-red-500/40" },
    { key: "warning", label: "Warning", color: "text-orange-400 border-orange-500/40" },
  ]

  return (
    <div className="min-h-screen bg-[#0a1120] text-slate-100">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-[#0c1524]/95 backdrop-blur-xl border-b border-slate-800/60">
        <div className="px-4 pt-4 pb-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Notifications</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {unreadCount > 0 ? (
                  <span className="text-emerald-400 font-semibold">{unreadCount} unread</span>
                ) : (
                  <span>All caught up</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition-all"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Mark all read
                </button>
              )}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 w-8 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center hover:bg-slate-800 active:scale-95 transition-all"
              >
                <RefreshCw className={`w-4 h-4 text-slate-400 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
          <div className="flex gap-1">
            {[
              { key: "inbox", icon: <Bell className="w-3.5 h-3.5" />, label: "Inbox" },
              { key: "preferences", icon: <Settings className="w-3.5 h-3.5" />, label: "Settings" },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
                  activeTab === tab.key
                    ? "text-emerald-400 border-emerald-500"
                    : "text-slate-500 border-transparent hover:text-slate-300"
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.key === "inbox" && unreadCount > 0 && (
                  <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── INBOX TAB ────────────────────────────────────────────────────────── */}
      {activeTab === "inbox" && (
        <div className="px-4 pb-24 pt-4">

          {/* Attendance Summary Banner (Task 2) */}
          <AttendanceStatusBanner notifications={notificationsList} />

          {/* Filter Bar */}
          {notificationsList.length > 0 && (
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
              <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              {filterOptions.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setFilterType(opt.key)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                    filterType === opt.key
                      ? `${opt.color} bg-slate-800/80`
                      : "text-slate-500 border-slate-800/60 hover:text-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Empty State */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <div className="h-20 w-20 rounded-full bg-slate-800/40 border border-slate-700/40 flex items-center justify-center">
                <BellOff className="h-9 w-9 text-slate-600" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-400">
                  {filterType === "all" ? "No notifications yet" : `No ${filterType} notifications`}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {filterType === "all"
                    ? "You'll see attendance alerts and school announcements here."
                    : `Switch to 'All' to see other notifications.`
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map(({ label, items }) => (
                <div key={label}>
                  {/* Day Divider — Task 2 clear date division */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest shrink-0">
                      {label}
                    </span>
                    <div className="flex-1 h-px bg-slate-800/60" />
                    <span className="text-[10px] text-slate-600 shrink-0">{items.length} alert{items.length !== 1 ? "s" : ""}</span>
                  </div>

                  {/* Notification Cards */}
                  <div className="space-y-2">
                    {items.map((notification) => {
                      const cfg = getTypeConfig(notification.type)
                      const { title, message } = localizeNotification(notification)
                      const hasStudent = notification.student?.fullName

                      return (
                        <div
                          key={notification.id}
                          onClick={() => { if (!notification.isRead) handleMarkAsRead(notification.id) }}
                          className={`relative overflow-hidden rounded-2xl border transition-all active:scale-[0.99] ${
                            !notification.isRead
                              ? `${cfg.bg} ${cfg.border}`
                              : "bg-[#111a28]/60 border-slate-800/40"
                          }`}
                        >
                          {/* Unread accent bar */}
                          {!notification.isRead && (
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.accentBar}`} />
                          )}

                          <div className="p-4 pl-5">
                            <div className="flex items-start gap-3">
                              {/* Icon */}
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg} border ${cfg.border}`}>
                                {cfg.icon}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    {/* Type Badge + Student Name */}
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md tracking-wider uppercase ${cfg.badge}`}>
                                        {cfg.badgeText}
                                      </span>
                                      {hasStudent && (
                                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                          <GraduationCap className="w-3 h-3" />
                                          {notification.student!.fullName}
                                        </span>
                                      )}
                                    </div>
                                    {/* Title */}
                                    <p className={`text-sm font-bold leading-snug mb-0.5 ${!notification.isRead ? "text-white" : "text-slate-400"}`}>
                                      {title}
                                    </p>
                                    {/* Message */}
                                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                                      {message}
                                    </p>
                                    {/* Time */}
                                    <p className="text-[10px] text-slate-600 mt-1.5 font-medium">
                                      {formatNotificationTime(notification.createdAt)}
                                    </p>
                                  </div>

                                  {/* Delete Button */}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(notification.id) }}
                                    className="h-7 w-7 rounded-lg bg-slate-800/50 flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all active:scale-90 shrink-0"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PREFERENCES TAB ──────────────────────────────────────────────────── */}
      {activeTab === "preferences" && (
        <div className="px-4 pb-24 pt-5">
          <div className="mb-4">
            <h2 className="text-base font-black text-slate-200">Alert Channels</h2>
            <p className="text-xs text-slate-500 mt-0.5">Choose how you receive attendance alerts</p>
          </div>

          <div className="space-y-3">
            {[
              {
                key: "smsAlerts" as keyof ParentPreferences,
                icon: <Smartphone className="w-5 h-5 text-emerald-400" />,
                iconBg: "bg-emerald-500/15 border-emerald-500/25",
                title: t("sms_alerts"),
                desc: t("sms_alert_desc"),
                value: preferences.smsAlerts,
              },
              {
                key: "emailAlerts" as keyof ParentPreferences,
                icon: <Mail className="w-5 h-5 text-blue-400" />,
                iconBg: "bg-blue-500/15 border-blue-500/25",
                title: t("email_alerts"),
                desc: t("email_alert_desc"),
                value: preferences.emailAlerts,
              },
              {
                key: "pushAlerts" as keyof ParentPreferences,
                icon: <Radio className="w-5 h-5 text-violet-400" />,
                iconBg: "bg-violet-500/15 border-violet-500/25",
                title: t("push_alerts"),
                desc: t("push_alert_desc"),
                value: preferences.pushAlerts,
              },
            ].map(pref => (
              <div
                key={pref.key}
                className="flex items-center justify-between p-4 bg-[#111a28] border border-slate-800/60 rounded-2xl"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 ${pref.iconBg}`}>
                    {pref.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-200">{pref.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{pref.desc}</p>
                  </div>
                </div>
                <Switch
                  checked={Boolean(pref.value)}
                  onCheckedChange={(checked) => handlePreferenceToggle(pref.key, checked)}
                  className="data-[state=checked]:bg-emerald-600 shrink-0"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
