"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Building2, MapPin, Phone, Mail, User } from "lucide-react"
import { parseJsonResponse } from "@/lib/utils/parse-json-response"
import { SchoolSubscriptionTab } from "@/components/super-admin/school-subscription-tab"

export default function SchoolDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [school, setSchool] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`/api/super-admin/schools/${id}`)
        const json = await parseJsonResponse<any>(res)
        if (json.success) setSchool(json.data)
      } catch (err) {
        console.error("Failed to load school details:", err)
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading school details...</div>

  if (!school) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive mb-4">School not found.</p>
        <Button onClick={() => router.push("/super-admin/schools")}>Back to list</Button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/super-admin/schools")}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Schools
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{school.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{school.code || school.id}</Badge>
              <Badge variant="secondary" className="capitalize">{school.status || 'Active'}</Badge>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="info">General Info</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
        </TabsList>
        
        <TabsContent value="info" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Contact Person</p>
                    <p className="text-sm font-medium">{school.contactPerson || "Not specified"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email Address</p>
                    <p className="text-sm font-medium">{school.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone Number</p>
                    <p className="text-sm font-medium">{school.phone || "Not specified"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="text-sm font-medium">
                      {school.address}, {school.city}, {school.state} {school.zipCode}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subscription" className="mt-6">
          <SchoolSubscriptionTab schoolId={id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
