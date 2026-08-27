'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Target,
  PieChart as PieChartIcon
} from 'lucide-react'

// Import visualization components
import {
  ReportLineChart,
  ReportBarChart,
  ReportPieChart,
  ReportAreaChart,
  Gauge,
  formatKES,
  formatPercent,
  CHART_COLORS,
  COLOR_PALETTES
} from './DataVisualization'

// Import KPI components
import { FinancialKPIs } from './KPIDashboard'

// Types
interface FinancialReportProps {
  data: any
  compact?: boolean
}

export function FinancialReport({ data, compact = false }: FinancialReportProps) {
  if (!data) return null

  const { revenue, expenses, profitability, metrics, incomeStatement, trends, cashFlow, alerts } = data

  // Prepare chart data
  const revenuePieData = revenue?.breakdown?.map((r: any) => ({
    name: r.category.replace(/\s+/g, ' '),
    value: r.amount / 1000000, // Convert to millions
    percentage: r.percentage,
    color: [
      CHART_COLORS.primary,
      CHART_COLORS.secondary,
      CHART_COLORS.warning,
      CHART_COLORS.danger,
      CHART_COLORS.neutral
    ][revenue.breakdown.indexOf(r)]
  })) || []

  const expensePieData = expenses?.breakdown?.map((e: any) => ({
    name: e.category.replace(/\s+/g, ' '),
    value: e.amount / 1000000,
    percentage: e.percentage,
    color: [
      CHART_COLORS.danger,
      CHART_COLORS.neutral,
      '#f97316',
      CHART_COLORS.warning,
      CHART_COLORS.info,
      CHART_COLORS.purple
    ][expenses.breakdown.indexOf(e)]
  })) || []

  const trendChartData = trends?.map((t: any) => ({
    month: t.month || new Date(t.date).toLocaleDateString('en-US', { month: 'short' }),
    ...t
  })) || []

  // Income statement for display (non-header items)
  const incomeStatementItems = incomeStatement?.filter((item: any) => !item.isHeader && !item.isSpacer) || []

  if (compact) {
    return (
      <div className="space-y-4">
        <FinancialKPIs data={data} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ReportAreaChart
            title="Revenue & Profit Trends"
            data={trendChartData}
            areas={[
              { dataKey: 'revenue', name: 'Revenue', color: CHART_COLORS.primary },
              { dataKey: 'profit', name: 'Profit', color: CHART_COLORS.success }
            ]}
            height={200}
          />
          
          <ReportPieChart
            title="Revenue Mix"
            data={revenuePieData}
            innerRadius={40}
            outerRadius={70}
            height={200}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Executive Summary - KPI Cards */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          Financial Performance Summary
        </h3>
        <FinancialKPIs data={data} />
      </section>

      {/* Revenue & Expense Overview */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Breakdown */}
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/10 dark:to-slate-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Revenue Breakdown
              </CardTitle>
              <CardDescription className="flex items-center justify-between mt-2">
                <span>Total: {formatKES(revenue?.totalRevenue)}</span>
                <Badge 
                  variant="outline" 
                  className={`${
                    revenue?.periodComparison?.direction === 'up' 
                      ? 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' 
                      : 'border-red-500 text-red-600 bg-red-50 dark:bg-red-950/30'
                  }`}
                >
                  {revenue?.periodComparison?.direction === 'up' ? (
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 mr-1" />
                  )}
                  {revenue?.periodComparison?.changePercent}% vs last period
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReportPieChart
                data={revenuePieData}
                innerRadius={55}
                outerRadius={90}
                height={220}
                showLegend={true}
                showLabels={false}
              />
              
              {/* Revenue Items */}
              <div className="mt-4 space-y-2">
                {revenue?.breakdown?.slice(0, 4).map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: revenuePieData[index]?.color }}
                      />
                      <span className="text-slate-600 dark:text-slate-400">{item.category}</span>
                    </div>
                    <span className="font-medium">{formatKES(item.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Expense Breakdown */}
          <Card className="border-orange-200 bg-gradient-to-br from-orange-50/50 to-white dark:from-orange-950/10 dark:to-slate-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-orange-800 dark:text-orange-300 flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                Expense Breakdown
              </CardTitle>
              <CardDescription className="flex items-center justify-between mt-2">
                <span>Total: {formatKES(expenses?.totalExpenses)}</span>
                <Badge variant="outline" className="border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-950/30">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  {expenses?.periodComparison?.changePercent}% vs last period
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReportBarChart
                data={expenses?.breakdown?.map((e: any) => ({ name: e.category, value: e.amount / 1000000 })) || []}
                bars={[{ dataKey: 'value', name: 'Amount (KSh M)', color: CHART_COLORS.warning }]}
                xAxisKey="name"
                height={220}
                layout="horizontal"
                showLegend={false}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* P&L Statement */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Income Statement (Profit & Loss)
        </h3>
        
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">P&L Statement</CardTitle>
              <Badge variant="secondary">Current Period</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-w-lg mx-auto space-y-1">
              {incomeStatementItems.map((item: any, index: number) => (
                <div
                  key={index}
                  className={`flex items-center justify-between py-2 px-3 rounded-md ${
                    item.isTotal 
                      ? item.isProfit 
                        ? 'bg-emerald-100 dark:bg-emerald-950/30 font-bold' 
                        : 'bg-slate-100 dark:bg-slate-800 font-semibold'
                      : item.isHeader
                        ? 'font-medium text-slate-500 uppercase text-xs mt-4 first:mt-0'
                        : ''
                  }`}
                >
                  <span className={
                    item.isTotal && item.isProfit 
                      ? 'text-emerald-800 dark:text-emerald-300' 
                      : item.isTotal 
                        ? 'text-slate-900 dark:text-white' 
                        : 'text-slate-700 dark:text-slate-300'
                  }>
                    {item.category}
                  </span>
                  <span className={
                    item.isTotal && item.isProfit 
                      ? 'text-emerald-800 dark:text-emerald-300' 
                      : 'text-slate-700 dark:text-slate-300'
                  }>
                    {item.amount !== null ? formatKES(item.amount) : ''}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Key Metrics Row */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <div className="text-center">
                <p className="text-sm text-slate-500">Gross Margin</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {profitability?.margin?.toFixed(1)}%
                </p>
              </div>
              <div className="text-center border-x border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500">ROA</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {profitability?.roa}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-500">Net Profit</p>
                <p className="text-xl font-bold text-emerald-600">
                  {formatKES(profitability?.netProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Financial Trends */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Financial Performance Trends
        </h3>
        
        <ReportAreaChart
          title="Revenue, Expenses & Profit Trends (12 Months)"
          data={trendChartData}
          areas={[
            { dataKey: 'revenue', name: 'Revenue', color: CHART_COLORS.primary },
            { dataKey: 'expenses', name: 'Expenses', color: CHART_COLORS.danger },
            { dataKey: 'profit', name: 'Net Profit', color: CHART_COLORS.success }
          ]}
          height={320}
          formatValue={(v) => `KSh ${(Number(v) / 1000000).toFixed(1)}M`}
          stacked={false}
        />

        {/* Margin Trend */}
        <Card className="mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportLineChart
              data={trendChartData}
              lines={[
                { dataKey: 'margin', name: 'Margin %', color: CHART_COLORS.purple }
              ]}
              height={180}
              showGrid={false}
              formatValue={(v) => `${v}%`}
            />
          </CardContent>
        </Card>
      </section>

      {/* Key Financial Ratios & Metrics */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-600" />
          Key Financial Ratios & KPIs
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Gauge 
                value={metrics?.yieldOnPortfolio || 16} 
                max={25} 
                size={100}
                title="Yield on Portfolio"
                unit="%"
                thresholds={[
                  { value: 40, color: CHART_COLORS.danger },
                  { value: 65, color: CHART_COLORS.warning },
                  { value: 100, color: CHART_COLORS.success }
                ]}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Gauge 
                value={metrics?.costOfFunds || 8} 
                max={15} 
                size={100}
                title="Cost of Funds"
                unit="%"
                thresholds={[
                  { value: 33, color: CHART_COLORS.success },
                  { value: 66, color: CHART_COLORS.warning },
                  { value: 100, color: CHART_COLORS.danger }
                ]}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Gauge 
                value={metrics?.operationalEfficiency || 62} 
                max={100} 
                size={100}
                title="Op Efficiency"
                unit="%"
                thresholds={[
                  { value: 50, color: CHART_COLORS.success },
                  { value: 75, color: CHART_COLORS.warning },
                  { value: 100, color: CHART_COLORS.danger }
                ]}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Gauge 
                value={metrics?.netInterestMargin || 8.6} 
                max={15} 
                size={100}
                title="NIM"
                unit="%"
                thresholds={[
                  { value: 40, color: CHART_COLORS.warning },
                  { value: 70, color: CHART_COLORS.success },
                  { value: 100, color: CHART_COLORS.primary }
                ]}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Gauge 
                value={metrics?.capitalAdequacy || 24.5} 
                max={35} 
                size={100}
                title="Capital Adequacy"
                unit="%"
                thresholds={[
                  { value: 57, color: CHART_COLORS.danger },
                  { value: 86, color: CHART_COLORS.warning },
                  { value: 100, color: CHART_COLORS.success }
                ]}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Gauge 
                value={metrics?.loanLossRatio || 1.2} 
                max={5} 
                size={100}
                title="Loan Loss Ratio"
                unit="%"
                thresholds={[
                  { value: 40, color: CHART_COLORS.success },
                  { value: 70, color: CHART_COLORS.warning },
                  { value: 100, color: CHART_COLORS.danger }
                ]}
              />
            </CardContent>
          </Card>
        </div>

        {/* Metrics Table */}
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Financial Metrics Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'Yield on Portfolio', value: `${metrics?.yieldOnPortfolio}%`, status: 'good' as const },
                { label: 'Cost of Funds', value: `${metrics?.costOfFunds}%`, status: 'good' as const },
                { label: 'Net Interest Margin', value: `${metrics?.netInterestMargin}%`, status: 'good' as const },
                { label: 'Operational Efficiency', value: `${metrics?.operationalEfficiency}%`, status: 'warning' as const },
                { label: 'Loan Loss Ratio', value: `${metrics?.loanLossRatio}%`, status: 'good' as const },
                { label: 'Capital Adequacy Ratio', value: `${metrics?.capitalAdequacy}%`, status: 'good' as const }
              ].map((metric, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-sm text-slate-600 dark:text-slate-400">{metric.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">{metric.value}</span>
                    <div className={`w-2 h-2 rounded-full ${
                      metric.status === 'good' ? 'bg-emerald-500' :
                      metric.status === 'warning' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Cash Flow Summary */}
      {cashFlow && (
        <section>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Cash Flow Summary
          </h3>
          
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Opening Balance */}
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-sm text-slate-500 mb-1">Opening Balance</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{formatKES(cashFlow.openingBalance)}</p>
                </div>
                
                {/* Net Change */}
                <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                  <p className="text-sm text-emerald-600 mb-1">Net Change</p>
                  <p className="text-xl font-bold text-emerald-600">{formatKES(cashFlow.netChange)}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs text-emerald-600">Positive Flow</span>
                  </div>
                </div>
                
                {/* Closing Balance */}
                <div className="text-center p-4 bg-emerald-100 dark:bg-emerald-950/30 rounded-lg">
                  <p className="text-sm text-emerald-700 dark:text-emerald-400 mb-1">Closing Balance</p>
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{formatKES(cashFlow.closingBalance)}</p>
                </div>
              </div>
              
              {/* Inflows/Outflows */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <h4 className="text-sm font-medium text-emerald-600 mb-3 flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4" /> Inflows
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Collections</span>
                      <span className="font-medium">{formatKES(cashFlow.inflows.collections)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">New Funding</span>
                      <span className="font-medium">{formatKES(cashFlow.inflows.newFunding)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium pt-2 border-t border-slate-200">
                      <span>Total Inflows</span>
                      <span className="text-emerald-600">{formatKES(cashFlow.inflows.totalInflows)}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-red-600 mb-3 flex items-center gap-2">
                    <ArrowDownRight className="w-4 h-4" /> Outflows
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Disbursements</span>
                      <span className="font-medium">{formatKES(cashFlow.outflows.disbursements)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Operations</span>
                      <span className="font-medium">{formatKES(cashFlow.outflows.operations)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium pt-2 border-t border-slate-200">
                      <span>Total Outflows</span>
                      <span className="text-red-600">{formatKES(cashFlow.outflows.totalOutflows)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Financial Alerts & Insights
          </h3>
          <div className="space-y-3">
            {alerts.slice(0, 3).map((alert: any, index: number) => (
              <Card key={index} className={`${
                alert.type === 'success' ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900' :
                alert.type === 'warning' ? 'border-amber-200 bg-amber-50 dark:border-amber-900' :
                'border-blue-200 bg-blue-50 dark:border-blue-900'
              }`}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className={`shrink-0 ${
                  alert.type === 'success' ? 'border-emerald-500 text-emerald-600' :
                  alert.type === 'warning' ? 'border-amber-500 text-amber-600' :
                  'border-blue-500 text-blue-600'
                }`}>
                  {alert.type}
                </Badge>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white text-sm">{alert.title}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{alert.message}</p>
                </div>
              </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default FinancialReport
