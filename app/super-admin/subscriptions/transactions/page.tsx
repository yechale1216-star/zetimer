"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Loader2 } from "lucide-react"
import { getApiUrl } from "@/lib/api-config"

interface Row {
  id: string
  amount: number
  currency: string
  status: string
  type: string
  description: string
  createdAt: string
  schoolName: string
}

export default function TransactionsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${getApiUrl()}/api/super-admin/transactions`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('attendance_token')}`
      }
    })
      .then(res => res.json())
      .then(json => {
        if (json.success) setRows(json.data)
      })
      .catch(err => console.error("Error fetching transactions:", err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/super-admin/subscriptions">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Subscriptions
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Transactions</h1>
        <p className="text-muted-foreground mt-1">Ledger of charges, refunds, and adjustments across all schools.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All transactions</CardTitle>
          <CardDescription>{rows.length} rows</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground italic">
              No transactions recorded yet.
            </div>
          ) : (
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4 text-[10px] uppercase font-semibold">When</th>
                  <th className="py-2 pr-4 text-[10px] uppercase font-semibold">School</th>
                  <th className="py-2 pr-4 text-[10px] uppercase font-semibold">Type</th>
                  <th className="py-2 pr-4 text-[10px] uppercase font-semibold">Amount</th>
                  <th className="py-2 pr-4 text-[10px] uppercase font-semibold">Status</th>
                  <th className="py-2 text-[10px] uppercase font-semibold">Memo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/70 hover:bg-secondary/20 transition-colors">
                    <td className="py-4 pr-4 whitespace-nowrap text-muted-foreground">{r.createdAt}</td>
                    <td className="py-4 pr-4 font-medium">{r.schoolName}</td>
                    <td className="py-4 pr-4 capitalize">{r.type}</td>
                    <td className={`py-4 pr-4 font-medium ${r.amount < 0 ? "text-green-600" : ""}`}>
                      {r.currency} {r.amount.toLocaleString()}
                    </td>
                    <td className="py-4 pr-4">
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {r.status}
                      </Badge>
                    </td>
                    <td className="py-4 text-muted-foreground">{r.description}</td>
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

