/** Product tier (feature bundle) — not the billing cadence */
export type TierPlan = "free" | "starter" | "standard" | "premium" | "enterprise"

/** Billing cadence */
export type BillingPeriod = "monthly" | "semester" | "yearly"

/** @deprecated alias — use BillingPeriod */
export type LegacyPlanType = BillingPeriod

export type SubscriptionStatus =
  | "active"
  | "trial"
  | "expired"
  | "suspended"
  | "pending_payment"
  | "expiring"
  | "cancelled"
  | "paused"

export type AddonId =
  | "sms_package"
  | "white_label"
  | "extra_branches"
  | "custom_domain"
  | "priority_support"
  | "additional_storage"

export interface AddonSelection {
  id: AddonId
  /** quantity for metered add-ons (e.g. branches, storage units) */
  quantity?: number
}

export interface DynamicPriceInput {
  studentCount: number
  tier: TierPlan
  billingPeriod: BillingPeriod
  addons: AddonSelection[]
  /** platform or coupon discount 0–100 */
  discountPercent?: number
}

export interface PriceLineItem {
  label: string
  amount: number
}

export interface DynamicPriceBreakdown {
  lineItems: PriceLineItem[]
  subtotal: number
  discountAmount: number
  total: number
  /** normalized monthly equivalent for analytics */
  effectiveMonthly: number
  billingMonths: number
}

export interface PlanUpgradeRecommendation {
  suggestedTier: TierPlan | null
  reason: string
}
