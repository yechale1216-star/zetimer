"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { parseJsonResponse } from "@/lib/utils/parse-json-response"
import { ChevronLeft } from "lucide-react"

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

  useEffect(() => {
    ;(async () => {
      const res = await fetch("/api/super-admin/transactions")
      const json = await parseJsonResponse<{ success: boolean; data: Row[] }>(res)
      if (json.success) setRows(json.data)
    })()
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
        <p className="text-muted-foreground mt-1">Ledger of charges, refunds, and adjustments.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All transactions</CardTitle>
          <CardDescription>{rows.length} rows</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4">When</th>
                <th className="py-2 pr-4">School</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Memo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/70">
                  <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">{r.createdAt}</td>
                  <td className="py-3 pr-4 font-medium">{r.schoolName}</td>
                  <td className="py-3 pr-4 capitalize">{r.type}</td>
                  <td className={`py-3 pr-4 font-medium ${r.amount < 0 ? "text-green-600" : ""}`}>
                    {r.currency} {r.amount.toLocaleString()}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant="outline" className="capitalize">
                      {r.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-muted-foreground">{r.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

