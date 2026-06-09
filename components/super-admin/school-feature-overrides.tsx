"use client"

import React, { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ShieldCheck, ShieldX, Trash2, Sliders } from "lucide-react"
import { getApiUrl } from "@/lib/auth/auth"

interface Feature { id: string; key: string; name: string; category: string; isActive: boolean; isCore: boolean }
interface Override { id: string; featureId: string; granted: boolean; reason?: string; feature: Feature }

const apiBase = () => getApiUrl()
const authHeader = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("attendance_token")}`,
})

interface SchoolFeatureOverridesProps {
  schoolId: string
  schoolName?: string
}

export function SchoolFeatureOverrides({ schoolId, schoolName }: SchoolFeatureOverridesProps) {
  const [overrides, setOverrides] = useState<Override[]>([])
  const [allFeatures, setAllFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFeatureId, setSelectedFeatureId] = useState("")
  const [overrideType, setOverrideType] = useState<"grant" | "revoke">("grant")
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [overridesRes, featuresRes] = await Promise.all([
        fetch(`${apiBase()}/api/subscriptions/schools/${schoolId}/feature-overrides`, { headers: authHeader() }),
        fetch(`${apiBase()}/api/subscriptions/features`, { headers: authHeader() }),
      ])
      const [ov, ft] = await Promise.all([overridesRes.json(), featuresRes.json()])
      if (ov.success) setOverrides(ov.data ?? [])
      if (ft.success) setAllFeatures(ft.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAddOverride = async () => {
    if (!selectedFeatureId) return
    setSaving(true)
    try {
      const res = await fetch(`${apiBase()}/api/subscriptions/schools/${schoolId}/feature-overrides`, {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify({ featureId: selectedFeatureId, granted: overrideType === "grant" }),
      })
      const json = await res.json()
      if (json.success) { await fetchData(); setSelectedFeatureId("") }
      else alert(json.error)
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveOverride = async (featureId: string) => {
    try {
      await fetch(`${apiBase()}/api/subscriptions/schools/${schoolId}/feature-overrides/${featureId}`, {
        method: "DELETE", headers: authHeader(),
      })
      setOverrides((prev) => prev.filter((o) => o.featureId !== featureId))
    } catch { alert("Failed to remove override") }
  }

  const overrideIds = new Set(overrides.map((o) => o.featureId))
  const availableFeatures = allFeatures.filter((f) => !overrideIds.has(f.id))

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sliders className="w-4 h-4" />
          Feature Overrides {schoolName && <span className="text-muted-foreground font-normal">— {schoolName}</span>}
        </CardTitle>
        <CardDescription>
          Manually grant or revoke features for this school. 
          <span className="text-emerald-600 block mt-1">Core features are granted to all schools by default.</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Add override */}
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-40 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Feature</label>
            <Select value={selectedFeatureId} onValueChange={setSelectedFeatureId}>
              <SelectTrigger><SelectValue placeholder="Select a feature…" /></SelectTrigger>
              <SelectContent>
                {availableFeatures.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    <span>{f.name}</span>
                    {f.isCore && <span className="ml-2 text-[10px] text-emerald-600 font-bold">(CORE)</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</label>
            <Select value={overrideType} onValueChange={(v) => setOverrideType(v as "grant" | "revoke")}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grant"><span className="text-emerald-600 font-medium">✓ Force Grant</span></SelectItem>
                <SelectItem value="revoke"><span className="text-destructive font-medium">✗ Force Revoke</span></SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAddOverride} disabled={!selectedFeatureId || saving} className="gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Apply Override
          </Button>
        </div>

        {/* Existing overrides */}
        {overrides.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No manual overrides set. This school uses the default SaaS feature resolution.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Manual Overrides</p>
            {overrides.map((override) => (
              <div key={override.id}
                className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${override.granted ? "border-emerald-500/20 bg-emerald-500/5" : "border-destructive/20 bg-destructive/5"}`}>
                {override.granted
                  ? <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  : <ShieldX className="w-4 h-4 text-destructive flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{override.feature.name}</span>
                  <code className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">{override.feature.key}</code>
                  {override.granted
                    ? <Badge variant="outline" className="ml-2 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Manually Granted</Badge>
                    : <Badge variant="outline" className="ml-2 text-[10px] bg-destructive/10 text-destructive border-destructive/20">Manually Revoked</Badge>}
                </div>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveOverride(override.featureId)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
