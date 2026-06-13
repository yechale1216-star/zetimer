"use client"

import React, { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Edit, Trash2, Loader2, Tag, Search } from "lucide-react"
import { getApiUrl } from "@/lib/api-config"
import { notifications } from "@/lib/utils/notifications"

interface Feature {
  id: string
  key: string
  name: string
  description?: string
  category: string
  isActive: boolean
}

const CATEGORIES = ["core", "reporting", "communication", "admin", "general"]

const getCategoryColor = (cat: string) => ({
  core: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  reporting: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  communication: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  admin: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  general: "bg-muted text-muted-foreground border-border",
}[cat] ?? "bg-muted text-muted-foreground border-border")

const apiBase = () => getApiUrl()
const authHeader = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("attendance_token")}`,
})

// ─── Feature Edit Dialog ──────────────────────────────────────────────────────

interface FeatureDialogProps {
  feature?: Feature | null
  onSave: () => void
  onClose: () => void
}

function FeatureDialog({ feature, onSave, onClose }: FeatureDialogProps) {
  const isNew = !feature
  const [form, setForm] = useState({
    key: feature?.key ?? "",
    name: feature?.name ?? "",
    description: feature?.description ?? "",
    category: feature?.category ?? "general",
    isActive: feature?.isActive ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const handleSave = async () => {
    if (!form.key || !form.name) { setError("Key and name are required"); return }
    setSaving(true); setError("")
    try {
      const url = isNew
        ? `${apiBase()}/api/subscriptions/features`
        : `${apiBase()}/api/subscriptions/features/${feature.id}`
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

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card border border-border/60 rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-bold">{isNew ? "New Feature" : `Edit: ${feature.name}`}</h2>
        </div>
        <div className="p-6 space-y-4">
          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>}
          <div className="space-y-1.5">
            <Label>Feature Key <span className="text-muted-foreground text-xs">(unique identifier, no spaces)</span></Label>
            <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase().replace(/\s+/g, "_") })} placeholder="e.g. messaging" disabled={!isNew} />
          </div>
          <div className="space-y-1.5">
            <Label>Display Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. In-App Messaging" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe what this feature does" />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <select className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
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
            {isNew ? "Create Feature" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Feature Catalog ─────────────────────────────────────────────────────

export function FeatureCatalog() {
  const [features, setFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [editingFeature, setEditingFeature] = useState<Feature | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  const fetchFeatures = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${apiBase()}/api/subscriptions/features`, { headers: authHeader() })
      const json = await res.json()
      if (json.success) setFeatures(json.data)
      else setError(json.error)
    } catch {
      setError("Failed to load features")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFeatures() }, [fetchFeatures])

  const handleDelete = async (feature: Feature) => {
    if (!window.confirm(`Delete feature "${feature.name}"? This removes it from all plans.`)) return
    try {
      const res = await fetch(`${apiBase()}/api/subscriptions/features/${feature.id}`, { method: "DELETE", headers: authHeader() })
      const json = await res.json()
      if (json.success) {
        setFeatures((prev) => prev.filter((f) => f.id !== feature.id));
        notifications.success("Success", "Feature deleted successfully");
      } else {
        notifications.error("Delete Failed", json.error || "Failed to delete feature");
      }
    } catch { 
      notifications.error("Error", "Failed to delete feature");
    }
  }

  const handleToggle = async (feature: Feature) => {
    try {
      const res = await fetch(`${apiBase()}/api/subscriptions/features/${feature.id}`, {
        method: "PUT", headers: authHeader(), body: JSON.stringify({ isActive: !feature.isActive }),
      })
      const json = await res.json()
      if (json.success) {
        setFeatures((prev) => prev.map((f) => f.id === feature.id ? { ...f, isActive: !f.isActive } : f));
        notifications.success("Success", `Feature ${!feature.isActive ? 'activated' : 'deactivated'}`);
      } else {
        notifications.error("Update Failed", json.error || "Failed to update feature");
      }
    } catch { 
      notifications.error("Error", "Failed to update feature");
    }
  }

  const filtered = features.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.key.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === "all" || f.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const grouped = filtered.reduce<Record<string, Feature[]>>((acc, f) => {
    acc[f.category] = acc[f.category] ?? []
    acc[f.category].push(f)
    return acc
  }, {})

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="space-y-6">
      {editingFeature !== undefined && (
        <FeatureDialog feature={editingFeature} onSave={fetchFeatures} onClose={() => setEditingFeature(undefined)} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Feature Catalog</h2>
          <p className="text-sm text-muted-foreground mt-1">{features.length} features across {Object.keys(grouped).length} categories</p>
        </div>
        <Button onClick={() => setEditingFeature(null)} className="gap-2">
          <Plus className="w-4 h-4" /> New Feature
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search features…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="px-3 py-2 rounded-lg border border-border bg-background text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
        </select>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {/* Features by category */}
      {Object.entries(grouped).map(([category, feats]) => (
        <Card key={category}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Tag className="w-4 h-4" />
              {category}
              <Badge variant="secondary" className="text-[10px]">{feats.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {feats.map((f) => (
                <div key={f.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{f.name}</span>
                      <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">{f.key}</code>
                      <Badge variant="outline" className={`text-[10px] ${getCategoryColor(f.category)}`}>{f.category}</Badge>
                      {!f.isActive && <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>}
                    </div>
                    {f.description && <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleToggle(f)} className={`w-8 h-5 rounded-full transition-colors relative ${f.isActive ? "bg-primary" : "bg-muted"}`}>
                      <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-transform ${f.isActive ? "translate-x-4" : "translate-x-1"}`} />
                    </button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setEditingFeature(f)}><Edit className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(f)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {filtered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-3">
            <Tag className="w-8 h-8 opacity-30" />
            <p className="text-sm">No features match your filters.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
