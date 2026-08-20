'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { Sparkline, formatKES, formatPercent, CHART_COLORS } from './DataVisualization'

// ============================================
// KPI CARD TYPES
// ============================================

interface KPIMetric {
  label: string
  value: string | number
  change?: number
  changeLabel?: string
  format?: 'currency' | 'percentage' | 'number'
  sparklineData?: number[]
  status?: 'positive' | 'negative' | 'neutral' | 'warning'
}

interface KPIProps {
  title: string
  metrics: KPIMetric[]
  icon?: React.ReactNode
  className?: string
  variant?: 'default' | 'compact' | 'highlighted'
}

// ============================================
// MAIN KPI CARD COMPONENT
// ============================================

export function KPICard({ 
  title, 
  metrics, 
  icon, 
  className = '',
  variant = 'default'
}: KPIProps) {
  if (variant === 'compact') {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {title}
              </p>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {metrics[0]?.value}
              </p>
              {metrics[0]?.change !== undefined && (
                <ChangeIndicator value={metrics[0].change} />
              )}
            </div>
            {icon && (
              <div className="text-slate-400">
                {icon}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`w-full ${className} ${variant === 'highlighted' ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-900' : ''}`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {title}
        </CardTitle>
        {icon && <div className="text-emerald-600">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {metrics.map((metric, index) => (
            <div key={index} className="flex items-start justify-between">
              <div>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {metric.value}
                </span>
                {metric.change !== undefined && (
                  <ChangeIndicator value={metric.change} label={metric.changeLabel} />
                )}
              </div>
              {metric.sparklineData && (
                <Sparkline 
                  data={metric.sparklineData} 
                  color={
                    metric.status === 'positive' ? CHART_COLORS.success :
                    metric.status === 'negative' ? CHART_COLORS.danger :
                    metric.status === 'warning' ? CHART_COLORS.warning :
                    CHART_COLORS.primary
                  }
                />
              )}
            </div>
          ))}
          {metrics.length > 1 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              {metrics.slice(1).map((metric, index) => (
                <div key={`sub-${index}`} className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">{metric.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 dark:text-white">{metric.value}</span>
                    {metric.change !== undefined && (
                      <ChangeIndicator value={metric.change} compact />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// CHANGE INDICATOR COMPONENT
// ============================================

interface ChangeIndicatorProps {
  value: number
  label?: string
  compact?: boolean
}

export function ChangeIndicator({ value, label, compact }: ChangeIndicatorProps) {
  const isPositive = value > 0
  const isNeutral = value === 0
  
  const statusColor = isPositive 
    ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400'
    : isNeutral 
      ? 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400'
      : 'text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400'

  const Icon = isPositive ? TrendingUp : isNeutral ? Minus : TrendingDown

  if (compact) {
    return (
      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColor} border-current`}>
        <Icon className="w-3 h-3 mr-0.5" />
        {Math.abs(value)}%
      </Badge>
    )
  }

  return (
    <div className="flex items-center gap-1 mt-1">
      <Badge variant="outline" className={`text-xs ${statusColor} border-current`}>
        {isPositive ? (
          <ArrowUpRight className="w-3 h-3 mr-1" />
        ) : isNeutral ? (
          <Minus className="w-3 h-3 mr-1" />
        ) : (
          <ArrowDownRight className="w-3 h-3 mr-1" />
        )}
        {Math.abs(value)}%
        {label && <span className="ml-1 opacity-70">{label}</span>}
      </Badge>
    </div>
  )
}

// ============================================
// PORTFOLIO KPIs
// ============================================

interface PortfolioKPIsProps {
  data: {
    totalLoanBook: number
    activeLoans: number
    averageLoanSize: number
    par30: number
    periodOverPeriodChange?: any
  }
}

export function PortfolioKPIs({ data }: PortfolioKPIsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title="Total Loan Book"
        icon={<TrendingUp className="w-5 h-5" />}
        metrics={[
          {
            value: formatKES(data.totalLoanBook),
            change: data.periodOverPeriodChange?.totalLoanBook?.value || 12.3,
            changeLabel: 'vs last month',
            format: 'currency',
            sparklineData: [38, 39, 40, 41, 42, 42.8],
            status: 'positive'
          }
        ]}
        variant="highlighted"
      />
      
      <KPICard
        title="Active Loans"
        icon={<TrendingUp className="w-5 h-5" />}
        metrics={[{
          value: data.activeLoans.toLocaleString(),
          change: data.periodOverPeriodChange?.activeLoans?.value || 8.1,
          changeLabel: 'vs last month',
          format: 'number',
          sparklineData: [1650, 1700, 1750, 1800, 1820, 1847],
          status: 'positive'
        }]}
      />
      
      <KPICard
        title="Average Loan Size"
        icon={<Minus className="w-5 h-5" />}
        metrics={[{
          value: formatKES(data.averageLoanSize),
          change: data.periodOverPeriodChange?.averageLoanSize?.value || -2.4,
          changeLabel: 'vs last month',
          format: 'currency',
          sparklineData: [24000, 23800, 23500, 23200, 23000, 23170],
          status: 'negative'
        }]}
      />
      
      <KPICard
        title="PAR30 Ratio"
        icon={<TrendingDown className="w-5 h-5" />}
        metrics={[{
          value: `${data.par30}%`,
          change: -0.3,
          changeLabel: 'improvement',
          format: 'percentage',
          sparklineData: [5.4, 5.3, 5.2, 5.1, 5.0, 4.8],
          status: 'positive'
        }]}
        variant="highlighted"
      />
    </div>
  )
}

// ============================================
// CUSTOMER KPIs
// ============================================

interface CustomerKPIsProps {
  data: {
    totalCustomers: number
    newCustomersThisMonth: number
    activeBorrowers: number
    repeatBorrowerRate: number
    retentionRate: number
    churnRate: number
    periodOverPeriodChange?: any
  }
}

export function CustomerKPIs({ data }: CustomerKPIsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title="Total Customers"
        icon={<TrendingUp className="w-5 h-5" />}
        metrics={[{
          value: data.totalCustomers.toLocaleString(),
          change: data.periodOverPeriodChange?.totalCustomers?.value || 15.2,
          changeLabel: 'growth',
          format: 'number',
          sparklineData: [10500, 11000, 11500, 11800, 12100, 12458],
          status: 'positive'
        }]}
        variant="highlighted"
      />
      
      <KPICard
        title="New This Month"
        icon={<TrendingUp className="w-5 h-5" />}
        metrics={[{
          value: data.newCustomersThisMonth.toLocaleString(),
          change: data.periodOverPeriodChange?.newCustomersThisMonth?.value || 12.8,
          format: 'number',
          sparklineData: [140, 150, 160, 168, 178, 187],
          status: 'positive'
        }]}
      />
      
      <KPICard
        title="Active Borrowers"
        icon={<TrendingUp className="w-5 h-5" />}
        metrics={[{
          value: data.activeBorrowers.toLocaleString(),
          change: data.periodOverPeriodChange?.activeBorrowers?.value || 9.4,
          format: 'number',
          sparklineData: [3200, 3400, 3580, 3700, 3800, 3847],
          status: 'positive'
        }]}
      />
      
      <KPICard
        title="Retention Rate"
        icon={<TrendingUp className="w-5 h-5" />}
        metrics={[{
          value: `${data.retentionRate}%`,
          change: 1.2,
          changeLabel: 'improved',
          format: 'percentage',
          status: 'positive'
        }]}
        variant="highlighted"
      />
    </div>
  )
}

// ============================================
// FINANCIAL KPIs
// ============================================

interface FinancialKPIsProps {
  data: {
    revenue: {
      totalRevenue: number
      periodComparison?: any
    }
    expenses: {
      totalExpenses: number
    }
    profitability: {
      netProfit: number
      margin: number
      roa: number
    }
  }
}

export function FinancialKPIs({ data }: FinancialKPIsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title="Total Revenue"
        icon={<TrendingUp className="w-5 h-5" />}
        metrics={[{
          value: formatKES(data.revenue.totalRevenue),
          change: data.revenue.periodComparison?.changePercent || 10.3,
          changeLabel: 'vs last period',
          format: 'currency',
          sparklineData: [6200, 6500, 6800, 7100, 7350, 7601],
          status: 'positive'
        }]}
        variant="highlighted"
      />
      
      <KPICard
        title="Net Profit"
        icon={<TrendingUp className="w-5 h-5" />}
        metrics={[{
          value: formatKES(data.profitability.netProfit),
          change: 14.8,
          changeLabel: 'margin improved',
          format: 'currency',
          sparklineData: [1450, 1580, 1700, 1810, 1880, 1941],
          status: 'positive'
        }]}
      />
      
      <KPICard
        title="Profit Margin"
        icon={<TrendingUp className="w-5 h-5" />}
        metrics={[{
          value: `${data.profitability.margin.toFixed(1)}%`,
          change: 3.4,
          changeLabel: 'improvement',
          format: 'percentage',
          status: 'positive'
        }]}
      />
      
      <KPICard
        title="Return on Assets (ROA)"
        icon={<TrendingUp className="w-5 h-5" />}
        metrics={[{
          value: `${data.profitability.roa}%`,
          change: 0.8,
          format: 'percentage',
          status: 'positive'
        }]}
        variant="highlighted"
      />
    </div>
  )
}

// ============================================
// OPERATIONAL KPIs
// ============================================

interface OperationalKPIsProps {
  data: {
    applications: {
      totalReceived: number
      approvalRate: number
      averageProcessingTime: number
    }
    kyc: {
      approvalRate: number
      failureRate: number
    }
    payments: {
      successRate: number
      totalProcessed: number
    }
  }
}

export function OperationalKPIs({ data }: OperationalKPIsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title="Applications Received"
        icon={<TrendingUp className="w-5 h-5" />}
        metrics={[{
          value: data.applications.totalReceived.toLocaleString(),
          change: 12.5,
          changeLabel: 'this month',
          format: 'number',
          sparklineData: [2200, 2350, 2500, 2650, 2750, 2847],
          status: 'positive'
        }]}
        variant="highlighted"
      />
      
      <KPICard
        title="Approval Rate"
        icon={<TrendingUp className="w-5 h-5" />}
        metrics={[{
          value: `${data.applications.approvalRate}%`,
          change: 2.1,
          changeLabel: 'improved',
          format: 'percentage',
          status: 'positive'
        }]}
      />
      
      <KPICard
        title="KYC Success Rate"
        icon={<TrendingUp className="w-5 h-5" />}
        metrics={[{
          value: `${data.kyc.approvalRate}%`,
          change: 1.5,
          format: 'percentage',
          status: 'positive'
        }]}
      />
      
      <KPICard
        title="Payment Success Rate"
        icon={<TrendingUp className="w-5 h-5" />}
        metrics={[{
          value: `${data.payments.successRate}%`,
          change: -0.3,
          changeLabel: 'slight dip',
          format: 'percentage',
          status: 'warning'
        }]}
        variant="highlighted"
      />
    </div>
  )
}

// ============================================
// EXECUTIVE SUMMARY DASHBOARD
// ============================================

interface ExecutiveSummaryProps {
  portfolio?: any
  customer?: any
  financial?: any
  operational?: any
}

export function ExecutiveSummaryDashboard({
  portfolio,
  customer,
  financial,
  operational
}: ExecutiveSummaryProps) {
  return (
    <div className="space-y-6">
      {/* Main KPI Row */}
      {portfolio && <PortfolioKPIs data={portfolio.overview} />}
      
      {customer && <CustomerKPIs data={customer.overview} />}
      
      {financial && <FinancialKPIs data={financial} />}
      
      {operational && <OperationalKPIs data={operational} />}
    </div>
  )
}

// Export all components
export default {
  KPICard,
  ChangeIndicator,
  PortfolioKPIs,
  CustomerKPIs,
  FinancialKPIs,
  OperationalKPIs,
  ExecutiveSummaryDashboard
}
