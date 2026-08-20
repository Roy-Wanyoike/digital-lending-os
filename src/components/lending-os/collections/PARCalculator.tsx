'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  Percent,
  Info,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Gauge,
  RefreshCw
} from 'lucide-react'

// PAR Data interface
export interface PARData {
  par1: number      // PAR >1 day
  par7: number      // PAR >7 days
  par30: number     // PAR >30 days (main regulatory metric)
  par60: number     // PAR >60 days
  par90: number     // PAR >90 days
  par180: number    // PAR >180 days
  totalPortfolio: number
  overdueAmount: number
}

// Kenya DCP Industry Benchmarks
const KENYA_BENCHMARKS = {
  par30: { excellent: 5, good: 10, average: 15, poor: 20, critical: 25 },
  description: 'Kenya Digital Credit Provider (DCP) industry average is ~15% for PAR >30 days'
}

// Mock PAR data
const mockPARData: PARData = {
  par1: 12.5,
  par7: 9.8,
  par30: 6.2,
  par60: 4.5,
  par90: 2.8,
  par180: 1.4,
  totalPortfolio: 840000000,
  overdueAmount: 11500000
}

interface PARCalculatorProps {
  data?: PARData
  showDetails?: boolean
  compact?: boolean
}

// Custom Gauge Component
function PARGauge({ value, label, benchmark }: { value: number; label: string; benchmark?: number }) {
  // Determine color based on value
  const getGaugeColor = (val: number) => {
    if (val <= 5) return { stroke: '#22c55e', fill: '#dcfce7', text: 'text-emerald-600' } // Green - Excellent
    if (val <= 10) return { stroke: '#84cc16', fill: '#ecfccb', text: 'text-lime-600' } // Lime - Good
    if (val <= 15) return { stroke: '#eab308', fill: '#fef9c3', text: 'text-yellow-600' } // Yellow - Average
    if (val <= 20) return { stroke: '#f97316', fill: '#ffedd5', text: 'text-orange-600' } // Orange - Poor
    return { stroke: '#ef4444', fill: '#fee2e2', text: 'text-red-600' } // Red - Critical
  }

  const colors = getGaugeColor(value)
  
  // Calculate arc parameters (270 degrees max, starting from 135 degrees)
  const percentage = Math.min(value / 30 * 100, 100) // Scale to 30% as max for gauge
  const rotation = 135 + (percentage / 100) * 270

  // Status label
  const getStatusLabel = (val: number) => {
    if (val <= 5) return 'Excellent'
    if (val <= 10) return 'Good'
    if (val <= 15) return 'Average'
    if (val <= 20) return 'Poor'
    return 'Critical'
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-24">
        {/* SVG Gauge */}
        <svg viewBox="0 0 120 70" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 15 65 A 50 50 0 0 1 105 65"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="10"
            strokeLinecap="round"
          />
          
          {/* Colored zones */}
          <path
            d="M 15 65 A 50 50 0 0 1 35 21"
            fill="none"
            stroke="#22c55e"
            strokeWidth="10"
            strokeLinecap="round"
            opacity="0.3"
          />
          <path
            d="M 35 21 A 50 50 0 0 1 60 16"
            fill="none"
            stroke="#84cc16"
            strokeWidth="10"
            strokeLinecap="round"
            opacity="0.3"
          />
          <path
            d="M 60 16 A 50 50 0 0 1 85 21"
            fill="none"
            stroke="#eab308"
            strokeWidth="10"
            strokeLinecap="round"
            opacity="0.3"
          />
          <path
            d="M 85 21 A 50 50 0 0 1 105 65"
            fill="none"
            stroke="#ef4444"
            strokeWidth="10"
            strokeLinecap="round"
            opacity="0.3"
          />

          {/* Value arc */}
          <path
            d="M 15 65 A 50 50 0 0 1 105 65"
            fill="none"
            stroke={colors.stroke}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${(percentage / 100) * 157} 157`}
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Value display */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <p className={cn("text-2xl font-bold", colors.text)}>
            {value.toFixed(1)}%
          </p>
        </div>
      </div>

      <p className="text-sm font-medium mt-1">{label}</p>
      <Badge variant="secondary" className={cn("text-[10px] mt-1", `bg-${colors.fill} ${colors.text}`)}>
        {getStatusLabel(value)}
      </Badge>
      
      {benchmark !== undefined && (
        <p className="text-xs text-slate-500 mt-1">
          Benchmark: {benchmark}%
        </p>
      )}
    </div>
  )
}

export function PARCalculator({ data = mockPARData, showDetails = true, compact = false }: PARCalculatorProps) {
  const [parData, setParData] = useState<PARData>(data)
  const [isLoading, setIsLoading] = useState(false)

  // Calculate derived metrics
  const metrics = useMemo(() => {
    const coverageRatio = ((parData.totalPortfolio - parData.overdueAmount) / parData.totalPortfolio) * 100
    
    return {
      coverageRatio,
      atRiskAmount: parData.totalPortfolio * (parData.par30 / 100),
      trendDirection: parData.par30 > 10 ? 'up' : 'down' as const,
      trendValue: parData.par30 - 10 // vs previous period
    }
  }, [parData])

  // Get status config for each PAR metric
  const getPARStatus = (value: number, type: keyof typeof KENYA_BENCHMARKS) => {
    if (!KENYA_BENCHMARKS[type]) return { color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800', label: 'N/A' }
    
    const b = KENYA_BENCHMARKS[type]
    if (value <= b.excellent) return { color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/40', label: 'Excellent' }
    if (value <= b.good) return { color: 'text-lime-600', bg: 'bg-lime-100 dark:bg-lime-900/40', label: 'Good' }
    if (value <= b.average) return { color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/40', label: 'Average' }
    if (value <= b.poor) return { color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/40', label: 'Poor' }
    return { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/40', label: 'Critical' }
  }

  // Refresh data handler
  const handleRefresh = async () => {
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 800))
    setParData({
      ...mockPARData,
      par30: mockPARData.par30 + (Math.random() * 2 - 1)
    })
    setIsLoading(false)
  }

  // Format currency
  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) return `KSh ${(amount / 1000000).toFixed(1)}M`
    return `KSh ${amount.toLocaleString()}`
  }

  if (compact) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">PAR &gt;30 Days</p>
              <p className={cn("text-2xl font-bold", getPARStatus(parData.par30, 'par30').color)}>
                {parData.par30.toFixed(1)}%
              </p>
            </div>
            <PARGauge value={parData.par30} label="" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Gauge className="w-5 h-5 text-purple-600" />
              Portfolio at Risk (PAR) Calculator
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Real-time portfolio risk metrics and industry comparison
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isLoading}
            className="dark:border-slate-700"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Main Gauge */}
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Main PAR30 Gauge */}
              <div className="md:col-span-1 flex justify-center">
                <PARGauge 
                  value={parData.par30} 
                  label="PAR >30 Days" 
                  benchmark={KENYA_BENCHMARKS.par30.average}
                />
              </div>

              {/* Key Metrics */}
              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                {/* PAR Values */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    PAR Metrics
                  </h4>
                  
                  {[
                    { label: 'PAR >1 Day', value: parData.par1 },
                    { label: 'PAR >7 Days', value: parData.par7 },
                    { label: 'PAR >30 Days', value: parData.par30 },
                    { label: 'PAR >60 Days', value: parData.par60 },
                    { label: 'PAR >90 Days', value: parData.par90 },
                    { label: 'PAR >180 Days', value: parData.par180 }
                  ].map((item) => {
                    const status = item.label.includes('30') ? getPARStatus(item.value, 'par30') : 
                      item.value <= 5 ? { color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/40', label: 'Good' } :
                      item.value <= 10 ? { color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/40', label: 'Warning' } :
                      { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/40', label: 'High Risk' }
                    
                    return (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className={cn("font-semibold", status.color)}>{item.value.toFixed(1)}%</span>
                          <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", status.bg, status.color)}>
                            {status.label}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Portfolio Summary */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Portfolio Summary
                  </h4>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Total Portfolio</span>
                      <span className="font-medium">{formatCurrency(parData.totalPortfolio)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Overdue Amount</span>
                      <span className="font-medium text-red-600">{formatCurrency(parData.overdueAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">At Risk (PAR30)</span>
                      <span className="font-medium text-orange-600">{formatCurrency(metrics.atRiskAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Coverage Ratio</span>
                      <span className="font-medium text-emerald-600">{metrics.coverageRatio.toFixed(1)}%</span>
                    </div>
                    
                    {/* Trend indicator */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        {metrics.trendDirection === 'down' ? (
                          <TrendingDown className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-red-500" />
                        )}
                        <span className={cn(
                          "text-sm font-medium",
                          metrics.trendDirection === 'down' ? "text-emerald-600" : "text-red-600"
                        )}>
                          {metrics.trendDirection === 'down' ? 'Improving' : 'Worsening'} vs last month
                        </span>
                        <Badge variant="secondary" className={cn(
                          "text-[10px]",
                          metrics.trendDirection === 'down' 
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400"
                        )}>
                          {Math.abs(metrics.trendValue).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Industry Comparison */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Percent className="w-5 h-5 text-blue-600" />
              Kenya DCP Industry Comparison
            </CardTitle>
            <CardDescription className="flex items-center gap-1">
              {KENYA_BENCHMARKS.description}
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="font-medium mb-1">About Kenya DCP Benchmarks</p>
                  <p className="text-xs">
                    Based on CBK regulated Digital Credit Providers data. 
                    PAR &gt;30 days is the primary regulatory metric used by Central Bank of Kenya.
                  </p>
                </TooltipContent>
              </Tooltip>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* PAR30 Comparison Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>PAR &gt;30 Days Performance</span>
                  <span className="font-medium">{parData.par30.toFixed(1)}% vs {KENYA_BENCHMARKS.par30.average}% avg</span>
                </div>
                <div className="relative h-8 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  {/* Benchmark marker */}
                  <div 
                    className="absolute top-0 h-full w-0.5 bg-slate-400 z-10"
                    style={{ left: `${(KENYA_BENCHMARKS.par30.average / 30) * 100}%` }}
                  />
                  {/* Current value */}
                  <div 
                    className={cn(
                      "absolute top-0 left-0 h-full transition-all duration-500 rounded-full",
                      parData.par30 <= KENYA_BENCHMARKS.par30.good ? "bg-emerald-500" :
                      parData.par30 <= KENYA_BENCHMARKS.par30.average ? "bg-yellow-500" :
                      parData.par30 <= KENYA_BENCHMARKS.par30.poor ? "bg-orange-500" : "bg-red-500"
                    )}
                    style={{ width: `${Math.min((parData.par30 / 30) * 100, 100)}%` }}
                  />
                  {/* Zone labels */}
                  <div className="absolute inset-0 flex items-center px-3">
                    <span className="text-xs font-medium text-white drop-shadow-sm">
                      {parData.par30.toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                {/* Zone legend */}
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Excellent (&lt;{KENYA_BENCHMARKS.par30.excellent}%)</span>
                  <span>Good ({KENYA_BENCHMARKS.par30.excellent}-{KENYA_BENCHMARKS.par30.good}%)</span>
                  <span>Average ({KENYA_BENCHMARKS.par30.good}-{KENYA_BENCHMARKS.par30.average}%)</span>
                  <span>Poor ({KENYA_BENCHMARKS.par30.average}-{KENYA_BENCHMARKS.par30.poor}%)</span>
                  <span>Critical (&gt;{KENYA_BENCHMARKS.par30.poor}%)</span>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{KENYA_BENCHMARKS.par30.excellent}%</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-500">Excellent</p>
                </div>
                <div className="text-center p-3 bg-lime-50 dark:bg-lime-900/20 rounded-lg">
                  <TrendingDown className="w-5 h-5 mx-auto mb-1 text-lime-600" />
                  <p className="text-lg font-bold text-lime-700 dark:text-lime-400">{KENYA_BENCHMARKS.par30.good}%</p>
                  <p className="text-[10px] text-lime-600 dark:text-lime-500">Good</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-yellow-600" />
                  <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{KENYA_BENCHMARKS.par30.average}%</p>
                  <p className="text-[10px] text-yellow-600 dark:text-yellow-500">Industry Avg</p>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-red-600" />
                  <p className="text-lg font-bold text-red-700 dark:text-red-400">&gt;{KENYA_BENCHMARKS.par30.poor}%</p>
                  <p className="text-[10px] text-red-600 dark:text-red-500">Critical</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formula Explanation */}
        {showDetails && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="w-5 h-5 text-slate-500" />
                How PAR is Calculated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300">Formula</h4>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg font-mono text-sm">
                    <p className="text-slate-700 dark:text-slate-300">
                      PAR &gt;X Days = <br/>
                      <span className="text-emerald-600">(Outstanding Principal of loans with payments overdue by more than X days)</span>
                      <br/>÷<br/>
                      <span className="text-blue-600">(Total Outstanding Gross Loan Portfolio)</span>
                      <br/>× 100
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300">Key Points</h4>
                  <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span><strong>PAR &gt;30 days</strong> is the primary regulatory metric monitored by CBK</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>Lower PAR indicates better collection performance</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>Kenya DCPs should target PAR &lt;15% for regulatory compliance</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>PAR does not include accrued interest - only principal balance</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  )
}
