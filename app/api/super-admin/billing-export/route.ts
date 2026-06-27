import { NextResponse } from "next/server"
import { mockDB } from "@/lib/db/mock-db"

export const dynamic = "force-dynamic"

/** CSV export of all billing rows (super admin) */
export async function GET() {
  try {
    const rows = mockDB.getAllBillingHistory()
    const header = ["id", "subscriptionId", "amount", "date", "status", "description"]
    const lines = [header.join(",")]
    for (const r of rows) {
      lines.push(
        [r.id, r.subscriptionId, r.amount, r.date, r.status, `"${r.description.replace(/"/g, '""')}"`].join(","),
      )
    }
    const csv = lines.join("\n")
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="zetime-billing-export.csv"',
      },
    })
  } catch (error) {
    console.error("[v0] billing-export:", error)
    return NextResponse.json({ success: false, error: "Export failed" }, { status: 500 })
  }
}



