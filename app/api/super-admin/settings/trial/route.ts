import { NextResponse } from "next/server"
import { mockDB } from "@/lib/db/mock-db"

export async function GET() {
  try {
    const settings = mockDB.getTrialSettings()
    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    console.error("[v0] GET trial settings:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const updated = mockDB.updateTrialSettings({
      ...(body.enabled !== undefined && { enabled: body.enabled }),
      ...(body.durationDays !== undefined && { durationDays: body.durationDays }),
      ...(body.studentCapacity !== undefined && { studentCapacity: body.studentCapacity })
    })
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("[v0] POST trial settings:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
