'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Download,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Headphones,
  Monitor,
  Server,
  Zap,
  Target,
  Timer,
  UserCheck,
  MessageSquare,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

// Types
interface OperationalMetricsReportProps {
  dateRange?: string
  exportFormat?: string
}

// Mock Data - Kenya DCP Context (KES currency)
const formatKES = (value: number): string => {
  if (value >= 1000000) return `KSh ${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `KSh ${(value / 1000).toFixed(0)}K`
  return `KSh ${value.toFixed(0)}`
}

// Loan Processing Metrics
const processingMetrics = {
  avgProcessingTime: 4.2, // hours
  approvalRate: 68.5, // percentage
  turnaroundTime: 3.8, // hours submit to disburse
  applicationsPerStaff: 145, // per month
  trend: [
    { week: 'W1', processingTime: 4.8, approvalRate: 65.2, turnaround: 4.5, appsPerStaff: 138 },
    { week: 'W2', processingTime: 4.5, approvalRate: 66.8, turnaround: 4.2, appsPerStaff: 142 },
    { week: 'W3', processingTime: 4.2, approvalRate: 67.5, turnaround: 3.9, appsPerStaff: 144 },
    { week: 'W4', processingTime: 4.0, approvalRate: 68.1, turnaround: 3.7, appsPerStaff: 146 },
    { week: 'W5', processingTime: 3.9, approvalRate: 68.5, turnaround: 3.6, appsPerStaff: 148 },
    { week: 'W6', processingTime: 3.7, approvalRate: 69.2, turnaround: 3.4, appsPerStaff: 150 },
    { week: 'W7', processingTime: 3.6, approvalRate: 69.8, turnaround: 3.3, appsPerStaff: 152 },
    { week: 'W8', processingTime: 4.2, approvalRate: 68.5, turnaround: 3.8, appsPerStaff: 145 }
  ],
  breakdownByStage: [
    { stage: 'Application Receipt', avgTime: 0.15, target: 0.25 },
    { stage: 'KYC Verification', avgTime: 0.45, target: 0.50 },
    { stage: 'Credit Bureau Check', avgTime: 0.30, target: 0.30 },
    { stage: 'Credit Scoring', avgTime: 0.20, target: 0.20 },
    { stage: 'Underwriting Review', avgTime: 1.80, target: 2.00 },
    { stage: 'Approval Decision', avgTime: 0.80, target: 1.00 },
    { stage: 'Disbursement Setup', avgTime: 0.50, target: 0.50 }
  ]
}

// Collection Efficiency Metrics
const collectionMetrics = {
  collectionRate: 87.5, // percentage of expected collections achieved
  avgDaysToCollect: 12.3, // average days past due to collect
  ptpFulfillmentRate: 72.8, // promise-to-pay fulfillment rate
  callsPerCollectedAccount: 2.4, // average calls needed
  trend: [
    { month: 'Jul', collectionRate: 84.2, daysToCollect: 14.5, ptpRate: 68.5, callsPerAccount: 2.8 },
    { month: 'Aug', collectionRate: 85.1, daysToCollect: 13.8, ptpRate: 69.8, callsPerAccount: 2.7 },
    { month: 'Sep', collectionRate: 85.8, daysToCollect: 13.2, ptpRate: 70.5, callsPerAccount: 2.6 },
    { month: 'Oct', collectionRate: 86.2, daysToCollect: 12.8, ptpRate: 71.2, callsPerAccount: 2.5 },
    { month: 'Nov', collectionRate: 86.8, daysToCollect: 12.5, ptpRate: 72.0, callsPerAccount: 2.5 },
    { month: 'Dec', collectionRate: 85.5, daysToCollect: 13.0, ptpRate: 70.8, callsPerAccount: 2.6 },
    { month: 'Jan', collectionRate: 87.0, daysToCollect: 12.4, ptpRate: 72.5, callsPerAccount: 2.4 },
    { month: 'Feb', collectionRate: 87.5, daysToCollect: 12.3, ptpRate: 72.8, callsPerAccount: 2.4 }
  ],
  byAgingBucket: [
    { bucket: 'Current', collected: 95.2, target: 98.0 },
    { bucket: '1-7 Days', collected: 88.5, target: 90.0 },
    { bucket: '8-30 Days', collected: 78.2, target: 80.0 },
    { bucket: '31-60 Days', collected: 62.5, target: 70.0 },
    { bucket: '61-90 Days', collected: 45.8, target: 55.0 },
    { bucket: '90+ Days', collected: 28.4, target: 35.0 }
  ]
}

// System Usage Metrics
const systemMetrics = {
  activeUsers: 285,
  apiCallsDaily: 125000,
  featureAdoption: {
    mobileApp: 78.5,
    webPortal: 65.2,
    autoRepayment: 82.3,
    smsNotifications: 94.5,
    mpesaDisbursement: 89.2
  },
  errorRate: 0.12, // percentage
  uptimePercentage: 99.97,
  dailyUptimeTrend: Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    uptime: 99.9 + Math.random() * 0.099,
    errors: Math.floor(Math.random() * 200 + 50)
  }))
}

// Staff Productivity Data
const staffProductivity = {
  loanOfficers: [
    { name: 'Jane Wanjiku', loansProcessed: 186, customersServed: 245, resolutionTime: 2.1, efficiency: 96 },
    { name: 'John Ochieng', loansProcessed: 172, customersServed: 228, resolutionTime: 2.4, efficiency: 92 },
    { name: 'Faith Muthoni', loansProcessed: 168, customersServed: 215, resolutionTime: 2.3, efficiency: 91 },
    { name: 'Peter Kamau', loansProcessed: 158, customersServed: 202, resolutionTime: 2.6, efficiency: 88 },
    { name: 'Grace Auma', loansProcessed: 152, customersServed: 198, resolutionTime: 2.5, efficiency: 87 },
    { name: 'David Mutiso', loansProcessed: 145, customersServed: 189, resolutionTime: 2.8, efficiency: 84 },
    { name: 'Mary Nyokabi', loansProcessed: 142, customersServed: 185, resolutionTime: 2.7, efficiency: 83 },
    { name: 'Samuel Kioko', loansProcessed: 138, customersServed: 178, resolutionTime: 2.9, efficiency: 81 }
  ],
  collectionAgents: [
    { name: 'Lucy Njeri', accountsManaged: 485, collectionsMade: 412, recoveryRate: 84.9, callsMade: 1240 },
    { name: 'Tom Otieno', accountsManaged: 468, collectionsMade: 392, recoveryRate: 83.8, callsMade: 1180 },
    { name: 'Ann Wairimu', accountsManaged: 452, collectionsMade: 385, recoveryRate: 85.2, callsMade: 1150 },
    { name: 'Kevin Ngugi', accountsManaged: 438, collectionsMade: 365, recoveryRate: 83.3, callsMade: 1100 },
    { name: 'Sarah Akinyi', accountsManaged: 425, collectionsMade: 358, recoveryRate: 84.2, callsMade: 1080 }
  ],
  supportAgents: [
    { name: 'Rachel Chebet', ticketsResolved: 285, avgResponseTime: 8.2, satisfactionScore: 4.6 },
    { name: 'Brian Kipchoge', ticketsResolved: 268, avgResponseTime: 9.1, satisfactionScore: 4.5 },
    { name: 'Diana Moraa', ticketsResolved: 255, avgResponseTime: 8.8, satisfactionScore: 4.4 },
    { name: 'George Wekesa', ticketsResolved: 242, avgResponseTime: 10.2, satisfactionScore: 4.2 }
  ]
}

export function OperationalMetricsReport({ dateRange = 'last30days', exportFormat = 'pdf' }: OperationalMetricsReportProps) {
  const [activeTab, setActiveTab] = useState('processing')

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-amber-600" />
            Operational Metrics Report
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Processing efficiency, collections performance & staff productivity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export {exportFormat.toUpperCase()}
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Avg Processing</p>
            <p className="text-lg font-bold text-blue-900 dark:text-blue-100 mt-1">
              {processingMetrics.avgProcessingTime}h
            </p>
            <p className="text-xs text-green-600/70 mt-1 flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3" /> Target: 5h
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Approval Rate</p>
            <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100 mt-1">
              {processingMetrics.approvalRate}%
            </p>
            <p className="text-xs text-green-600/70 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +2.3pp vs last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Collection Rate</p>
            <p className="text-lg font-bold text-purple-900 dark:text-purple-100 mt-1">
              {collectionMetrics.collectionRate}%
            </p>
            <p className="text-xs text-green-600/70 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +0.7pp vs last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-950/20 dark:to-sky-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">System Uptime</p>
            <p className="text-lg font-bold text-cyan-900 dark:text-cyan-100 mt-1">
              {systemMetrics.uptimePercentage}%
            </p>
            <p className="text-xs text-green-600/70 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Excellent
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Active Users</p>
            <p className="text-lg font-bold text-amber-900 dark:text-amber-100 mt-1">
              {systemMetrics.activeUsers}
            </p>
            <p className="text-xs text-slate-500 mt-1">{(systemMetrics.activeUsers / 45680 * 100).toFixed(1)}% of staff</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/20 dark:to-red-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">Error Rate</p>
            <p className="text-lg font-bold text-rose-900 dark:text-rose-100 mt-1">
              {systemMetrics.errorRate}%
            </p>
            <p className="text-xs text-green-600/70 mt-1 flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3" /> Below 0.5% target
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 bg-slate-100 dark:bg-slate-800 p-1">
          <TabsTrigger value="processing">Loan Processing</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="systems">System Usage</TabsTrigger>
          <TabsTrigger value="staff">Staff Productivity</TabsTrigger>
        </TabsList>

        {/* Loan Processing Tab */}
        <TabsContent value="processing" className="mt-6 space-y-6">
          {/* Processing Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Processing Metrics Trends</CardTitle>
              <CardDescription>Weekly performance on key processing KPIs</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={processingMetrics.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `${v}%`} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 6]} tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `${v}h`} />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === 'approvalRate') return [`${value}%`, 'Approval Rate']
                      if (name === 'appsPerStaff') return [`${value}`, 'Apps/Staff']
                      return [`${value}h`, name]
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line yAxisId="left" type="monotone" dataKey="approvalRate" name="Approval Rate %" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} />
                  <Line yAxisId="right" type="monotone" dataKey="processingTime" name="Processing Time (h)" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="turnaround" name="Turnaround Time (h)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Stage Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-blue-600" />
                Processing Time by Stage
              </CardTitle>
              <CardDescription>Average time spent in each processing stage vs target</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {processingMetrics.breakdownByStage.map((stage, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-40 shrink-0">
                      <span className="font-medium text-sm">{stage.stage}</span>
                    </div>
                    <div className="flex-1">
                      <div className="relative">
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-6">
                          <div 
                            className={`h-6 rounded-full flex items-center justify-end pr-2 transition-all ${
                              stage.avgTime <= stage.target ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, (stage.avgTime / 2.5) * 100)}%` }}
                          >
                            <span className="text-xs font-semibold text-white">{stage.avgTime}h</span>
                          </div>
                        </div>
                        {/* Target marker */}
                        <div 
                          className="absolute top-0 w-0.5 h-6 bg-slate-400"
                          style={{ left: `${(stage.target / 2.5) * 100}%` }}
                        />
                      </div>
                    </div>
                    <Badge variant={stage.avgTime <= stage.target ? 'outline' : 'secondary'}
                           className={`shrink-0 ${stage.avgTime <= stage.target ? 'border-emerald-500 text-emerald-600' : ''}`}>
                      Target: {stage.target}h
                    </Badge>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-800 dark:text-blue-200"><strong>Total Average:</strong> {processingMetrics.breakdownByStage.reduce((a, b) => a + b.avgTime, 0).toFixed(2)} hours</span>
                  <span className="text-blue-800 dark:text-blue-200"><strong>Target Total:</strong> {processingMetrics.breakdownByStage.reduce((a, b) => a + b.target, 0).toFixed(2)} hours</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Collections Tab */}
        <TabsContent value="collections" className="mt-6 space-y-6">
          {/* Collection KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="w-8 h-8 mx-auto text-green-600 mb-2" />
                <p className="text-sm text-green-600 font-medium">Collection Rate</p>
                <p className="text-3xl font-bold text-green-900">{collectionMetrics.collectionRate}%</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
              <CardContent className="p-4 text-center">
                <Clock className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                <p className="text-sm text-blue-600 font-medium">Avg Days to Collect</p>
                <p className="text-3xl font-bold text-blue-900">{collectionMetrics.avgDaysToCollect}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20">
              <CardContent className="p-4 text-center">
                <Phone className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                <p className="text-sm text-purple-600 font-medium">PTP Fulfillment</p>
                <p className="text-3xl font-bold text-purple-900">{collectionMetrics.ptpFulfillmentRate}%</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
              <CardContent className="p-4 text-center">
                <Headphones className="w-8 h-8 mx-auto text-amber-600 mb-2" />
                <p className="text-sm text-amber-600 font-medium">Calls Per Account</p>
                <p className="text-3xl font-bold text-amber-900">{collectionMetrics.callsPerCollectedAccount}</p>
              </CardContent>
            </Card>
          </div>

          {/* Collection Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Collection Performance Trends</CardTitle>
              <CardDescription>Monthly collection metrics over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={collectionMetrics.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis yAxisId="left" domain={[75, 92]} tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `${v}%`} />
                  <YAxis yAxisId="right" orientation="right" domain={[10, 16]} tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `${v}`} />
                  <Tooltip formatter={(value: number, name: string) => {
                    if (name === 'daysToCollect' || name === 'callsPerAccount') return [value, name]
                    return [`${value}%`, name]
                  }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line yAxisId="left" type="monotone" dataKey="collectionRate" name="Collection Rate %" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} />
                  <Line yAxisId="left" type="monotone" dataKey="ptpRate" name="PTP Fulfillment %" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="daysToCollect" name="Days to Collect" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* By Aging Bucket */}
          <Card>
            <CardHeader>
              <CardTitle>Collection Rate by Aging Bucket</CardTitle>
              <CardDescription>Performance across different delinquency stages</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={collectionMetrics.byAgingBucket} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="bucket" type="category" tick={{ fontSize: 11 }} width={75} />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="collected" name="Actual Collection %" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="target" name="Target %" fill="#e5e7eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Usage Tab */}
        <TabsContent value="systems" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Uptime Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-green-600" />
                  System Uptime (Last 30 Days)
                </CardTitle>
                <CardDescription>Daily uptime percentage and error count</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={systemMetrics.dailyUptimeTrend.slice(-14)}>
                    <defs>
                      <linearGradient id="uptimeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <YAxis domain={[99, 100]} tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                    <Area type="monotone" dataKey="uptime" name="Uptime %" stroke="#22c55e" fill="url(#uptimeGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
                
                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-500">Avg Uptime</p>
                    <p className="text-lg font-bold text-green-600">99.97%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Min Uptime</p>
                    <p className="text-lg font-bold text-amber-600">99.91%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total Downtime</p>
                    <p className="text-lg font-bold text-slate-700">13 min</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feature Adoption */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-600" />
                  Feature Adoption Rates
                </CardTitle>
                <CustomerDescription>How customers are using platform features</CustomerDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(systemMetrics.featureAdoption).map(([feature, rate]) => (
                    <div key={feature} className="flex items-center gap-4">
                      <div className="w-36 shrink-0">
                        <span className="text-sm font-medium capitalize">
                          {feature.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4">
                          <div 
                            className="h-4 rounded-full transition-all"
                            style={{ 
                              width: `${rate}%`,
                              backgroundColor: rate >= 85 ? '#22c55e' : rate >= 70 ? '#3b82f6' : '#f59e0b'
                            }}
                          />
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0 w-14 justify-center">
                        {rate}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Monitor className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                <p className="text-sm text-slate-500">Active Users</p>
                <p className="text-2xl font-bold">{systemMetrics.activeUsers}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <RefreshCw className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                <p className="text-sm text-slate-500">API Calls/Day</p>
                <p className="text-2xl font-bold">{(systemMetrics.apiCallsDaily / 1000).toFixed(0)}K</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <AlertTriangle className="w-8 h-8 mx-auto text-amber-600 mb-2" />
                <p className="text-sm text-slate-500">Error Rate</p>
                <p className="text-2xl font-bold text-amber-600">{systemMetrics.errorRate}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="w-8 h-8 mx-auto text-green-600 mb-2" />
                <p className="text-sm text-slate-500">Uptime SLA</p>
                <p className="text-2xl font-bold text-green-600">{systemMetrics.uptimePercentage}%</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Staff Productivity Tab */}
        <TabsContent value="staff" className="mt-6 space-y-6">
          {/* Staff Type Selector */}
          <Tabs defaultValue="loanOfficers">
            <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-slate-800 p-1">
              <TabsTrigger value="loanOfficers">Loan Officers</TabsTrigger>
              <TabsTrigger value="collectionAgents">Collection Agents</TabsTrigger>
              <TabsTrigger value="supportAgents">Support Agents</TabsTrigger>
            </TabsList>

            <TabsContent value="loanOfficers" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Loan Officer Productivity</CardTitle>
                  <CardDescription>This month's performance rankings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Officer Name</TableHead>
                          <TableHead className="text-right">Loans Processed</TableHead>
                          <TableHead className="text-right">Customers Served</TableHead>
                          <TableHead className="text-right">Avg Resolution (h)</TableHead>
                          <TableHead className="text-center">Efficiency %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {staffProductivity.loanOfficers.map((officer, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                                  {index + 1}
                                </Badge>
                                {officer.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">{officer.loansProcessed}</TableCell>
                            <TableCell className="text-right">{officer.customersServed}</TableCell>
                            <TableCell className="text-right font-mono">{officer.resolutionTime}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-16 bg-slate-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      officer.efficiency >= 90 ? 'bg-green-500' :
                                      officer.efficiency >= 80 ? 'bg-blue-500' : 'bg-amber-500'
                                    }`}
                                    style={{ width: `${officer.efficiency}%` }}
                                  />
                                </div>
                                <span className="text-xs font-mono w-8">{officer.efficiency}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="collectionAgents" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Collection Agent Performance</CardTitle>
                  <CardDescription>Recovery rates and call activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Agent Name</TableHead>
                          <TableHead className="text-right">Accounts Managed</TableHead>
                          <TableHead className="text-right">Collections Made</TableHead>
                          <TableHead className="text-right">Recovery Rate</TableHead>
                          <TableHead className="text-right">Calls Made</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {staffProductivity.collectionAgents.map((agent, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-green-600" />
                                {agent.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">{agent.accountsManaged}</TableCell>
                            <TableCell className="text-right font-mono">{agent.collectionsMade}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={agent.recoveryRate >= 84 ? 'outline' : 'secondary'}
                                     className={agent.recoveryRate >= 84 ? 'border-green-500 text-green-600' : ''}>
                                {agent.recoveryRate}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">{agent.callsMade.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="supportAgents" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Support Agent Performance</CardTitle>
                  <CardDescription>Ticket resolution and customer satisfaction</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Agent Name</TableHead>
                          <TableHead className="text-right">Tickets Resolved</TableHead>
                          <TableHead className="text-right">Avg Response (min)</TableHead>
                          <TableHead className="text-center">CSAT Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {staffProductivity.supportAgents.map((agent, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Headphones className="w-4 h-4 text-blue-600" />
                                {agent.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">{agent.ticketsResolved}</TableCell>
                            <TableCell className="text-right font-mono">{agent.avgResponseTime}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} filled={i < Math.floor(agent.satisfactionScore)} />
                                ))}
                                <span className="ml-1 text-sm font-mono">{agent.satisfactionScore}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper Components
function CustomerDescription({ children }: { children: React.ReactNode }) {
  return <CardDescription>{children}</CardDescription>
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg 
      className={`w-4 h-4 ${filled ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`}
      viewBox="0 0 24 24"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

export default OperationalMetricsReport
