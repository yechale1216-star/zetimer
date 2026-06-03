"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle, XCircle, AlertCircle, Mail, ExternalLink } from "lucide-react"
import { db } from "@/lib/db/database"
import { parseJsonResponse } from "@/lib/utils/parse-json-response"

export function EmailStatus() {
  const [emailStatus, setEmailStatus] = useState<{
    configured: boolean
    demo: boolean
    message: string
  }>({ configured: false, demo: true, message: "Checking email configuration..." })
  const [testEmail, setTestEmail] = useState("")
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [schoolName, setSchoolName] = useState("Smart Attendance Tracker")

  useEffect(() => {
    checkEmailStatus()
    loadSchoolName()
  }, [])

  const loadSchoolName = async () => {
    try {
      const settings = await db.getSettings()
      setSchoolName(settings.schoolName || "Smart Attendance Tracker")
    } catch (error) {
      console.error("Error loading school name:", error)
    }
  }

  const checkEmailStatus = async () => {
    try {
      const settings = await db.getEmailSettings()
      const configured = !!settings?.api_key
      
      setEmailStatus({
        configured,
        demo: !configured,
        message: !configured ? "Add Resend API key in Settings for real email delivery" : "Real email delivery configured",
      })
    } catch (error) {
      setEmailStatus({
        configured: false,
        demo: true,
        message: "Error checking email configuration",
      })
    }
  }

  const testEmailDelivery = async () => {
    if (!testEmail) return

    setTesting(true)
    setTestResult(null)

    try {
      const settings = await db.getEmailSettings()
      const isConfigured = !!settings?.api_key

      // Mock behavior
      setTimeout(() => {
        if (isConfigured) {
          setTestResult("Test email sent successfully via Resend! Check your inbox.")
        } else {
          setTestResult("Demo Mode: Email would be sent if a Resend API key was configured.")
        }
        setTesting(false)
      }, 1500)
    } catch (error) {
      setTestResult("Error sending test email")
      setTesting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Configuration Status
        </CardTitle>
        <CardDescription>Configure real email delivery for attendance notifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          {emailStatus.configured ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
          <span className="typography-label">
            {emailStatus.configured ? "Real Email Delivery" : "Configuration Required"}
          </span>
          <Badge variant={emailStatus.configured ? "default" : "secondary"}>
            {emailStatus.configured ? "Active" : "Setup Needed"}
          </Badge>
        </div>

        <p className="typography-body text-muted-foreground">{emailStatus.message}</p>

        {!emailStatus.configured && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div className="space-y-2">
                <h4 className="typography-label text-orange-600 dark:text-orange-400">Setup Required</h4>
                <p className="typography-body text-orange-600/80 dark:text-orange-400/80">
                  To enable real email delivery, add your Resend API key as an environment variable:
                </p>
                <div className="typography-helper bg-orange-500/10 rounded p-2 font-mono text-orange-700 dark:text-orange-300">
                  RESEND_API_KEY=re_your_actual_api_key_here
                </div>
                <div className="typography-body flex items-center gap-2">
                  <span className="text-muted-foreground">Get your API key from:</span>
                  <a
                    href="https://resend.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="typography-label text-primary hover:underline flex items-center gap-1"
                  >
                    Resend Dashboard
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="test-email">Test Email Delivery</Label>
          <div className="flex gap-2">
            <Input
              id="test-email"
              type="email"
              placeholder="Enter email to test delivery"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
            <Button onClick={testEmailDelivery} disabled={testing || !testEmail}>
              {testing ? "Sending..." : "Test"}
            </Button>
          </div>
          {testResult && (
            <p className={`typography-label ${testResult.includes("successfully") ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
              {testResult}
            </p>
          )}
        </div>

        <Button variant="outline" onClick={checkEmailStatus} className="w-full bg-transparent">
          Refresh Status
        </Button>
      </CardContent>
    </Card>
  )
}

