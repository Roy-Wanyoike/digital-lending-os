'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  TrendingUp,
  MapPin,
  UserPlus,
  Repeat,
  Star,
  ArrowUpRight
} from 'lucide-react'

// Import visualization components
import {
  ReportLineChart,
  ReportBarChart,
  ReportPieChart,
  ReportAreaChart,
  formatKES,
  CHART_COLORS,
  COLOR_PALETTES
} from './DataVisualization'

// Import KPI components
import { CustomerKPIs } from './KPIDashboard'

// Types
interface CustomerReportProps {
  data: any
  compact?: boolean
}

export function CustomerReport({ data, compact = false }: CustomerReportProps) {
  if (!data) return null

  const { overview, acquisition, segmentation, behavior, geography, cohortRetention, clvDistribution, acquisitionChannels } = data

  // Prepare chart data
  const acquisitionChartData = acquisition?.map((a: any) => ({
    ...a,
    month: a.month || new Date(a.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  })) || []

  const riskSegmentData = segmentation?.byRiskLevel?.map((s: any) => {
    const riskIndex = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'].indexOf(s.segment.toUpperCase())
    return {
      name: s.segment,
      value: s.count,
      percentage: s.percentage,
      color: COLOR_PALETTES.risk[riskIndex] || CHART_COLORS.neutral
    }
  }) || []

  const loanCountSegmentData = segmentation?.byLoanCount?.map((s: any) => ({
    name: s.segment,
    value: s.count,
    description: s.description
  })) || []

  const valueSegmentData = segmentation?.byValue?.map((s: any) => ({
    name: s.segment.replace(/ \([^)]+\)/, ''),
    count: s.count,
    volume: s.volume / 1000000 // Convert to millions
  })) || []

  const geographyTop10 = geography?.slice(0, 10).map((g: any) => ({
    county: g.county,
    customers: g.customerCount,
    volume: g.volume / 1000000
  })) || []

  // Cohort retention for line chart
  const cohortChartData = cohortRetention?.map((c: any) => ({
    month: c.cohort,
    acquired: c.acquired,
    retainedM1: c.retainedM1,
    retainedM3: c.retainedM3,
    retainedM6: c.retainedM6
  })) || []

  if (compact) {
    return (
      <div className="space-y-4">
        <CustomerKPIs data={overview} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ReportAreaChart
            title="Customer Acquisition"
            data={acquisitionChartData}
            areas={[
              { dataKey: 'newCustomers', name: 'New Customers', color: CHART_COLORS.primary }
            ]}
            height={200}
          />
          
          <ReportPieChart
            title="Risk Distribution"
            data={riskSegmentData}
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
          <Users className="w-5 h-5 text-emerald-600" />
          Customer Analytics Summary
        </h3>
        <CustomerKPIs data={overview} />
      </section>

      {/* Acquisition Trends & Segmentation */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Acquisition Trend */}
          <ReportBarChart
            title="Customer Acquisition Trend"
            data={acquisitionChartData}
            bars={[
              { dataKey: 'newCustomers', name: 'New Customers', color: CHART_COLORS.primary },
              { dataKey: 'acquisitionCost', name: 'Cost (÷1000)', color: CHART_COLORS.warning }
            ]}
            xAxisKey="month"
            height={320}
            formatValue={(v) => typeof v === 'number' && v > 500 ? `KSh ${(v / 1000).toFixed(0)}K` : String(v)}
          />

          {/* Risk Level Distribution */}
          <ReportPieChart
            title="Customer Segmentation by Risk Level"
            data={riskSegmentData}
            innerRadius={60}
            outerRadius={100}
            height={320}
          />
        </div>
      </section>

      {/* Behavior Metrics & Value Segmentation */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Customer Behavior & Value Analysis
        </h3>
        
        {/* Behavior Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Repeat className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{behavior?.averageLoansPerCustomer}</p>
              <p className="text-xs text-slate-500">Avg Loans/Customer</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="w-8 h-8 mx-auto text-blue-600 mb-2" />
              <p className="text-xl font-bold text-slate-900 dark:text-white">{formatKES(behavior?.averageLifetimeValue)}</p>
              <p className="text-xs text-slate-500">Avg Lifetime Value</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{behavior?.retentionRate}%</p>
              <p className="text-xs text-slate-500">Retention Rate</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 mx-auto text-red-500 mb-2" />
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{behavior?.churnRate}%</p>
              <p className="text-xs text-slate-500">Monthly Churn</p>
            </CardContent>
          </Card>
        </div>

        {/* Loan Count & Value Segmentation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ReportBarChart
            title="Customer Segmentation by Loan Count"
            data={loanCountSegmentData}
            bars={[
              { dataKey: 'value', name: 'Customers', color: CHART_COLORS.secondary }
            ]}
            xAxisKey="name"
            height={280}
          />

          <ReportBarChart
            title="Customer Value Distribution"
            data={valueSegmentData}
            bars={[
              { dataKey: 'volume', name: 'Volume (KSh M)', color: CHART_COLORS.primary },
              { dataKey: 'count', name: 'Count (÷50)', color: CHART_COLORS.tertiary }
            ]}
            xAxisKey="name"
            height={280}
          />
        </div>
      </section>

      {/* Geographic Distribution */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-600" />
          Geographic Distribution (Kenya Counties)
        </h3>
        
        <ReportBarChart
          title="Customer Distribution by County"
          data={geographyTop10}
          bars={[
            { dataKey: 'customers', name: 'Customers', color: CHART_COLORS.primary },
            { dataKey: 'volume', name: 'Volume (KSh M)', color: CHART_COLORS.secondary }
          ]}
          xAxisKey="county"
          height={350}
          layout="horizontal"
        />

        {/* Top Counties Table */}
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">County Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">County</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Customers</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Loan Volume</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {geography?.slice(0, 15).map((county: any, index: number) => {
                    const totalCustomers = geography.reduce((sum: number, g: any) => sum + g.customerCount, 0)
                    const percentage = ((county.customerCount / totalCustomers) * 100).toFixed(1)
                    
                    return (
                      <tr key={index} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{county.county}</td>
                        <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">{county.customerCount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">{formatKES(county.loanVolume)}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span>{percentage}%</span>
                            <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                              <div 
                                className="bg-emerald-500 h-1.5 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Cohort Retention Analysis */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Cohort Retention Analysis
        </h3>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Monthly Cohort Retention Rates</CardTitle>
            <CardDescription>Tracking customer retention by acquisition month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Cohort Month</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Acquired</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Month 1</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Month 3</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Month 6</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600 dark:text-slate-400">M1 Rate</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600 dark:text-slate-400">M3 Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {cohortRetention?.map((cohort: any, index: number) => (
                    <tr key={index} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{cohort.cohort}</td>
                      <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">{cohort.acquired}</td>
                      <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">{cohort.retainedM1 ?? '-'}</td>
                      <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">{cohort.retainedM3 ?? '-'}</td>
                      <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">{cohort.retainedM6 ?? '-'}</td>
                      <td className="py-3 px-4 text-center">
                        {cohort.retainedM1 && (
                          <Badge variant="outline" className={
                            (cohort.retainedM1 / cohort.acquired) > 0.9 ? 'border-emerald-500 text-emerald-600' :
                            (cohort.retainedM1 / cohort.acquired) > 0.8 ? 'border-yellow-500 text-yellow-600' :
                            'border-red-500 text-red-600'
                          }>
                            {((cohort.retainedM1 / cohort.acquired) * 100).toFixed(0)}%
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {cohort.retainedM3 && (
                          <Badge variant="outline" className={
                            (cohort.retainedM3 / cohort.acquired) > 0.75 ? 'border-emerald-500 text-emerald-600' :
                            (cohort.retainedM3 / cohort.acquired) > 0.65 ? 'border-yellow-500 text-yellow-600' :
                            'border-red-500 text-red-600'
                          }>
                            {((cohort.retainedM3 / cohort.acquired) * 100).toFixed(0)}%
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

      {/* Acquisition Channels */}
      {acquisitionChannels && (
        <section>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-600" />
            Acquisition Channel Effectiveness
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {acquisitionChannels.map((channel: any, index: number) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-medium text-slate-900 dark:text-white">{channel.channel}</h4>
                    <Badge 
                      variant="outline"
                      className={
                        channel.conversionRate > 30 ? 'border-emerald-500 text-emerald-600' :
                        channel.conversionRate > 20 ? 'border-blue-500 text-blue-600' :
                        'border-slate-500 text-slate-600'
                      }
                    >
                      {channel.conversionRate}% CVR
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Customers</span>
                      <span className="font-medium">{channel.customers.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cost/Acquisition</span>
                      <span className="font-medium">{formatKES(channel.costPerAcquisition)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Conversion</span>
                      <span className="font-medium">{channel.conversionRate}%</span>
                    </div>
                  </div>
                  
                  {/* Efficiency bar */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Efficiency Score</span>
                      <span>{Math.round(100 - (channel.costPerAcquisition / 10))}/100</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${
                          channel.conversionRate > 30 ? 'bg-emerald-500' :
                          channel.conversionRate > 20 ? 'bg-blue-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${Math.min(100, channel.conversionRate * 2)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* CLV Distribution */}
      {clvDistribution && (
        <section>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Customer Lifetime Value Distribution
          </h3>
          
          <ReportBarChart
            title="CLV Distribution"
            data={clvDistribution.map((d: any) => ({ name: d.range, ...d }))}
            bars={[{ dataKey: 'count', name: 'Customers', color: CHART_COLORS.purple }]}
            xAxisKey="range"
            height={250}
          />
        </section>
      )}
    </div>
  )
}

export default CustomerReport
