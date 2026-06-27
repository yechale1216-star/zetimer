import { NextRequest, NextResponse } from "next/server"
import {
  calculateDynamicPrice,
  recommendPlanUpgrade,
  volumeDiscountPercent,
} from "@/lib/utils/pricing-utils"
import { mockDB } from "@/lib/db/mock-db"
import type { AddonSelection, BillingPeriod, TierPlan } from "@/lib/utils/subscription-types"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const studentCount = Number(body.studentCount ?? body.userCount ?? 0)
    const tier = (body.tier ?? "standard") as TierPlan
    const billingPeriod = (body.billingPeriod ?? body.planType ?? "monthly") as BillingPeriod
    const addons = (body.addons ?? []) as AddonSelection[]
    const discountPercent = Number(body.discountPercent ?? 0)

    if (!studentCount || studentCount < 1 || studentCount > 50000) {
      return NextResponse.json({ error: "Invalid student count (1–50000)." }, { status: 400 })
    }

    if (!["monthly", "semester", "yearly"].includes(billingPeriod)) {
      return NextResponse.json({ error: "Invalid billing period." }, { status: 400 })
    }

    const tierBases = mockDB.getTierBaseOverrides()
    const addonList = mockDB.getAddonOverrides()
    const addonMap = addonList.reduce((acc: any, cur: any) => ({ ...acc, [cur.id]: cur }), {})

    const breakdown = calculateDynamicPrice(
      { studentCount, tier, billingPeriod, addons, discountPercent },
      { tierBaseOverrides: tierBases, addonOverrides: addonMap },
    )
    const upgrade = recommendPlanUpgrade(tier, studentCount)

    return NextResponse.json({
      success: true,
      calculation: {
        ...breakdown,
        studentCount,
        tier,
        billingPeriod,
        volumeDiscountPercent: volumeDiscountPercent(studentCount),
        upgrade,
      },
    })
  } catch (error) {
    console.error("[v0] calculate POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/** @deprecated Prefer POST with full body — kept for older links */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userCount = Number.parseInt(searchParams.get("userCount") || "0", 10)
    const planType = (searchParams.get("planType") || "monthly") as BillingPeriod

    if (!userCount || userCount < 1 || userCount > 50000) {
      return NextResponse.json({ error: "Invalid user count." }, { status: 400 })
    }

    if (!["monthly", "semester", "yearly"].includes(planType)) {
      return NextResponse.json({ error: "Invalid plan type." }, { status: 400 })
    }

    const tierBases = mockDB.getTierBaseOverrides()
    const breakdown = calculateDynamicPrice(
      { studentCount: userCount, tier: "standard", billingPeriod: planType, addons: [], discountPercent: 0 },
      { tierBaseOverrides: tierBases },
    )

    return NextResponse.json({
      success: true,
      calculation: {
        userCount,
        planType,
        pricePerUser: breakdown.lineItems[0]?.amount / userCount / breakdown.billingMonths || 0,
        totalCost: breakdown.total,
        monthlyCost: breakdown.effectiveMonthly,
        billingPeriodMonths: breakdown.billingMonths,
        lineItems: breakdown.lineItems,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
