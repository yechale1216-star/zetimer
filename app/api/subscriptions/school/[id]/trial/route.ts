import { NextRequest, NextResponse } from "next/server"
import { mockDB } from "@/lib/db/mock-db"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const schoolId = id

    const settings = mockDB.getTrialSettings()
    
    if (!settings.enabled) {
      return NextResponse.json({ success: false, error: "Free trial is disabled by the administrator" }, { status: 400 })
    }

    // Check if subscription already exists
    const existing = mockDB.getSubscriptionBySchoolId(schoolId)
    if (existing) {
      return NextResponse.json({ success: false, error: "School already has a subscription" }, { status: 400 })
    }

    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(startDate.getDate() + settings.durationDays) // Dynamic duration

    const newSub = mockDB.createSubscription(schoolId, {
      tier: "starter",
      billingPeriod: "monthly",
      studentCount: settings.studentCapacity, // Dynamic capacity
      status: "trial",
      billingStart: startDate.toISOString().split("T")[0],
      billingEnd: endDate.toISOString().split("T")[0],
      renewalDate: endDate.toISOString().split("T")[0],
      addons: [],
      discountPercent: 0,
      isTrial: true,
      trialStartedAt: startDate.toISOString(),
      trialEndsAt: endDate.toISOString()
    })

    return NextResponse.json({
      success: true,
      data: newSub
    })
  } catch (error) {
    console.error("[v0] create trial subscription:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
