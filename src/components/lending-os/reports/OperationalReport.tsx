'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Activity,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Zap,
  Shield,
  ArrowRight
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
import { OperationalKPIs } from './KPIDashboard'

// Types
interface OperationalReportProps {
  data: any
  compact?: boolean
}

export function OperationalReport({ data, compact = false }: OperationalReportProps) {
  if (!data) return null

  const { applications, kyc, payments, staffPerformance, channelEffectiveness, slaCompliance, alerts } = data

  // Prepare chart data
  const funnelData = applications?.funnelStages || []
  
  const dailyApplications = applications?.dailyApplications?.map((d: any) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  })) || []

  const kycTrend = kyc?.trend?.map((k: any) => ({
    ...k,
    date: new Date(k.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  })) || []

  const paymentMethods = payments?.breakdownByMethod?.map((m: any) => ({
    name: m.method,
    count: m.count,
    volume: m.volume / 1000000,
    successRate: m.successRate
  })) || []

  const channelData = channelEffectiveness?.map((c: any) => ({
    name: c.channel,
    applications: c.applications,
    disbursements: c.disbursements,
    avgLoanSize: c.avgLoanSize / 1000,
    par: c.par
  })) || []

  if (compact) {
    return (
      <div className="space-y-4">
        <OperationalKPIs data={data} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ReportAreaChart
            title="Application Volume"
            data={dailyApplications.slice(-14)}
            areas={[
              { dataKey: 'received', name: 'Received', color: CHART_COLORS.primary },
              { dataKey: 'approved', name: 'Approved', color: CHART_COLORS.success }
            ]}
            height={200}
          />
          
          <ReportBarChart
            title="Payment Methods"
            data={paymentMethods}
            bars={[{ dataKey: 'count', name: 'Transactions', color: CHART_COLORS.secondary }]}
            xAxisKey="name"
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
          <Activity className="w-5 h-5 text-emerald-600" />
          Operational Performance Summary
        </h3>
        <OperationalKPIs data={data} />
      </section>

      {/* Application Pipeline */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-emerald-600" />
          Application Pipeline & Funnel
        </h3>

        {/* Funnel Visualization */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Application Funnel</CardTitle>
            <CardDescription>Conversion rates at each stage of the application process</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-6">
              {funnelData.map((stage: any, index: number) => (
                <div key={stage.stage} className="flex-1 w-full max-w-[160px]">
                  {/* Funnel bar */}
                  <div 
                    className={`rounded-t-lg p-4 text-center transition-all ${
                      index === 0 ? 'bg-blue-500' :
                      index === 1 ? 'bg-cyan-500' :
                      index === 2 ? 'bg-teal-500' :
                      index === 3 ? 'bg-emerald-500' :
                      'bg-green-600'
                    }`}
                    style={{ 
                      marginTop: `${index * 10}px`,
                      opacity: 1 - (index * 0.1)
                    }}
                  >
                    <p className="text-white font-bold text-xl">{stage.count.toLocaleString()}</p>
                    <p className="text-white/80 text-xs mt-1">{stage.stage}</p>
                  </div>
                  
                  {/* Conversion rate */}
                  {index < funnelData.length - 1 && (
                    <div className="text-center mt-2">
                      <ArrowRight className="w-4 h-4 mx-auto text-slate-400" />
                      <span className="text-xs text-slate-500">
                        {stage.conversion}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Key Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <p className="text-sm text-slate-500">Total Received</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{applications?.totalReceived?.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                <p className="text-sm text-emerald-600">Approved</p>
                <p className="text-xl font-bold text-emerald-600">{applications?.approved?.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <p className="text-sm text-red-600">Rejected</p>
                <p className="text-xl font-bold text-red-600">{applications?.rejected?.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <p className="text-sm text-amber-600">Pending</p>
                <p className="text-xl font-bold text-amber-600">{applications?.pending?.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Applications Chart */}
        <ReportAreaChart
          title="Daily Application Trends (30 Days)"
          data={dailyApplications}
          areas={[
            { dataKey: 'received', name: 'Received', color: CHART_COLORS.primary },
            { dataKey: 'approved', name: 'Approved', color: CHART_COLORS.success },
            { dataKey: 'rejected', name: 'Rejected', color: CHART_COLORS.danger }
          ]}
          height={280}
        />

        {/* Processing Time Breakdown */}
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Average Processing Time</CardTitle>
            <CardDescription>Current average: {applications?.averageProcessingTime} hours total</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { stage: 'KYC Verification', time: applications?.processingTimeBreakdown?.kycVerification || 1.2, color: 'bg-blue-500' },
                { stage: 'Credit Assessment', time: applications?.processingTimeBreakdown?.creditAssessment || 1.8, color: 'bg-purple-500' },
                { stage: 'Manual Review', time: applications?.processingTimeBreakdown?.manualReview || 1.2, color: 'bg-emerald-500' }
              ].map((item, index) => (
                <div key={index} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600 dark:text-slate-400">{item.stage}</span>
                    <Badge variant="outline" className="font-mono">{item.time}h</Badge>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div 
                      className={`${item.color} h-2 rounded-full transition-all`}
                      style={{ width: `${(item.time / 4.2) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            {/* Processing Time Trend */}
            {applications?.processingTimeTrend && (
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Processing Time Trend (Weekly)</h4>
                <ReportLineChart
                  data={applications.processingTimeTrend}
                  lines={[{ dataKey: 'avgHours', name: 'Avg Hours', color: CHART_COLORS.warning }]}
                  height={150}
                  showGrid={false}
                  showLegend={false}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* KYC & Payment Metrics */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* KYC Processing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                KYC Verification Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg text-center">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 mb-1" />
                  <p className="text-2xl font-bold text-emerald-600">{kyc?.approvalRate}%</p>
                  <p className="text-xs text-slate-500">Approval Rate</p>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg text-center">
                  <XCircle className="w-8 h-8 mx-auto text-red-500 mb-1" />
                  <p className="text-2xl font-bold text-red-500">{kyc?.failureRate}%</p>
                  <p className="text-xs text-slate-500">Failure Rate</p>
                </div>
              </div>
              
              {/* KYC by Type */}
              {kyc?.breakdownByType && (
                <div className="space-y-2 mt-4">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">By Document Type</h4>
                  {kyc.breakdownByType.map((type: any, index: number) => (
                    <div key={index} className="flex items-center justify-between text-sm p-2 bg-slate-50 dark:bg-slate-800/50 rounded">
                      <span className="text-slate-700 dark:text-slate-300">{type.type}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">{type.avgTime}h avg</span>
                        <Badge variant="outline" className={
                          (type.approved / type.submitted) > 0.9 ? 'border-emerald-500 text-emerald-600' :
                          (type.approved / type.submitted) > 0.85 ? 'border-yellow-500 text-yellow-600' :
                          'border-red-500 text-red-600'
                        }>
                          {Math.round((type.approved / type.submitted) * 100)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* KYC Trend */}
              {kycTrend.length > 0 && (
                <div className="mt-4">
                  <ReportLineChart
                    data={kycTrend.slice(-7)}
                    lines={[
                      { dataKey: 'submitted', name: 'Submitted', color: CHART_COLORS.primary },
                      { dataKey: 'approved', name: 'Approved', color: CHART_COLORS.success }
                    ]}
                    height={150}
                    showGrid={false}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Processing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-600" />
                Payment Processing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg text-center">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 mb-1" />
                  <p className="text-2xl font-bold text-emerald-600">{payments?.successRate}%</p>
                  <p className="text-xs text-slate-500">Success Rate</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
                  <Clock className="w-8 h-8 mx-auto text-slate-400 mb-1" />
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {payments?.averageProcessingTime * 60}m
                  </p>
                  <p className="text-xs text-slate-500">Avg Processing</p>
                </div>
              </div>
              
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Total Processed</span>
                  <span className="font-semibold">{payments?.totalProcessed?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Total Volume</span>
                  <span className="font-semibold">{formatKES(payments?.totalVolume)}</span>
                </div>
              </div>
              
              {/* Payment Methods */}
              <ReportBarChart
                data={paymentMethods}
                bars={[{ dataKey: 'count', name: 'Count', color: CHART_COLORS.secondary }]}
                xAxisKey="name"
                height={180}
                showLegend={false}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Channel Effectiveness */}
      {channelEffectiveness && (
        <section>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Channel Effectiveness Analysis
          </h3>
          
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Channel</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Applications</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Disbursements</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Conv. Rate</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Avg Loan Size</th>
                      <th className="text-center py-3 px-4 font-medium text-slate-600 dark:text-slate-400">PAR30</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channelEffectiveness.map((channel: any, index: number) => (
                      <tr key={index} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{channel.channel}</td>
                        <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">{channel.applications}</td>
                        <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">{channel.disbursements}</td>
                        <td className="py-3 px-4 text-right">
                          <Badge variant="outline" className={
                            (channel.disbursements / channel.applications) > 0.65 ? 'border-emerald-500 text-emerald-600' :
                            (channel.disbursements / channel.applications) > 0.55 ? 'border-yellow-500 text-yellow-600' :
                            'border-red-500 text-red-600'
                          }>
                            {((channel.disbursements / channel.applications) * 100).toFixed(0)}%
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">{formatKES(channel.avgLoanSize)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-medium ${
                            channel.par <= 4 ? 'text-emerald-600' :
                            channel.par <= 6 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {channel.par}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Staff Performance Leaderboard */}
      {staffPerformance && staffPerformance.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Staff Performance Leaderboard
          </h3>
          
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-900">
                      <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400 w-12">#</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Staff Member</th>
                      <th className="text-center py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Role</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Processed</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Approved</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Collections</th>
                      <th className="text-center py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffPerformance
                      .sort((a: any, b: any) => b.applicationsProcessed - a.applicationsProcessed)
                      .map((staff: any, index: number) => (
                      <tr key={staff.userId} className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                        index < 3 ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                      }`}>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            index === 0 ? 'bg-amber-400 text-white' :
                            index === 1 ? 'bg-slate-300 text-slate-700' :
                            index === 2 ? 'bg-orange-400 text-white' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                              {staff.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className="font-medium text-slate-900 dark:text-white">{staff.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="secondary" className="text-xs">{staff.role}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-white">
                          {staff.applicationsProcessed}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-600 font-medium">
                          {staff.loansApproved}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                          {staff.collectionsAchieved}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star filled={true} className="w-4 h-4 text-amber-400" />
                            <span className="font-medium">{staff.rating}</span>
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
      )}

      {/* SLA Compliance */}
      {slaCompliance && (
        <section>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            SLA Compliance Dashboard
          </h3>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Service Level Agreement Compliance</CardTitle>
                <Badge variant="outline" className={
                  slaCompliance.overallCompliance >= 95 ? 'border-emerald-500 text-emerald-600' :
                  slaCompliance.overallCompliance >= 90 ? 'border-yellow-500 text-yellow-600' :
                  'border-red-500 text-red-600'
                }>
                  Overall: {slaCompliance.overallCompliance}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {slaCompliance.metrics.map((metric: any, index: number) => (
                  <div key={index} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {metric.sla}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">Target: {metric.target}%</span>
                        <Badge variant="outline" className={
                          metric.status === 'met' ? 'border-emerald-500 text-emerald-600' :
                          'border-red-500 text-red-600'
                        }>
                          {metric.status === 'met' ? (
                            <><CheckCircle2 className="w-3 h-3 mr-1" /> Met ({metric.actual}%)</>
                          ) : (
                            <><AlertTriangle className="w-3 h-3 mr-1" /> Breached ({metric.actual}%)</>
                          )}
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full transition-all ${
                          metric.status === 'met' ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, metric.actual)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Operational Alerts
          </h3>
          <div className="space-y-3">
            {alerts.map((alert: any, index: number) => (
              <Card key={index} className={`${
                alert.type === 'warning' ? 'border-amber-200 bg-amber-50 dark:border-amber-900' :
                alert.type === 'success' ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900' :
                'border-blue-200 bg-blue-50 dark:border-blue-900'
              }`}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-3">
                    {alert.type === 'warning' ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    ) : alert.type === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <Activity className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{alert.title}</p>
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

// Star icon component for ratings
function Star({ filled }: { filled: boolean }) {
  return (
    <svg className={`w-4 h-4 ${filled ? 'text-amber-400 fill-current' : 'text-slate-300'}`} viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

export default OperationalReport
