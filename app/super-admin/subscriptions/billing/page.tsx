"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { parseJsonResponse } from "@/lib/utils/parse-json-response"
import { ChevronLeft, Download } from "lucide-react"

interface Row {
  id: string
  subscriptionId: string
  amount: number
  date: string
  status: string
  description: string
  schoolName: string
}

export default function BillingHistoryPage() {
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    ;(async () => {
      const res = await fetch("/api/super-admin/billing")
      const json = await parseJsonResponse<{ success: boolean; data: Row[] }>(res)
      if (json.success) setRows(json.data)
    })()
  }, [])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/super-admin/subscriptions">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Subscriptions
            </Link>
          </Button>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="/api/super-admin/billing-export">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </a>
        </Button>
      </div>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Billing history</h1>
        <p className="text-muted-foreground mt-1">All schools — posted subscription charges.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Charges</CardTitle>
          <CardDescription>{rows.length} records</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">School</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/70">
                  <td className="py-3 pr-4 whitespace-nowrap">{r.date}</td>
                  <td className="py-3 pr-4 font-medium">{r.schoolName}</td>
                  <td className="py-3 pr-4">${r.amount.toLocaleString()}</td>
                  <td className="py-3 pr-4">
                    <Badge variant="secondary" className="capitalize">
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

