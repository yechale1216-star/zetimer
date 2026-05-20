import { NextResponse } from "next/server"
import { mockDB } from "@/lib/db/mock-db"

// Use environment variables in production
const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY || "CHASECK_TEST_MOCK"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { schoolId, tier, billingPeriod, paymentMethod } = body

    if (!schoolId || !tier || !billingPeriod || !paymentMethod) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    let school = mockDB.getSchool(schoolId)
    if (!school) {

      school = {
        id: schoolId,
        name: "Demo School",
        email: "demo@school.edu",
        phone: "0900000000",
        address: "Demo Address",
        city: "Addis Ababa",
        state: "Addis Ababa",
        zipCode: "1000",
        contactPerson: "Admin"
      }
    }

    let subscription = mockDB.getSubscriptionBySchoolId(schoolId)
    if (!subscription) {

      subscription = mockDB.createSubscription(schoolId, {
        tier: "starter",
        billingPeriod: "monthly",
        studentCount: 100,
        status: "trial",
        billingStart: new Date().toISOString().split('T')[0],
        billingEnd: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        renewalDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        addons: [],
        discountPercent: 0
      })
    }

    // Calculate dynamic price
    const mockCalcSub = {
      ...subscription,
      tier,
      billingPeriod
    }
    const pricingResult = mockDB.calculateForSubscription(mockCalcSub as any)
    const amount = pricingResult.total

    const txRef = `tx-zetime-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    // Create a pending transaction
    const transaction = mockDB.addTransaction({
      schoolId,
      subscriptionId: subscription.id,
      amount,
      currency: "ETB",
      status: "pending",
      type: "charge",
      description: `Upgrade to ${tier} (${billingPeriod}) via ${paymentMethod}`,
      createdAt: new Date().toISOString(),
      paymentMethod,
      txRef,
    })

    // Update subscription to pending payment status
    mockDB.updateSubscription(subscription.id, {
      status: "pending_payment",
      tier: tier,
      billingPeriod: billingPeriod
    })

    // If no real CHAPA_SECRET_KEY is provided, we simulate the redirect to a mock chapa page
    if (CHAPA_SECRET_KEY === "CHASECK_TEST_MOCK") {
        return NextResponse.json({
            success: true,
            checkout_url: `/api/payments/mock-checkout?txRef=${txRef}&amount=${amount}`
        })
    }

    const chapaPayload = {
      amount: amount.toString(),
      currency: "ETB",
      email: school.email,
      first_name: school.contactPerson.split(" ")[0] || "Admin",
      last_name: school.contactPerson.split(" ")[1] || "School",
      phone_number: school.phone,
      tx_ref: txRef,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhooks/chapa`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/school/admin/subscription`,
      customization: {
        title: "Zetime Subscription",
        description: `Payment for ${tier} tier`,
      }
    }

    const chapaRes = await fetch("https://api.chapa.co/v1/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CHAPA_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(chapaPayload)
    })

    const chapaData = await chapaRes.json()

    if (chapaData.status === "success") {
      return NextResponse.json({ success: true, checkout_url: chapaData.data.checkout_url })
    } else {
      console.error("[v0] Chapa error:", chapaData)
      return NextResponse.json({ success: false, error: "Failed to initialize payment gateway" }, { status: 500 })
    }
  } catch (error) {
    console.error("[v0] Payment Init Error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
