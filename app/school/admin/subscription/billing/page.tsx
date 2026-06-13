'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Download, Loader2, ArrowUpRight, History } from 'lucide-react'
import { parseJsonResponse } from '@/lib/utils/parse-json-response'
import { getApiUrl } from '@/lib/auth/auth'

interface BillingRecord {
  id: string
  subscriptionId: string
  amount: number
  date: string
  status: 'completed' | 'failed' | 'pending'
  description: string
  invoiceUrl?: string
  paymentMethod?: string
}

export default function BillingHistoryPage() {
  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBillingHistory()
  }, [])

  const fetchBillingHistory = async () => {
    try {
      const token = localStorage.getItem('attendance_token')
      // Use the authenticated /me/billing endpoint — same as the overview page
      const res = await fetch(`${getApiUrl()}/api/subscriptions/me/billing`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const json = await parseJsonResponse<any>(res)
      if (json.success) {
        const mapped: BillingRecord[] = (json.data || []).map((tx: any) => ({
          id: tx.id,
          subscriptionId: tx.subscriptionId || tx.id,
          amount: tx.amount,
          date: new Date(tx.createdAt).toLocaleDateString('en-ET', { timeZone: 'Africa/Addis_Ababa' }),
          status:
            tx.status === 'completed' || tx.status === 'success'
              ? 'completed'
              : tx.status === 'failed'
              ? 'failed'
              : 'pending',
          description: tx.description,
          invoiceUrl: tx.invoiceUrl,
          paymentMethod: tx.paymentMethod,
        }))
        setBillingHistory(mapped)
      }
    } catch (err) {
      console.error('[subscription] Error fetching billing history:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-none shadow-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800">
        <CardHeader className="pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Billing History</CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-70">
                View and download your past transactions
              </CardDescription>
            </div>
            <Button
              variant="outline"
              className="gap-2 bg-white/95 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 rounded-xl font-bold uppercase tracking-tight text-xs h-10 hover:scale-[1.02] transition-transform"
            >
              <Download className="w-4 h-4" />
              Export All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {billingHistory.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground flex flex-col items-center justify-center">
              <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-bold uppercase tracking-widest text-[10px]">No billing history found.</p>
              <p className="text-xs mt-1 font-medium">Your past transactions will appear here.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200/60 dark:border-slate-800 overflow-hidden bg-background/50 dark:bg-slate-800/20">
              <Table>
                <TableHeader className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
                  <TableRow className="border-b border-slate-200/60 dark:border-slate-800/60 hover:bg-transparent">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Method</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amount</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {billingHistory.map((record) => (
                    <TableRow
                      key={record.id}
                      className="hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors border-none"
                    >
                      <TableCell className="font-bold text-sm whitespace-nowrap">{record.date}</TableCell>
                      <TableCell className="font-medium text-sm">{record.description}</TableCell>
                      <TableCell>
                        {record.paymentMethod ? (
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 uppercase tracking-tighter bg-secondary/50 border-slate-300 dark:border-slate-600">
                            {record.paymentMethod}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-black text-sm">{record.amount.toLocaleString('en-ET')} ETB</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            record.status === 'completed'
                              ? 'default'
                              : record.status === 'pending'
                              ? 'secondary'
                              : 'destructive'
                          }
                          className={`text-[9px] uppercase tracking-tighter font-black ${
                            record.status === 'completed'
                              ? 'bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20 border-green-200 dark:border-green-800'
                              : ''
                          }`}
                        >
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {record.invoiceUrl ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 rounded-lg h-8 hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => window.open(record.invoiceUrl, '_blank')}
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span className="sr-only sm:not-sr-only text-[10px] font-bold uppercase tracking-wider">Receipt</span>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-muted-foreground rounded-lg h-8 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Details</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
