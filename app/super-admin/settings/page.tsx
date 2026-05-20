'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Save } from 'lucide-react'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    platformName: 'Zetime',
    supportEmail: 'support@zetime.io',
    maintenanceMode: false,
    apiRateLimit: 10000,
    maxUploadSize: 100,
    emailNotifications: true,
    autoBackup: true,
  })

  const [trialSettings, setTrialSettings] = useState({
    enabled: true,
    durationDays: 14,
    studentCapacity: 100
  })

  useEffect(() => {
    fetch('/api/super-admin/settings/trial')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          setTrialSettings(json.data)
        }
      })
      .catch(err => console.error("Error fetching trial settings:", err))
  }, [])

  const handleSave = () => {
    console.log('Settings saved:', settings)
  }

  const handleSaveTrial = async () => {
    try {
      const res = await fetch('/api/super-admin/settings/trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trialSettings)
      })
      const json = await res.json()
      if (json.success) {
        alert("Trial settings saved successfully!")
      } else {
        alert("Failed to save trial settings: " + json.error)
      }
    } catch (err) {
      alert("Error saving trial settings")
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Platform Settings</h1>
        <p className="text-muted-foreground mt-1">Configure system-wide settings and preferences</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="trial">Free Trial</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Basic platform configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="platformName">Platform Name</Label>
                <Input
                  id="platformName"
                  value={settings.platformName}
                  onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">Take platform offline for maintenance</p>
                </div>
                <Switch
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
                />
              </div>

              <Button onClick={handleSave} className="gap-2">
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>API and resource configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="apiRateLimit">API Rate Limit (requests/hour)</Label>
                <Input
                  id="apiRateLimit"
                  type="number"
                  value={settings.apiRateLimit}
                  onChange={(e) => setSettings({ ...settings, apiRateLimit: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxUploadSize">Max Upload Size (MB)</Label>
                <Input
                  id="maxUploadSize"
                  type="number"
                  value={settings.maxUploadSize}
                  onChange={(e) => setSettings({ ...settings, maxUploadSize: parseInt(e.target.value) })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Automatic Backups</Label>
                  <p className="text-sm text-muted-foreground">Daily automatic database backups</p>
                </div>
                <Switch
                  checked={settings.autoBackup}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoBackup: checked })}
                />
              </div>

              <Button onClick={handleSave} className="gap-2">
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Email Settings</CardTitle>
              <CardDescription>Email service configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Send system notifications via email</p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label>SMTP Configuration</Label>
                <div className="bg-secondary p-4 rounded-lg text-sm text-muted-foreground">
                  <p>SMTP Server: mail.zetime.io:587</p>
                  <p>Encryption: TLS</p>
                </div>
              </div>

              <Button onClick={handleSave} className="gap-2">
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Security and access control</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 bg-secondary/50 p-4 rounded-lg border border-border">
                <h3 className="font-semibold text-foreground">Two-Factor Authentication</h3>
                <p className="text-sm text-muted-foreground">Enable 2FA for all admin accounts</p>
                <Button variant="outline" size="sm">
                  Configure 2FA
                </Button>
              </div>

              <div className="space-y-4 bg-secondary/50 p-4 rounded-lg border border-border">
                <h3 className="font-semibold text-foreground">IP Whitelist</h3>
                <p className="text-sm text-muted-foreground">Restrict admin access to specific IP addresses</p>
                <Button variant="outline" size="sm">
                  Manage IP Whitelist
                </Button>
              </div>

              <div className="space-y-4 bg-secondary/50 p-4 rounded-lg border border-border">
                <h3 className="font-semibold text-foreground">Session Timeout</h3>
                <p className="text-sm text-muted-foreground">Auto-logout inactive sessions after 30 minutes</p>
                <Button variant="outline" size="sm">
                  Configure Timeout
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trial Settings */}
        <TabsContent value="trial">
          <Card>
            <CardHeader>
              <CardTitle>Free Trial Configuration</CardTitle>
              <CardDescription>Manage how new schools access the platform initially</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Free Trial</Label>
                  <p className="text-sm text-muted-foreground">Automatically provision a free trial for new registrations</p>
                </div>
                <Switch
                  checked={trialSettings.enabled}
                  onCheckedChange={(checked) => setTrialSettings({ ...trialSettings, enabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trialDuration">Trial Duration (Days)</Label>
                <Input
                  id="trialDuration"
                  type="number"
                  value={trialSettings.durationDays}
                  onChange={(e) => setTrialSettings({ ...trialSettings, durationDays: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trialCapacity">Student Capacity Limit</Label>
                <Input
                  id="trialCapacity"
                  type="number"
                  value={trialSettings.studentCapacity}
                  onChange={(e) => setTrialSettings({ ...trialSettings, studentCapacity: parseInt(e.target.value) || 0 })}
                />
              </div>

              <Button onClick={handleSaveTrial} className="gap-2">
                <Save className="w-4 h-4" />
                Save Trial Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
