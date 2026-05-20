import { NextRequest, NextResponse } from "next/server"
import { mockDB } from "@/lib/db/mock-db"
import type { BillingPeriod, SubscriptionStatus, TierPlan } from "@/lib/utils/subscription-types"
import type { Subscription } from "@/lib/db/mock-db"

function serializeSubscription(sub: Subscription) {
  const price = mockDB.calculateForSubscription(sub)
  return {
    ...sub,
    /** legacy field for older clients */
    userCount: sub.studentCount,
    plan: sub.billingPeriod,
    currentPeriodTotal: price.total,
    effectiveMonthly: price.effectiveMonthly,
  }
}

export async function GET() {
  try {
    const subscriptions = mockDB.getAllSubscriptions()
    const enriched = subscriptions.map((sub) => {
      const school = mockDB.getSchool(sub.schoolId)
      return { ...serializeSubscription(sub), school }
    })

    return NextResponse.json({
      success: true,
      data: enriched,
      total: enriched.length,
    })
  } catch (error) {
    console.error("[v0] Error fetching subscriptions:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch subscriptions" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      schoolId,
      billingPeriod,
      tier,
      studentCount,
      userCount,
      status = "active",
      addons = [],
      discountPercent = 0,
      trialEndsAt,
    } = body

    const seats = Number(studentCount ?? userCount)
    const period = (billingPeriod ?? body.plan) as BillingPeriod
    const tierPlan = (tier ?? "standard") as TierPlan

    if (!schoolId || !period || !seats) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const billingStart = new Date()
    const billingEnd = new Date()
    const renewalDate = new Date()

    if (period === "monthly") {
      billingEnd.setMonth(billingEnd.getMonth() + 1)
      renewalDate.setMonth(renewalDate.getMonth() + 1)
    } else if (period === "semester") {
      billingEnd.setMonth(billingEnd.getMonth() + 6)
      renewalDate.setMonth(renewalDate.getMonth() + 6)
    } else if (period === "yearly") {
      billingEnd.setFullYear(billingEnd.getFullYear() + 1)
      renewalDate.setFullYear(renewalDate.getFullYear() + 1)
    }

    const subscription = mockDB.createSubscription(schoolId, {
      tier: tierPlan,
      billingPeriod: period,
      studentCount: seats,
      status: status as SubscriptionStatus,
      billingStart: billingStart.toISOString().split("T")[0],
      billingEnd: billingEnd.toISOString().split("T")[0],
      renewalDate: renewalDate.toISOString().split("T")[0],
      addons,
      discountPercent: Number(discountPercent) || 0,
      trialEndsAt,
    })

    return NextResponse.json({ success: true, data: serializeSubscription(subscription) })
  } catch (error) {
    console.error("[v0] Error creating subscription:", error)
    return NextResponse.json({ success: false, error: "Failed to create subscription" }, { status: 500 })
  }
}


