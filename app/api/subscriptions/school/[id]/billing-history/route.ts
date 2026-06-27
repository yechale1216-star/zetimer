import { NextRequest, NextResponse } from "next/server"
import { mockDB } from "@/lib/db/mock-db"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const schoolId = id
    const sub = mockDB.getSubscriptionBySchoolId(schoolId)
    
    if (!sub) {
      return NextResponse.json({ success: true, data: { billingHistory: [] } })
    }

    const history = mockDB.getBillingHistory(sub.id)

    return NextResponse.json({
      success: true,
      data: {
        billingHistory: history
      },
    })
  } catch (error) {
    console.error("[v0] billing history GET:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
