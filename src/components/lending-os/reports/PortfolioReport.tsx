'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react'

// Import visualization components
import {
  ReportLineChart,
  ReportBarChart,
  ReportPieChart,
  ReportAreaChart,
  TreemapHeatmap,
  formatKES,
  formatPercent,
  CHART_COLORS,
  COLOR_PALETTES
} from './DataVisualization'

// Import KPI components
import { PortfolioKPIs } from './KPIDashboard'

// Types
interface PortfolioReportProps {
  data: any
  compact?: boolean
}

export function PortfolioReport({ data, compact = false }: PortfolioReportProps) {
  if (!data) return null

  const { overview, disbursementTrend, repaymentTrend, parAnalysis, portfolioByProduct, portfolioByRisk, vintageAnalysis } = data

  // Prepare chart data
  const parPieData = [
    { name: 'Current (PAR0)', value: 100 - (parAnalysis.par30 || 5), color: CHART_COLORS.success },
    { name: 'PAR1-7', value: (parAnalysis.par7 || 4) - (parAnalysis.par1 || 3), color: '#eab308' },
    { name: 'PAR8-30', value: (parAnalysis.par30 || 5) - (parAnalysis.par7 || 4), color: CHART_COLORS.warning },
    { name: 'PAR31-90', value: (parAnalysis.par90 || 2) - ((parAnalysis.par30 || 5) - (parAnalysis.par7 || 4)), color: '#f97316' },
    { name: 'PAR90+', value: parAnalysis.par90 || 2, color: CHART_COLORS.danger }
  ].filter(d => d.value > 0)

  const productChartData = portfolioByProduct?.map((p: any) => ({
    name: p.product,
    volume: p.volume / 1000000, // Convert to millions for display
    count: p.count,
    par: p.par
  })) || []

  const riskChartData = portfolioByRisk?.map((r: any) => ({
    name: `${r.riskLevel} Risk`,
    volume: r.volume / 1000000,
    count: r.count,
    percentage: r.percentage
  })) || []

  const vintageTreemapData = vintageAnalysis?.map((v: any) => ({
    name: v.month,
    size: v.originationVolume / 100000,
    par: v.par
  })) || []

  if (compact) {
    return (
      <div className="space-y-4">
        <PortfolioKPIs data={overview} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ReportLineChart
            title="Disbursement Trend"
            data={disbursementTrend}
            lines={[
              { dataKey: 'volume', name: 'Volume (KSh M)', color: CHART_COLORS.primary }
            ]}
            height={200}
            formatValue={(v) => `KSh ${(v as number).toFixed(1)}M`}
          />
          
          <ReportPieChart
            title="Portfolio at Risk"
            data={parPieData}
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
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          Portfolio Performance Summary
        </h3>
        <PortfolioKPIs data={overview} />
      </section>

      {/* Main Charts Row - Disbursement & PAR Analysis */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Disbursement Trend */}
          <ReportAreaChart
            title="Disbursement & Repayment Trends"
            data={disbursementTrend}
            areas={[
              { dataKey: 'volume', name: 'Disbursements', color: CHART_COLORS.primary },
              { dataKey: 'count', name: 'Loan Count (÷100)', color: CHART_COLORS.tertiary }
            ]}
            height={320}
            formatValue={(v) => typeof v === 'number' && v > 100 ? `KSh ${(v / 1000000).toFixed(1)}M` : String(v)}
          />

          {/* PAR Analysis Pie Chart */}
          <div className="space-y-6">
            <ReportPieChart
              title="Portfolio at Risk Distribution"
              data={parPieData}
              innerRadius={60}
              outerRadius={100}
              height={240}
            />
            
            {/* PAR Trend Line */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">PAR30 Trend (12 Months)</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  Current: <span className="font-semibold text-slate-900 dark:text-white">{parAnalysis.par30}%</span>
                  <Badge variant="outline" className={`${
                    parAnalysis.comparison?.direction === 'improvement' 
                      ? 'border-emerald-500 text-emerald-600' 
                      : 'border-red-500 text-red-600'
                  }`}>
                    {parAnalysis.comparison?.direction === 'improvement' ? (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    )}
                    {Math.abs(parAnalysis.comparison?.change || 0)}% vs last period
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ReportLineChart
                  data={parAnalysis.parTrend || []}
                  lines={[{ dataKey: 'par30', name: 'PAR30 %', color: CHART_COLORS.danger }]}
                  height={180}
                  showLegend={false}
                  showGrid={false}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Portfolio by Product & Risk */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Portfolio Composition
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Breakdown Bar Chart */}
          <ReportBarChart
            title="Portfolio by Loan Product"
            data={productChartData}
            bars={[
              { dataKey: 'volume', name: 'Volume (KSh M)', color: CHART_COLORS.primary }
            ]}
            xAxisKey="name"
            height={300}
            formatValue={(v) => `KSh ${v.toFixed(1)}M`}
          />

          {/* Risk Distribution */}
          <ReportBarChart
            title="Portfolio by Risk Level"
            data={riskChartData}
            bars={[
              { dataKey: 'volume', name: 'Volume (KSh M)', color: COLOR_PALETTES.risk[0] },
              { dataKey: 'count', name: 'Count (÷10)', color: COLOR_PALETTES.risk[3] }
            ]}
            xAxisKey="name"
            height={300}
            layout="horizontal"
          />
        </div>

        {/* Product Performance Table */}
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Product Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Product</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Count</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Volume</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">PAR30</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolioByProduct?.map((product: any, index: number) => (
                    <tr key={index} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{product.product}</td>
                      <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">{product.count.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">{formatKES(product.volume)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-medium ${
                          product.par <= 3 ? 'text-emerald-600' :
                          product.par <= 5 ? 'text-yellow-600' :
                          product.par <= 8 ? 'text-orange-600' : 'text-red-600'
                        }`}>
                          {product.par}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {product.par <= 5 ? (
                          <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-50">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Healthy
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Monitor
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Vintage Analysis */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Vintage Analysis (Cohort Performance)
        </h3>
        <TreemapHeatmap
          title="Vintage Performance by Origination Month"
          data={vintageTreemapData}
          height={280}
        />

        {/* Vintage Table */}
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Vintage Details</CardTitle>
            <CardDescription>Performance tracking by loan origination cohort</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Origination Month</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Origination Volume</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Remaining Balance</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">PAR</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {vintageAnalysis?.map((vintage: any, index: number) => (
                    <tr key={index} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{vintage.month}</td>
                      <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">{formatKES(vintage.originationVolume)}</td>
                      <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">{formatKES(vintage.remainingBalance)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-medium ${
                          vintage.par <= 3 ? 'text-emerald-600' :
                          vintage.par <= 5 ? 'text-yellow-600' :
                          vintage.par <= 8 ? 'text-orange-600' : 'text-red-600'
                        }`}>
                          {vintage.par}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="w-full max-w-[80px] mx-auto bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              vintage.par <= 3 ? 'bg-emerald-500' :
                              vintage.par <= 5 ? 'bg-yellow-500' :
                              vintage.par <= 8 ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, vintage.par * 7)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Alerts Section */}
      {data.alerts && data.alerts.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Portfolio Alerts
          </h3>
          <div className="space-y-3">
            {data.alerts.map((alert: any, index: number) => (
              <Card key={index} className={`${
                alert.type === 'warning' ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20' :
                alert.type === 'danger' ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20' :
                'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20'
              }`}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    {alert.type === 'warning' ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{alert.metric}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{alert.message}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        Current: {alert.current} | Threshold: {alert.threshold}
                      </p>
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

export default PortfolioReport
