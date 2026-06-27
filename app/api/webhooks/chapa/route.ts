import { NextResponse } from "next/server"
import { mockDB } from "@/lib/db/mock-db"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { event, tx_ref, reference, status } = body

    // Optional: Add crypto verification of x-chapa-signature header using CHAPA_SECRET_KEY
    // For this implementation, we assume the webhook source is verified if not in mock mode.

    if (status === 'success' || event === 'charge.success') {
      const transaction = mockDB.getTransactionByTxRef(tx_ref)
      if (!transaction) {
        console.error(`[Webhook] Transaction not found for tx_ref: ${tx_ref}`)
        return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 })
      }

      // If already completed, skip
      if (transaction.status === 'completed') {
        return NextResponse.json({ success: true, message: "Already processed" })
      }

      // Mark transaction completed
      mockDB.updateTransactionStatus(transaction.id, "completed", reference)

      // Fetch subscription
      const subscription = mockDB.getSubscription(transaction.subscriptionId)
      if (subscription) {
        // Calculate new end date based on billing period
        const startDate = new Date()
        const endDate = new Date(startDate)
        
        if (subscription.billingPeriod === 'monthly') {
          endDate.setMonth(endDate.getMonth() + 1)
        } else if (subscription.billingPeriod === 'semester') {
          endDate.setMonth(endDate.getMonth() + 6)
        } else if (subscription.billingPeriod === 'yearly') {
          endDate.setFullYear(endDate.getFullYear() + 1)
        }

        // Activate and clear trial info
        mockDB.updateSubscription(subscription.id, {
          status: "active",
          billingStart: startDate.toISOString().split('T')[0],
          billingEnd: endDate.toISOString().split('T')[0],
          renewalDate: endDate.toISOString().split('T')[0],
          isTrial: false,
          trialEndsAt: undefined,
          trialStartedAt: undefined,
        })

        // Generate invoice
        const invoiceNum = `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
        mockDB.addInvoice({
          number: invoiceNum,
          subscriptionId: subscription.id,
          schoolId: subscription.schoolId,
          amount: transaction.amount,
          status: "paid",
          issuedAt: startDate.toISOString().split('T')[0],
          dueAt: startDate.toISOString().split('T')[0],
          lineItemSummary: transaction.description,
          pdfUrl: `/invoices/${invoiceNum}.pdf`
        })

        // Add to billing history
        mockDB.addBillingRecord({
          subscriptionId: subscription.id,
          amount: transaction.amount,
          date: startDate.toISOString().split('T')[0],
          status: "completed",
          description: transaction.description,
          invoiceUrl: `/invoices/${invoiceNum}.pdf` 
        })
      }

      console.log(`[Webhook] Successfully processed payment for ${tx_ref}`)
      return NextResponse.json({ success: true })
    }

    // Handle failure webhook
    if (status === 'failed') {
      const transaction = mockDB.getTransactionByTxRef(tx_ref)
      if (transaction) {
        mockDB.updateTransactionStatus(transaction.id, "failed", reference)
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: true, message: "Unhandled event" })
  } catch (error) {
    console.error("[v0] Webhook Error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

