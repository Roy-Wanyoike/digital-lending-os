'use client'

import { useState } from 'react'
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
import { cn } from '@/lib/utils'
import {
  CalendarIcon,
  Handshake,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { OverdueLoan } from './types'

interface PromiseToPayDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: OverdueLoan | null
  onSuccess?: () => void
}

export function PromiseToPayDialog({
  open,
  onOpenChange,
  loan,
  onSuccess
}: PromiseToPayDialogProps) {
  const [promisedAmount, setPromisedAmount] = useState<string>('')
  const [promisedDate, setPromisedDate] = useState<Date>()
  const [confidenceLevel, setConfidenceLevel] = useState<'high' | 'medium' | 'low'>('medium')
  const [notes, setNotes] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Reset form when dialog opens/closes or loan changes
  const resetForm = () => {
    setPromisedAmount('')
    setPromisedDate(undefined)
    setConfidenceLevel('medium')
    setNotes('')
    setCalendarOpen(false)
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm()
    }
    onOpenChange(isOpen)
  }

  // Validate form
  const validateForm = (): string | null => {
    if (!loan) return 'No loan selected'
    
    const amount = parseFloat(promisedAmount)
    if (!promisedAmount || isNaN(amount) || amount <= 0) {
      return 'Please enter a valid promised amount'
    }
    
    if (amount > loan.outstandingBalance) {
      return `Amount cannot exceed outstanding balance (${loan.outstandingBalance.toLocaleString()})`
    }
    
    if (!promisedDate) {
      return 'Please select a promised date'
    }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (promisedDate <= today) {
      return 'Promised date must be in the future'
    }

    return null
  }

  // Handle form submission
  const handleSubmit = async () => {
    const validationError = validateForm()
    if (validationError) {
      toast.error(validationError)
      return
    }

    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800))

      // In production:
      // const response = await fetch('/api/collections/promises', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     loanId: loan.id,
      //     promisedAmount: parseFloat(promisedAmount),
      //     promisedDate: promisedDate.toISOString(),
      //     confidenceLevel,
      //     notes
      //   })
      // })
      
      // if (!response.ok) throw new Error('Failed to record promise')

      toast.success(`Promise recorded: KSh ${parseFloat(promisedAmount).toLocaleString()} by ${format(promisedDate!, 'MMM d, yyyy')}`)
      
      resetForm()
      onSuccess?.()
      handleClose(false)
    } catch (error) {
      console.error('Error recording promise:', error)
      toast.error('Failed to record promise. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Format currency for display
  const formatCurrency = (amount: number): string => `KSh ${amount.toLocaleString()}`

  // Confidence level options with descriptions
  const confidenceOptions = [
    { 
      value: 'high', 
      label: 'High', 
      description: 'Customer has reliable payment history',
      color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400',
      icon: CheckCircle2
    },
    { 
      value: 'medium', 
      label: 'Medium', 
      description: 'Uncertain but likely to pay',
      color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400',
      icon: AlertCircle
    },
    { 
      value: 'low', 
      label: 'Low', 
      description: 'Customer has broken promises before',
      color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400',
      icon: AlertCircle
    }
  ]

  if (!loan) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="w-5 h-5 text-emerald-600" />
            Record Promise to Pay
          </DialogTitle>
          <DialogDescription>
            Record a customer&apos;s commitment to make a payment.
          </DialogDescription>
        </DialogHeader>

        {/* Loan Summary */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 mb-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600 dark:text-slate-400">Loan</span>
            <span className="font-medium font-mono">{loan.loanNumber}</span>
          </div>
          <div className="flex justify-between items-center text-sm mt-1">
            <span className="text-slate-600 dark:text-slate-400">Customer</span>
            <span className="font-medium">{loan.customerName}</span>
          </div>
          <div className="flex justify-between items-center text-sm mt-1">
            <span className="text-slate-600 dark:text-slate-400">Outstanding Balance</span>
            <span className="font-bold text-red-600">{formatCurrency(loan.outstandingBalance)}</span>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Promised Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Promised Amount (KSh)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                KSh
              </span>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={promisedAmount}
                onChange={(e) => setPromisedAmount(e.target.value)}
                className="pl-12"
                min="0"
                max={loan.outstandingBalance}
                step="100"
              />
            </div>
            {parseFloat(promisedAmount) > loan.outstandingBalance && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Amount exceeds outstanding balance
              </p>
            )}
          </div>

          {/* Promised Date */}
          <div className="space-y-2">
            <Label>Promise Date</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !promisedDate && "text-muted-foreground",
                    "dark:border-slate-700"
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
                  }}
                  disabled={(date) => {
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    return date < today || date > new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-slate-500">
              Maximum 90 days from today
            </p>
          </div>

          {/* Confidence Level */}
          <div className="space-y-2">
            <Label>Confidence Level</Label>
            <div className="grid grid-cols-3 gap-2">
              {confidenceOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setConfidenceLevel(option.value as typeof confidenceLevel)}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all text-left",
                    confidenceLevel === option.value
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <option.icon className={cn("w-4 h-4", 
                      confidenceLevel === option.value ? "text-emerald-600" : "text-slate-400"
                    )} />
                    <Badge variant="secondary" className={cn("text-xs", option.color)}>
                      {option.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">
                    {option.description}
                  </p>
                </button>
              ))}
            </div>
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
      </DialogContent>
    </Dialog>
  )
}
