'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { 
  Calculator, 
  TrendingUp, 
  Calendar,
  Percent,
  ArrowRight
} from 'lucide-react'

interface LoanCalculation {
  principal: number
  interestRate: number
  termDays: number
  monthlyInterest: number
  totalInterest: number
  processingFee: number
  totalRepayable: number
  monthlyPayment: number
}

// Product configurations with different interest rates
const PRODUCT_CONFIGS: Record<string, { name: string; interestRate: number; minAmount: number; maxAmount: number }> = {
  personal: { name: 'Personal Loan', interestRate: 15, minAmount: 5000, maxAmount: 500000 },
  business: { name: 'Business Loan', interestRate: 18, minAmount: 10000, maxAmount: 500000 },
  salary: { name: 'Salary Advance', interestRate: 12, minAmount: 5000, maxAmount: 150000 },
  emergency: { name: 'Emergency Loan', interestRate: 20, minAmount: 5000, maxAmount: 100000 }
}

interface LoanCalculatorProps {
  onApply?: (data: { amount: number; termDays: number; productType: string; calculation: LoanCalculation }) => void
}

export function LoanCalculator({ onApply }: LoanCalculatorProps) {
  const [amount, setAmount] = useState(50000)
  const [termDays, setTermDays] = useState(90)
  const [interestRate, setInterestRate] = useState(15)
  const [productType, setProductType] = useState('personal')

  // Update interest rate when product type changes
  const handleProductChange = useCallback((value: string) => {
    setProductType(value)
    const config = PRODUCT_CONFIGS[value]
    if (config) {
      setInterestRate(config.interestRate)
      // Adjust amount if outside new product's range
      if (amount < config.minAmount || amount > config.maxAmount) {
        setAmount(Math.min(Math.max(amount, config.minAmount), config.maxAmount))
      }
      toast.success(`Switched to ${config.name}`, {
        description: `Interest rate: ${config.interestRate}% per month`
      })
    }
  }, [amount])

  const calculation: LoanCalculation = useMemo(() => {
    const months = Math.ceil(termDays / 30)
    const totalInterest = amount * (interestRate / 100) * (termDays / 30)
    const processingFee = amount * 0.03 // 3% processing fee
    const totalRepayable = amount + totalInterest + processingFee
    const monthlyPayment = totalRepayable / months

    return {
      principal: amount,
      interestRate,
      termDays,
      monthlyInterest: interestRate / 100,
      totalInterest,
      processingFee,
      totalRepayable,
      monthlyPayment
    }
  }, [amount, termDays, interestRate])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const handleApply = () => {
    if (onApply) {
      onApply({ amount, termDays, productType, calculation })
      toast.success('Proceeding to application', {
        description: `Loan amount: ${formatCurrency(amount)}, Term: ${termDays} days`
      })
    } else {
      toast.info('Apply for this loan', {
        description: `Please navigate to "Apply Now" tab to continue with your application`
      })
    }
  }

  const currentProductConfig = PRODUCT_CONFIGS[productType]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calculator Input */}
      <Card className="lg:col-span-2 dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-600" />
            Loan Calculator
          </CardTitle>
          <CardDescription>
            Calculate your loan repayments and see the total cost
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Product Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Loan Product</Label>
            <Select value={productType} onValueChange={handleProductChange}>
              <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600">
                <SelectValue placeholder="Select loan product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal Loan</SelectItem>
                <SelectItem value="business">Business Loan</SelectItem>
                <SelectItem value="salary">Salary Advance</SelectItem>
                <SelectItem value="emergency">Emergency Loan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Loan Amount</Label>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {formatCurrency(amount)}
              </Badge>
            </div>
            <Slider
              value={[amount]}
              onValueChange={(value) => setAmount(value[0])}
              min={currentProductConfig?.minAmount || 5000}
              max={currentProductConfig?.maxAmount || 500000}
              step={5000}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>{formatCurrency(currentProductConfig?.minAmount || 5000)}</span>
              <span>{formatCurrency(currentProductConfig?.maxAmount || 500000)}</span>
            </div>
          </div>

          {/* Term Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Loan Term
              </Label>
              <span className="text-sm font-medium text-slate-700">{termDays} days ({Math.ceil(termDays / 30)} months)</span>
            </div>
            <Slider
              value={[termDays]}
              onValueChange={(value) => setTermDays(value[0])}
              min={30}
              max={365}
              step={30}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>30 days</span>
              <span>365 days</span>
            </div>
          </div>

          {/* Interest Rate Display */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Interest Rate (Monthly)
              </Label>
              <span className="text-xl font-bold text-emerald-600">{interestRate}%</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Rate varies based on credit score and product type ({currentProductConfig?.name})
            </p>
          </div>

          <Button 
            onClick={handleApply}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg"
          >
            Apply for this Loan
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </CardContent>
      </Card>

      {/* Calculation Results */}
      <Card className="bg-gradient-to-b from-slate-800 to-slate-900 text-white border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Loan Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">Principal Amount</span>
              <span className="font-semibold">{formatCurrency(calculation.principal)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">Interest Rate</span>
              <span className="font-semibold">{calculation.interestRate}%/month</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">Total Interest</span>
              <span className="font-semibold text-amber-400">{formatCurrency(calculation.totalInterest)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">Processing Fee (3%)</span>
              <span className="font-semibold text-slate-300">{formatCurrency(calculation.processingFee)}</span>
            </div>
            <div className="flex justify-between py-3 border-t-2 border-emerald-500 mt-4">
              <span className="font-semibold text-lg">Total Repayable</span>
              <span className="font-bold text-xl text-emerald-400">{formatCurrency(calculation.totalRepayable)}</span>
            </div>
            <div className="flex justify-between py-2 bg-emerald-900/30 rounded-lg p-3 -mx-2">
              <span className="text-slate-300">Monthly Payment</span>
              <span className="font-bold text-emerald-400">{formatCurrency(calculation.monthlyPayment)}</span>
            </div>
          </div>

          {/* APR Disclosure */}
          <div className="mt-6 p-3 bg-slate-800 rounded-lg">
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong>APR:</strong> {(calculation.totalInterest / calculation.principal * 12 / (calculation.termDays / 30) * 100).toFixed(1)}% per annum. 
              Representative example based on selected parameters.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
