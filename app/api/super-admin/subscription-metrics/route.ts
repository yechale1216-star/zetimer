import { NextResponse } from "next/server"
import { mockDB } from "@/lib/db/mock-db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const metrics = mockDB.getSubscriptionMetrics()
    return NextResponse.json({ success: true, data: metrics })
  } catch (error) {
    console.error("[v0] subscription-metrics:", error)
    return NextResponse.json({ success: false, error: "Failed to load metrics" }, { status: 500 })
  }
}



