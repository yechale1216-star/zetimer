'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SubscriptionsList } from '@/components/super-admin/subscriptions-list'
import { SubscriptionMetricsBar } from '@/components/super-admin/subscription-metrics-bar'
import { Search, Download, Settings, History, CreditCard } from 'lucide-react'
import Link from 'next/link'

export default function SubscriptionsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Subscriptions management</h1>
          <p className="text-muted-foreground mt-1">Dynamic pricing, billing health, and lifecycle controls.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href="/super-admin/subscriptions/pricing">
              <Settings className="w-4 h-4" />
              Pricing config
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href="/super-admin/subscriptions/billing">
              <History className="w-4 h-4" />
              Billing history
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href="/super-admin/subscriptions/transactions">
              <CreditCard className="w-4 h-4" />
              Transactions
            </Link>
          </Button>
        </div>
      </div>

      <SubscriptionMetricsBar />

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
                Export billing CSV
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <SubscriptionsList searchQuery={searchQuery} statusFilter={statusFilter} />
    </div>
  )
}
