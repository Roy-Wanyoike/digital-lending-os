'use client'

/**
 * Payment Center Component
 * Digital Lending OS - Customer Payment Hub
 * 
 * Integrated payment interface that combines:
 * - M-Pesa STK Push payment form
 * - Real-time status tracking
 * - Transaction receipt display
 * - Payment history access
 */

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CreditCard,
  Smartphone,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Shield,
  ArrowRight,
  Phone,
  Lock,
  Receipt,
  History,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

// Import M-Pesa payment components
import { MpesaPaymentForm } from '@/components/lending-os/payments/MpesaPaymentForm'
import { StkPushStatus, type StatusData } from '@/components/lending-os/payments/StkPushStatus'
import { TransactionReceipt, type TransactionData } from '@/components/lending-os/payments/TransactionReceipt'
import { PaymentHistoryList } from '@/components/lending-os/payments/PaymentHistoryList'

// Types
interface PaymentMethod {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  recommended?: boolean
}

interface LoanInfo {
  loanNumber: string
  outstandingBalance: number
  dueDate: string
  minimumPayment: number
  loanId?: string
}

interface PaymentCenterProps {
  loanInfo?: LoanInfo
  onPaymentComplete?: (reference: string) => void
}

// Mock data
const defaultLoanInfo: LoanInfo = {
  loanNumber: 'LN-2026-0042',
  outstandingBalance: 18400,
  dueDate: '2026-08-28',
  minimumPayment: 4200,
  loanId: 'loan_001'
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'mpesa',
    name: 'M-Pesa',
    icon: <Smartphone className="w-5 h-5" />,
    description: 'Pay via M-Pesa STK Push (Instant)',
    recommended: true
  },
  {
    id: 'bank',
    name: 'Bank Transfer',
    icon: <Building2 className="w-5 h-5" />,
    description: 'Direct bank transfer or Pesalink (1-3 hours)'
  },
  {
    id: 'card',
    name: 'Debit/Credit Card',
    icon: <CreditCard className="w-5 h-5" />,
    description: 'Visa or Mastercard (Coming soon)'
  }
]

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0
  }).format(amount)
}

export function PaymentCenter({ loanInfo = defaultLoanInfo, onPaymentComplete }: PaymentCenterProps) {
  const [paymentMethod, setPaymentMethod] = useState('mpesa')
  const [amountType, setAmountType] = useState<'full' | 'minimum' | 'other'>('full')
  const [customAmount, setCustomAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  
  // M-Pesa integration state
  const [checkoutRequestID, setCheckoutRequestID] = useState<string>('')
  const [showStatusTracker, setShowStatusTracker] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptData, setReceiptData] = useState<TransactionData | null>(null)
  const [activeTab, setActiveTab] = useState<'pay' | 'history'>('pay')

  // Calculate payment amount
  const getPaymentAmount = (): number => {
    switch (amountType) {
      case 'full':
        return loanInfo.outstandingBalance
      case 'minimum':
        return loanInfo.minimumPayment
      case 'other':
        return Number(customAmount) || 0
      default:
        return loanInfo.minimumPayment
    }
  }

  const paymentAmount = getPaymentAmount()

  // Handle M-Pesa STK Push initiation success
  const handleStkInitiated = useCallback((checkoutID: string) => {
    console.log('STK Push initiated:', checkoutID)
    setCheckoutRequestID(checkoutID)
    setShowStatusTracker(true)
    
    toast.success('STK Push Sent!', {
      description: 'Check your phone and enter your M-Pesa PIN to complete the payment.'
    })
  }, [])

  // Handle M-Pesa STK Push error
  const handleStkError = useCallback((error: string) => {
    console.error('STK Push error:', error)
    toast.error('Payment Initiation Failed', {
      description: error || 'Could not initiate M-Pesa payment. Please try again.'
    })
  }, [])

  // Handle payment completion from status tracker
  const handlePaymentComplete = useCallback((data: StatusData) => {
    console.log('Payment completed:', data)
    
    // Create receipt data
    const receipt: TransactionData = {
      id: `pay_${Date.now()}`,
      receiptNumber: data.mpesaReceiptNumber || '',
      referenceNumber: data.checkoutRequestID,
      type: 'STK_PUSH',
      status: 'COMPLETED',
      amount: data.amount || paymentAmount,
      currency: 'KES',
      phoneNumber: data.phoneNumber,
      transactionDate: data.transactionDate || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      merchantName: 'Digital Lending OS',
      merchantTill: '174379',
      loanId: loanInfo.loanId,
      loanNumber: loanInfo.loanNumber,
      description: `Loan repayment - ${loanInfo.loanNumber}`,
    }
    
    setReceiptData(receipt)
    setShowReceipt(true)
    setShowStatusTracker(false)
    
    onPaymentComplete?.(receipt.receiptNumber)
    
    toast.success('Payment Successful!', {
      description: `KSh ${receipt.amount?.toLocaleString()} received. Receipt: ${receipt.receiptNumber}`
    })
  }, [paymentAmount, loanInfo, onPaymentComplete])

  // Get days until due date
  const getDaysUntilDue = (): number => {
    const now = new Date()
    const due = new Date(loanInfo.dueDate)
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  const daysUntilDue = getDaysUntilDue()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pay' | 'history')}>
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
          <TabsTrigger value="pay" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Make Payment
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Make Payment Tab */}
        <TabsContent value="pay" className="mt-6 space-y-6">
          {/* Show Receipt if available */}
          {showReceipt && receiptData ? (
            <div className="space-y-4">
              <TransactionReceipt transaction={receiptData} />
              <div className="flex gap-3 justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowReceipt(false)
                    setCheckoutRequestID('')
                    setShowStatusTracker(false)
                  }}
                >
                  Make Another Payment
                </Button>
              </div>
            </div>
          ) : showStatusTracker && checkoutRequestID ? (
            /* Show Status Tracker */
            <div className="space-y-4">
              <StkPushStatus
                checkoutRequestID={checkoutRequestID}
                autoStart={true}
                pollInterval={3000}
                maxPollDuration={180000}
                onPaymentComplete={handlePaymentComplete}
                showRetry={true}
              />
              
              {!showReceipt && (
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 animate-pulse" />
                    Waiting for you to enter your M-Pesa PIN...
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Default Payment Form View */
            <>
              {/* Header */}
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
                  <CreditCard className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold">Payment Center</h2>
                <p className="text-muted-foreground mt-1">
                  Make a payment towards your loan
                </p>
              </div>

              {/* Current Loan Info */}
              <Card className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Loan</p>
                      <p className="font-semibold text-lg">{loanInfo.loanNumber}</p>
                    </div>
                    
                    <div className="text-right space-y-1">
                      <div>
                        <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                        <p className="font-bold text-xl text-primary">
                          {formatCurrency(loanInfo.outstandingBalance)}
                        </p>
                      </div>
                      
                      <div className={`flex items-center justify-end gap-1 text-sm ${
                        daysUntilDue <= 3 ? 'text-red-600' : daysUntilDue <= 7 ? 'text-amber-600' : 'text-muted-foreground'
                      }`}>
                        <Clock className="w-4 h-4" />
                        Due {new Date(loanInfo.dueDate).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                        
                        {daysUntilDue <= 7 && daysUntilDue > 0 && (
                          <Badge variant="outline" className={`ml-2 ${daysUntilDue <= 3 ? 'border-red-300 text-red-600' : 'border-amber-300 text-amber-600'}`}>
                            {daysUntilDue}d left
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Method</CardTitle>
                  <CardDescription>Choose how you'd like to pay</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RadioGroup 
                    value={paymentMethod} 
                    onValueChange={setPaymentMethod}
                    className="space-y-3"
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <label
                        key={method.id}
                        htmlFor={`method-${method.id}`}
                        className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          paymentMethod === method.id
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                            : 'border-border hover:border-emerald-300'
                        } ${method.recommended ? 'relative' : ''}`}
                      >
                        {method.recommended && (
                          <Badge className="absolute -top-2 left-4 bg-emerald-500 text-white text-xs px-2 py-0">
                            Recommended
                          </Badge>
                        )}
                        
                        <div className="flex items-center gap-4">
                          <RadioGroupItem value={method.id} id={`method-${method.id}`} />
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            paymentMethod === method.id ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-muted'
                          }`}>
                            {method.icon}
                          </div>
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              {method.name}
                              {method.recommended && (
                                <span className="text-xs text-emerald-600">(Instant)</span>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">{method.description}</p>
                          </div>
                        </div>

                        {/* Disable non-M-Pesa methods for now */}
                        {method.id !== 'mpesa' && (
                          <Badge variant="secondary" className="text-xs">
                            Coming Soon
                          </Badge>
                        )}
                      </label>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* M-Pesa Payment Form */}
              {paymentMethod === 'mpesa' && (
                <MpesaPaymentForm
                  defaultAmount={paymentAmount}
                  loanId={loanInfo.loanId}
                  onInitiated={handleStkInitiated}
                  onError={handleStkError}
                  className="mx-auto"
                />
              )}

              {/* Bank Transfer Details */}
              {paymentMethod === 'bank' && (
                <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                      <Building2 className="w-5 h-5" />
                      <span className="font-semibold">Bank Transfer Instructions</span>
                    </div>
                    
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-4 space-y-3 text-sm font-mono">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bank:</span>
                        <span className="font-medium">Equity Bank Kenya</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account Name:</span>
                        <span className="font-medium">Digital Lending OS Ltd</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account Number:</span>
                        <span className="font-bold text-blue-600">0123456789012</span>
                      </div>
                      <Separator />
                      <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded">
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
                          ⚠️ Important:
                        </p>
                        <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-1 list-disc list-inside">
                          <li>Use <strong>{loanInfo.loanNumber}</strong> as payment reference</li>
                          <li>Payments take 1-3 business hours to reflect</li>
                          <li>Email proof of payment to finance@digitallending.os</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Security Notice */}
              <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm">
                <Shield className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">Secure Payment</p>
                  <p className="text-muted-foreground mt-1">
                    Your payment information is encrypted and secure. We never store your card details or PIN.
                    All M-Pesa transactions are protected by Safaricom's security infrastructure.
                  </p>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <PaymentHistoryList 
            loanId={loanInfo.loanId}
            showFilters={true}
            showExport={true}
          />
        </TabsContent>
      </Tabs>

      {/* Help Text */}
      <p className="text-center text-sm text-muted-foreground pb-4">
        Need help?{' '}
        <a href="#" className="text-emerald-600 hover:underline">Contact Support</a>
        {' '}or call{' '}
        <a href="tel:+254700000000" className="text-emerald-600 hover:underline">0700 000 000</a>
      </p>
    </div>
  )
}

export default PaymentCenter
