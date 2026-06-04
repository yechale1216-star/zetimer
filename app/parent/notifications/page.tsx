"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { parentDb, type ParentNotification, type ParentPreferences } from "@/lib/db/parent-db"
import { useLanguage } from "@/lib/context/language-context"
import { 
  Bell, 
  Settings, 
  CheckCheck, 
  Trash2, 
  Smartphone, 
  Mail, 
  Radio,
  Clock,
  XCircle,
  Megaphone,
  AlertTriangle,
  Info,
  X
} from "lucide-react"

export default function ParentNotifications() {
  const { t, language } = useLanguage()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [notificationsList, setNotificationsList] = useState<ParentNotification[]>([])
  const [preferences, setPreferences] = useState<ParentPreferences>({
    smsAlerts: true,
    emailAlerts: false,
    pushAlerts: true
  })
  const [activeTab, setActiveTab] = useState<"inbox" | "preferences">("inbox")
  const [isLoading, setIsLoading] = useState(true)

  // 1. Initial Load
  const loadData = async () => {
    const userStr = localStorage.getItem("attendance_current_user")
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setCurrentUser(user)
        
        // Fetch notifications
        await fetchNotificationsList(user.phone)
        
        // Fetch channel preferences
        const prefs = await parentDb.getPreferences(user.phone)
        if (prefs) setPreferences(prefs)
      } catch (e) {
        console.error("[Notifications] Load error:", e)
      }
    }
    setIsLoading(false)
  }

  const fetchNotificationsList = async (phone: string) => {
    const list = await parentDb.getNotifications(phone)
    setNotificationsList(list)
  }

  useEffect(() => {
    loadData()
  }, [])

  // 2. Mark notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    if (!currentUser?.phone) return
    const success = await parentDb.markNotificationAsRead(notificationId)
    if (success) {
      // Update local state
      setNotificationsList(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      )
      // Trigger header badge refresh
      window.dispatchEvent(new Event("refreshNotifications"))
    }
  }

  // 2.5 Delete notification
  const handleDelete = async (notificationId: string) => {
    if (!currentUser?.phone) return
    const success = await parentDb.deleteNotification(notificationId)
    if (success) {
      setNotificationsList(prev => prev.filter(n => n.id !== notificationId))
      window.dispatchEvent(new Event("refreshNotifications"))
    }
  }

  // 3. Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (!currentUser?.phone) return
    const success = await parentDb.markAllNotificationsAsRead(currentUser.phone)
    if (success) {
      setNotificationsList(prev => prev.map(n => ({ ...n, isRead: true })))
      window.dispatchEvent(new Event("refreshNotifications"))
    }
  }

  // 4. Update channel preferences toggle
  const handlePreferenceToggle = async (key: keyof ParentPreferences, value: boolean) => {
    if (!currentUser?.phone) return
    const updated = { ...preferences, [key]: value }
    setPreferences(updated)
    await parentDb.updatePreferences(currentUser.phone, updated)
  }

  // Visual notification category indicators
  const getNotificationIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "absent":
        return (
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <XCircle className="w-4.5 h-4.5" />
          </div>
        )
      case "late":
        return (
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Clock className="w-4.5 h-4.5" />
          </div>
        )
      case "announcement":
        return (
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Megaphone className="w-4.5 h-4.5" />
          </div>
        )
      case "emergency":
        return (
          <div className="w-9 h-9 rounded-xl bg-rose-600/20 border border-rose-600/30 flex items-center justify-center text-rose-700 dark:text-rose-300 shrink-0">
            <AlertTriangle className="w-4.5 h-4.5" />
          </div>
        )
      default:
        return (
          <div className="w-9 h-9 rounded-xl bg-muted/40 border border-border/10 flex items-center justify-center text-muted-foreground shrink-0">
            <Info className="w-4.5 h-4.5" />
          </div>
        )
    }
  }

  const formatNotificationTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString(language === "am" ? "am-ET" : "en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    } catch {
      return dateStr
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-28 w-full bg-card animate-pulse rounded-3xl" />
        <div className="h-96 w-full bg-card animate-pulse rounded-3xl" />
      </div>
    )
  }

  const unreadCount = notificationsList.filter(n => !n.isRead).length

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Page Header */}
      <div>
        <h1 className="typography-page-title text-foreground">{t("alerts_config")}</h1>
        <p className="typography-label text-muted-foreground mt-0.5">{t("notifications_desc")}</p>
      </div>

      {/* Tabs list layout switcher */}
      <Tabs 
        defaultValue="inbox" 
        value={activeTab} 
        onValueChange={(val) => setActiveTab(val as any)}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <TabsList className="bg-card/60 backdrop-blur-md border border-border/40 p-1 rounded-2xl">
            <TabsTrigger value="inbox" className="typography-label gap-1.5 rounded-xl px-4 py-2">
              <Bell className="w-4 h-4" />
              <span>{t("notification_inbox")}</span>
              {unreadCount > 0 && (
                <span className="typography-label ml-1 px-1.5 py-0.5 text-[9px] rounded-full bg-rose-500 text-white shrink-0">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="preferences" className="typography-label gap-1.5 rounded-xl px-4 py-2">
              <Settings className="w-4 h-4" />
              <span>{t("channel_preferences")}</span>
            </TabsTrigger>
          </TabsList>

          {activeTab === "inbox" && unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="typography-label gap-1.5 rounded-xl border-border/40 hover:bg-muted"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>{t("mark_all_read")}</span>
            </Button>
          )}
        </div>

        {/* 1. NOTIFICATIONS INBOX TAB VIEW */}
        <TabsContent value="inbox" className="outline-none">
          <Card className="border-border/40 shadow-xl rounded-3xl bg-card/60 backdrop-blur-md overflow-hidden">
            <CardContent className="p-0 divide-y divide-border/20">
              {notificationsList.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-muted-foreground text-center">
                  <Bell className="w-12 h-12 text-muted-foreground/30 mb-2" />
                  <p className="typography-label">{t("no_alerts")}</p>
                  <span className="typography-label text-[10px] text-muted-foreground/60 mt-1">Check back later for school newsletters or attendance triggers.</span>
                </div>
              ) : (
                notificationsList.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`p-4 md:p-6 flex gap-4 transition-all relative ${
                      !notification.isRead 
                        ? "bg-emerald-500/5 dark:bg-emerald-500/[0.02]" 
                        : "hover:bg-muted/10"
                    }`}
                  >
                    {!notification.isRead && (
                      <div className="w-1.5 bg-emerald-600 dark:bg-emerald-500 absolute left-0 top-0 bottom-0 shrink-0" />
                    )}

                    {getNotificationIcon(notification.type)}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="typography-label text-foreground">{notification.title}</span>
                          <span className="typography-label block text-[10px] text-muted-foreground mt-0.5">{formatNotificationTime(notification.createdAt)}</span>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(notification.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-md shrink-0"
                          title="Dismiss alert"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <p className="typography-label text-muted-foreground mt-2">{notification.message}</p>
                    </div>

                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. CHANNELS PREFERENCES CONFIGURATION TAB VIEW */}
        <TabsContent value="preferences" className="outline-none animate-in fade-in duration-300">
          <Card className="border-border/40 shadow-xl rounded-3xl bg-card/60 backdrop-blur-md overflow-hidden">
            <CardHeader className="border-b border-border/20 py-4 px-6">
              <CardTitle className="typography-label uppercase text-foreground">{t("notification_channels")}</CardTitle>
              <CardDescription className="typography-helper">{t("notifications_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              {/* SMS Channel toggle */}
              <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/10 rounded-2xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="typography-label text-foreground">{t("sms_alerts")}</p>
                    <span className="typography-label text-[10px] text-muted-foreground mt-0.5">Receive text message triggers on Absents or Lates.</span>
                  </div>
                </div>
                <Switch 
                  checked={preferences.smsAlerts}
                  onCheckedChange={(checked) => handlePreferenceToggle("smsAlerts", checked)}
                  className="data-[state=checked]:bg-emerald-600"
                />
              </div>

              {/* Email Channel toggle */}
              <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/10 rounded-2xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="typography-label text-foreground">{t("email_alerts")}</p>
                    <span className="typography-label text-[10px] text-muted-foreground mt-0.5">Receive monthly attendance PDF audit sheets.</span>
                  </div>
                </div>
                <Switch 
                  checked={preferences.emailAlerts}
                  onCheckedChange={(checked) => handlePreferenceToggle("emailAlerts", checked)}
                  className="data-[state=checked]:bg-emerald-600"
                />
              </div>

              {/* Push Channel toggle */}
              <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/10 rounded-2xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="typography-label text-foreground">{t("push_alerts")}</p>
                    <span className="typography-label text-[10px] text-muted-foreground mt-0.5">Receive active web-app updates when mark is altered.</span>
                  </div>
                </div>
                <Switch 
                  checked={preferences.pushAlerts}
                  onCheckedChange={(checked) => handlePreferenceToggle("pushAlerts", checked)}
                  className="data-[state=checked]:bg-emerald-600"
                />
              </div>

            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

    </div>
  )
}
