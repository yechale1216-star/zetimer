'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle, ShieldCheck, CreditCard } from 'lucide-react'
import { parseJsonResponse } from '@/lib/utils/parse-json-response'
import { getApiUrl } from '@/lib/api-config'

function CheckoutSimulationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const tx_id = searchParams.get('tx_id')
  const school_id = searchParams.get('school_id')
  const tier = searchParams.get('tier')
  const period = searchParams.get('period')
  const amount = searchParams.get('amount')
  const method = searchParams.get('method')

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [failed, setFailed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSimulateAction = async (isSuccess: boolean) => {
    if (!isSuccess) {
      setFailed(true)
      return
    }

    try {
      setLoading(true)
      const token = localStorage.getItem('attendance_token')
      const apiUrl = getApiUrl()

      const res = await fetch(`${apiUrl}/api/payments/verify`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tx_id, school_id, tier, period }),
      })
      const json = await parseJsonResponse<any>(res)
      if (json.success) {
        setSuccess(true)
      } else {
        setError(json.error || 'Verification failed')
      }
    } catch (err) {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center space-y-6 animate-in zoom-in-95 duration-500">
        <div className="p-4 bg-green-500/10 rounded-full">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
        </div>
        <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight">Payment Successful!</h1>
            <p className="text-muted-foreground font-medium">Your Zetime subscription has been activated.</p>
        </div>
        <Button onClick={() => router.push('/school/admin/subscription')} size="lg" className="rounded-xl font-bold px-8 shadow-lg hover:scale-105 transition-transform">
            Return to Dashboard
        </Button>
      </div>
    )
  }

  if (failed) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center space-y-6 animate-in zoom-in-95 duration-500">
          <div className="p-4 bg-red-500/10 rounded-full">
              <XCircle className="w-16 h-16 text-red-500" />
          </div>
          <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tight">Payment Failed</h1>
              <p className="text-muted-foreground font-medium">The transaction was cancelled or declined.</p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setFailed(false)} className="rounded-xl font-bold">Try Simulation Again</Button>
            <Button onClick={() => router.push('/school/admin/subscription/upgrade')} className="rounded-xl font-bold">Go Back</Button>
          </div>
        </div>
      )
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center gap-2 mb-4">
             <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="w-6 h-6" />
                <span className="text-lg font-black tracking-tighter uppercase">Chapa Sandbox</span>
             </div>
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Checkout Simulation Environment</p>
        </div>

        <Card className="border-none shadow-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl overflow-hidden border border-slate-200/60 dark:border-slate-800">
            <CardHeader className="bg-background/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 py-6">
                <CardTitle className="text-center text-sm font-black uppercase tracking-widest text-muted-foreground opacity-80">Order Summary</CardTitle>
                <div className="text-center mt-4">
                    <p className="text-4xl font-black">{parseFloat(amount || '0').toLocaleString('en-ET')} <span className="text-lg font-bold opacity-60">ETB</span></p>
                    <p className="text-[10px] font-bold text-primary mt-1 uppercase tracking-widest">{tier} • {period} Billing</p>
                </div>
            </CardHeader>
            <CardContent className="pt-8 px-8 space-y-6 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-muted-foreground">Transaction ID</span>
                    <span className="font-mono text-xs">{tx_id}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-muted-foreground">Payment Method</span>
                    <span className="font-bold capitalize">{method}</span>
                </div>

                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 space-y-2">
                    <p className="text-xs font-bold text-primary flex items-center gap-2">
                        <CreditCard className="w-3 h-3" />
                        Simulation Note
                    </p>
                    <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                        This is a simulated environment. Clicking "Confirm Payment" will trigger a verification callback to your backend to activate the subscription.
                    </p>
                </div>

                {error && (
                    <p className="text-xs text-red-500 font-bold text-center animate-pulse">{error}</p>
                )}
            </CardContent>
            <CardFooter className="p-8 pt-4 flex flex-col gap-3">
                <Button 
                    className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all" 
                    onClick={() => handleSimulateAction(true)}
                    disabled={loading}
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Payment"}
                </Button>
                <Button 
                    variant="ghost" 
                    className="w-full h-12 rounded-2xl font-bold text-xs uppercase tracking-widest text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                    onClick={() => handleSimulateAction(false)}
                    disabled={loading}
                >
                    Cancel Transaction
                </Button>
            </CardFooter>
        </Card>

        <p className="text-center text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">
            Secure Encrypted Transaction via Chapa Simulation
        </p>
    </div>
  )
}

export default function CheckoutSimulationPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
            <CheckoutSimulationContent />
        </Suspense>
    )
}
