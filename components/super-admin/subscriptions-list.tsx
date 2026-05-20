"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Eye, Edit, Trash2, Loader2 } from "lucide-react"
import { TIER_CONFIG } from "@/lib/utils/pricing-utils"
import { parseJsonResponse } from "@/lib/utils/parse-json-response"
import type { BillingPeriod, SubscriptionStatus, TierPlan } from "@/lib/utils/subscription-types"

const TIERS: TierPlan[] = ["starter", "standard", "premium", "enterprise"]

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    active: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    trial: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    expiring: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    expired: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    cancelled: "bg-muted text-muted-foreground border-border",
    paused: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    suspended: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    pending_payment: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  }
  return colors[status] || "bg-muted text-muted-foreground border-border"
}

const getStatusLabel = (status: string) =>
  ({
    active: "Active",
    trial: "Trial",
    expiring: "Expiring soon",
    expired: "Expired",
    cancelled: "Cancelled",
    paused: "Paused",
    suspended: "Suspended",
    pending_payment: "Pending payment",
  })[status] || status

interface EnrichedSubscription {
  id: string
  schoolId: string
  tier: TierPlan
  billingPeriod: BillingPeriod
  studentCount: number
  userCount?: number
  plan?: BillingPeriod
  status: SubscriptionStatus
  billingStart: string
  billingEnd: string
  renewalDate: string
  addons?: { id: string; quantity?: number }[]
  discountPercent?: number
  trialEndsAt?: string
  school?: { name: string }
  currentPeriodTotal?: number
  effectiveMonthly?: number
}

interface ViewDetailsModalProps {
  subscription: EnrichedSubscription | null
  onClose: () => void
}

function ViewDetailsModal({ subscription, onClose }: ViewDetailsModalProps) {
  if (!subscription) return null
  const seats = subscription.studentCount ?? subscription.userCount ?? 0

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border-primary/20" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Subscription Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">School</p>
              <p className="font-medium text-foreground">{subscription.school?.name || "Unknown"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Tier</p>
              <Badge variant="outline" className="mt-1 font-bold">
                {TIER_CONFIG[subscription.tier]?.label ?? subscription.tier}
              </Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Billing Period</p>
              <p className="font-medium capitalize text-foreground">{subscription.billingPeriod ?? subscription.plan}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Active Students</p>
              <p className="font-medium text-foreground">{seats}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Period Total</p>
              <p className="font-bold text-foreground text-lg">${(subscription.currentPeriodTotal ?? 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Monthly Equiv.</p>
              <p className="font-medium text-foreground">${(subscription.effectiveMonthly ?? 0).toFixed(2)}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Billing window</p>
            <p className="font-medium text-sm text-foreground">
              {subscription.billingStart} <span className="text-muted-foreground mx-1">→</span> {subscription.billingEnd}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Renewal</p>
              <p className="font-medium text-foreground">{subscription.renewalDate}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Discount</p>
              <p className="font-medium text-foreground">{subscription.discountPercent ?? 0}%</p>
            </div>
          </div>

          {subscription.trialEndsAt && (
            <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Trial ends</p>
              <p className="font-bold text-primary">{subscription.trialEndsAt}</p>
            </div>
          )}

          <div className="pt-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Status</p>
            <Badge variant="outline" className={`${getStatusColor(subscription.status)} font-bold px-3 py-1`}>
              {getStatusLabel(subscription.status)}
            </Badge>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button asChild variant="default" className="w-full">
              <Link href={`/super-admin/subscriptions/${subscription.id}`}>Open Full Record</Link>
            </Button>
            <Button onClick={onClose} variant="ghost" className="w-full">
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface SubscriptionsListProps {
  searchQuery: string
  statusFilter: string
}

export function SubscriptionsList({ searchQuery, statusFilter }: SubscriptionsListProps) {
  const [subscriptions, setSubscriptions] = useState<EnrichedSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [selectedSub, setSelectedSub] = useState<EnrichedSubscription | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const itemsPerPage = 10

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/subscriptions")
      const json = await parseJsonResponse<{ success: boolean; data: EnrichedSubscription[]; error?: string }>(res)
      if (json.success) setSubscriptions(json.data)
      else setError(json.error || "Failed to load subscriptions")
    } catch (err) {
      console.error("[v0] Error fetching subscriptions:", err)
      setError("Failed to load subscriptions")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this subscription?")) return
    try {
      setDeleteLoading(id)
      const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" })
      const json = await parseJsonResponse<{ success: boolean; error?: string }>(res)
      if (json.success) setSubscriptions((subs) => subs.filter((s) => s.id !== id))
      else alert(json.error || "Failed to delete subscription")
    } catch {
      alert("Failed to delete subscription")
    } finally {
      setDeleteLoading(null)
    }
  }

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const schoolName = sub.school?.name || ""
    const matchesSearch =
      schoolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.tier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.billingPeriod || sub.plan || "").toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const paginatedSubscriptions = filteredSubscriptions.slice((page - 1) * itemsPerPage, page * itemsPerPage)


  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <ViewDetailsModal subscription={selectedSub} onClose={() => setSelectedSub(null)} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            All subscriptions
          </CardTitle>
          <CardDescription>Total: {filteredSubscriptions.length} subscriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">School</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Tier</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Billing</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Students</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Period total</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">MRR eq.</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Renewal</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSubscriptions.map((sub) => {
                  const seats = sub.studentCount ?? sub.userCount ?? 0
                  return (
                    <tr key={sub.id} className="border-b border-border hover:bg-secondary/50 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium text-foreground">{sub.school?.name || "Unknown"}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{TIER_CONFIG[sub.tier]?.label}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground capitalize">
                        {sub.billingPeriod ?? sub.plan}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium">{seats}</td>
                      <td className="py-3 px-4 text-sm font-medium">${(sub.currentPeriodTotal ?? 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-sm font-medium">${(sub.effectiveMonthly ?? 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{sub.renewalDate}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className={`${getStatusColor(sub.status)} text-[10px] font-bold uppercase tracking-wider`}>
                          {getStatusLabel(sub.status)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setSelectedSub(sub)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild title="Edit in detail view">
                            <Link href={`/super-admin/subscriptions/${sub.id}`}>
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(sub.id)}
                            disabled={deleteLoading === sub.id}
                          >
                            {deleteLoading === sub.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing {Math.min((page - 1) * itemsPerPage + 1, filteredSubscriptions.length)} to{" "}
              {Math.min(page * itemsPerPage, filteredSubscriptions.length)} of {filteredSubscriptions.length}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page * itemsPerPage >= filteredSubscriptions.length}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

