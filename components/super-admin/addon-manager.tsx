"use client"

import React, { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Edit, Trash2, Loader2, Package, Search } from "lucide-react"
import { getApiUrl } from "@/lib/auth/auth"

interface Addon {
  id: string
  name: string
  description?: string
  monthlyFlat: number
  perUnit: boolean
  unitLabel?: string
  featureKey?: string
  isActive: boolean
}

interface Feature {
  id: string
  key: string
  name: string
  isCore: boolean
}

const apiBase = () => getApiUrl()
const authHeader = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("attendance_token")}`,
})

// ─── Addon Edit Dialog ───────────────────────────────────────────────────────

interface AddonDialogProps {
  addon?: Addon | null
  allFeatures: Feature[]
  onSave: () => void
  onClose: () => void
}

function AddonDialog({ addon, allFeatures, onSave, onClose }: AddonDialogProps) {
  const isNew = !addon
  const [form, setForm] = useState({
    name: addon?.name ?? "",
    description: addon?.description ?? "",
    monthlyFlat: addon?.monthlyFlat ? Number(addon.monthlyFlat) : 0,
    perUnit: addon?.perUnit ?? false,
    unitLabel: addon?.unitLabel ?? "",
    featureKey: addon?.featureKey ?? "",
    isActive: addon?.isActive ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const handleSave = async () => {
    if (!form.name) { setError("Name is required"); return }
    setSaving(true); setError("")
    try {
      const url = isNew
        ? `${apiBase()}/api/subscriptions/addons`
        : `${apiBase()}/api/subscriptions/addons/${addon.id}`
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: authHeader(),
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      onSave()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // Only show features that aren't core
  const addonableFeatures = allFeatures.filter(f => !f.isCore)

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card border border-border/60 rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-bold">{isNew ? "New Add-on" : `Edit: ${addon.name}`}</h2>
        </div>
        <div className="p-6 space-y-4">
          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>}
          
          <div className="space-y-1.5">
            <Label>Display Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. SMS package" />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe this add-on" />
          </div>

          <div className="space-y-1.5">
            <Label>Associated Feature Key (Optional)</Label>
            <select 
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
              value={form.featureKey}
              onChange={(e) => setForm({ ...form, featureKey: e.target.value })}
            >
              <option value="">No feature linkage</option>
              {addonableFeatures.map(f => (
                <option key={f.id} value={f.key}>{f.name} ({f.key})</option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">Linking an add-on to a feature key automatically unlocks that feature for the school upon purchase.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Monthly Rate (ETB)</Label>
              <Input type="number" value={form.monthlyFlat} onChange={(e) => setForm({ ...form, monthlyFlat: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Billing Type</Label>
              <select 
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                value={form.perUnit ? "unit" : "flat"}
                onChange={(e) => setForm({ ...form, perUnit: e.target.value === "unit" })}
              >
                <option value="flat">Flat rate</option>
                <option value="unit">Per unit</option>
              </select>
            </div>
          </div>

          {form.perUnit && (
            <div className="space-y-1.5">
              <Label>Unit Label</Label>
              <Input value={form.unitLabel} onChange={(e) => setForm({ ...form, unitLabel: e.target.value })} placeholder="e.g. branch, 100 GB block" />
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Label>Active</Label>
            <button onClick={() => setForm({ ...form, isActive: !form.isActive })} className={`w-10 h-6 rounded-full transition-colors relative ${form.isActive ? "bg-primary" : "bg-muted"}`}>
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${form.isActive ? "translate-x-5" : "translate-x-1"}`} />
            </button>
          </div>
        </div>
        <div className="p-6 border-t border-border flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isNew ? "Create Add-on" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Add-on Manager ─────────────────────────────────────────────────────

export function AddonManager() {
  const [addons, setAddons] = useState<Addon[]>([])
  const [allFeatures, setAllFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [editingAddon, setEditingAddon] = useState<Addon | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [addonsRes, featuresRes] = await Promise.all([
        fetch(`${apiBase()}/api/subscriptions/addons`, { headers: authHeader() }),
        fetch(`${apiBase()}/api/subscriptions/features`, { headers: authHeader() }),
      ])
      const [addonsJson, featuresJson] = await Promise.all([addonsRes.json(), featuresRes.json()])
      if (addonsJson.success) setAddons(addonsJson.data)
      if (featuresJson.success) setAllFeatures(featuresJson.data)
      if (!addonsJson.success) setError(addonsJson.error)
    } catch {
      setError("Failed to load catalog data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDelete = async (addon: Addon) => {
    if (!window.confirm(`Delete add-on "${addon.name}"?`)) return
    try {
      const res = await fetch(`${apiBase()}/api/subscriptions/addons/${addon.id}`, { method: "DELETE", headers: authHeader() })
      const json = await res.json()
      if (json.success) setAddons((prev) => prev.filter((a) => a.id !== addon.id))
      else alert(json.error)
    } catch { alert("Failed to delete add-on") }
  }

  const handleToggle = async (addon: Addon) => {
    try {
      const res = await fetch(`${apiBase()}/api/subscriptions/addons/${addon.id}`, {
        method: "PUT", headers: authHeader(), body: JSON.stringify({ isActive: !addon.isActive }),
      })
      const json = await res.json()
      if (json.success) setAddons((prev) => prev.map((a) => a.id === addon.id ? { ...a, isActive: !a.isActive } : a))
    } catch { alert("Failed to update add-on") }
  }

  const filtered = addons.filter((a) => 
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.description?.toLowerCase().includes(search.toLowerCase()) ||
    a.featureKey?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="space-y-6">
      {editingAddon !== undefined && (
        <AddonDialog addon={editingAddon} allFeatures={allFeatures} onSave={fetchData} onClose={() => setEditingAddon(undefined)} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Optional Add-ons</h2>
          <p className="text-sm text-muted-foreground mt-1">{addons.length} items in catalog</p>
        </div>
        <Button onClick={() => setEditingAddon(null)} className="gap-2">
          <Plus className="w-4 h-4" /> New Add-on
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search add-ons or feature keys…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((addon) => (
          <Card key={addon.id} className={!addon.isActive ? "opacity-60 bg-muted/20" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-4 h-4 text-primary" />
                    <span className="font-bold">{addon.name}</span>
                    {!addon.isActive && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                  </div>
                  {addon.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{addon.description}</p>}
                  
                  {addon.featureKey && (
                    <div className="mb-3">
                      <Badge variant="secondary" className="text-[10px] py-0 h-5 font-normal border-primary/20 text-primary">Unlocks: {addon.featureKey}</Badge>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Rate</p>
                      <p className="text-sm font-bold">{Number(addon.monthlyFlat).toLocaleString()} ETB/mo</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Type</p>
                      <p className="text-sm">{addon.perUnit ? `Per ${addon.unitLabel}` : "Flat rate"}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button onClick={() => handleToggle(addon)} className={`w-8 h-5 rounded-full transition-colors relative self-end ${addon.isActive ? "bg-primary" : "bg-muted"}`}>
                    <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-transform ${addon.isActive ? "translate-x-4" : "translate-x-1"}`} />
                  </button>
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setEditingAddon(addon)}><Edit className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(addon)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <Card className="md:col-span-2">
            <CardContent className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-3">
              <Package className="w-8 h-8 opacity-30" />
              <p className="text-sm">No add-ons found.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
