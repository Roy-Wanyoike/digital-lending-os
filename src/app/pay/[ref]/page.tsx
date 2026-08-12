'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { CreditCard, Shield, CheckCircle, AlertCircle, Loader2, ExternalLink, Globe, Smartphone, Building } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

const CURRENCY_FLAGS: Record<string, string> = {
  USD: '\u{1F1FA}\u{1F1F8}', EUR: '\u{1F1EA}\u{1F1FA}', GBP: '\u{1F1EC}\u{1F1E7}', NGN: '\u{1F1F3}\u{1F1EC}', KES: '\u{1F1F0}\u{1F1EA}',
  GHS: '\u{1F1EC}\u{1F1ED}', UGX: '\u{1F1FA}\u{1F1EC}', TZS: '\u{1F1F9}\u{1F1FF}', BRL: '\u{1F1E7}\u{1F1F7}', ZAR: '\u{1F1FF}\u{1F1E6}',
}

interface PaymentLinkData {
  id: string
  linkRef: string
  title: string | null
  description: string | null
  amount: number
  currency: string
  status: string
  maxPayments: number
  paymentCount: number
  totalCollected: number
}

interface ProviderInfo {
  code: string
  name: string
  supportedMethods: string[]
 feePercent: number
}

const METHOD_ICONS: Record<string, any> = {
  card: CreditCard,
  mobile_money: Smartphone,
  mpesa: Smartphone,
  bank_transfer: Building,
  digital_wallet: Globe,
}

// Lightweight CSS-based transition (replaces ~69KB framer-motion dependency)
function TransitionWrapper({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
        transition: 'opacity 200ms ease, transform 200ms ease',
        display: show ? 'block' : 'none',
      }}
    >
      {children}
    </div>
  )
}

export default function PaymentCheckoutPage() {
  return (
    <Suspense>
      <PaymentCheckoutInner />
    </Suspense>
  )
}

function PaymentCheckoutInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const ref = params.ref as string
  const providerParam = searchParams.get('provider')
  const cancelled = searchParams.get('cancelled')

  const [link, setLink] = useState<PaymentLinkData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedMethod, setSelectedMethod] = useState('card')

  // Payer form
  const [payerName, setPayerName] = useState('')
  const [payerEmail, setPayerEmail] = useState('')
  const [payerCountry, setPayerCountry] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [paying, setPaying] = useState(false)
  const [payResult, setPayResult] = useState<{checkoutUrl?: string; providerName?: string} | null>(null)

  const loadLink = useCallback(async () => {
    if (!ref) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/payment-links/ref/' + encodeURIComponent(ref))
      const json = await res.json()
      if (!res.ok) { setError(json.error?.message || 'Payment link not found'); return }
      const found = json.data as PaymentLinkData
      if (found.status !== 'active') { setError(`This payment link is ${found.status}`); return }
      setLink(found)
      if (found.amount > 0) setPayAmount(String(found.amount))

      // Load providers for this currency
      try {
        const pres = await fetch(`/api/payments/providers?currency=${found.currency}`)
        const pjson = await pres.json()
        setProviders(pjson.data || [])
        const pList = pjson.data || []
        if (providerParam && pList.find((p: any) => p.code === providerParam)) {
          setSelectedProvider(providerParam)
        } else if (pList.length > 0) {
          setSelectedProvider(pList[0].code)
        }
      } catch { setProviders([]) }
    } catch { setError('Failed to load payment link') } finally { setLoading(false) }
  }, [ref, providerParam])

  useEffect(() => { loadLink() }, [loadLink])

  const handlePay = async () => {
    if (!link || !payerName || !payerEmail || !payAmount) return
    setPaying(true)
    setPayResult(null)
    try {
      const body: Record<string, any> = {
        amount: parseFloat(payAmount),
        payerName, payerEmail, payerCountry: payerCountry || 'US',
        paymentMethod: selectedMethod,
      }
      if (selectedProvider) body.provider = selectedProvider

      const res = await fetch(`/api/payment-links/${link.id}/pay`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message || json.error || 'Payment failed')
      const data = json.data
      if (data?.checkoutUrl) {
        setPayResult({ checkoutUrl: data.checkoutUrl, providerName: data.providerName })
        // Auto-redirect after short delay
        setTimeout(() => { window.location.href = data.checkoutUrl }, 1500)
      } else {
        setPayResult({ providerName: 'Demo Mode' })
      }
    } catch (e: any) { setError(e.message) } finally { setPaying(false) }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400 dark:text-slate-500" aria-hidden="true" />
        <span className="sr-only">Loading payment page…</span>
      </div>
    )
  }

  if (error && !link) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" aria-hidden="true" />
            <h1 className="text-lg font-semibold mb-2">Payment Unavailable</h1>
            <p className="text-sm text-muted-foreground" role="alert">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">YS</span>
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">Youngsend</p>
              <p className="text-xs text-muted-foreground">Secure Payment</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-emerald-500" aria-hidden="true" />
            <span className="text-xs text-muted-foreground">Secured by Youngsend Escrow</span>
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-2xl mx-auto px-4 py-8">
        {cancelled && (
          <div className="mb-6 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400" role="status">
            Payment was cancelled. You can try again below.
          </div>
        )}

        <TransitionWrapper show={!payResult}>
              <h1 className="sr-only">Payment — {link?.title || 'Checkout'}</h1>
              {/* Payment Details Card */}
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="font-semibold text-lg text-foreground">{link?.title || 'Payment'}</h2>
                      {link?.description && <p className="text-sm text-muted-foreground mt-1">{link.description}</p>}
                    </div>
                    {link?.currency && (
                      <span className="text-2xl">{CURRENCY_FLAGS[link.currency] || '\u{1F4B0}'}</span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-3xl font-bold">
                      {link?.currency || 'USD'} {link?.amount === 0 ? '' : link?.amount?.toLocaleString()}
                    </span>
                    {link?.amount === 0 && <span className="text-muted-foreground">Open amount</span>}
                  </div>
                  <Separator className="mb-4" />
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div>Ref: <span className="font-mono text-xs">{ref}</span></div>
                    <div>Status: <Badge variant="default">Active</Badge></div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Form */}
              <Card>
                <CardHeader><CardTitle className="text-base">Payment Details</CardTitle></CardHeader>
                <CardContent className="space-y-5">
                  {/* Provider Selection */}
                  {providers.length > 0 && (
                    <div className="space-y-2">
                      <Label>Payment Provider</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {providers.map(p => (
                          <button
                            key={p.code}
                            onClick={() => setSelectedProvider(p.code)}
                            className={`p-3 rounded-lg border-2 text-center transition-all ${selectedProvider === p.code ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
                            aria-pressed={selectedProvider === p.code}
                          >
                            <p className="text-sm font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.feePercent}% fee</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {providers.length === 0 && (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
                      No payment providers configured. Payment will be recorded in demo mode.
                    </div>
                  )}

                  {/* Method Selection */}
                  {selectedProvider && providers.find(p => p.code === selectedProvider)?.supportedMethods && (
                    <div className="space-y-2">
                      <Label>Payment Method</Label>
                      <div className="flex flex-wrap gap-2">
                        {providers.find(p => p.code === selectedProvider)!.supportedMethods.map(m => {
                          const Icon = METHOD_ICONS[m] || CreditCard
                          return (
                            <button
                              key={m}
                              onClick={() => setSelectedMethod(m)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-all ${selectedMethod === m ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
                              aria-pressed={selectedMethod === m}
                            >
                              <Icon className="h-4 w-4" />
                              <span>{m.replace(/_/g, ' ')}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Payer Info */}
                  <div className="space-y-4">
                    <div className="space-y-2"><Label htmlFor="payerName">Full Name *</Label>
                      <Input id="payerName" placeholder="John Doe" value={payerName} onChange={e => setPayerName(e.target.value)} />
                    </div>
                    <div className="space-y-2"><Label htmlFor="payerEmail">Email *</Label>
                      <Input id="payerEmail" type="email" placeholder="john@example.com" value={payerEmail} onChange={e => setPayerEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2"><Label>Country</Label>
                      <Select value={payerCountry} onValueChange={setPayerCountry}>
                        <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                        <SelectContent>{['US','GB','NG','KE','GH','UG','TZ','ZA','IN','DE','BR','AE','SG','AU','JP','CN'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>

                    {/* Open Amount */}
                    {link?.amount === 0 && (
                      <div className="space-y-2"><Label>Amount ({link?.currency || 'USD'}) *</Label>
                        <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
                      </div>
                    )}
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400" role="alert">
                      {error}
                    </div>
                  )}

                  {/* Pay Button */}
                  <Button
                    className="w-full h-12 text-base font-semibold"
                    onClick={handlePay}
                    disabled={!payerName || !payerEmail || !payAmount || paying}
                  >
                    {paying ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CreditCard className="h-5 w-5 mr-2" />}
                    {paying ? 'Processing...' : `Pay ${link?.currency || 'USD'} ${Number(payAmount).toLocaleString()}`}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    <Shield className="h-3 w-3 inline mr-1" aria-hidden="true" />
                    Payments are secured and processed through our trusted providers
                  </p>
                </CardContent>
              </Card>
          </TransitionWrapper>
          <TransitionWrapper show={!!payResult}>
              <Card>
                <CardContent className="p-12 text-center">
                  {payResult && payResult.checkoutUrl ? (
                    <>
                      <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                      <h2 className="text-xl font-semibold mb-2">Redirecting to {payResult.providerName}...</h2>
                      <p className="text-sm text-muted-foreground mb-6">You will be redirected to complete your payment securely.</p>
                      <Button onClick={() => window.location.href = payResult.checkoutUrl!}>
                        <ExternalLink className="h-4 w-4 mr-2" />Continue to Payment
                      </Button>
                    </>
                  ) : payResult ? (
                    <>
                      <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                      <h2 className="text-xl font-semibold mb-2">Payment Recorded</h2>
                      <p className="text-sm text-muted-foreground">Payment has been recorded in demo mode.</p>
                    </>
                  ) : null}
                </CardContent>
              </Card>
          </TransitionWrapper>
      </main>
    </div>
  )
}