import { NextResponse } from "next/server"
import { mockDB } from "@/lib/db/mock-db"

export async function GET() {
  try {
    const rows = mockDB.getAllTransactions().map((t) => {
      const school = mockDB.getSchool(t.schoolId)
      return { ...t, schoolName: school?.name ?? "—" }
    })
    rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return NextResponse.json({ success: true, data: rows })
  } catch (error) {
    console.error("[v0] super-admin transactions:", error)
    return NextResponse.json({ success: false, error: "Failed to load transactions" }, { status: 500 })
  }
}
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { subscriptionId, schoolId, amount, type, description } = body
    if (!schoolId || !amount || !type) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }
    const t = mockDB.addTransaction({
      subscriptionId,
      schoolId,
      amount: Number(amount),
      currency: "USD",
      status: "completed",
      type,
      description,
      createdAt: new Date().toISOString(),
    })
    return NextResponse.json({ success: true, data: t })
  } catch (error) {
    console.error("[v0] super-admin transactions POST:", error)
    return NextResponse.json({ success: false, error: "Failed to create transaction" }, { status: 500 })
  }
}


