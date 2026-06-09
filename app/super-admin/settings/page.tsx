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
import { getApiUrl } from '@/lib/auth/auth'

export default function SettingsPage() {
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${getApiUrl()}/api/super-admin/settings`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('attendance_token')}`
      }
    })
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          setConfig(json.data)
        }
      })
      .catch(err => console.error("Error fetching platform settings:", err))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (updatedData: any) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/super-admin/settings`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('attendance_token')}`
        },
        body: JSON.stringify(updatedData)
      })
      const json = await res.json()
      if (json.success) {
        setConfig(json.data)
        alert("Settings updated successfully!")
      } else {
        alert("Failed to update settings: " + json.error)
      }
    } catch (err) {
      alert("Error saving settings")
    }
  }

  if (loading || !config) {
    return <div className="p-20 text-center text-muted-foreground">Loading settings...</div>
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
                  value={config.platformName}
                  onChange={(e) => setConfig({ ...config, platformName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={config.supportEmail}
                  onChange={(e) => setConfig({ ...config, supportEmail: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">Take platform offline for maintenance</p>
                </div>
                <Switch
                  checked={config.maintenanceMode}
                  onCheckedChange={(checked) => setConfig({ ...config, maintenanceMode: checked })}
                />
              </div>

              <Button onClick={() => handleSave(config)} className="gap-2">
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
                  value={config.apiRateLimit}
                  onChange={(e) => setConfig({ ...config, apiRateLimit: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxUploadSize">Max Upload Size (MB)</Label>
                <Input
                  id="maxUploadSize"
                  type="number"
                  value={config.maxUploadSize}
                  onChange={(e) => setConfig({ ...config, maxUploadSize: parseInt(e.target.value) })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Automatic Backups</Label>
                  <p className="text-sm text-muted-foreground">Daily automatic database backups</p>
                </div>
                <Switch
                  checked={config.autoBackup}
                  onCheckedChange={(checked) => setConfig({ ...config, autoBackup: checked })}
                />
              </div>

              <Button onClick={() => handleSave(config)} className="gap-2">
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
                  checked={config.emailNotifications || false}
                  onCheckedChange={(checked) => setConfig({ ...config, emailNotifications: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label>SMTP Configuration</Label>
                <div className="bg-secondary p-4 rounded-lg text-sm text-muted-foreground">
                  <p>SMTP Server: mail.zetime.io:587</p>
                  <p>Encryption: TLS</p>
                </div>
              </div>

              <Button onClick={() => handleSave(config)} className="gap-2">
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
                  <Switch 
                    checked={config.maintenanceMode} 
                    onCheckedChange={(checked) => setConfig({ ...config, maintenanceMode: checked })}
                  />
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

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Configuration</CardTitle>
              <CardDescription>Configure platform-wide security policies and access controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Session Timeout (Minutes)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={config.sessionTimeout}
                  onChange={(e) => setConfig({ ...config, sessionTimeout: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">Inactivity period before a user is automatically logged out.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                <Input
                  id="maxLoginAttempts"
                  type="number"
                  value={config.maxLoginAttempts}
                  onChange={(e) => setConfig({ ...config, maxLoginAttempts: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">Number of failed attempts before an account is temporarily locked.</p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label>Multi-Factor Authentication (MFA)</Label>
                  <p className="text-sm text-muted-foreground">Enforce 2FA for all administrative accounts</p>
                </div>
                <Switch
                  checked={config.twoFactorEnabled}
                  onCheckedChange={(checked) => setConfig({ ...config, twoFactorEnabled: checked })}
                />
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
                <p className="text-xs text-amber-600 font-medium">
                  Note: Changes to security policies will apply to new sessions. 
                  Enforcing MFA will require admins to set up a secondary factor on their next login.
                </p>
              </div>

              <Button onClick={() => handleSave(config)} className="gap-2">
                <Save className="w-4 h-4" />
                Save Security Settings
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

              <Button onClick={() => handleSave(config)} className="gap-2">
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
                  checked={config.trialEnabled}
                  onCheckedChange={(checked) => setConfig({ ...config, trialEnabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trialDuration">Trial Duration (Days)</Label>
                <Input
                  id="trialDuration"
                  type="number"
                  value={config.trialDuration}
                  onChange={(e) => setConfig({ ...config, trialDuration: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trialCapacity">Student Capacity Limit</Label>
                <Input
                  id="trialCapacity"
                  type="number"
                  value={config.trialCapacity}
                  onChange={(e) => setConfig({ ...config, trialCapacity: parseInt(e.target.value) || 0 })}
                />
              </div>

              <Button onClick={() => handleSave(config)} className="gap-2">
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
