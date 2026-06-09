'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SubscriptionsList } from '@/components/super-admin/subscriptions-list'
import { SubscriptionMetricsBar } from '@/components/super-admin/subscription-metrics-bar'
import { PlanManager } from '@/components/super-admin/plan-manager'
// import { FeatureCatalog } from '@/components/super-admin/feature-catalog'
import { AddonManager } from '@/components/super-admin/addon-manager'
import { Search, Download, CreditCard, Layers, Tag, Package } from 'lucide-react'

export default function SubscriptionsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Subscription Management</h1>
          <p className="text-muted-foreground mt-1">Plans, features, billing health, and lifecycle controls.</p>
        </div>
      </div>

      <SubscriptionMetricsBar />

      <Tabs defaultValue="subscriptions" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="subscriptions" className="gap-2">
            <CreditCard className="w-4 h-4" /> Subscriptions
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-2">
            <Layers className="w-4 h-4" /> Plans
          </TabsTrigger>
          <TabsTrigger value="addons" className="gap-2">
            <Package className="w-4 h-4" /> Add-ons
          </TabsTrigger>
        </TabsList>

        {/* ─── Subscriptions Tab ────────────────────────────────────────── */}
        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by school, tier, or billing period..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  className="px-3 py-2 rounded-lg border border-border bg-background text-foreground min-w-[180px]"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All status</option>
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="expiring">Expiring soon</option>
                  <option value="expired">Expired</option>
                  <option value="suspended">Suspended</option>
                  <option value="pending_payment">Pending payment</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="paused">Paused</option>
                </select>
                <Button variant="outline" className="gap-2" asChild>
                  <a href="/api/super-admin/billing-export">
                    <Download className="w-4 h-4" />
                    Export CSV
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
          <SubscriptionsList searchQuery={searchQuery} statusFilter={statusFilter} />
        </TabsContent>

        {/* ─── Plan Manager Tab ─────────────────────────────────────────── */}
        <TabsContent value="plans">
          <PlanManager />
        </TabsContent>


        {/* ─── Add-on Manager Tab ───────────────────────────────────────── */}
        <TabsContent value="addons">
          <AddonManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
