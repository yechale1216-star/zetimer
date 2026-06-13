"use client"

import React, { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Loader2, Package, Save, Trash2, Plus } from "lucide-react"
import { getApiUrl } from "@/lib/api-config"

interface Addon {
  id: string
  name: string
  monthlyFlat: number
  perUnit: boolean
  unitLabel: string | null
}

interface SchoolAddon {
  id: string
  addonId: string
  quantity: number
  isActive: boolean
  addon: Addon
}

export function SchoolAddonsTab({ schoolId }: { schoolId: string }) {
  const [availableAddons, setAvailableAddons] = useState<Addon[]>([])
  const [schoolAddons, setSchoolAddons] = useState<SchoolAddon[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem("attendance_token")
      const [allRes, subRes] = await Promise.all([
        fetch(`${getApiUrl()}/api/subscriptions/addons`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${getApiUrl()}/api/subscriptions/schools/${schoolId}/addons`, { headers: { Authorization: `Bearer ${token}` } })
      ])
      
      const allJson = await allRes.json()
      const subJson = await subRes.json()

      if (allJson.success) setAvailableAddons(allJson.data.filter((a: any) => a.isActive))
      if (subJson.success) setSchoolAddons(subJson.data)
    } catch (err) {
      console.error("Failed to load school addons:", err)
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => { fetchData() }, [fetchData])

  const handleUpsert = async (addonId: string, quantity: number, isActive: boolean) => {
    setSavingId(addonId)
    try {
      const token = localStorage.getItem("attendance_token")
      const res = await fetch(`${getApiUrl()}/api/subscriptions/schools/${schoolId}/addons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ addonId, quantity, isActive })
      })
      const json = await res.json()
      if (json.success) {
        await fetchData()
      } else {
        alert(json.error)
      }
    } catch {
      alert("Failed to save addon")
    } finally {
      setSavingId(null)
    }
  }

  const handleRemove = async (addonId: string) => {
    if (!window.confirm("Remove this add-on from the school?")) return
    setSavingId(addonId)
    try {
      const token = localStorage.getItem("attendance_token")
      const res = await fetch(`${getApiUrl()}/api/subscriptions/schools/${schoolId}/addons/${addonId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })
      const json = await res.json()
      if (json.success) {
        await fetchData()
      }
    } catch {
      alert("Failed to remove addon")
    } finally {
      setSavingId(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  )

  const activeAddonIds = new Set(schoolAddons.map(sa => sa.addonId))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Add-ons */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4" /> Active for this school
            </CardTitle>
            <CardDescription>Manually assigned add-ons and their monthly impact.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {schoolAddons.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6 border-2 border-dashed rounded-xl">
                No add-ons assigned to this school yet.
              </p>
            ) : (
              <div className="space-y-3">
                {schoolAddons.map((sa) => (
                  <div key={sa.id} className="p-3 border rounded-lg bg-card space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold">{sa.addon.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">
                          {sa.addon.perUnit ? `Per ${sa.addon.unitLabel}` : "Flat rate"}
                        </p>
                      </div>
                      <Badge variant="outline" className={sa.isActive ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-muted-foreground"}>
                        {sa.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4">
                      {sa.addon.perUnit && (
                        <div className="flex-1 space-y-1">
                          <Label className="text-[10px]">Quantity</Label>
                          <Input 
                            type="number" 
                            min={1} 
                            value={sa.quantity} 
                            disabled={savingId === sa.addonId}
                            onChange={(e) => handleUpsert(sa.addonId, Number(e.target.value), sa.isActive)}
                            className="h-8"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-4">
                        <Label className="text-[10px]">Status</Label>
                        <Switch 
                          checked={sa.isActive} 
                          disabled={savingId === sa.addonId}
                          onCheckedChange={(on) => handleUpsert(sa.addonId, sa.quantity, on)}
                        />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-destructive mt-4" 
                        onClick={() => handleRemove(sa.addonId)}
                        disabled={savingId === sa.addonId}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available to Add */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Available add-ons</CardTitle>
            <CardDescription>Select an add-on to assign to this school.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableAddons
              .filter(a => !activeAddonIds.has(a.id))
              .map((addon) => (
                <div key={addon.id} className="flex items-center justify-between p-3 border rounded-lg hover:border-primary/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{addon.name}</p>
                    <p className="text-[10px] text-muted-foreground font-bold">
                      {Number(addon.monthlyFlat).toLocaleString()} ETB / mo
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="gap-1.5"
                    disabled={savingId === addon.id}
                    onClick={() => handleUpsert(addon.id, 1, true)}
                  >
                    {savingId === addon.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Assign
                  </Button>
                </div>
              ))}
            
            {availableAddons.filter(a => !activeAddonIds.has(a.id)).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6 italic">No more add-ons available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary / Total Impact */}
      {schoolAddons.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Total Add-on Impact</p>
              <p className="text-lg font-bold text-primary">
                ETB {schoolAddons.reduce((sum, sa) => {
                  if (!sa.isActive) return sum
                  return sum + (Number(sa.addon.monthlyFlat) * sa.quantity)
                }, 0).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">/ month</span>
              </p>
            </div>
            <Package className="w-8 h-8 text-primary/20" />
          </CardContent>
        </Card>
      )}
    </div>
  )
}


