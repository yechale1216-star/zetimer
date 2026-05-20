import { NextResponse } from "next/server"
import { mockDB } from "@/lib/db/mock-db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const schoolId = id

    const transactions = mockDB.getAllTransactions().filter(t => t.schoolId === schoolId)
    
    // Sort by newest first
    transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ success: true, data: transactions })
  } catch (error) {
    console.error("[v0] Error fetching transactions:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
