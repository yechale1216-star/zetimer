import { type NextRequest, NextResponse } from "next/server"

// Simple in-memory tracking for demo purposes
// In production, this would be stored in a database or cache
let dailyMessageCount = 0
let lastResetDate = new Date().toDateString()

export async function POST(request: NextRequest) {
  try {
    const { to, message } = await request.json()

    if (!to || !message) {
      return NextResponse.json({ error: "Phone number and message are required" }, { status: 400 })
    }

    const settings = {
      sendSmsNotifications: true,
    }

    if (!settings.sendSmsNotifications) {
      return NextResponse.json({ error: "SMS notifications are disabled" }, { status: 400 })
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID


    if (!accountSid || !authToken || !twilioPhoneNumber) {
      return NextResponse.json({
        success: true,
        demo: true,
        messageId: `demo_${Date.now()}`,
        message: "SMS simulated - Addiss Hiwot School",
        details:
          "Twilio credentials not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to your environment variables.",
      })
    }

    if (!accountSid?.startsWith("AC") || accountSid.length !== 34) {

      return NextResponse.json({
        success: true,
        demo: true,
        messageId: `demo_${Date.now()}`,
        message: "SMS simulated - Addiss Hiwot School",
        details: `Invalid TWILIO_ACCOUNT_SID format. Expected: starts with 'AC' and 34 chars long. Got: ${accountSid.length} chars, starts with '${accountSid.substring(0, 2)}'`,
      })
    }

    if (!authToken || authToken.length !== 32) {

      return NextResponse.json({
        success: true,
        demo: true,
        messageId: `demo_${Date.now()}`,
        message: "SMS simulated - Addiss Hiwot School",
        details: `Invalid TWILIO_AUTH_TOKEN format. Expected: 32 characters. Got: ${authToken.length} characters.`,
      })
    }

    const currentDate = new Date().toDateString()
    if (currentDate !== lastResetDate) {
      dailyMessageCount = 0
      lastResetDate = currentDate
    }

    if (dailyMessageCount >= 9) {
      return NextResponse.json({
        success: true,
        demo: true,
        messageId: `demo_${Date.now()}`,
        message: "SMS simulated - Addiss Hiwot School",
        details:
          "Twilio trial account has exceeded the daily message limit. Upgrade to a paid account for unlimited messages",
      })
    }

    const knownUnverifiedNumbers = ["+251911058683"]
    const verifiedNumbers: string[] = ["+251924919853"]

    if (knownUnverifiedNumbers.includes(to)) {
      return NextResponse.json({
        success: true,
        demo: true,
        messageId: `demo_${Date.now()}`,
        message: "SMS simulated - Addiss Hiwot School",
        details: `📱 To send real SMS to ${to}:\n1. Visit https://console.twilio.com/us1/develop/phone-numbers/manage/verified\n2. Click "Add a new number"\n3. Enter ${to} and verify it\n4. Or upgrade to a paid Twilio account to send to any number`,
      })
    }



    let response: Response
    let responseText: string

    try {


      const requestBody = new URLSearchParams({
        MessagingServiceSid: messagingServiceSid || "",
        To: to,
        Body: message,
      })



      response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: requestBody,
      })

      responseText = await response.text()
      console.log("[SMS] Twilio API response status:", response.status)

    } catch (fetchError) {
      console.error("[SMS] Fetch error:", fetchError)

      return NextResponse.json({
        success: true,
        demo: true,
        messageId: `demo_${Date.now()}`,
        message: "SMS simulated - Addiss Hiwot School",
        details: "SMS service temporarily unavailable, using demo mode",
      })
    }

    if (!response.ok) {
      try {
        const errorData = JSON.parse(responseText)
        console.log("[v0] Twilio error data:", errorData)

        if (errorData.code === 21608) {
          return NextResponse.json({
            success: true,
            demo: true,
            messageId: `demo_${Date.now()}`,
            message: "SMS simulated - Addiss Hiwot School",
            details: `📱 Number ${to} is unverified on your Twilio trial account.\n\nTo send real SMS:\n1. Visit https://console.twilio.com/us1/develop/phone-numbers/manage/verified\n2. Click "Add a new number"\n3. Enter ${to} and complete verification\n4. Or upgrade to a paid Twilio account`,
          })
        } else if (errorData.code === 63038) {
          // Daily message limit exceeded
          dailyMessageCount = 9
          return NextResponse.json({
            success: true,
            demo: true,
            messageId: `demo_${Date.now()}`,
            message: "SMS simulated - Addiss Hiwot School",
            details:
              "Twilio trial account has exceeded the daily message limit. Upgrade to a paid account for unlimited messages",
          })
        } else if (errorData.code === 20003) {


          return NextResponse.json({
            success: true,
            demo: true,
            messageId: `demo_${Date.now()}`,
            message: "SMS simulated - Addiss Hiwot School",
            details:
              "Twilio authentication failed (Error 20003). Please verify your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are correct and active. Check for extra spaces or invalid characters.",
          })
        }
      } catch (parseError) {
        console.log("[v0] Error parsing Twilio response:", parseError)
      }

      return NextResponse.json({
        success: true,
        demo: true,
        messageId: `demo_${Date.now()}`,
        message: "SMS simulated - Addiss Hiwot School",
        details: `SMS service error (HTTP ${response.status}). Using demo mode.`,
      })
    }

    try {
      const result = JSON.parse(responseText)

      if (result.sid) {
        dailyMessageCount++
        console.log("[SMS] Sent successfully:", result.sid)

        return NextResponse.json({
          success: true,
          messageId: result.sid,
          message: "SMS sent successfully - Addiss Hiwot School",
          demo: false,
        })
      } else {
        return NextResponse.json({
          success: true,
          demo: true,
          messageId: `demo_${Date.now()}`,
          message: "SMS simulated - Addiss Hiwot School",
          details: "SMS service response incomplete, using demo mode",
        })
      }
    } catch (parseError) {
      console.log("[v0] Error parsing success response:", parseError)
      return NextResponse.json({
        success: true,
        demo: true,
        messageId: `demo_${Date.now()}`,
        message: "SMS simulated - Addiss Hiwot School",
        details: "SMS service response incomplete, using demo mode",
      })
    }
  } catch (error) {
    console.error("Error in SMS API route:", error)

    return NextResponse.json({
      success: true,
      demo: true,
      messageId: `demo_${Date.now()}`,
      message: "SMS simulated - Addiss Hiwot School",
      details: "SMS service temporarily unavailable, using demo mode",
    })
  }
}
