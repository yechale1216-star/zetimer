"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft, Building2, MapPin, Mail, Sliders, Package,
  Users, GraduationCap, CalendarDays, ShieldBan, ShieldCheck, Loader2, AlertTriangle, Phone
} from "lucide-react"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { parseJsonResponse } from "@/lib/utils/parse-json-response"
import { getApiUrl } from "@/lib/api-config"
import { SchoolSubscriptionTab } from "@/components/super-admin/school-subscription-tab"
import { SchoolAddonsTab } from "@/components/super-admin/school-addons-tab"

export default function SchoolDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [school, setSchool] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [suspending, setSuspending] = useState(false)

  const fetchSchool = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("attendance_token")
      const res = await fetch(`${getApiUrl()}/api/schools/${id}/details`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await parseJsonResponse<any>(res)
      if (json.success) setSchool(json.data)
    } catch (err) {
      console.error("Failed to load school details:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSchool() }, [id])

  const handleSuspendToggle = async () => {
    try {
      setSuspending(true)
      const token = localStorage.getItem("attendance_token")
      const isSuspended = school?.subscriptionStatus === "SUSPENDED"
      const res = await fetch(`${getApiUrl()}/api/schools/${id}/suspend`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ suspend: !isSuspended }),
      })
      const json = await res.json()
      if (json.success) await fetchSchool()
    } catch (err) {
      console.error("Suspend toggle failed:", err)
    } finally {
      setSuspending(false)
    }
  }

  if (loading) return (
    <div className="p-8 flex items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin" /> Loading school details...
    </div>
  )

  if (!school) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive mb-4">School not found.</p>
        <Button onClick={() => router.push("/super-admin/schools")}>Back to list</Button>
      </div>
    )
  }

  const isSuspended = school.subscriptionStatus === "SUSPENDED"

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/super-admin/schools")}>
          <ChevronLeft className="w-4 h-4 mr-1" />Schools
        </Button>
      </div>

      {/* School Hero */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden border relative ${isSuspended ? 'bg-red-500/10 border-red-500/20' : 'bg-primary/10 border-primary/20'}`}>
            <Building2 className={`w-8 h-8 absolute ${isSuspended ? 'text-red-500' : 'text-primary'}`} />
            {school.settings?.school_logo && (
              <img 
                src={school.settings.school_logo} 
                alt={school.name} 
                className="w-full h-full object-cover relative z-10"
                onError={(e) => {
                  (e.target as any).style.display = 'none';
                }}
              />
            )}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{school.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="font-mono text-xs">{school.schoolId || school.id}</Badge>
              {isSuspended ? (
                <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 gap-1 uppercase text-[10px]">
                  <ShieldBan className="w-3 h-3" /> Suspended
                </Badge>
              ) : (
                <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30 gap-1 uppercase text-[10px]">
                  <ShieldCheck className="w-3 h-3" /> Active
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] uppercase text-muted-foreground">
                {school.onboardingStatus?.replace("_", " ")}
              </Badge>
            </div>
          </div>
        </div>

        {/* Suspend / Unsuspend Action */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant={isSuspended ? "outline" : "destructive"}
              className={isSuspended ? "border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950" : ""}
              disabled={suspending}
            >
              {suspending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> :
                isSuspended ? <ShieldCheck className="w-4 h-4 mr-2" /> : <ShieldBan className="w-4 h-4 mr-2" />}
              {isSuspended ? "Unsuspend School" : "Suspend School"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                {isSuspended ? "Unsuspend School?" : "Suspend School?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isSuspended
                  ? `${school.name} will regain full access. All users will be able to create and modify data again.`
                  : `${school.name} will lose the ability to create or modify any data. All users will be blocked from write operations. Existing data will remain readable.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSuspendToggle}
                className={isSuspended ? "bg-green-600 hover:bg-green-700" : "bg-destructive hover:bg-destructive/90"}
              >
                {isSuspended ? "Yes, Unsuspend" : "Yes, Suspend"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: school.userCount ?? "—", icon: <Users className="w-5 h-5 text-blue-500" /> },
          { label: "Total Students", value: school.studentCount ?? "—", icon: <GraduationCap className="w-5 h-5 text-green-500" /> },
          { label: "Created", value: new Date(school.createdAt).toLocaleDateString(), icon: <CalendarDays className="w-5 h-5 text-muted-foreground" /> },
          { label: "Tier", value: school.subscriptionStatus || "ACTIVE", icon: <Sliders className="w-5 h-5 text-purple-500" /> },
        ].map(({ label, value, icon }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">{icon}</div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold truncate">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full max-w-sm grid-cols-3">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="addons" className="gap-1.5 text-xs sm:text-sm">
            <Package className="w-3 h-3" /> Add-ons
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* School Contact */}
            <Card>
              <CardHeader><CardTitle className="text-base">Contact &amp; Identity</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm">
                <InfoRow icon={<Mail className="w-4 h-4 text-muted-foreground" />} label="School Email" value={school.schoolEmail || "Not set"} />
                <InfoRow icon={<Building2 className="w-4 h-4 text-muted-foreground" />} label="School ID" value={school.schoolId || school.id} mono />
              </CardContent>
            </Card>

            {/* Administrator Info */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Primary Administrator
              </CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm">
                {school.adminUser ? (
                  <>
                    <InfoRow icon={<Users className="w-4 h-4 text-muted-foreground" />} label="Full Name" value={school.adminUser.full_name} />
                    <InfoRow icon={<Mail className="w-4 h-4 text-muted-foreground" />} label="Email Address" value={school.adminUser.email} />
                    <InfoRow icon={<Phone className="w-4 h-4 text-muted-foreground" />} label="Phone" value={school.adminUser.phone || "Not set"} />
                  </>
                ) : (
                  <p className="text-muted-foreground italic py-2">No primary administrator found.</p>
                )}
              </CardContent>
            </Card>

            {/* Settings */}
            <Card>
              <CardHeader><CardTitle className="text-base">Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm">
                <InfoRow icon={<MapPin className="w-4 h-4 text-muted-foreground" />} label="Address" value={school.settings?.school_address || "Not set"} />
                <InfoRow icon={<CalendarDays className="w-4 h-4 text-muted-foreground" />} label="Academic Year" value={school.settings?.academic_year || "Not set"} />
                <InfoRow icon={<Sliders className="w-4 h-4 text-muted-foreground" />} label="Attendance Mode" value={school.settings?.attendance_mode?.replace("_", " ") || "Not set"} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subscription" className="mt-6">
          <SchoolSubscriptionTab schoolId={id} />
        </TabsContent>

        <TabsContent value="addons" className="mt-6">
          <SchoolAddonsTab schoolId={id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function InfoRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`font-medium ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
      </div>
    </div>
  )
}
