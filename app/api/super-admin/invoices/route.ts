import { NextRequest, NextResponse } from "next/server"
import { mockDB } from "@/lib/db/mock-db"

export async function GET() {
  try {
    const rows = mockDB.getAllInvoices().map((inv) => {
      const school = mockDB.getSchool(inv.schoolId)
      return { ...inv, schoolName: school?.name ?? "—" }
    })
    rows.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
    return NextResponse.json({ success: true, data: rows })
  } catch (error) {
    console.error("[v0] invoices GET:", error)
    return NextResponse.json({ success: false, error: "Failed to load invoices" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subscriptionId } = body
    if (!subscriptionId) {
      return NextResponse.json({ success: false, error: "subscriptionId required" }, { status: 400 })
    }
    const sub = mockDB.getSubscription(subscriptionId)
    if (!sub) {
      return NextResponse.json({ success: false, error: "Subscription not found" }, { status: 404 })
    }
    const school = mockDB.getSchool(sub.schoolId)
    const price = mockDB.calculateForSubscription(sub)
    const num = `INV-${new Date().getFullYear()}-${String(mockDB.getAllInvoices().length + 1).padStart(4, "0")}`
    const inv = mockDB.addInvoice({
      number: num,
      subscriptionId: sub.id,
      schoolId: sub.schoolId,
      amount: price.total,
      status: "open",
      issuedAt: new Date().toISOString().split("T")[0],
      dueAt: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      lineItemSummary: `${sub.tier} · ${sub.studentCount} students · ${sub.billingPeriod}`,
      pdfUrl: `/invoices/${num}.pdf`,
    })
    return NextResponse.json({ success: true, data: inv })
  } catch (error) {
    console.error("[v0] invoice generate:", error)
    return NextResponse.json({ success: false, error: "Failed to generate invoice" }, { status: 500 })
  }
}


