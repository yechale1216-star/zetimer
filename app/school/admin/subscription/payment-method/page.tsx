'use client'

import React, { useState, Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, ArrowLeft, CreditCard } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'
import { parseJsonResponse } from '@/lib/utils/parse-json-response'
import { authService } from '@/lib/auth/auth'
import { getApiUrl } from '@/lib/api-config'
import type { TierPlan, BillingPeriod } from '@/lib/utils/subscription-types'
import { TIER_CONFIG, calculateDynamicPrice } from '@/lib/utils/pricing-utils'

function PaymentMethodContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const tier = (searchParams.get('tier') as TierPlan) || 'starter'
  const period = (searchParams.get('period') as BillingPeriod) || 'monthly'
  
  const [paymentMethod, setPaymentMethod] = useState<string>('telebirr')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [studentCount, setStudentCount] = useState<number>(0)

  // Fetch current student count to accurately calculate the price
  React.useEffect(() => {
    const fetchSub = async () => {
      try {
        const user = authService.getCurrentUser()
        const schoolId = user?.schoolId || 's1'
        const apiUrl = getApiUrl()
        const token = localStorage.getItem('attendance_token')
        const res = await fetch(`${apiUrl}/api/subscriptions/schools/${schoolId}/subscription`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const json = await parseJsonResponse<any>(res)
        if (json.success) {
          setStudentCount(json.data.studentCount || 0)
        }
      } catch (err) {
        console.error('Error fetching student count', err)
      }
    }
    fetchSub()
  }, [])

  const handleProceed = async () => {
    try {
      setLoading(true)
      setError(null)
      const user = authService.getCurrentUser()
      const schoolId = user?.schoolId || 's1' // fallback for demo/dev
      const apiUrl = getApiUrl()
      const token = localStorage.getItem('attendance_token')
      const res = await fetch(`${apiUrl}/api/payments/initialize`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          schoolId, 
          tier, 
          billingPeriod: period, 
          paymentMethod 
        }),
      })
      const json = await parseJsonResponse<any>(res)
      if (json.success && json.checkout_url) {
        window.location.href = json.checkout_url
      } else {
        setError(json.error || 'Failed to initialize payment')
      }
    } catch (err) {
      console.error('[v0] Error updating subscription:', err)
      setError('Failed to update plan')
    } finally {
      setLoading(false)
    }
  }

  const tierConfig = TIER_CONFIG[tier]
  
  const breakdown = calculateDynamicPrice({
    studentCount: Math.max(studentCount, 1), // use at least 1 to avoid zero base if new
    tier,
    billingPeriod: period,
    addons: []
  })

  const discountedPrice = breakdown.total
  const discount = breakdown.discountAmount > 0 ? (breakdown.discountAmount / breakdown.subtotal) : 0

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 py-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Checkout</h2>
          <p className="text-muted-foreground mt-1">Complete your subscription upgrade.</p>
        </div>
      </div>

      {error && (
        <Card className="border-none shadow-sm bg-red-50/80 dark:bg-red-950/80 backdrop-blur-md rounded-2xl border border-red-200/60 dark:border-red-800">
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <p className="text-destructive font-bold text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-none shadow-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800">
            <CardHeader className="pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
              <CardTitle className="text-lg font-bold">Select Payment Method</CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-70">Choose your preferred Ethiopian local payment gateway</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {[
                  { id: 'telebirr', name: 'Telebirr', desc: 'Ethio Telecom Mobile Payment', color: 'border-orange-400 bg-orange-50 dark:bg-orange-950/30', activeColor: 'ring-2 ring-orange-500', dot: 'bg-orange-500', emoji: '📱' },
                  { id: 'cbe', name: 'CBE Birr', desc: 'Commercial Bank of Ethiopia', color: 'border-blue-400 bg-blue-50 dark:bg-blue-950/30', activeColor: 'ring-2 ring-blue-500', dot: 'bg-blue-600', emoji: '🏦' },
                  { id: 'dashen', name: 'Dashen Bank', desc: 'Dashen Bank Mobile & Online', color: 'border-green-400 bg-green-50 dark:bg-green-950/30', activeColor: 'ring-2 ring-green-500', dot: 'bg-green-600', emoji: '💳' },
                ].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex items-center w-full gap-4 p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${method.color} ${paymentMethod === method.id ? method.activeColor : 'hover:opacity-80'}`}
                  >
                    <span className="text-3xl">{method.emoji}</span>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-foreground">{method.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{method.desc}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentMethod === method.id ? method.dot + ' border-transparent' : 'border-muted-foreground'}`}>
                      {paymentMethod === method.id && <span className="w-2 h-2 rounded-full bg-white block" />}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-primary/5 backdrop-blur-md rounded-2xl border border-primary/20">
            <CardHeader className="pb-4 border-b border-primary/10">
              <CardTitle className="text-lg font-bold">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-center py-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Plan</span>
                <span className="font-bold text-sm capitalize">{tierConfig?.label || tier}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Billing Period</span>
                <span className="font-bold text-sm capitalize">{period}</span>
              </div>
              <div className="border-t border-primary/10 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black uppercase tracking-widest text-foreground">Total</span>
                  <span className="font-black text-xl text-primary">{discountedPrice.toLocaleString('en-ET')} ETB</span>
                </div>
                {discount > 0 && (
                  <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest text-right mt-1 opacity-80">
                    Includes {discount * 100}% discount
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Button 
            className="w-full rounded-xl font-bold uppercase tracking-widest text-xs h-12 transition-all shadow-md active:scale-95" 
            size="lg" 
            onClick={handleProceed}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Proceed to Payment
              </>
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-4">
            Secured by Chapa Payment Gateway
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PaymentMethodPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <PaymentMethodContent />
    </Suspense>
  )
}
