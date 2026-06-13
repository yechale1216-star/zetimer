"use client"

import React, { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Plus, Edit, Trash2, Check, X, Loader2, Layers, Users, DollarSign,
  ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Calendar, GraduationCap
} from "lucide-react"
import { getApiUrl } from "@/lib/api-config"
import { cn } from "@/lib/utils/utils"
import { notifications } from "@/lib/utils/notifications"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Feature {
  id: string
  key: string
  name: string
  description?: string
  category: string
  isActive: boolean
}

interface PlanFeature {
  id: string
  featureId: string
  feature: Feature
}

interface SubscriptionPlan {
  id: string
  name: string
  slug: string
  description?: string
  pricePerStudentMonthly: number
  pricePerStudentSemester: number
  pricePerStudentYearly: number
  monthlyTotal: number
  semesterTotal: number
  yearlyTotal: number
  maxStudents: number
  maxUsers: number
  trialDays: number
  isActive: boolean
  isCustom: boolean
  sortOrder: number
  _count?: { subscriptions: number }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const apiBase = () => getApiUrl()
const authHeader = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("attendance_token")}`,
})

const getTierColor = (slug: string) => ({
  starter: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  medium: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  premium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  enterprise: "bg-rose-500/10 text-rose-600 border-rose-500/20",
}[slug] ?? "bg-muted text-muted-foreground border-border")

// ─── Edit Plan Dialog ─────────────────────────────────────────────────────────

interface EditPlanDialogProps {
  plan?: SubscriptionPlan | null
  onSave: () => void
  onClose: () => void
}

function EditPlanDialog({ plan, onSave, onClose }: EditPlanDialogProps) {
  const isNew = !plan
  const [form, setForm] = useState({
    name: plan?.name ?? "",
    slug: plan?.slug ?? "",
    description: plan?.description ?? "",
    pricePerStudentMonthly: plan?.pricePerStudentMonthly ?? 0,
    pricePerStudentSemester: plan?.pricePerStudentSemester ?? 0,
    pricePerStudentYearly: plan?.pricePerStudentYearly ?? 0,
    monthlyTotal: plan?.monthlyTotal ?? 0,
    semesterTotal: plan?.semesterTotal ?? 0,
    yearlyTotal: plan?.yearlyTotal ?? 0,
    maxStudents: plan?.maxStudents ?? 250,
    maxUsers: plan?.maxUsers ?? 15,
    trialDays: plan?.trialDays ?? 14,
    isActive: plan?.isActive ?? true,
    isCustom: plan?.isCustom ?? false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const handleSave = async () => {
    if (!form.name || !form.slug) { setError("Name and slug are required"); return }
    setSaving(true); setError("")
    try {
      let planId = plan?.id
      if (isNew) {
        const res = await fetch(`${apiBase()}/api/subscriptions/plans`, {
          method: "POST", headers: authHeader(), body: JSON.stringify(form),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error)
      } else {
        const res = await fetch(`${apiBase()}/api/subscriptions/plans/${planId}`, {
          method: "PUT", headers: authHeader(), body: JSON.stringify(form),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error)
      }

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
      <div className="bg-card border border-border/60 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold">{isNew ? "Create New Plan" : `Edit: ${plan.name}`}</h2>
          <p className="text-sm text-muted-foreground mt-1">Configure pricing and capacity limits</p>
        </div>
        <div className="p-6 space-y-6">
          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>}

          {/* Basics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Plan Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Standard" />
            </div>
            <div className="space-y-1.5">
              <Label>Slug (unique ID)</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} placeholder="e.g. standard" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief plan description" />
          </div>

          {/* Pricing Totals — only for paid plans */}
          {form.slug !== 'free' ? (
            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4 text-muted-foreground" /> Package Totals (Flat Rates)</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Monthly", key: "monthlyTotal" },
                  { label: "Semester", key: "semesterTotal" },
                  { label: "Yearly", key: "yearlyTotal" },
                ].map(({ label, key }) => (
                  <div key={key} className="space-y-1.5">
                    <Label>{label}</Label>
                    <div className="relative">
                      <Input type="number" className="pr-8" value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} min={0} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">ETB</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /> Free Trial Settings</h3>
              <div className="space-y-1.5">
                <Label>Trial Duration (days)</Label>
                <Input type="number" value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: Number(e.target.value) })} min={1} />
              </div>
            </div>
          )}

          {/* Limits */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Max Students (-1 = ♾️)</Label>
              <Input type="number" value={form.maxStudents} onChange={(e) => setForm({ ...form, maxStudents: Number(e.target.value) })} min={-1} />
            </div>
            <div className="space-y-1.5">
              <Label>Max Users (-1 = ♾️)</Label>
              <Input type="number" value={form.maxUsers} onChange={(e) => setForm({ ...form, maxUsers: Number(e.target.value) })} min={-1} />
            </div>
          </div>

          <div className="flex items-center gap-4 py-2">
            <div className="flex items-center gap-3 flex-1">
              <Label>Status</Label>
              <button onClick={() => setForm({ ...form, isActive: !form.isActive })} className={`w-10 h-6 rounded-full transition-colors relative ${form.isActive ? "bg-primary" : "bg-muted"}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${form.isActive ? "translate-x-5" : "translate-x-1"}`} />
              </button>
              <span className="text-xs text-muted-foreground">{form.isActive ? "Active" : "Inactive"}</span>
            </div>
            <div className="flex items-center gap-3">
              <Label>Custom Plan</Label>
              <button onClick={() => setForm({ ...form, isCustom: !form.isCustom })} className={`w-10 h-6 rounded-full transition-colors relative ${form.isCustom ? "bg-amber-500" : "bg-muted"}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${form.isCustom ? "translate-x-5" : "translate-x-1"}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isNew ? "Create Plan" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

interface PlanCardProps {
  plan: SubscriptionPlan
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}

function PlanCard({ plan, onEdit, onDelete, onToggle }: PlanCardProps) {
  const subscriptions = plan._count?.subscriptions ?? 0
  const isFree = plan.slug === 'free' || (Number(plan.monthlyTotal) === 0 && Number(plan.semesterTotal) === 0 && Number(plan.yearlyTotal) === 0)

  return (
    <Card 
      className={cn(
        "transition-all duration-300 relative overflow-hidden cursor-pointer",
        "border-border/60 hover:border-primary hover:ring-2 hover:ring-primary/20 hover:shadow-lg hover:shadow-primary/20 dark:hover:shadow-primary/10",
        !plan.isActive && "opacity-60"
      )}
      onClick={onEdit}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base font-bold">{plan.name}</CardTitle>
              <Badge variant="outline" className={`text-[10px] uppercase ${getTierColor(plan.slug)}`}>{plan.slug}</Badge>
              {plan.isCustom && <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 bg-amber-500/5">Custom</Badge>}
              {!plan.isActive && <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>}
            </div>
            {plan.description && <CardDescription className="mt-1 text-xs truncate max-w-[200px]">{plan.description}</CardDescription>}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); onToggle(); }} title={plan.isActive ? "Deactivate" : "Activate"}>
              {plan.isActive ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); onEdit(); }}><Edit className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }} disabled={subscriptions > 0 || plan.slug === 'free'} title={plan.slug === 'free' ? "System plan cannot be deleted" : subscriptions > 0 ? "Has active subscriptions" : "Delete"}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5 pb-3">
        {/* Pricing table — only for paid plans */}
        {isFree ? (
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-green-500/5 rounded-lg p-1.5 border border-green-500/10">
              <p className="text-[9px] text-muted-foreground uppercase font-semibold tracking-tight">Max Students</p>
              <p className="text-xs font-bold text-green-600 dark:text-green-400 mt-0.5">{plan.maxStudents === -1 ? '♾️' : plan.maxStudents}</p>
            </div>
            <div className="bg-green-500/5 rounded-lg p-1.5 border border-green-500/10">
              <p className="text-[9px] text-muted-foreground uppercase font-semibold tracking-tight">Max Users</p>
              <p className="text-xs font-bold text-green-600 dark:text-green-400 mt-0.5">{plan.maxUsers === -1 ? '♾️' : plan.maxUsers}</p>
            </div>
            <div className="bg-green-500/5 rounded-lg p-1.5 border border-green-500/10">
              <p className="text-[9px] text-muted-foreground uppercase font-semibold tracking-tight">Trial Days</p>
              <p className="text-xs font-bold text-green-600 dark:text-green-400 mt-0.5">{plan.trialDays ?? 14}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 text-center">
            {[
              { label: "Monthly", price: plan.monthlyTotal },
              { label: "Semester", price: plan.semesterTotal },
              { label: "Yearly", price: plan.yearlyTotal },
            ].map(({ label, price }) => (
              <div key={label} className="bg-primary/5 rounded-lg p-1.5 border border-primary/10">
                <p className="text-[9px] text-muted-foreground uppercase font-semibold tracking-tight">{label}</p>
                <p className="text-xs font-bold text-primary mt-0.5">{Number(price).toLocaleString()} ETB</p>
                <p className="text-[8px] text-primary/60 font-medium tracking-tight">Package</p>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="space-y-2 pt-0.5">
          <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs text-foreground/80">
            <div className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded-md">
              <Users className="w-3 h-3 text-muted-foreground" />
              <span className="font-semibold">{plan.maxStudents === -1 ? "♾️" : plan.maxStudents.toLocaleString()}</span> Students
            </div>
            <div className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded-md">
              <Plus className="w-3 h-3 text-muted-foreground" />
              <span className="font-semibold">{plan.maxUsers === -1 ? "♾️" : plan.maxUsers.toLocaleString()}</span> Teachers
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/50 pt-1.5">
            <span className="flex items-center gap-1"><Check className="w-2.5 h-2.5 text-green-500" /> Core Features</span>
            <Badge variant="secondary" className="text-[8px] font-normal px-1 h-3.5 leading-none">{subscriptions} schools</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Plan Manager ────────────────────────────────────────────────────────

export function PlanManager() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [allFeatures, setAllFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null | undefined>(undefined) // undefined = closed, null = new
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [plansRes, featuresRes] = await Promise.all([
        fetch(`${apiBase()}/api/subscriptions/plans`, { headers: authHeader() }),
        fetch(`${apiBase()}/api/subscriptions/features`, { headers: authHeader() }),
      ])
      const [plansJson, featuresJson] = await Promise.all([plansRes.json(), featuresRes.json()])
      if (plansJson.success) setPlans(plansJson.data)
      if (featuresJson.success) setAllFeatures(featuresJson.data)
    } catch {
      setError("Failed to load plans")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDelete = async (plan: SubscriptionPlan) => {
    if (!window.confirm(`Delete plan "${plan.name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`${apiBase()}/api/subscriptions/plans/${plan.id}`, { method: "DELETE", headers: authHeader() })
      const json = await res.json()
      if (json.success) {
        setPlans((prev) => prev.filter((p) => p.id !== plan.id));
        notifications.success("Success", "Plan deleted successfully");
      } else {
        notifications.error("Delete Failed", json.error || "Failed to delete plan");
      }
    } catch (e: any) {
      notifications.error("Error", e.message || "An unexpected error occurred");
    }
  }

  const handleToggle = async (plan: SubscriptionPlan) => {
    try {
      const res = await fetch(`${apiBase()}/api/subscriptions/plans/${plan.id}`, {
        method: "PUT", headers: authHeader(), body: JSON.stringify({ isActive: !plan.isActive }),
      })
      const json = await res.json()
      if (json.success) {
        setPlans((prev) => prev.map((p) => p.id === plan.id ? { ...p, isActive: !p.isActive } : p));
        notifications.success("Success", `Plan ${!plan.isActive ? 'activated' : 'deactivated'}`);
      } else {
        notifications.error("Update Failed", json.error || "Failed to update plan");
      }
    } catch {
      notifications.error("Error", "Failed to update plan status");
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="space-y-6">
      {editingPlan !== undefined && (
        <EditPlanDialog
          plan={editingPlan}
          onSave={fetchData}
          onClose={() => setEditingPlan(undefined)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Subscription Plans</h2>
          <p className="text-sm text-muted-foreground mt-1">{plans.length} plans · {plans.filter(p => p.isActive).length} active</p>
        </div>
        <Button onClick={() => setEditingPlan(null)} className="gap-2">
          <Plus className="w-4 h-4" /> New Plan
        </Button>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onEdit={() => setEditingPlan(plan)}
            onDelete={() => handleDelete(plan)}
            onToggle={() => handleToggle(plan)}
          />
        ))}
      </div>

      {plans.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <Layers className="w-10 h-10 opacity-30" />
            <p>No plans yet. Create your first plan above.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
