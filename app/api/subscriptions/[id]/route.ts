import { NextRequest, NextResponse } from "next/server"
import { mockDB } from "@/lib/db/mock-db"

function serialize(sub: NonNullable<ReturnType<typeof mockDB.getSubscription>>) {
  const price = mockDB.calculateForSubscription(sub)
  return {
    ...sub,
    userCount: sub.studentCount,
    plan: sub.billingPeriod,
    currentPeriodTotal: price.total,
    effectiveMonthly: price.effectiveMonthly,
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const subscription = mockDB.getSubscription(id)

    if (!subscription) {
      return NextResponse.json({ success: false, error: "Subscription not found" }, { status: 404 })
    }

    const school = mockDB.getSchool(subscription.schoolId)
    const billingHistory = mockDB.getBillingHistory(id)
    const invoices = mockDB.getAllInvoices().filter((i) => i.subscriptionId === id)
    const transactions = mockDB.getAllTransactions().filter((t) => t.subscriptionId === id)
    const price = mockDB.calculateForSubscription(subscription)

    return NextResponse.json({
      success: true,
      data: {
        ...serialize(subscription),
        school,
        billingHistory,
        invoices,
        transactions,
        priceBreakdown: price,
      },
    })
  } catch (error) {
    console.error("[v0] Error fetching subscription:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch subscription" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    if (body.userCount != null && body.studentCount == null) {
      body.studentCount = body.userCount
      delete body.userCount
    }
    if (body.plan != null && body.billingPeriod == null) {
      body.billingPeriod = body.plan
      delete body.plan
    }
    const subscription = mockDB.updateSubscription(id, body)

    if (!subscription) {
      return NextResponse.json({ success: false, error: "Subscription not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: serialize(subscription) })
  } catch (error) {
    console.error("[v0] Error updating subscription:", error)
    return NextResponse.json({ success: false, error: "Failed to update subscription" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const deleted = mockDB.deleteSubscription(id)

    if (!deleted) {
      return NextResponse.json({ success: false, error: "Subscription not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Subscription deleted" })
  } catch (error) {
    console.error("[v0] Error deleting subscription:", error)
    return NextResponse.json({ success: false, error: "Failed to delete subscription" }, { status: 500 })
  }
}
