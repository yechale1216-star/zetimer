'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Download, Loader2, FileText } from 'lucide-react'
import { parseJsonResponse } from '@/lib/utils/parse-json-response'

const SCHOOL_ID = 's1'

interface Invoice {
  id: string
  number: string
  amount: number
  currency: string
  status: 'draft' | 'open' | 'paid' | 'void'
  issuedAt: string
  dueAt: string
  pdfUrl?: string
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`/api/subscriptions/school/${SCHOOL_ID}/invoices`)
      if (res.ok) {
        const json = await parseJsonResponse<any>(res)
        if (json.success) {
          setInvoices(json.data.invoices || [])
        }
      } else {
        // Mock fallback if API not implemented
        setTimeout(() => {
          setInvoices([
            {
              id: 'inv_1',
              number: 'INV-2026-001',
              amount: 299.00,
              currency: 'USD',
              status: 'paid',
              issuedAt: '2026-05-01',
              dueAt: '2026-05-15',
              pdfUrl: '#'
            },
            {
              id: 'inv_2',
              number: 'INV-2026-002',
              amount: 299.00,
              currency: 'USD',
              status: 'open',
              issuedAt: '2026-06-01',
              dueAt: '2026-06-15',
            }
          ])
        }, 500)
      }
    } catch (err) {
      console.error('[v0] Error fetching invoices:', err)
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
              <CardTitle className="text-lg font-bold">Invoices</CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-70">Manage and download your billing invoices</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {invoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-bold uppercase tracking-widest text-[10px]">No invoices found.</p>
              <p className="text-xs mt-1 font-medium">When you are billed, invoices will appear here.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200/60 dark:border-slate-800 overflow-hidden bg-background/50 dark:bg-slate-800/20">
              <Table>
                <TableHeader className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
                  <TableRow className="border-b border-slate-200/60 dark:border-slate-800/60 hover:bg-transparent">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Invoice Number</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Issued Date</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Due Date</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amount</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors border-none">
                      <TableCell className="font-bold text-sm">
                        {invoice.number}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{invoice.issuedAt}</TableCell>
                      <TableCell className="font-medium text-sm">{invoice.dueAt}</TableCell>
                      <TableCell className="font-black text-sm">{invoice.amount.toFixed(2)} {invoice.currency}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            invoice.status === 'paid' ? 'default' : 
                            invoice.status === 'open' ? 'secondary' : 
                            invoice.status === 'void' ? 'destructive' : 'outline'
                          }
                          className={`text-[9px] uppercase tracking-tighter font-black ${invoice.status === 'paid' ? 'bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20 border-green-200 dark:border-green-800' : ''}`}
                        >
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="gap-2 rounded-lg h-8 hover:bg-slate-100 dark:hover:bg-slate-800" disabled={!invoice.pdfUrl}>
                          <Download className="w-4 h-4" />
                          <span className="sr-only sm:not-sr-only text-[10px] font-bold uppercase tracking-wider">Download PDF</span>
                        </Button>
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

