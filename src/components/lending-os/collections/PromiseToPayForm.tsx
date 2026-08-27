'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import {
  CalendarIcon,
  Handshake,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Phone,
  MessageSquare,
  Smartphone,
  Building2,
  PartyPopper
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { OverdueLoan } from './types'

interface PromiseToPayFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: OverdueLoan | null
  onSuccess?: (data: PromiseData) => void
}

export interface PromiseData {
  promisedAmount: number
  promisedDate: string
  paymentMethod: string
  notes: string
  sendConfirmationSMS: boolean
  sendConfirmationWhatsApp: boolean
}

// Payment methods available in Kenya
const paymentMethods = [
  { value: 'mpesa', label: 'M-Pesa', icon: Smartphone, color: 'text-green-600' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2, color: 'text-blue-600' },
  { value: 'cash', label: 'Cash Deposit', icon: CheckCircle2, color: 'text-amber-600' },
  { value: 'other', label: 'Other', icon: AlertCircle, color: 'text-slate-600' }
]

export function PromiseToPayForm({
  open,
  onOpenChange,
  loan,
  onSuccess
}: PromiseToPayFormProps) {
  const [promisedAmount, setPromisedAmount] = useState<string>('')
  const [promisedDate, setPromisedDate] = useState<Date>()
  const [paymentMethod, setPaymentMethod] = useState<string>('mpesa')
  const [notes, setNotes] = useState<string>('')
  const [sendConfirmationSMS, setSendConfirmationSMS] = useState(true)
  const [sendConfirmationWhatsApp, setSendConfirmationWhatsApp] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when dialog opens/closes or loan changes
  useEffect(() => {
    if (open && loan) {
      resetForm()
    }
    if (!open) {
      setIsSuccess(false)
    }
  }, [open, loan])

  const resetForm = () => {
    setPromisedAmount('')
    setPromisedDate(undefined)
    setPaymentMethod('mpesa')
    setNotes('')
    setSendConfirmationSMS(true)
    setSendConfirmationWhatsApp(false)
    setCalendarOpen(false)
    setErrors({})
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm()
    }
    onOpenChange(isOpen)
  }

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!loan) {
      newErrors.general = 'No loan selected'
    }

    const amount = parseFloat(promisedAmount)
    if (!promisedAmount || isNaN(amount)) {
      newErrors.amount = 'Please enter a valid amount'
    } else if (amount <= 0) {
      newErrors.amount = 'Amount must be greater than zero'
    } else if (loan && amount > loan.outstandingBalance) {
      newErrors.amount = `Amount cannot exceed outstanding balance (KSh ${loan.outstandingBalance.toLocaleString()})`
    }

    if (!promisedDate) {
      newErrors.date = 'Please select a promise date'
    } else {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (promisedDate <= today) {
        newErrors.date = 'Promise date must be in the future'
      }

      // Max 90 days from today
      const maxDate = new Date()
      maxDate.setDate(maxDate.getDate() + 90)
      if (promisedDate > maxDate) {
        newErrors.date = 'Promise date cannot be more than 90 days from now'
      }
    }

    if (!paymentMethod) {
      newErrors.paymentMethod = 'Please select a payment method'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))

      const data: PromiseData = {
        promisedAmount: parseFloat(promisedAmount),
        promisedDate: promisedDate!.toISOString(),
        paymentMethod,
        notes,
        sendConfirmationSMS,
        sendConfirmationWhatsApp
      }

      // Show success animation
      setIsSuccess(true)

      // Show success toast
      toast.success(`Promise recorded successfully!`, {
        description: `KSh ${parseFloat(promisedAmount).toLocaleString()} by ${format(promisedDate!, 'MMM d, yyyy')}`
      })

      // Call success callback
      onSuccess?.(data)

      // Close after delay to show success state
      setTimeout(() => {
        handleClose(false)
      }, 2000)

    } catch (error) {
      console.error('Error recording promise:', error)
      toast.error('Failed to record promise. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Format currency for display
  const formatCurrency = (amount: number): string => `KSh ${amount.toLocaleString()}`

  if (!loan && !isSuccess) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        {!isSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Handshake className="w-5 h-5 text-emerald-600" />
                Record Promise to Pay
              </DialogTitle>
              <DialogDescription>
                Log a customer&apos;s commitment to make a payment.
              </DialogDescription>
            </DialogHeader>

            {/* Loan Summary */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {loan?.customerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Customer</p>
                    <p className="font-medium truncate">{loan?.customerName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Loan Number</p>
                    <p className="font-mono text-sm">{loan?.loanNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Phone</p>
                    <p className="font-mono text-sm">{loan?.customerPhone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Outstanding</p>
                    <p className="font-bold text-red-600">{loan ? formatCurrency(loan.outstandingBalance) : ''}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* General Error */}
              {errors.general && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {errors.general}
                </div>
              )}

              {/* Promised Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Promised Amount (KSh) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                    KSh
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={promisedAmount}
                    onChange={(e) => {
                      setPromisedAmount(e.target.value)
                      if (errors.amount) setErrors(prev => ({ ...prev, amount: '' }))
                    }}
                    className={cn(
                      "pl-12",
                      errors.amount && "border-red-500 focus-visible:ring-red-500"
                    )}
                    min="0"
                    max={loan?.outstandingBalance}
                    step="100"
                  />
                </div>
                {errors.amount && (
                  <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.amount}
                  </p>
                )}
                {/* Quick amount buttons */}
                <div className="flex gap-2 mt-2">
                  {[25, 50, 75, 100].map(percent => (
                    <Button
                      key={percent}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs dark:border-slate-700"
                      onClick={() => loan && setPromisedAmount(Math.round(loan.outstandingBalance * percent / 100).toString())}
                    >
                      {percent}%
                    </Button>
                  ))}
                </div>
              </div>

              {/* Promised Date */}
              <div className="space-y-2">
                <Label>
                  Promise Date <span className="text-red-500">*</span>
                </Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !promisedDate && "text-muted-foreground",
                        "dark:border-slate-700",
                        errors.date && "border-red-500"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {promisedDate ? format(promisedDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={promisedDate}
                      onSelect={(date) => {
                        setPromisedDate(date)
                        setCalendarOpen(false)
                        if (errors.date) setErrors(prev => ({ ...prev, date: '' }))
                      }}
                      disabled={(date) => {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        const maxDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)
                        return date < today || date > maxDate
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.date && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.date}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  Maximum 90 days from today ({format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'MMM d, yyyy')})
                </p>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>Payment Method <span className="text-red-500">*</span></Label>
                <Select 
                  value={paymentMethod} 
                  onValueChange={(val) => {
                    setPaymentMethod(val)
                    if (errors.paymentMethod) setErrors(prev => ({ ...prev, paymentMethod: '' }))
                  }}
                >
                  <SelectTrigger className={cn(errors.paymentMethod && "border-red-500")}>
                    <SelectValue placeholder="Select payment method..." />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        <div className="flex items-center gap-2">
                          <method.icon className={cn("w-4 h-4", method.color)} />
                          {method.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.paymentMethod && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.paymentMethod}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional context about this promise..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Confirmation Options */}
              <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <Label className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Send Confirmation to Customer
                </Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={sendConfirmationSMS}
                      onCheckedChange={(checked) => setSendConfirmationSMS(checked === true)}
                    />
                    <MessageSquare className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Send SMS confirmation</span>
                    <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400">
                      Recommended
                    </Badge>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={sendConfirmationWhatsApp}
                      onCheckedChange={(checked) => setSendConfirmationWhatsApp(checked === true)}
                    />
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm">Send WhatsApp confirmation</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={isLoading}
                className="dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Record Promise
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Success State Content */}
            <div className="flex flex-col items-center justify-center py-8 text-center">
              {/* Success Animation */}
              {' '}
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                </div>
                <PartyPopper className="absolute -top-2 -right-2 w-8 h-8 text-amber-500 animate-pulse" />
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Promise Recorded!
              </h3>
              
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                The payment promise has been logged successfully.
              </p>

              {/* Summary Card */}
              <div className="w-full bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Customer</span>
                  <span className="font-medium">{loan?.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Promised Amount</span>
                  <span className="font-bold text-emerald-600">
                    KSh {parseFloat(promisedAmount).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Promise Date</span>
                  <span className="font-medium">{promisedDate ? format(promisedDate, 'MMM d, yyyy') : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Payment Method</span>
                  <span className="font-medium capitalize">{paymentMethod.replace('_', ' ')}</span>
                </div>
                
                {(sendConfirmationSMS || sendConfirmationWhatsApp) && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Confirmation will be sent via{' '}
                      {sendConfirmationSMS && 'SMS'}
                      {sendConfirmationSMS && sendConfirmationWhatsApp && ' & '}
                      {sendConfirmationWhatsApp && 'WhatsApp'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
