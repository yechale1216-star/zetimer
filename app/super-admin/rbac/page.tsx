'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Shield, ShieldAlert, ShieldCheck, Users, Lock, ChevronRight, Save, PlusCircle } from 'lucide-react'

import { cn } from '@/lib/utils/utils'

// Mock roles and permissions
const roles = [
  { id: '1', name: 'Owner', description: 'Full access to all system modules and data across all tenants.', users: 1, type: 'system' },
  { id: '2', name: 'Billing Manager', description: 'Can view and export financial data, manage subscriptions and invoices.', users: 3, type: 'custom' },
  { id: '3', name: 'Support Agent', description: 'Can view and reply to school tickets, view school dashboard statistics.', users: 8, type: 'custom' },
  { id: '4', name: 'Technical Admin', description: 'Access to system monitoring, logs, and maintenance tools.', users: 2, type: 'custom' },
]

const permissions = [
  { group: 'School Operations', actions: ['View Schools', 'Create School', 'Suspend/Activate School', 'Impersonate Admin'] },
  { group: 'Financials', actions: ['View Revenue', 'Manage Pricing', 'Generate Invoices', 'Refund Transactions'] },
  { group: 'Security & Audit', actions: ['View Audit Logs', 'Manage Backups', 'Configure RBAC', 'Platform Settings'] },
  { group: 'Support & Comms', actions: ['Reply To Tickets', 'Global Announcements', 'Manage User Roles'] },
]

export default function RBACPage() {
  const [selectedRole, setSelectedRole] = useState(roles[0])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Role-Based Access Control</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Define permissions and management roles for Super Admin personnel.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-1">Management Roles</h3>
          {roles.map((role) => (
            <Card 
              key={role.id} 
              className={cn(
                "cursor-pointer transition-all border-l-4",
                selectedRole.id === role.id 
                  ? "border-l-primary bg-primary/5 ring-1 ring-primary/20" 
                  : "border-l-transparent hover:bg-secondary/50"
              )}
              onClick={() => setSelectedRole(role)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{role.name}</p>
                    {role.type === 'system' && <Badge variant="secondary" className="text-[10px]">System</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{role.users} active members</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" className="w-full gap-2 mt-4 border-dashed">
            <PlusCircle className="w-4 h-4" />
            Create New Role
          </Button>
        </div>

        {/* Permissions Grid */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-border mb-6">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  {selectedRole.name} Permissions
                </CardTitle>
                <CardDescription>{selectedRole.description}</CardDescription>
              </div>
              <Button size="sm" className="gap-2">
                <Save className="w-4 h-4" />
                Save Policy
              </Button>
            </CardHeader>
            <CardContent className="space-y-8">
              {permissions.map((group) => (
                <div key={group.group} className="space-y-4">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {group.group}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {group.actions.map((action) => (
                      <div key={action} className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-secondary/10">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">{action}</p>
                          <p className="text-[10px] text-muted-foreground">Allow platform-wide {action.toLowerCase()}</p>
                        </div>
                        <Switch 
                          defaultChecked={selectedRole.name === 'Owner' || (selectedRole.name === 'Billing Manager' && group.group === 'Financials')} 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Security Policy */}
          <Card className="border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="p-4 flex items-start gap-4">
              <ShieldAlert className="w-5 h-5 text-yellow-600 shrink-0 mt-1" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-yellow-700">Security Inheritance</p>
                <p className="text-xs text-yellow-600/80 leading-relaxed">
                  Permissions granted to the '{selectedRole.name}' role will apply to all assigned users instantly. 
                  Audit logs will record the actor's identity for all subsequent operations.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

