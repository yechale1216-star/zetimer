'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
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
          <TabsTrigger value="localization">Localization</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
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

        {/* Maintenance & Backups */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance & Backups</CardTitle>
              <CardDescription>Manage database backups and platform maintenance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-semibold">Database Backup</p>
                  <p className="text-sm text-muted-foreground">Last backup: Today at 02:00 AM (Daily Auto)</p>
                </div>
                <Button variant="default" size="sm">
                  Run Backup Now
                </Button>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Backup History</h3>
                <div className="space-y-2">
                  {[
                    { date: '2024-06-07 02:00', size: '24.5 MB', type: 'Automatic' },
                    { date: '2024-06-06 02:00', size: '24.2 MB', type: 'Automatic' },
                    { date: '2024-06-05 11:30', size: '23.9 MB', type: 'Manual' },
                  ].map((b, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="font-medium">{b.date}</span>
                        <Badge variant="outline" className="text-[10px]">{b.type}</Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">{b.size}</span>
                        <Button variant="ghost" size="sm" className="h-8 text-xs">Download</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-red-500">Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">Take the entire platform offline for updates</p>
                  </div>
                  <Switch checked={false} />
                </div>
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
                  <p className="text-xs text-red-600 font-medium">
                    Warning: Maintenance mode will disconnect all active users (Admins, Teachers, Parents) 
                    and show a maintenance page.
                  </p>
                </div>
              </div>

              <Button variant="destructive" className="w-full">
                Verify System Integrity
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Localization Settings */}
        <TabsContent value="localization">
          <Card>
            <CardHeader>
              <CardTitle>Localization Settings</CardTitle>
              <CardDescription>Configure language, date, and region settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="defaultLanguage">Default Language</Label>
                  <div className="flex gap-2">
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="en">English</option>
                      <option value="am">Amharic (አማርኛ)</option>
                      <option value="om">Oromo (Afaan Oromoo)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultTimezone">Default Timezone</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="Africa/Addis_Ababa">Africa/Addis Ababa (EAT)</option>
                    <option value="UTC">Coordinated Universal Time (UTC)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  Ethiopian Localization
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Ethiopian Calendar Support</Label>
                    <p className="text-sm text-muted-foreground">Show Ge'ez calendar options alongside Gregorian</p>
                  </div>
                  <Switch checked={true} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Local Time Format (12h Cycle)</Label>
                    <p className="text-sm text-muted-foreground">Support Ethiopian local 6-to-6 time cycle</p>
                  </div>
                  <Switch checked={false} />
                </div>
              </div>

              <Button onClick={handleSave} className="gap-2">
                <Save className="w-4 h-4" />
                Save Localization
              </Button>
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
