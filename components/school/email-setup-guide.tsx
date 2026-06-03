"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, ExternalLink, Copy, AlertTriangle } from "lucide-react"

interface EmailSetupGuideProps {
  onClose?: () => void
}

export function EmailSetupGuide({ onClose }: EmailSetupGuideProps) {
  const [copiedStep, setCopiedStep] = useState<number | null>(null)

  const copyToClipboard = (text: string, step: number) => {
    navigator.clipboard.writeText(text)
    setCopiedStep(step)
    setTimeout(() => setCopiedStep(null), 2000)
  }

  const steps = [
    {
      title: "Create Resend Account",
      description: "Sign up for a free Resend account",
      action: "Go to resend.com",
      link: "https://resend.com/signup",
    },
    {
      title: "Create API Key",
      description: "Generate a new API key for your project",
      action: "Go to API Keys Dashboard",
      link: "https://resend.com/api-keys",
    },
    {
      title: "Configure Permissions",
      description: "Choose 'Sending access' for the API key",
      action: "Select sending permissions",
    },
    {
      title: "Copy API Key",
      description: "Copy the generated API key (starts with 're_')",
      action: "Copy API key",
      copyText: "re_your_api_key_here",
    },
    {
      title: "Add to Environment",
      description: "Add the API key to your Vercel project settings",
      action: "Add RESEND_API_KEY variable",
      link: "https://vercel.com/docs/projects/environment-variables",
    },
  ]

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-primary" />
          Email Setup Required
        </CardTitle>
        <CardDescription>
          To send real email notifications, you need to configure a valid Resend API key.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Currently using demo mode. Real emails will not be sent until you complete the setup below.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="typography-label flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                {index + 1}
              </div>
              <div className="flex-1">
                <h4 className="typography-label">{step.title}</h4>
                <p className="typography-body text-muted-foreground">{step.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  {step.link && (
                    <Button variant="outline" size="sm" onClick={() => window.open(step.link, "_blank")}>
                      <ExternalLink className="h-3 w-3 mr-1" />
                      {step.action}
                    </Button>
                  )}
                  {step.copyText && (
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(step.copyText!, index)}>
                      {copiedStep === index ? (
                        <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      {copiedStep === index ? "Copied!" : step.action}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Note:</strong> SMS notifications are already working! Only email setup is needed.
          </AlertDescription>
        </Alert>

        {onClose && (
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Close Guide
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
