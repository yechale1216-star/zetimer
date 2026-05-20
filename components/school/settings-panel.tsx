"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmailSettings } from "./email-settings"
import { Settings, Mail, MessageSquare } from "lucide-react"

export function SettingsPanel() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          System Settings
        </h1>
        <p className="text-muted-foreground mt-2">Configure notification services and system preferences</p>
      </div>

      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Settings
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            SMS Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="mt-6">
          <EmailSettings />
        </TabsContent>

        <TabsContent value="sms" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>SMS Notification Settings</CardTitle>
              <CardDescription>SMS notifications are currently configured and working</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">✅ SMS Configuration Active</h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>
                      <strong>Service:</strong> Twilio
                    </p>
                    <p>
                      <strong>Phone Number:</strong> +12184323408
                    </p>
                    <p>
                      <strong>Status:</strong> Working for verified numbers
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-2">⚠️ Trial Account Limitations</h4>
                  <p className="text-sm text-yellow-700">
                    Your Twilio account is in trial mode. SMS will only be sent to verified phone numbers. To send to
                    all numbers, upgrade to a paid Twilio account.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
