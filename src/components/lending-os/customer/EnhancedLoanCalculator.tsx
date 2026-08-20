'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Calculator,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowRight,
  Calendar,
  Percent
} from 'lucide-react'

// Types
interface LoanCalculation {
  principal: number
  interestRate: number
  interestAmount: number
  processingFee: number
  insuranceFee: number
  totalRepayment: number
  effectiveRate: number
  monthlyPayment: number
  dueDate: Date
}

interface AmortizationRow {
  month: number
  date: string
  principal: number
  interest: number
  fee: number
  total: number
  balance: number
  status: 'upcoming' | 'current' | 'paid'
}

interface LoanCalculatorProps {
  onApply?: (data: {
    amount: number
    termDays: number
    productType: string
    calculation: LoanCalculation
  }) => void
  compact?: boolean
}

// Configuration
const LOAN_CONFIG = {
  minAmount: 5000,
  maxAmount: 500000,
  defaultAmount: 50000,
  amountStep: 5000,
  minTerm: 7,
  maxTerm: 180,
  defaultTerm: 30,
  baseInterestRate: 0.13, // 13% per month
  processingFeeRate: 0.02, // 2%
  maxProcessingFee: 1000,
  insuranceFeeRate: 0.005, // 0.5%
  maxInsuranceFee: 500
}

const LOAN_PURPOSES = [
  { value: 'personal', label: 'Personal Loan', rate: 0.13 },
  { value: 'emergency', label: 'Emergency Loan', rate: 0.15 },
  { value: 'business', label: 'Business Loan', rate: 0.12 },
  { value: 'education', label: 'Education/School Fees', rate: 0.10 },
  { value: 'medical', label: 'Medical Expenses', rate: 0.11 },
  { value: 'home', label: 'Home Improvement', rate: 0.12 },
]

// Utility functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

const formatPercent = (rate: number): string => {
  return `${(rate * 100).toFixed(1)}%`
}

export function EnhancedLoanCalculator({ onApply, compact = false }: LoanCalculatorProps) {
  const [amount, setAmount] = useState(LOAN_CONFIG.defaultAmount)
  const [termDays, setTermDays] = useState(LOAN_CONFIG.defaultTerm)
  const [purpose, setPurpose] = useState('personal')
  const [showSchedule, setShowSchedule] = useState(false)

  // Get purpose-specific rate
  const selectedPurpose = LOAN_PURPOSES.find(p => p.value === purpose)
  const interestRate = selectedPurpose?.rate || LOAN_CONFIG.baseInterestRate

  // Calculate loan details
  const calculation = useMemo((): LoanCalculation => {
    const principal = amount
    const termInMonths = termDays / 30
    
    // Interest calculation (simple interest for short-term loans)
    const interestAmount = principal * interestRate * termInMonths
    
    // Fees
    const processingFee = Math.min(
      principal * LOAN_CONFIG.processingFeeRate,
      LOAN_CONFIG.maxProcessingFee
    )
    const insuranceFee = Math.min(
      principal * LOAN_CONFIG.insuranceFeeRate,
      LOAN_CONFIG.maxInsuranceFee
    )
    
    // Totals
    const totalRepayment = principal + interestAmount + processingFee + insuranceFee
    
    // Effective annual rate approximation
    const effectiveRate = (totalRepayment / principal - 1) / termInMonths * 12
    
    // Monthly/bullet payment
    const monthlyPayment = totalRepayment
    
    // Due date
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + termDays)
    
    return {
      principal,
      interestRate,
      interestAmount,
      processingFee,
      insuranceFee,
      totalRepayment,
      effectiveRate,
      monthlyPayment,
      dueDate
    }
  }, [amount, termDays, interestRate])

  // Generate amortization schedule
  const amortizationSchedule = useMemo((): AmortizationRow[] => {
    if (termDays <= 30) {
      // Single payment loan
      return [{
        month: 1,
        date: calculation.dueDate.toLocaleDateString('en-KE', { 
          year: 'numeric', month: 'short', day: 'numeric' 
        }),
        principal: calculation.principal,
        interest: calculation.interestAmount,
        fee: calculation.processingFee + calculation.insuranceFee,
        total: calculation.totalRepayment,
        balance: 0,
        status: 'upcoming'
      }]
    }

    // Multi-installment loan (simplified)
    const installments = Math.ceil(termDays / 30)
    const perInstallmentPrincipal = calculation.principal / installments
    const perInstallmentInterest = calculation.interestAmount / installments
    const perInstallmentFee = (calculation.processingFee + calculation.insuranceFee) / installments
    
    const rows: AmortizationRow[] = []
    let balance = calculation.principal
    
    for (let i = 1; i <= installments; i++) {
      const installmentDate = new Date()
      installmentDate.setDate(installmentDate.getDate() + (i * 30))
      
      balance -= perInstallmentPrincipal
      
      rows.push({
        month: i,
        date: installmentDate.toLocaleDateString('en-KE', { 
          year: 'numeric', month: 'short', day: 'numeric' 
        }),
        principal: Math.round(perInstallmentPrincipal),
        interest: Math.round(perInstallmentInterest),
        fee: Math.round(perInstallmentFee),
        total: Math.round(perInstallmentPrincipal + perInstallmentInterest + perInstallmentFee),
        balance: Math.max(0, Math.round(balance)),
        status: i === 1 ? 'current' : 'upcoming'
      })
    }
    
    return rows
  }, [calculation, termDays])

  // Affordability check
  const affordabilityCheck = useMemo(() => {
    // Assume monthly income threshold (this would come from user profile in real app)
    const assumedIncome = 45000
    const debtToIncomeRatio = calculation.monthlyPayment / assumedIncome
    
    return {
      isAffordable: debtToIncomeRatio < 0.4,
      ratio: debtToIncomeRatio,
      recommendedMax: assumedIncome * 0.4,
      message: debtToIncomeRatio > 0.5 
        ? 'This payment may be difficult to afford'
        : debtToIncomeRatio > 0.4
        ? 'Payment is within acceptable range but consider your budget'
        : 'This payment appears affordable for your income level'
    }
  }, [calculation])

  // Handle apply button
  const handleApply = useCallback(() => {
    onApply?.({
      amount,
      termDays,
      productType: selectedPurpose?.label || 'Personal Loan',
      calculation
    })
  }, [amount, termDays, selectedPurpose, calculation, onApply])

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-600" />
            Quick Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Amount</span>
              <span className="font-semibold">{formatCurrency(amount)}</span>
            </div>
            <Slider
              value={[amount]}
              onValueChange={([v]) => setAmount(v)}
              min={LOAN_CONFIG.minAmount}
              max={LOAN_CONFIG.maxAmount}
              step={LOAN_CONFIG.amountStep}
            />
          </div>
          
          <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
            <span className="text-sm">Total Repayment</span>
            <span className="font-bold text-emerald-600">{formatCurrency(calculation.totalRepayment)}</span>
          </div>
          
          {onApply && (
            <Button onClick={handleApply} className="w-full gap-2">
              Apply Now <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${compact ? '' : 'max-w-4xl mx-auto'}`}>
      {/* Header */}
      {!compact && (
        <div className="text-center">
          <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Calculator className="w-7 h-7 text-emerald-600" />
            Loan Calculator
          </h2>
          <p className="text-muted-foreground mt-1">
            Calculate your loan repayment and see the breakdown
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Loan Details</CardTitle>
            <CardDescription>Adjust the parameters to see your repayment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Amount Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-base font-medium">Loan Amount</label>
                <Badge variant="outline" className="text-xl px-4 py-1 font-bold">
                  {formatCurrency(amount)}
                </Badge>
              </div>
              
              <Slider
                value={[amount]}
                onValueChange={([v]) => setAmount(v)}
                min={LOAN_CONFIG.minAmount}
                max={LOAN_CONFIG.maxAmount}
                step={LOAN_CONFIG.amountStep}
                className="py-4"
              />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(LOAN_CONFIG.minAmount)}</span>
                <span>{formatCurrency(LOAN_CONFIG.maxAmount)}</span>
              </div>

              {/* Quick select buttons */}
              <div className="flex flex-wrap gap-2">
                {[10000, 25000, 50000, 100000, 200000].map(val => (
                  <Button
                    key={val}
                    variant={amount === val ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAmount(val)}
                    className="min-w-[80px]"
                  >
                    {(val / 1000).toFixed(0)}K
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Term Selection */}
            <div className="space-y-4">
              <label className="text-base font-medium">Loan Term</label>
              
              <div className="grid grid-cols-4 gap-2">
                {[7, 14, 30, 60, 90, 120, 150, 180].map(days => (
                  <Button
                    key={days}
                    variant={termDays === days ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTermDays(days)}
                  >
                    {days <= 30 ? `${days} days` : `${Math.round(days / 30)}mo`}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Purpose Selection */}
            <div className="space-y-4">
              <label className="text-base font-medium">Loan Purpose</label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOAN_PURPOSES.map(p => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="flex items-center justify-between w-full">
                        {p.label}
                        <span className="text-muted-foreground ml-2">{formatPercent(p.rate)}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="space-y-6">
          {/* Total Repayment Card */}
          <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
            <CardContent className="pt-6 space-y-4">
              <div className="text-center">
                <p className="text-emerald-100 text-sm">Total Repayment</p>
                <p className="text-3xl font-bold mt-1">
                  {formatCurrency(calculation.totalRepayment)}
                </p>
              </div>
              
              <Separator className="bg-white/20" />
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-emerald-100">Principal</span>
                  <span>{formatCurrency(calculation.principal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-100">Interest ({formatPercent(interestRate)})</span>
                  <span>{formatCurrency(calculation.interestAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-100">Fees</span>
                  <span>{formatCurrency(calculation.processingFee + calculation.insuranceFee)}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 pt-2 bg-white/10 rounded-lg p-3">
                <Calendar className="w-4 h-4 shrink-0" />
                <span className="text-sm">
                  Due: {calculation.dueDate.toLocaleDateString('en-KE', { 
                    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
                  })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Affordability Indicator */}
          <Card className={`${affordabilityCheck.isAffordable ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20'}`}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                {affordabilityCheck.isAffordable ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`font-medium ${affordabilityCheck.isAffordable ? 'text-emerald-800 dark:text-emerald-200' : 'text-amber-800 dark:text-amber-200'}`}>
                    {affordabilityCheck.isAffordable ? 'Looks Affordable' : 'Review Carefully'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {affordabilityCheck.message}
                  </p>
                  
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Debt-to-Income Ratio</span>
                      <span>{(affordabilityCheck.ratio * 100).toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={Math.min(affordabilityCheck.ratio * 100, 100)} 
                      className={`h-2 ${affordabilityCheck.isAffordable ? '[&>div]:bg-emerald-500' : '[&>div]:bg-amber-500'}`}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Effective Rate */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Percent className="w-4 h-4" />
                <span>Effective Annual Rate (APR)</span>
              </div>
              <p className="text-2xl font-bold text-primary">
                {formatPercent(calculation.effectiveRate)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Includes all fees and charges
              </p>
            </CardContent>
          </Card>

          {/* Apply Button */}
          {onApply && (
            <Button 
              onClick={handleApply} 
              size="lg"
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-base"
            >
              <TrendingUp className="w-5 h-5" />
              Apply for This Loan
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Amortization Schedule Toggle & Table */}
      {termDays > 30 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Repayment Schedule</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSchedule(!showSchedule)}
              >
                {showSchedule ? 'Hide' : 'Show'} Schedule
              </Button>
            </div>
          </CardHeader>
          
          {showSchedule && (
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">#</th>
                      <th className="text-left p-2">Date</th>
                      <th className="text-right p-2">Principal</th>
                      <th className="text-right p-2">Interest</th>
                      <th className="text-right p-2">Fees</th>
                      <th className="text-right p-2">Total</th>
                      <th className="text-right p-2">Balance</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {amortizationSchedule.map((row) => (
                      <tr key={row.month} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="p-2">{row.month}</td>
                        <td className="p-2">{row.date}</td>
                        <td className="text-right p-2">{formatCurrency(row.principal)}</td>
                        <td className="text-right p-2">{formatCurrency(row.interest)}</td>
                        <td className="text-right p-2">{formatCurrency(row.fee)}</td>
                        <td className="text-right p-2 font-medium">{formatCurrency(row.total)}</td>
                        <td className="text-right p-2">{formatCurrency(row.balance)}</td>
                        <td className="p-2">
                          <Badge 
                            variant={
                              row.status === 'paid' ? 'default' :
                              row.status === 'current' ? 'secondary' : 'outline'
                            }
                            className="text-xs"
                          >
                            {row.status === 'paid' ? 'Paid' : row.status === 'current' ? 'Current' : 'Upcoming'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold border-t-2">
                      <td colSpan={5} className="p-2 text-right">Total:</td>
                      <td className="text-right p-2 text-emerald-600">
                        {formatCurrency(amortizationSchedule.reduce((sum, r) => sum + r.total, 0))}
                      </td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Info Note */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm text-blue-800 dark:text-blue-200">
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Important Information</p>
          <ul className="mt-1 space-y-1 list-disc list-inside text-xs">
            <li>Interest rates are calculated based on the loan purpose and term</li>
            <li>Processing and insurance fees are one-time charges</li>
            <li>Actual rates may vary based on credit assessment</li>
            <li>Late payments may incur additional charges</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// Export as default for convenience
export default EnhancedLoanCalculator
