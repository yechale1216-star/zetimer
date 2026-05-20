import { NextRequest, NextResponse } from "next/server"
import { mockDB } from "@/lib/db/mock-db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const schoolId = id
    let sub = mockDB.getSubscriptionBySchoolId(schoolId)
    
    if (!sub) {
      console.log(`[v0] Subscription for ${schoolId} not found, creating dummy subscription for demo`)
      sub = mockDB.createSubscription(schoolId, {
        tier: "starter",
        billingPeriod: "monthly",
        studentCount: 100,
        status: "trial",
        billingStart: new Date().toISOString().split('T')[0],
        billingEnd: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        renewalDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        addons: [],
        discountPercent: 0
      })
    }

    const calc = mockDB.calculateForSubscription(sub)

    return NextResponse.json({
      success: true,
      data: {
        ...sub,
        currentPeriodTotal: calc.total,
        effectiveMonthly: calc.effectiveMonthly,
        priceBreakdown: calc
      },
    })
  } catch (error) {
    console.error("[v0] subscription school GET:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const schoolId = id
    const body = await request.json()
    const { tier, billingPeriod, status } = body

    const existingSub = mockDB.getSubscriptionBySchoolId(schoolId)
    if (!existingSub) {
      return NextResponse.json({ success: false, error: "No subscription found" }, { status: 404 })
    }

    const updated = mockDB.updateSubscription(existingSub.id, {
      tier: tier || existingSub.tier,
      billingPeriod: billingPeriod || existingSub.billingPeriod,
      status: status || existingSub.status,
      ...(status === "active" ? { isTrial: false, trialEndsAt: undefined, trialStartedAt: undefined, studentCount: existingSub.studentCount > 100 ? existingSub.studentCount : 250 } : {})
    })

    if (!updated) {
      return NextResponse.json({ success: false, error: "Failed to update subscription" }, { status: 500 })
    }

    const calc = mockDB.calculateForSubscription(updated)

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        currentPeriodTotal: calc.total,
        effectiveMonthly: calc.effectiveMonthly,
      },
    })
  } catch (error) {
    console.error("[v0] subscription school PATCH:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

