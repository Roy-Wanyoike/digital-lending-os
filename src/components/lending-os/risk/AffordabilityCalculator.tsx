'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Calculator,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Printer,
  Share2,
  RefreshCw,
  Users,
  Home,
  CreditCard,
  Wallet,
  FileText,
  Download
} from 'lucide-react'

// TypeScript interfaces
export interface AffordabilityInput {
  monthlyIncome: number
  existingLoanPayments: number
  livingExpenses: number
  dependents: number
  otherDebtObligations: number
}

export interface AffordabilityResult {
  disposableIncome: number
  netMonthlyIncome: number
  recommendedMaxLoanAmount: number
  recommendedMaxMonthlyInstallment: number
  dtiRatio: number
  disposableRatio: number
  affordabilityStatus: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'STRETCHED' | 'HIGH_RISK'
  warnings: string[]
}

// Constants for Kenyan context
const KENYA_CONSTANTS = {
  MIN_DISPOSABLE_INCOME: 5000, // Minimum disposable income required (KES)
  MAX_DTI_RATIO: 50, // Maximum debt-to-income ratio (%)
  LIVING_EXPENSE_PER_DEPENDENT: 5000, // Estimated cost per dependent (KES)
  MAX_LOAN_TERM_MONTHS: 12, // Maximum loan term for calculation
  INTEREST_RATE_CAP: 30, // Maximum interest rate (% per annum) - CBK guideline
  RECOMMENDED_INSTALLMENT_RATIO: 35 // Recommended max installment as % of income
}

// Initial input values
const defaultInputs: AffordabilityInput = {
  monthlyIncome: 65000,
  existingLoanPayments: 8500,
  livingExpenses: 25000,
  dependents: 2,
  otherDebtObligations: 2000
}

// Helper functions
const formatCurrency = (value: number): string => {
  return `KSh ${value.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const getDTIColor = (ratio: number): string => {
  if (ratio <= 30) return 'text-emerald-600 dark:text-emerald-400'
  if (ratio <= 40) return 'text-lime-600 dark:text-lime-400'
  if (ratio <= 50) return 'text-amber-600 dark:text-amber-400'
  if (ratio <= 60) return 'text-orange-600 dark:text-orange-400'
  return 'text-red-600 dark:text-red-400'
}

const getDTIBgColor = (ratio: number): string => {
  if (ratio <= 30) return 'bg-emerald-100 dark:bg-emerald-900/40'
  if (ratio <= 40) return 'bg-lime-100 dark:bg-lime-900/40'
  if (ratio <= 50) return 'bg-amber-100 dark:bg-amber-900/40'
  if (ratio <= 60) return 'bg-orange-100 dark:bg-orange-900/40'
  return 'bg-red-100 dark:bg-red-900/40'
}

const getAffordabilityConfig = (status: AffordabilityResult['affordabilityStatus']) => {
  switch (status) {
    case 'EXCELLENT':
      return {
        label: 'Excellent Affordability',
        icon: <CheckCircle2 className="w-6 h-6" />,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
        borderColor: 'border-emerald-500',
        description: 'Applicant can comfortably afford the loan with good financial cushion.'
      }
    case 'GOOD':
      return {
        label: 'Good Affordability',
        icon: <CheckCircle2 className="w-6 h-6" />,
        color: 'text-green-600',
        bgColor: 'bg-green-50 dark:bg-green-950/20',
        borderColor: 'border-green-500',
        description: 'Applicant has sufficient capacity to service the loan.'
      }
    case 'MODERATE':
      return {
        label: 'Moderate Affordability',
        icon: <AlertTriangle className="w-6 h-6" />,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50 dark:bg-amber-950/20',
        borderColor: 'border-amber-500',
        description: 'Loan is affordable but leaves limited financial flexibility.'
      }
    case 'STRETCHED':
      return {
        label: 'Stretched Affordability',
        icon: <AlertTriangle className="w-6 h-6" />,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 dark:bg-orange-950/20',
        borderColor: 'border-orange-500',
        description: 'High risk - applicant may struggle to meet obligations during financial stress.'
      }
    case 'HIGH_RISK':
      return {
        label: 'High Risk - Not Affordable',
        icon: <XCircle className="w-6 h-6" />,
        color: 'text-red-600',
        bgColor: 'bg-red-50 dark:bg-red-950/20',
        borderColor: 'border-red-500',
        description: 'Cannot recommend approval - DTI exceeds acceptable limits.'
      }
  }
}

export function AffordabilityCalculator() {
  const [inputs, setInputs] = useState<AffordabilityInput>(defaultInputs)
  const [loanTermMonths, setLoanTermMonths] = useState(6)
  const [interestRate, setInterestRate] = useState(18)

  // Calculate affordability results
  const result: AffordabilityResult = useMemo(() => {
    // Net Monthly Income after living expenses and dependents
    const adjustedLivingExpenses = inputs.livingExpenses + (inputs.dependents * KENYA_CONSTANTS.LIVING_EXPENSE_PER_DEPENDENT)
    const netMonthlyIncome = inputs.monthlyIncome - adjustedLivingExpenses
    
    // Total existing debt obligations
    const totalExistingDebt = inputs.existingLoanPayments + inputs.otherDebtObligations
    
    // Disposable income
    const disposableIncome = netMonthlyIncome - totalExistingDebt
    
    // DTI Ratio (debt / income * 100)
    const dtiRatio = (totalExistingDebt / inputs.monthlyIncome) * 100
    
    // Disposable ratio (disposable / income * 100)
    const disposableRatio = (disposableIncome / inputs.monthlyIncome) * 100
    
    // Recommended maximum monthly installment (max 35% of income minus existing debt)
    const maxInstallmentCapacity = (inputs.monthlyIncome * KENYA_CONSTANTS.RECOMMENDED_INSTALLMENT_RATIO / 100) - totalExistingDebt
    const recommendedMaxMonthlyInstallment = Math.max(0, maxInstallmentCapacity)
    
    // Calculate max loan amount based on installment capacity
    // Simple interest formula approximation for short-term loans
    const monthlyRate = interestRate / 100 / 12
    const totalPayments = loanTermMonths
    const maxLoanAmount = recommendedMaxMonthlyInstallment > 0 
      ? Math.round((recommendedMaxMonthlyInstallment * totalPayments) / (1 + (monthlyRate * totalPayments / 2)))
      : 0

    // Determine status and generate warnings
    const warnings: string[] = []
    
    let status: AffordabilityResult['affordabilityStatus']
    if (dtiRatio > 60 || disposableIncome < KENYA_CONSTANTS.MIN_DISPOSABLE_INCOME) {
      status = 'HIGH_RISK'
      if (dtiRatio > 60) warnings.push(`DTI ratio (${dtiRatio.toFixed(1)}%) exceeds critical threshold of 60%`)
      if (disposableIncome < KENYA_CONSTANTS.MIN_DISPOSABLE_INCOME) warnings.push(`Disposable income below minimum threshold of ${formatCurrency(KENYA_CONSTANTS.MIN_DISPOSABLE_INCOME)}`)
    } else if (dtiRatio > 50 || disposableRatio < 15) {
      status = 'STRETCHED'
      if (dtiRatio > 50) warnings.push(`DTI ratio (${dtiRatio.toFixed(1)}%) exceeds recommended limit of 50%`)
      if (disposableRatio < 15) warnings.push('Limited financial buffer for emergencies')
    } else if (dtiRatio > 40 || disposableRatio < 25) {
      status = 'MODERATE'
      if (dtiRatio > 40) warnings.push('DTI ratio approaching upper limit')
    } else if (dtiRatio > 30) {
      status = 'GOOD'
    } else {
      status = 'EXCELLENT'
    }

    // Additional contextual warnings for Kenya
    if (inputs.monthlyIncome < 15000) {
      warnings.push('Monthly income below typical DCP minimum requirement (KSh 15,000)')
    }
    if (inputs.dependents > 4) {
      warnings.push('High number of dependents may impact repayment capacity')
    }

    return {
      disposableIncome,
      netMonthlyIncome,
      recommendedMaxLoanAmount,
      recommendedMaxMonthlyInstallment,
      dtiRatio,
      disposableRatio,
      affordabilityStatus: status,
      warnings
    }
  }, [inputs, loanTermMonths, interestRate])

  const config = getAffordabilityConfig(result.affordabilityStatus)

  // Handle input changes
  const handleInputChange = (field: keyof AffordabilityInput, value: number) => {
    setInputs(prev => ({ ...prev, [field]: value }))
  }

  // Reset calculator
  const handleReset = () => {
    setInputs(defaultInputs)
    setLoanTermMonths(6)
    setInterestRate(18)
  }

  // Print report
  const handlePrint = () => {
    window.print()
  }

  // Generate shareable summary
  const handleShare = async () => {
    const summary = `
AFFORDABILITY ASSESSMENT REPORT
==============================
Date: ${new Date().toLocaleDateString()}

INCOME & EXPENSES
-----------------
Gross Monthly Income: ${formatCurrency(inputs.monthlyIncome)}
Living Expenses: ${formatCurrency(inputs.livingExpenses)}
Dependents: ${inputs.dependents}
Dependent Allowance: ${formatCurrency(inputs.dependents * KENYA_CONSTANTS.LIVING_EXPENSE_PER_DEPENDENT)}

DEBT OBLIGATIONS
----------------
Existing Loan Payments: ${formatCurrency(inputs.existingLoanPayments)}
Other Debt Obligations: ${formatCurrency(inputs.otherDebtObligations)}
Total Debt Service: ${formatCurrency(inputs.existingLoanPayments + inputs.otherDebtObligations)}

RESULTS
-------
Disposable Income: ${formatCurrency(result.disposableIncome)}
DTI Ratio: ${result.dtiRatio.toFixed(1)}%
Recommended Max Loan: ${formatCurrency(result.recommendedMaxLoanAmount)}
Max Monthly Installment: ${formatCurrency(result.recommendedMaxMonthlyInstallment)}
Status: ${config.label}
`.trim()

    try {
      await navigator.clipboard.writeText(summary)
      alert('Report copied to clipboard!')
    } catch {
      console.log(summary)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Calculator className="w-7 h-7 text-emerald-600" />
            Affordability Calculator
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Assess borrower capacity for Kenyan DCP lending operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="dark:border-slate-700 dark:hover:bg-slate-800">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare} className="dark:border-slate-700 dark:hover:bg-slate-800">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} className="dark:border-slate-700 dark:hover:bg-slate-800">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <Card className="lg:col-span-1 dark:bg-slate-800/50 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-600" />
              Financial Information
            </CardTitle>
            <CardDescription>Enter applicant's financial details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Monthly Income */}
            <div className="space-y-2">
              <Label htmlFor="income" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-slate-400" />
                Gross Monthly Income *
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-slate-400">KSh</span>
                <Input
                  id="income"
                  type="number"
                  value={inputs.monthlyIncome}
                  onChange={(e) => handleInputChange('monthlyIncome', parseFloat(e.target.value) || 0)}
                  className="pl-14 dark:bg-slate-800 dark:border-slate-600"
                  placeholder="65000"
                />
              </div>
            </div>

            {/* Living Expenses */}
            <div className="space-y-2">
              <Label htmlFor="expenses" className="flex items-center gap-2">
                <Home className="w-4 h-4 text-slate-400" />
                Monthly Living Expenses
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-slate-400">KSh</span>
                <Input
                  id="expenses"
                  type="number"
                  value={inputs.livingExpenses}
                  onChange={(e) => handleInputChange('livingExpenses', parseFloat(e.target.value) || 0)}
                  className="pl-14 dark:bg-slate-800 dark:border-slate-600"
                  placeholder="25000"
                />
              </div>
              <p className="text-xs text-slate-500">Rent, utilities, food, transport, etc.</p>
            </div>

            {/* Dependents */}
            <div className="space-y-2">
              <Label htmlFor="dependents" className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                Number of Dependents
              </Label>
              <Input
                id="dependents"
                type="number"
                min={0}
                max={15}
                value={inputs.dependents}
                onChange={(e) => handleInputChange('dependents', parseInt(e.target.value) || 0)}
                className="dark:bg-slate-800 dark:border-slate-600"
                placeholder="2"
              />
              <p className="text-xs text-slate-500">
                +{formatCurrency(KENYA_CONSTANTS.LIVING_EXPENSE_PER_DEPENDENT)} per dependent added to expenses
              </p>
            </div>

            <Separator className="dark:bg-slate-700" />

            {/* Existing Loan Payments */}
            <div className="space-y-2">
              <Label htmlFor="loans" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-400" />
                Existing Loan Payments
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-slate-400">KSh</span>
                <Input
                  id="loans"
                  type="number"
                  value={inputs.existingLoanPayments}
                  onChange={(e) => handleInputChange('existingLoanPayments', parseFloat(e.target.value) || 0)}
                  className="pl-14 dark:bg-slate-800 dark:border-slate-600"
                  placeholder="8500"
                />
              </div>
              <p className="text-xs text-slate-500">Total monthly payments to other lenders</p>
            </div>

            {/* Other Debt Obligations */}
            <div className="space-y-2">
              <Label htmlFor="other-debt" className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                Other Debt Obligations
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-slate-400">KSh</span>
                <Input
                  id="other-debt"
                  type="number"
                  value={inputs.otherDebtObligations}
                  onChange={(e) => handleInputChange('otherDebtObligations', parseFloat(e.target.value) || 0)}
                  className="pl-14 dark:bg-slate-800 dark:border-slate-600"
                  placeholder="2000"
                />
              </div>
              <p className="text-xs text-slate-500">SACCO contributions, school fees, etc.</p>
            </div>

            <Separator className="dark:bg-slate-700" />

            {/* Loan Parameters */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loan Term</Label>
                <Select value={String(loanTermMonths)} onValueChange={(v) => setLoanTermMonths(parseInt(v))}>
                  <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 month</SelectItem>
                    <SelectItem value="3">3 months</SelectItem>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="9">9 months</SelectItem>
                    <SelectItem value="12">12 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Interest Rate (%)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={5}
                    max={30}
                    value={interestRate}
                    onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                    className="pr-8 dark:bg-slate-800 dark:border-slate-600"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-slate-400">%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Result Card */}
          <Card className={`border-2 ${config.borderColor} ${config.bgColor}`}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`${config.color}`}>{config.icon}</div>
                  <div>
                    <h3 className={`text-xl font-bold ${config.color}`}>{config.label}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{config.description}</p>
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className={`px-4 py-2 text-lg font-semibold border-2 ${config.borderColor} ${config.color}`}
                >
                  {result.dtiRatio.toFixed(1)}% DTI
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="dark:bg-slate-800/50 dark:border-slate-700">
              <CardContent className="p-4 text-center">
                <Wallet className="w-5 h-5 mx-auto mb-2 text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Disposable Income</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {formatCurrency(result.disposableIncome)}
                </p>
                <p className="text-xs text-slate-400 mt-1">{result.disposableRatio.toFixed(1)}% of income</p>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-800/50 dark:border-slate-700">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-5 h-5 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Max Loan Amount</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {formatCurrency(result.recommendedMaxLoanAmount)}
                </p>
                <p className="text-xs text-slate-400 mt-1">@ {interestRate}% for {loanTermMonths}mo</p>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-800/50 dark:border-slate-700">
              <CardContent className="p-4 text-center">
                <CreditCard className="w-5 h-5 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Max Installment</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {formatCurrency(result.recommendedMaxMonthlyInstallment)}
                </p>
                <p className="text-xs text-slate-400 mt-1">per month</p>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-800/50 dark:border-slate-700">
              <CardContent className="p-4 text-center">
                <div className={`w-5 h-5 mx-auto mb-2 rounded-full flex items-center justify-center ${getDTIBgColor(result.dtiRatio)}`}>
                  <Info className={`w-3 h-3 ${getDTIColor(result.dtiRatio)}`} />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">DTI Ratio</p>
                <p className={`text-xl font-bold mt-1 ${getDTIColor(result.dtiRatio)}`}>
                  {result.dtiRatio.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-400 mt-1">limit: {KENYA_CONSTANTS.MAX_DTI_RATIO}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Breakdown */}
          <Card className="dark:bg-slate-800/50 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                Income & Expense Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Income Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Gross Monthly Income</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(inputs.monthlyIncome)}</span>
                </div>
                
                {/* Stacked bar visualization */}
                <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden flex">
                  {/* Living expenses portion */}
                  <div 
                    className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium transition-all"
                    style={{ width: `${Math.min((inputs.livingExpenses + (inputs.dependents * KENYA_CONSTANTS.LIVING_EXPENSE_PER_DEPENDENT)) / inputs.monthlyIncome * 100, 100)}%` }}
                  >
                    {(inputs.livingExpenses / inputs.monthlyIncome * 100).toFixed(0)}% Expenses
                  </div>
                  
                  {/* Debt portion */}
                  <div 
                    className="bg-amber-500 flex items-center justify-center text-white text-xs font-medium transition-all"
                    style={{ width: `${(inputs.existingLoanPayments + inputs.otherDebtObligations) / inputs.monthlyIncome * 100}%` }}
                  >
                    {((inputs.existingLoanPayments + inputs.otherDebtObligations) / inputs.monthlyIncome * 100).toFixed(0)}% Debt
                  </div>
                  
                  {/* Disposable portion */}
                  <div 
                    className="bg-emerald-500 flex items-center justify-center text-white text-xs font-medium transition-all"
                    style={{ width: `${Math.max(result.disposableIncome / inputs.monthlyIncome * 100, 0)}%` }}
                  >
                    {Math.max(result.disposableRatio, 0).toFixed(0)}% Free
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center py-2 border-b border-dashed dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-emerald-500" />
                    <span>Gross Monthly Income</span>
                  </div>
                  <span className="font-medium">{formatCurrency(inputs.monthlyIncome)}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 pl-6 text-sm text-slate-600 dark:text-slate-400">
                  <span>Less: Living Expenses</span>
                  <span>-{formatCurrency(inputs.livingExpenses)}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 pl-6 text-sm text-slate-600 dark:text-slate-400">
                  <span>Less: Dependent Allowance ({inputs.dependents} × {formatCurrency(KENYA_CONSTANTS.LIVING_EXPENSE_PER_DEPENDENT)})</span>
                  <span>-{formatCurrency(inputs.dependents * KENYA_CONSTANTS.LIVING_EXPENSE_PER_DEPENDENT)}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 pl-6 text-sm text-slate-600 dark:text-slate-400">
                  <span>Less: Existing Loan Payments</span>
                  <span>-{formatCurrency(inputs.existingLoanPayments)}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 pl-6 text-sm text-slate-600 dark:text-slate-400">
                  <span>Less: Other Debt Obligations</span>
                  <span>-{formatCurrency(inputs.otherDebtObligations)}</span>
                </div>

                <Separator className="dark:bg-slate-700" />

                <div className="flex justify-between items-center py-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg px-4">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">Net Disposable Income</span>
                  <span className="font-bold text-xl text-emerald-700 dark:text-emerald-400">{formatCurrency(result.disposableIncome)}</span>
                </div>
              </div>

              {/* Formula Display */}
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <p className="text-xs font-mono text-slate-600 dark:text-slate-400 leading-relaxed">
                  <strong>Formula:</strong><br />
                  Disposable Income = Gross Income − Living Expenses − (Dependents × {formatCurrency(KENYA_CONSTANTS.LIVING_EXPENSE_PER_DEPENDENT)}) − Existing Loans − Other Debts<br /><br />
                  DTI Ratio = (Total Debt ÷ Gross Income) × 100<br /><br />
                  Max Installment = (Gross Income × {KENYA_CONSTANTS.RECOMMENDED_INSTALLMENT_RATIO}%) − Total Existing Debt
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <Card className="border-amber-300 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                  Warnings & Considerations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.warnings.map((warning, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {warning}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 flex-1 sm:flex-none">
              <Download className="w-4 h-4 mr-2" />
              Download PDF Report
            </Button>
            <Button variant="outline" className="dark:border-slate-700 dark:hover:bg-slate-800 flex-1 sm:flex-none">
              <Share2 className="w-4 h-4 mr-2" />
              Export Summary
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export type { AffordabilityInput, AffordabilityResult }
