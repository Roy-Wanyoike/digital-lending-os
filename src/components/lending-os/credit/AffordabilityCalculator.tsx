'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Wallet,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PieChart
} from 'lucide-react'
import type { AffordabilityResult } from '@/lib/credit-engine'
import { formatCurrency } from '@/lib/credit-engine'

interface AffordabilityCalculatorProps {
  affordability: AffordabilityResult
  maxDtiRatio?: number
  showBreakdown?: boolean
  className?: string
}

export function AffordabilityCalculator({
  affordability,
  maxDtiRatio = 0.5,
  showBreakdown = true,
  className = ''
}: AffordabilityCalculatorProps) {
  const {
    monthlyIncome,
    existingObligations,
    recommendedMonthlyPayment,
    dtiRatio,
    affordable,
    disposableIncome,
    maxRecommendedPayment
  } = affordability

  // Calculate percentages for visualization
  const incomePercent = 100
  const existingPercent = monthlyIncome > 0 ? (existingObligations / monthlyIncome) * 100 : 0
  const proposedPercent = monthlyIncome > 0 ? (recommendedMonthlyPayment / monthlyIncome) * 100 : 0
  const remainingPercent = Math.max(0, 100 - existingPercent - proposedPercent)
  
  // DTI progress color based on ratio
  const getDtiColor = (ratio: number): string => {
    if (ratio <= 30) return 'bg-emerald-500'
    if (ratio <= 50) return 'bg-yellow-500'
    if (ratio <= 65) return 'bg-orange-500'
    return 'bg-red-500'
  }

  // Status configuration
  const statusConfig = affordable 
    ? { 
        icon: CheckCircle2, 
        label: 'AFFORDABLE', 
        color: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-100 dark:bg-emerald-950/50',
        borderColor: 'border-emerald-200 dark:border-emerald-800'
      }
    : { 
        icon: XCircle, 
        label: 'NOT AFFORDABLE', 
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-950/50',
        borderColor: 'border-red-200 dark:border-red-800'
      }

  const StatusIcon = statusConfig.icon

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Wallet className="w-5 h-5 text-blue-600" />
          AFFORDABILITY ANALYSIS
        </CardTitle>
        <CardDescription>
          Debt-to-income and payment capacity assessment
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Income & Obligations Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Monthly Income</p>
            <p className="font-bold text-lg">{formatCurrency(monthlyIncome)}</p>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Existing Obligations</p>
            <p className="font-bold text-lg text-orange-600">
              {formatCurrency(existingObligations)}
            </p>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Proposed Payment</p>
            <p className="font-bold text-lg text-blue-600">
              {formatCurrency(recommendedMonthlyPayment)}
            </p>
          </div>
        </div>

        {/* DTI Ratio Display */}
        <div className={`rounded-lg p-4 border ${statusConfig.bgColor} ${statusConfig.borderColor}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">DTI Ratio</span>
            <Badge 
              variant="outline" 
              className={`${statusConfig.color} ${statusConfig.borderColor}`}
            >
              {dtiRatio}%
            </Badge>
          </div>
          
          {/* Progress bar for DTI */}
          <div className="relative">
            <Progress 
              value={Math.min(dtiRatio, 100)} 
              className="h-3"
            />
            {/* Threshold marker */}
            <div 
              className="absolute top-0 w-0.5 h-3 bg-gray-800 dark:bg-gray-200"
              style={{ left: `${maxDtiRatio * 100}%` }}
            />
          </div>
          
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>0%</span>
            <span>Threshold: {(maxDtiRatio * 100).toFixed(0)}%</span>
            <span>100%</span>
          </div>

          {/* Status indicator */}
          <div className={`flex items-center gap-2 mt-4 ${statusConfig.color}`}>
            <StatusIcon className="w-5 h-5" />
            <span className="font-semibold">{statusConfig.label}</span>
          </div>
        </div>

        {/* Visual Breakdown */}
        {showBreakdown && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Income Breakdown
            </h4>
            
            {/* Stacked bar visualization */}
            <div className="space-y-2">
              <div className="h-8 rounded-md overflow-hidden flex bg-gray-200 dark:bg-gray-700">
                {/* Existing obligations */}
                {existingPercent > 0 && (
                  <div 
                    className="bg-orange-500 flex items-center justify-center text-white text-xs font-medium transition-all duration-500"
                    style={{ width: `${Math.min(existingPercent, 100)}%` }}
                  >
                    {existingPercent >= 10 ? `Existing ${existingPercent.toFixed(0)}%` : ''}
                  </div>
                )}
                
                {/* Proposed loan */}
                {proposedPercent > 0 && (
                  <div 
                    className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium transition-all duration-500"
                    style={{ width: `${Math.min(proposedPercent, 100 - existingPercent)}%` }}
                  >
                    {proposedPercent >= 10 ? `Loan ${proposedPercent.toFixed(0)}%` : ''}
                  </div>
                )}
                
                {/* Remaining */}
                <div 
                  className="bg-emerald-500 flex items-center justify-center text-white text-xs font-medium flex-1"
                >
                  {remainingPercent >= 10 ? `Free ${remainingPercent.toFixed(0)}%` : ''}
                </div>
              </div>
              
              {/* Legend */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-500" />
                  <span>Income (100%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-orange-500" />
                  <span>Debts ({existingPercent.toFixed(1)}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-blue-500" />
                  <span>Loan ({proposedPercent.toFixed(1)}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-400" />
                  <span>Free ({remainingPercent.toFixed(1)}%)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Additional Metrics */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="border rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Disposable Income</span>
            </div>
            <p className={`font-semibold ${disposableIncome > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(disposableIncome)}
            </p>
          </div>
          
          <div className="border rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingDown className="w-4 h-4" />
              <span className="text-xs">Max Payment Capacity</span>
            </div>
            <p className="font-semibold text-blue-600">
              {formatCurrency(maxRecommendedPayment)}
            </p>
          </div>
        </div>

        {/* Warnings */}
        {!affordable && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">Affordability Warning</p>
                <ul className="list-disc list-inside space-y-1 text-xs opacity-90">
                  <li>DTI ratio exceeds recommended threshold of {(maxDtiRatio * 100).toFixed(0)}%</li>
                  <li>Consider reducing loan amount or extending term</li>
                  <li>Additional income verification may be required</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {affordable && dtiRatio > 40 && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Moderate DTI Ratio</p>
                <p className="text-xs opacity-90">
                  While within acceptable limits, a DTI ratio above 40% may indicate 
                  limited financial flexibility. Monitor this customer's repayment capacity closely.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AffordabilityCalculator
