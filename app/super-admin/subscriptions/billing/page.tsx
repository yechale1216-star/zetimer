"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ChevronLeft, Download, Search, Loader2 } from "lucide-react"
import { getApiUrl } from "@/lib/api-config"

interface Row {
  id: string
  subscriptionId: string
  amount: number
  date: string
  status: string
  description: string
  schoolName: string
  plan: string
  billingPeriod: string
}

export default function BillingHistoryPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    setLoading(true)
    fetch(`${getApiUrl()}/api/super-admin/billing?page=${page}&limit=30`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('attendance_token')}` }
    })
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setRows(json.data)
          setTotal(json.data.length)
        }
      })
      .finally(() => setLoading(false))
  }, [page])

  const filtered = rows.filter(r =>
    !search ||
    r.schoolName.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase())
  )

  const totalRevenue = filtered.reduce((sum, r) => sum + (r.amount || 0), 0)

  const getStatusBadge = (s: string) => {
    if (s === 'active') return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 capitalize">{s}</Badge>
    if (s === 'suspended') return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 capitalize">{s}</Badge>
    if (s === 'trial') return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 capitalize">{s}</Badge>
    return <Badge variant="secondary" className="capitalize">{s}</Badge>
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/super-admin/subscriptions"><ChevronLeft className="w-4 h-4 mr-1" />Subscriptions</Link>
          </Button>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={`${getApiUrl()}/api/super-admin/billing-export`}>
            <Download className="w-4 h-4 mr-2" />Export CSV
          </a>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Billing History</h1>
        <p className="text-muted-foreground mt-1">All schools — active subscription charges across the platform.</p>
      </div>

      {/* Summary card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase font-semibold">Total Records</p><p className="text-2xl font-bold">{filtered.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase font-semibold">Total Revenue (MRR)</p><p className="text-2xl font-bold">ETB {totalRevenue.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase font-semibold">Active</p><p className="text-2xl font-bold">{filtered.filter(r => r.status === 'active').length}</p></CardContent></Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Filter by school or description..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription Charges</CardTitle>
          <CardDescription>{filtered.length} records</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground italic">No billing records yet. Schools need active subscriptions to appear here.</div>
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4 text-[10px] font-semibold uppercase tracking-wider">Date</th>
                  <th className="py-2 pr-4 text-[10px] font-semibold uppercase tracking-wider">School</th>
                  <th className="py-2 pr-4 text-[10px] font-semibold uppercase tracking-wider">Plan</th>
                  <th className="py-2 pr-4 text-[10px] font-semibold uppercase tracking-wider">Period</th>
                  <th className="py-2 pr-4 text-[10px] font-semibold uppercase tracking-wider">Amount (ETB)</th>
                  <th className="py-2 pr-4 text-[10px] font-semibold uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border/70 hover:bg-secondary/20 transition-colors">
                    <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">{r.date}</td>
                    <td className="py-3 pr-4 font-medium">{r.schoolName}</td>
                    <td className="py-3 pr-4">{r.plan}</td>
                    <td className="py-3 pr-4 capitalize">{r.billingPeriod}</td>
                    <td className="py-3 pr-4 font-medium">ETB {r.amount.toLocaleString()}</td>
                    <td className="py-3 pr-4">{getStatusBadge(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
