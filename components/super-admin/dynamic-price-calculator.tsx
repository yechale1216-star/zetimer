"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Loader2, AlertTriangle, TrendingUp, Settings2, Save, CheckCircle2 } from "lucide-react"
import { getApiUrl } from "@/lib/auth/auth"
import type { AddonSelection, BillingPeriod } from "@/lib/utils/subscription-types"

const PERIODS: { value: BillingPeriod; label: string; discount: string }[] = [
  { value: "monthly",  label: "Monthly",          discount: "" },
  { value: "semester", label: "Semester (6 mo)",  discount: "Save 10%" },
  { value: "yearly",   label: "Yearly (12 mo)",   discount: "Save 20%" },
]

interface DBPlan {
  id: string
  name: string
  slug: string
  pricePerStudentMonthly: number
  pricePerStudentSemester: number
  pricePerStudentYearly: number
  monthlyTotal: number
  semesterTotal: number
  yearlyTotal: number
  maxStudents: number
  maxUsers: number
  isActive: boolean
}

interface DBAddon {
  id: string
  name: string
  description: string | null
  monthlyFlat: number
  perUnit: boolean
  unitLabel: string | null
  isActive: boolean
}

function volumeDiscount(students: number) {
  if (students >= 2000) return 12
  if (students >= 1000) return 8
  if (students >= 500) return 5
  return 0
}

function calcTotal(
  plan: DBPlan, 
  students: number, 
  billing: BillingPeriod, 
  discount: number, 
  addonSelection: AddonSelection[],
  addonsCatalog: DBAddon[]
) {
  const months = billing === "monthly" ? 1 : billing === "semester" ? 6 : 12
  const priceKey = billing === "monthly"
    ? "pricePerStudentMonthly"
    : billing === "semester"
      ? "pricePerStudentSemester"
      : "pricePerStudentYearly"

  const totalKey = billing === "monthly" 
    ? "monthlyTotal" 
    : billing === "semester" 
      ? "semesterTotal" 
      : "yearlyTotal"
  
  const packageTotal = Number(plan[totalKey as keyof DBPlan] || 0)
  const isWithinLimit = plan.maxStudents === -1 || students <= plan.maxStudents
  const volPct = volumeDiscount(students) / 100
  const couponPct = Math.min(100, Math.max(0, discount)) / 100

  let baseAmount = 0
  let label = ""

  if (packageTotal > 0 && isWithinLimit) {
    baseAmount = packageTotal
    label = `${plan.name} Package (Up to ${plan.maxStudents.toLocaleString()} students) × ${months} mo`
  } else {
    // Fallback to per-student calculation if no flat total or limit exceeded
    const rate = Number(plan[priceKey as keyof DBPlan])
    baseAmount = rate * students * months * (1 - volPct)
    label = `${plan.name} · ${students.toLocaleString()} students × ${months} mo`
  }

  const lineItems: { label: string; amount: number }[] = [
    { label, amount: Math.round(baseAmount * 100) / 100 },
  ]

  let addonsTotal = 0
  for (const sel of addonSelection) {
    const def = addonsCatalog.find(a => a.id === sel.id)
    if (!def) continue
    const units = def.perUnit ? Math.max(1, sel.quantity ?? 1) : 1
    const amount = Math.round(Number(def.monthlyFlat) * units * months * 100) / 100
    addonsTotal += amount
    lineItems.push({ label: `${def.name}${def.perUnit ? ` (${units} ${def.unitLabel ?? "units"})` : ""}`, amount })
  }

  const subtotal = lineItems.reduce((s, l) => s + l.amount, 0)
  const discountAmount = Math.round(subtotal * couponPct * 100) / 100
  const total = Math.round((subtotal - discountAmount) * 100) / 100
  const effectiveMonthly = months > 0 ? Math.round((total / months) * 100) / 100 : total

  return { lineItems, subtotal, discountAmount, total, effectiveMonthly, billingMonths: months, volumeDiscountPercent: Math.round(volPct * 100) }
}

export function DynamicPriceCalculator() {
  const [plans, setPlans] = useState<DBPlan[]>([])
  const [addonsCatalog, setAddonsCatalog] = useState<DBAddon[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlanId, setSelectedPlanId] = useState<string>("")
  const [students, setStudents] = useState(250)
  const [billing, setBilling] = useState<BillingPeriod>("monthly")
  const [discount, setDiscount] = useState(0)
  const [addonState, setAddonState] = useState<Record<string, { on: boolean; qty: number }>>({})
  const [isEditingRates, setIsEditingRates] = useState(false)
  const [editedRates, setEditedRates] = useState({ monthly: 0, semester: 0, yearly: 0 })
  const [savingRates, setSavingRates] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("attendance_token")
        const [plansRes, addonsRes] = await Promise.all([
          fetch(`${getApiUrl()}/api/subscriptions/plans`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${getApiUrl()}/api/subscriptions/addons`, { headers: { Authorization: `Bearer ${token}` } })
        ])
        
        const plansJson = await plansRes.json()
        const addonsJson = await addonsRes.json()

        if (plansJson.success) {
          const activePlans = plansJson.data.filter((p: DBPlan) => p.isActive)
          setPlans(activePlans)
          setSelectedPlanId(activePlans[0]?.id ?? "")
        }
        
        if (addonsJson.success) {
          const activeAddons = addonsJson.data.filter((a: DBAddon) => a.isActive)
          setAddonsCatalog(activeAddons)
          
          const initState: Record<string, { on: boolean; qty: number }> = {}
          activeAddons.forEach((a: DBAddon) => {
            initState[a.id] = { on: false, qty: 1 }
          })
          setAddonState(initState)
        }
      } catch (err) {
        console.error("Failed to fetch calculator data:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const selectedPlan = plans.find((p) => p.id === selectedPlanId)

  useEffect(() => {
    if (selectedPlan) {
      setEditedRates({
        monthly: selectedPlan.pricePerStudentMonthly,
        semester: selectedPlan.pricePerStudentSemester,
        yearly: selectedPlan.pricePerStudentYearly
      })
    }
  }, [selectedPlan])

  const handleSaveRates = async () => {
    if (!selectedPlan) return
    setSavingRates(true)
    try {
      const token = localStorage.getItem("attendance_token")
      const res = await fetch(`${getApiUrl()}/api/subscriptions/plans/${selectedPlan.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          pricePerStudentMonthly: editedRates.monthly,
          pricePerStudentSemester: editedRates.semester,
          pricePerStudentYearly: editedRates.yearly
        })
      })
      const json = await res.json()
      if (json.success) {
        // Update local plan state
        setPlans(prev => prev.map(p => p.id === selectedPlan.id ? {
          ...p,
          pricePerStudentMonthly: editedRates.monthly,
          pricePerStudentSemester: editedRates.semester,
          pricePerStudentYearly: editedRates.yearly
        } : p))
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
        setIsEditingRates(false)
      }
    } catch (err) {
      console.error("Failed to save rates:", err)
    } finally {
      setSavingRates(false)
    }
  }

  const addonSelection: AddonSelection[] = useMemo(() => {
    return addonsCatalog
      .filter(a => addonState[a.id]?.on)
      .map(a => ({
        id: a.id as any,
        quantity: a.perUnit ? addonState[a.id].qty : undefined
      }))
  }, [addonState, addonsCatalog])

  const result = useMemo(() => {
    if (!selectedPlan || students < 1) return null
    return calcTotal(selectedPlan, students, billing, discount, addonSelection, addonsCatalog)
  }, [selectedPlan, students, billing, discount, addonSelection, addonsCatalog])

  const atCap = selectedPlan && selectedPlan.maxStudents !== -1 && students > selectedPlan.maxStudents
  const nearCap = selectedPlan && selectedPlan.maxStudents !== -1 && students > selectedPlan.maxStudents * 0.85

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 border rounded-xl bg-muted/5">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading calculator data...</p>
        </div>
      </div>
    )
  }

  return (
    <Card className="border-border/80">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Dynamic pricing calculator</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 h-8 ${isEditingRates ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
            onClick={() => setIsEditingRates(!isEditingRates)}
          >
            <Settings2 className="w-4 h-4" />
            Manage Unit Rates
          </Button>
        </div>
        <CardDescription>
          Live quote based on your plan, billing period, student count, and optional add-ons.
          All prices are fetched live from the database.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isEditingRates && selectedPlan && (
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-4 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-2">
                <Settings2 className="w-3 h-3" /> Unit Calculation Settings ({selectedPlan.name})
              </h4>
              <div className="flex items-center gap-2">
                {saveSuccess && (
                  <span className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Rates Saved
                  </span>
                )}
                <Button size="sm" className="h-7 text-[10px] gap-1.5" onClick={handleSaveRates} disabled={savingRates}>
                  {savingRates ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Save className="w-2.5 h-2.5" />}
                  Save Rates
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px]">Monthly (ETB/Student)</Label>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  value={editedRates.monthly}
                  onChange={(e) => setEditedRates({ ...editedRates, monthly: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px]">Semester (ETB/Student)</Label>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  value={editedRates.semester}
                  onChange={(e) => setEditedRates({ ...editedRates, semester: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px]">Yearly (ETB/Student)</Label>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  value={editedRates.yearly}
                  onChange={(e) => setEditedRates({ ...editedRates, yearly: Number(e.target.value) })}
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              These rates power the dynamic quote calculation when student count exceeds the plan's flat-rate limit.
            </p>
          </div>
        )}

        {plans.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            No active plans found. Please configure plans in the <strong>Plans</strong> tab.
          </div>
        ) : (
          <>
            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Plan</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {selectedPlan && (
                  <p className="text-[11px] text-muted-foreground">
                    Max: {selectedPlan.maxStudents === -1 ? "Unlimited" : selectedPlan.maxStudents.toLocaleString()} students 
                    {" · "} 
                    {selectedPlan.maxUsers === -1 ? "Unlimited" : selectedPlan.maxUsers.toLocaleString()} users
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Active students</Label>
                <Input
                  type="number"
                  min={1}
                  value={students}
                  onChange={(e) => setStudents(Math.max(1, Number(e.target.value)))}
                  className={atCap ? "border-destructive" : nearCap ? "border-amber-500" : ""}
                />
                {atCap && (
                  <p className="text-[11px] text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Exceeds plan limit of {selectedPlan?.maxStudents.toLocaleString()}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Billing period</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={billing}
                  onChange={(e) => setBilling(e.target.value as BillingPeriod)}
                >
                  {PERIODS.map(({ value, label, discount }) => (
                    <option key={value} value={value}>
                      {label}{discount ? ` — ${discount}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Discount %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Plan pricing reference */}
            {selectedPlan && (
              <div className="grid grid-cols-3 gap-2">
                {PERIODS.map(({ value, label }) => {
                  const totalKey = value === "monthly" ? "monthlyTotal" : value === "semester" ? "semesterTotal" : "yearlyTotal"
                  const total = Number(selectedPlan[totalKey as keyof DBPlan] || 0)
                  return (
                    <div
                      key={value}
                      onClick={() => setBilling(value)}
                      className={`text-center p-2 rounded-lg border cursor-pointer transition-all text-sm ${billing === value ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"}`}
                    >
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">{label}</p>
                      <p className="font-bold mt-0.5">{total.toLocaleString()} ETB</p>
                      <p className="text-[10px] text-muted-foreground">package price</p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add-ons */}
            {addonsCatalog.length > 0 && (
              <div className="space-y-3">
                <Label>Optional add-ons</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {addonsCatalog.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={addonState[a.id]?.on}
                          onCheckedChange={(on) => setAddonState((prev) => ({ ...prev, [a.id]: { ...prev[a.id], on } }))}
                        />
                        <div>
                          <span className="text-sm font-medium">{a.name}</span>
                          <p className="text-[11px] text-muted-foreground">{Number(a.monthlyFlat).toLocaleString()} ETB/mo</p>
                        </div>
                      </div>
                      {a.perUnit && addonState[a.id]?.on && (
                        <Input
                          className="w-20 h-8"
                          type="number"
                          min={1}
                          value={addonState[a.id].qty}
                          onChange={(e) =>
                            setAddonState((prev) => ({ ...prev, [a.id]: { ...prev[a.id], qty: Math.max(1, Number(e.target.value)) } }))
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex flex-wrap gap-2 items-center">
                  {result.volumeDiscountPercent > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Volume discount: {result.volumeDiscountPercent}%
                    </Badge>
                  )}
                  {discount > 0 && <Badge variant="secondary">Discount: {discount}%</Badge>}
                </div>

                <div className="space-y-1.5">
                  {result.lineItems.map((row, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-medium">ETB {row.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  {result.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount applied</span>
                      <span>−ETB {result.discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-baseline border-t border-border/60 pt-3">
                  <span className="font-bold text-base">Total ({result.billingMonths} mo)</span>
                  <span className="text-xl font-bold text-primary">ETB {result.total.toLocaleString()}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Effective monthly: <strong>ETB {result.effectiveMonthly.toLocaleString()}</strong>
                  {" · "}
                  Per student/mo: <strong>ETB {students > 0 ? Math.round(result.effectiveMonthly / students).toLocaleString() : "—"}</strong>
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
