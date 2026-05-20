import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const txRef = searchParams.get('txRef')

  // Simulate user paying and Chapa sending webhook in the background
  if (txRef) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    
    // Fire and forget webhook simulation
    fetch(`${appUrl}/api/webhooks/chapa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'charge.success',
        tx_ref: txRef,
        reference: `mock-chapa-${Date.now()}`,
        status: 'success'
      })
    }).catch(console.error)
  }

  // Redirect user back to subscription page
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  return NextResponse.redirect(`${appUrl}/school/admin/subscription`)
}
