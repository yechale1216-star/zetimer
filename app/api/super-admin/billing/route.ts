import { NextResponse } from "next/server"
import { mockDB } from "@/lib/db/mock-db"

export async function GET() {
  try {
    const rows = mockDB.getAllBillingHistory().map((b) => {
      const sub = mockDB.getSubscription(b.subscriptionId)
      const school = sub ? mockDB.getSchool(sub.schoolId) : undefined
      return { ...b, schoolName: school?.name ?? "—" }
    })
    rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return NextResponse.json({ success: true, data: rows })
  } catch (error) {
    console.error("[v0] super-admin billing:", error)
    return NextResponse.json({ success: false, error: "Failed to load billing" }, { status: 500 })
  }
}


