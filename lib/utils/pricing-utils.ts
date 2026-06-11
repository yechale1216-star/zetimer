import type {
  AddonId,
  AddonSelection,
  BillingPeriod,
  DynamicPriceBreakdown,
  DynamicPriceInput,
  PlanUpgradeRecommendation,
  TierPlan,
} from "@/lib/utils/subscription-types"

// ---------------------------------------------------------------------------
// Tier configuration (per active student / month, in ETB)
// ---------------------------------------------------------------------------

export const TIER_CONFIG: Record<
  TierPlan,
  { label: string; basePerStudentMonth: number; maxStudentsSoft: number; description: string }
> = {
  free: {
    label: "Free Trial",
    basePerStudentMonth: 0,
    maxStudentsSoft: 50,
    description: "Trial for new schools",
  },
  starter: {
    label: "Starter",
    basePerStudentMonth: 150,
    maxStudentsSoft: 250,
    description: "Core attendance & reporting",
  },
  standard: {
    label: "Standard",
    basePerStudentMonth: 250,
    maxStudentsSoft: 600,
    description: "Advanced analytics & integrations",
  },
  premium: {
    label: "Premium",
    basePerStudentMonth: 400,
    maxStudentsSoft: 2000,
    description: "Priority workflows & API access",
  },
  enterprise: {
    label: "Enterprise",
    basePerStudentMonth: 600,
    maxStudentsSoft: Number.POSITIVE_INFINITY,
    description: "Dedicated limits & custom SLAs",
  },
}

const BILLING: Record<BillingPeriod, { months: number; label: string; discount: number }> = {
  monthly: { months: 1, label: "Monthly", discount: 0 },
  semester: { months: 6, label: "Semester (6 mo)", discount: 10 },
  yearly: { months: 12, label: "Yearly (12 mo)", discount: 20 },
}

/** Optional add-ons: flat monthly ETB */
export const ADDON_CATALOG: Record<
  AddonId,
  { name: string; monthlyFlat: number; perUnit?: boolean; unitLabel?: string }
> = {
  sms_package: { name: "SMS package", monthlyFlat: 2500 },
  white_label: { name: "White label branding", monthlyFlat: 10000 },
  extra_branches: { name: "Extra branches", monthlyFlat: 4000, perUnit: true, unitLabel: "branch" },
  custom_domain: { name: "Custom domain", monthlyFlat: 1300 },
  priority_support: { name: "Priority support", monthlyFlat: 5000 },
  additional_storage: { name: "Additional storage", monthlyFlat: 1500, perUnit: true, unitLabel: "100 GB block" },
}

/** Volume discount on student line only */
export function volumeDiscountPercent(studentCount: number): number {
  if (studentCount >= 2000) return 12
  if (studentCount >= 1000) return 8
  if (studentCount >= 500) return 5
  return 0
}

export function calculateDynamicPrice(
  input: DynamicPriceInput,
  options?: { 
    tierBaseOverrides?: Partial<Record<TierPlan, number>>,
    addonOverrides?: Record<string, { name: string; monthlyFlat: number; perUnit?: boolean; unitLabel?: string }>
  },
): DynamicPriceBreakdown {
  const { studentCount, tier, billingPeriod, addons, discountPercent = 0 } = input
  const months = BILLING[billingPeriod].months
  const billingPctOff = BILLING[billingPeriod].discount / 100
  const volPct = volumeDiscountPercent(studentCount) / 100
  const couponPct = Math.min(100, Math.max(0, discountPercent)) / 100

  const tierCfg = TIER_CONFIG[tier]
  const baseRate = options?.tierBaseOverrides?.[tier] ?? tierCfg.basePerStudentMonth
  const listStudentMonth = baseRate * studentCount
  const afterVolume = listStudentMonth * (1 - volPct)
  const afterBilling = afterVolume * months * (1 - billingPctOff)

  const lineItems: DynamicPriceBreakdown["lineItems"] = [
    {
      label: `${tierCfg.label} · ${studentCount.toLocaleString()} students × ${months} mo`,
      amount: Math.round(afterBilling * 100) / 100,
    },
  ]

  let addonsTotal = 0
  for (const sel of addons) {
    const def = options?.addonOverrides?.[sel.id] ?? ADDON_CATALOG[sel.id]
    if (!def) continue
    const units = def.perUnit ? Math.max(1, sel.quantity ?? 1) : 1
    const monthly = def.monthlyFlat * units
    const period = monthly * months
    addonsTotal += period
    lineItems.push({
      label: `${def.name}${def.perUnit ? ` (${units} ${def.unitLabel ?? "units"})` : ""}`,
      amount: Math.round(period * 100) / 100,
    })
  }

  const subtotal = lineItems.reduce((s, l) => s + l.amount, 0)
  const discountAmount = Math.round(subtotal * couponPct * 100) / 100
  const total = Math.round((subtotal - discountAmount) * 100) / 100
  const effectiveMonthly = months > 0 ? Math.round((total / months) * 100) / 100 : total

  return {
    lineItems,
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount,
    total,
    effectiveMonthly,
    billingMonths: months,
  }
}

export function recommendPlanUpgrade(tier: TierPlan, studentCount: number): PlanUpgradeRecommendation {
  const soft = TIER_CONFIG[tier].maxStudentsSoft
  if (studentCount > soft) {
    const order: TierPlan[] = ["free", "starter", "standard", "premium", "enterprise"]
    const idx = order.indexOf(tier)
    const next = order[Math.min(idx + 1, order.length - 1)] as TierPlan
    if (next !== tier) {
      return {
        suggestedTier: next,
        reason: `Student count exceeds typical ${TIER_CONFIG[tier].label} band (${soft.toLocaleString()}+). Consider ${TIER_CONFIG[next].label} for better value and limits.`,
      }
    }
  }
  if (tier === "starter" && studentCount >= 180) {
    return {
      suggestedTier: "standard",
      reason: "Approaching Starter capacity — Standard unlocks richer analytics.",
    }
  }
  return { suggestedTier: null, reason: "Current tier fits projected usage." }
}

// ---------------------------------------------------------------------------
// Backward-compatible exports (legacy names used across codebase)
// ---------------------------------------------------------------------------

/** @deprecated use BillingPeriod */
export type PlanType = BillingPeriod

export function getPricePerUser(planType: PlanType): number {
  return TIER_CONFIG.standard.basePerStudentMonth * (1 - BILLING[planType].discount / 100)
}

export function calculateSubscriptionCost(userCount: number, planType: PlanType): number {
  return calculateDynamicPrice({
    studentCount: userCount,
    tier: "standard",
    billingPeriod: planType,
    addons: [],
  }).total
}

export function calculateMonthlyCost(userCount: number, planType: PlanType): number {
  const b = calculateDynamicPrice({
    studentCount: userCount,
    tier: "standard",
    billingPeriod: planType,
    addons: [],
  })
  return b.effectiveMonthly
}

export function calculateBillingDates(planType: PlanType, startDate: Date = new Date()) {
  const months = BILLING[planType].months
  const endDate = new Date(startDate)
  endDate.setMonth(endDate.getMonth() + months)
  const renewalDate = new Date(endDate)
  renewalDate.setDate(renewalDate.getDate() + 1)
  return { start: startDate, end: endDate, renewal: renewalDate }
}

export function formatPlanType(planType: PlanType): string {
  return BILLING[planType].label
}

export function getAvailablePlans(): PlanType[] {
  return ["monthly", "semester", "yearly"]
}

export function calculateProRataAdjustment(
  oldUserCount: number,
  newUserCount: number,
  planType: PlanType,
  daysRemaining: number,
  totalDaysInCycle: number,
): number {
  const pricePerUser = getPricePerUser(planType)
  const userCountDifference = newUserCount - oldUserCount
  const costPerDayPerUser = (pricePerUser * 30) / totalDaysInCycle
  return userCountDifference * costPerDayPerUser * daysRemaining
}

export function getPriceComparison(userCount: number) {
  return getAvailablePlans().map((plan) => {
    const total = calculateSubscriptionCost(userCount, plan)
    const months = BILLING[plan].months
    return {
      plan,
      displayName: formatPlanType(plan),
      pricePerUser: getPricePerUser(plan),
      totalCost: total,
      monthlyCost: months ? total / months : total,
      months,
      discount: BILLING[plan].discount,
    }
  })
}

export { ADDON_CATALOG as ADDON_DEFINITIONS }

