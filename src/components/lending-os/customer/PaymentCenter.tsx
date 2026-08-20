'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
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
  Receipt
} from 'lucide-react'
import { toast } from 'sonner'

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
  minimumPayment: 4200
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'mpesa',
    name: 'M-Pesa',
    icon: <Smartphone className="w-5 h-5" />,
    description: 'Pay via M-Pesa STK Push',
    recommended: true
  },
  {
    id: 'bank',
    name: 'Bank Transfer',
    icon: <Building2 className="w-5 h-5" />,
    description: 'Direct bank transfer or Pesalink'
  },
  {
    id: 'card',
    name: 'Debit/Credit Card',
    icon: <CreditCard className="w-5 h-5" />,
    description: 'Visa or Mastercard'
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
  const [mpesaNumber, setMpesaNumber] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [transactionRef, setTransactionRef] = useState('')

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

  // Validate form
  const isFormValid = (): boolean => {
    if (paymentAmount <= 0 || paymentAmount > loanInfo.outstandingBalance) return false
    if (paymentMethod === 'mpesa' && mpesaNumber.length < 9) return false
    return true
  }

  // Handle payment submission
  const handleSubmit = async () => {
    if (!isFormValid()) {
      toast.error('Please fill in all required fields correctly')
      return
    }

    setIsProcessing(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Generate mock reference number
      const ref = `MP${Date.now().toString().slice(-8)}`
      setTransactionRef(ref)

      setShowConfirmation(true)
      
      onPaymentComplete?.(ref)
      
      toast.success('Payment Initiated Successfully!', {
        description: `Reference: ${ref}`
      })
    } catch (error) {
      toast.error('Payment Failed', {
        description: 'Please try again or contact support'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Reset form
  const handleReset = () => {
    setShowConfirmation(false)
    setCustomAmount('')
    setTransactionRef('')
  }

  // Get days until due date
  const getDaysUntilDue = (): number => {
    const now = new Date()
    const due = new Date(loanInfo.dueDate)
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  const daysUntilDue = getDaysUntilDue()

  if (showConfirmation) {
    return (
      <div className="max-w-lg mx-auto">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-8 text-center text-white">
            <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold">Payment Initiated!</h2>
            <p className="text-emerald-100 mt-2">
              Complete your payment using the instructions below
            </p>
          </div>
          
          <CardContent className="p-6 space-y-6">
            {/* Reference Number */}
            <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
              <p className="text-sm text-muted-foreground">Transaction Reference</p>
              <p className="text-xl font-mono font-bold text-emerald-600 mt-1">
                {transactionRef}
              </p>
            </div>

            {/* M-Pesa Instructions */}
            {paymentMethod === 'mpesa' && (
              <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-green-800 dark:text-green-200 flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    M-Pesa Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <ol className="space-y-2 list-decimal list-inside text-green-700 dark:text-green-300">
                    <li>Go to M-Pesa menu on your phone</li>
                    <li>Select <strong>Lipa na M-Pesa</strong></li>
                    <li>Choose <strong>Pay Bill</strong></li>
                    <li>Enter Business Number: <strong>123456</strong></li>
                    <li>Enter Account Number: <strong>{transactionRef}</strong></li>
                    <li>Enter Amount: <strong>{formatCurrency(paymentAmount)}</strong></li>
                    <li>Enter your M-Pesa PIN and confirm</li>
                  </ol>
                  
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  <span className="text-xs text-green-600 dark:text-green-400">
                    You will receive an STK push on your phone ({mpesaNumber})
                  </span>
                </CardContent>
              </Card>
            )}

            {/* Payment Summary */}
            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <h4 className="font-medium">Payment Summary</h4>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Loan</span>
                  <span>{loanInfo.loanNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-semibold">{formatCurrency(paymentAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <span className="capitalize">{paymentMethod === 'mpesa' ? 'M-Pesa' : paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                    Pending Confirmation
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleReset} variant="outline" className="flex-1">
                Make Another Payment
              </Button>
              <Button onClick={() => window.print()} variant="outline" className="gap-2">
                <Receipt className="w-4 h-4" />
                Print Receipt
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
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
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Amount Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Payment Amount</CardTitle>
          <CardDescription>Choose how much you want to pay</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup 
            value={amountType} 
            onValueChange={(v) => setAmountType(v as typeof amountType)}
            className="space-y-3"
          >
            {/* Full Amount Option */}
            <label 
              htmlFor="amount-full"
              className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                amountType === 'full' 
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' 
                  : 'border-transparent bg-muted/50 hover:bg-muted'
              }`}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="full" id="amount-full" />
                <div>
                  <p className="font-medium">Full Amount</p>
                  <p className="text-sm text-muted-foreground">Pay off entire balance</p>
                </div>
              </div>
              <span className="font-bold text-emerald-600">
                {formatCurrency(loanInfo.outstandingBalance)}
              </span>
            </label>

            {/* Minimum Payment Option */}
            <label 
              htmlFor="amount-minimum"
              className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                amountType === 'minimum' 
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' 
                  : 'border-transparent bg-muted/50 hover:bg-muted'
              }`}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="minimum" id="amount-minimum" />
                <div>
                  <p className="font-medium">Minimum Due</p>
                  <p className="text-sm text-muted-foreground">Required installment amount</p>
                </div>
              </div>
              <span className="font-bold text-blue-600">
                {formatCurrency(loanInfo.minimumPayment)}
              </span>
            </label>

            {/* Custom Amount Option */}
            <label 
              htmlFor="amount-other"
              className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                amountType === 'other' 
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' 
                  : 'border-transparent bg-muted/50 hover:bg-muted'
              }`}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="other" id="amount-other" />
                <div>
                  <p className="font-medium">Other Amount</p>
                  <p className="text-sm text-muted-foreground">Enter custom amount</p>
                </div>
              </div>
              <Input
                type="number"
                placeholder="KSh 0"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                disabled={amountType !== 'other'}
                className="w-32 text-right"
                min={100}
                max={loanInfo.outstandingBalance}
              />
            </label>
          </RadioGroup>

          {/* Selected Amount Display */}
          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
            <span className="font-medium">You're paying:</span>
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(paymentAmount)}
            </span>
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
              </label>
            ))}
          </RadioGroup>

          {/* M-Pesa Number Input */}
          {paymentMethod === 'mpesa' && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <Label htmlFor="mpesa-number" className="flex items-center gap-2 mb-2">
                <Phone className="w-4 h-4 text-green-600" />
                M-Pesa Registered Phone Number
              </Label>
              <div className="flex gap-2">
                <span className="flex items-center px-3 py-2 bg-white dark:bg-slate-900 border rounded-md text-sm font-medium">
                  +254
                </span>
                <Input
                  id="mpesa-number"
                  type="tel"
                  placeholder="712 345 678"
                  value={mpesaNumber}
                  onChange={(e) => setMpesaNumber(e.target.value.replace(/\s/g, ''))}
                  maxLength={9}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                You'll receive an STK push on this number to confirm payment
              </p>
            </div>
          )}

          {/* Bank Details for Bank Transfer */}
          {paymentMethod === 'bank' && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Label className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-blue-600" />
                Bank Account Details
              </Label>
              <div className="bg-white dark:bg-slate-900 rounded-lg p-4 space-y-2 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank:</span>
                  <span>Equity Bank Kenya</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Name:</span>
                  <span>Digital Lending OS Ltd</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Number:</span>
                  <span>0123456789012</span>
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground pt-2">
                  Use your loan number ({loanInfo.loanNumber}) as the payment reference
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm">
        <Shield className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-slate-700 dark:text-slate-300">Secure Payment</p>
          <p className="text-muted-foreground mt-1">
            Your payment information is encrypted and secure. We never store your card details or PIN.
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        size="lg"
        onClick={handleSubmit}
        disabled={!isFormValid() || isProcessing}
        className="w-full gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-lg py-6"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            Pay {formatCurrency(paymentAmount)}
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </Button>

      {/* Help Text */}
      <p className="text-center text-sm text-muted-foreground">
        Need help?{' '}
        <a href="#" className="text-emerald-600 hover:underline">Contact Support</a>
        {' '}or call{' '}
        <a href="tel:+254700000000" className="text-emerald-600 hover:underline">0700 000 000</a>
      </p>
    </div>
  )
}

export default PaymentCenter
