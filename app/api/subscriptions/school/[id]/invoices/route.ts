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
    const invoices = mockDB.getAllInvoices().filter(inv => inv.schoolId === schoolId)

    return NextResponse.json({
      success: true,
      data: {
        invoices: invoices
      },
    })
  } catch (error) {
    console.error("[v0] invoices GET:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
