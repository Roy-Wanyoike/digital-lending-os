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
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ZAxis
} from 'recharts'
import {
  Users,
  TrendingUp,
  TrendingDown,
  Download,
  UserCheck,
  UserX,
  Star,
  MapPin,
  Calendar,
  Target,
  Heart,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react'

// Types
interface CustomerSegmentationReportProps {
  dateRange?: string
  exportFormat?: string
}

// Mock Data - Kenya DCP Context
const formatKES = (value: number): string => {
  if (value >= 1000000) return `KSh ${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `KSh ${(value / 1000).toFixed(0)}K`
  return `KSh ${value.toFixed(0)}`
}

// Customer Demographics
const demographics = {
  totalCustomers: 45680,
  activeCustomers: 32450,
  newCustomersThisMonth: 2450,
  genderSplit: [
    { gender: 'Male', count: 26850, percentage: 58.8 },
    { gender: 'Female', count: 18830, percentage: 41.2 }
  ],
  ageDistribution: [
    { range: '18-24', count: 8200, percentage: 18.0 },
    { range: '25-34', count: 18500, percentage: 40.5 },
    { range: '35-44', count: 12400, percentage: 27.1 },
    { range: '45-54', count: 4850, percentage: 10.6 },
    { range: '55+', count: 1730, percentage: 3.8 }
  ],
  geographicDistribution: [
    { county: 'Nairobi', count: 15200, percentage: 33.3 },
    { county: 'Mombasa', count: 5840, percentage: 12.8 },
    { county: 'Kisumu', count: 3980, percentage: 8.7 },
    { county: 'Nakuru', count: 3650, percentage: 8.0 },
    { county: 'Eldoret', count: 2890, percentage: 6.3 },
    { county: 'Kiambu', count: 2540, percentage: 5.6 },
    { county: 'Other Counties', count: 11580, percentage: 25.3 }
  ]
}

// Customer Tenure Bands
const tenureBands = [
  { band: 'New (<30 days)', count: 3850, color: '#3b82f6', description: 'Recently acquired' },
  { band: 'Active (30-180 days)', count: 12500, color: '#22c55e', description: 'Engaged users' },
  { band: 'Established (180-365 days)', count: 11200, color: '#f59e0b', description: 'Regular borrowers' },
  { band: 'Loyal (1-2 years)', count: 10800, color: '#a855f7', description: 'Long-term customers' },
  { band: 'Champions (2+ years)', count: 7330, color: '#ef4444', description: 'VIP customers' }
]

// Customer Value Segmentation
const valueSegments = [
  { 
    segment: 'High Value', 
    count: 9136, 
    percentage: 20, 
    revenueContribution: 68.5, 
    avgLoanValue: 85000,
    loansPerCustomer: 8.2,
    parRate: 2.1,
    color: '#22c55e',
    icon: '👑',
    trend: '+12%'
  },
  { 
    segment: 'Growing', 
    count: 11420, 
    percentage: 25, 
    revenueContribution: 18.2, 
    avgLoanValue: 45000,
    loansPerCustomer: 4.5,
    parRate: 4.8,
    color: '#3b82f6',
    icon: '📈',
    trend: '+24%'
  },
  { 
    segment: 'Stable', 
    count: 13700, 
    percentage: 30, 
    revenueContribution: 10.3, 
    avgLoanValue: 28000,
    loansPerCustomer: 3.2,
    parRate: 5.2,
    color: '#f59e0b',
    icon: '⚖️',
    trend: '-2%'
  },
  { 
    segment: 'At-Risk', 
    count: 6850, 
    percentage: 15, 
    revenueContribution: 2.5, 
    avgLoanValue: 15000,
    loansPerCustomer: 1.8,
    parRate: 14.5,
    color: '#f97316',
    icon: '⚠️',
    trend: '-18%'
  },
  { 
    segment: 'Dormant', 
    count: 4574, 
    percentage: 10, 
    revenueContribution: 0.5, 
    avgLoanValue: 8000,
    loansPerCustomer: 0.5,
    parRate: 28.3,
    color: '#6b7280',
    icon: '💤',
    trend: '-8%'
  }
]

// Scatter Plot Data for Segmentation Matrix
const segmentationScatterData = [
  { name: 'High Value', frequency: 8.2, value: 85, size: 200, color: '#22c55e' },
  { name: 'Growing A', frequency: 5.5, value: 52, size: 150, color: '#3b82f6' },
  { name: 'Growing B', frequency: 4.2, value: 45, size: 120, color: '#3b82f6' },
  { name: 'Stable A', frequency: 3.5, value: 32, size: 130, color: '#f59e0b' },
  { name: 'Stable B', frequency: 2.8, value: 28, size: 110, color: '#f59e0b' },
  { name: 'Stable C', frequency: 3.2, value: 25, size: 90, color: '#f59e0b' },
  { name: 'At-Risk A', frequency: 1.8, value: 18, size: 80, color: '#f97316' },
  { name: 'At-Risk B', frequency: 1.2, value: 12, size: 70, color: '#f97316' },
  { name: 'Dormant A', frequency: 0.5, value: 8, size: 60, color: '#6b7280' },
  { name: 'Dormant B', frequency: 0.3, value: 5, size: 40, color: '#6b7280' }
]

// Acquisition Analysis
const acquisitionData = [
  { month: 'Jul', newCustomers: 1850, channels: { organic: 520, referral: 480, sms: 350, social: 300, partner: 200 }, cac: 485 },
  { month: 'Aug', newCustomers: 1980, channels: { organic: 550, referral: 520, sms: 380, social: 320, partner: 210 }, cac: 472 },
  { month: 'Sep', newCustomers: 2120, channels: { organic: 600, referral: 550, sms: 400, social: 350, partner: 220 }, cac: 458 },
  { month: 'Oct', newCustomers: 2280, channels: { organic: 650, referral: 590, sms: 420, social: 380, partner: 240 }, cac: 445 },
  { month: 'Nov', newCustomers: 2350, channels: { organic: 680, referral: 610, sms: 430, social: 390, partner: 240 }, cac: 438 },
  { month: 'Dec', newCustomers: 1890, channels: { organic: 520, referral: 490, sms: 360, social: 310, partner: 210 }, cac: 462 },
  { month: 'Jan', newCustomers: 2180, channels: { organic: 620, referral: 570, sms: 410, social: 360, partner: 220 }, cac: 450 },
  { month: 'Feb', newCustomers: 2450, channels: { organic: 700, referral: 640, sms: 450, social: 400, partner: 260 }, cac: 432 }
]

// Retention Metrics
const retentionMetrics = {
  overallRetentionRate: 78.5,
  monthlyChurnRate: 4.2,
  reactivationRate: 23.5,
  cohortRetention: [
    { cohort: 'Jul 2024', month0: 100, month1: 92, month3: 81, month6: 72, month9: 65, month12: 58 },
    { cohort: 'Aug 2024', month0: 100, month1: 93, month3: 83, month6: 74, month9: 67, month12: null },
    { cohort: 'Sep 2024', month0: 100, month1: 94, month3: 84, month6: 76, month9: null, month12: null },
    { cohort: 'Oct 2024', month0: 100, month1: 92, month3: 82, month6: null, month9: null, month12: null },
    { cohort: 'Nov 2024', month0: 100, month1: 93, month3: null, month6: null, month9: null, month12: null },
    { cohort: 'Dec 2024', month0: 100, month1: null, month3: null, month6: null, month9: null, month12: null }
  ]
}

// NPS/CSAT Data
const npsData = {
  currentNPS: 42,
  previousNPS: 38,
  csatScore: 4.3,
  responses: 3450,
  trends: [
    { month: 'Jul', nps: 35, csat: 4.1 },
    { month: 'Aug', nps: 37, csat: 4.1 },
    { month: 'Sep', nps: 39, csat: 4.2 },
    { month: 'Oct', nps: 38, csat: 4.2 },
    { month: 'Nov', nps: 40, csat: 4.3 },
    { month: 'Dec', nps: 41, csat: 4.2 },
    { month: 'Jan', nps: 40, csat: 4.3 },
    { month: 'Feb', nps: 42, csat: 4.3 }
  ],
  feedbackThemes: [
    { theme: 'Fast Disbursement', sentiment: 'positive', mentions: 892, percentage: 25.8 },
    { theme: 'Easy Application', sentiment: 'positive', mentions: 756, percentage: 21.9 },
    { theme: 'Good Interest Rates', sentiment: 'positive', mentions: 623, percentage: 18.1 },
    { theme: 'Helpful Support', sentiment: 'positive', mentions: 512, percentage: 14.8 },
    { theme: 'App Experience', sentiment: 'positive', mentions: 445, percentage: 12.9 },
    { theme: 'Repayment Flexibility', sentiment: 'neutral', mentions: 234, percentage: 6.8 },
    { theme: 'High Fees', sentiment: 'negative', mentions: 189, percentage: 5.5 },
    { theme: 'Slow Resolution', sentiment: 'negative', mentions: 98, percentage: 2.8 }
  ]
}

export function CustomerSegmentationReport({ dateRange = 'last30days', exportFormat = 'pdf' }: CustomerSegmentationReportProps) {
  const [activeTab, setActiveTab] = useState('demographics')

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-600" />
            Customer Analytics & Segmentation
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Deep insights into customer base composition and behavior patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-purple-500 text-purple-600">
            <Users className="w-3 h-3 mr-1" />
            {demographics.totalCustomers.toLocaleString()} Total Customers
          </Badge>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export {exportFormat.toUpperCase()}
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Total Customers</p>
            <p className="text-xl font-bold text-purple-900 dark:text-purple-100 mt-1">
              {demographics.totalCustomers.toLocaleString()}
            </p>
            <p className="text-xs text-green-600/70 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +{demographics.newCustomersThisMonth} this month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Active Customers</p>
            <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">
              {demographics.activeCustomers.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {(demographics.activeCustomers / demographics.totalCustomers * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Retention Rate</p>
            <p className="text-xl font-bold text-blue-900 dark:text-blue-100 mt-1">
              {retentionMetrics.overallRetentionRate}%
            </p>
            <p className="text-xs text-green-600/70 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +2.3pp vs last quarter
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-950/20 dark:to-sky-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">NPS Score</p>
            <p className="text-xl font-bold text-cyan-900 dark:text-cyan-100 mt-1">
              {npsData.currentNPS}
            </p>
            <p className={`text-xs mt-1 flex items-center gap-1 ${
              npsData.currentNPS > npsData.previousNPS ? 'text-green-600/70' : 'text-red-600/70'
            }`}>
              {npsData.currentNPS > npsData.previousNPS ? 
                <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              +{npsData.currentNPS - npsData.previousNPS} vs last period
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Avg CAC</p>
            <p className="text-xl font-bold text-amber-900 dark:text-amber-100 mt-1">
              {formatKES(acquisitionData[acquisitionData.length - 1].cac)}
            </p>
            <p className="text-xs text-green-600/70 mt-1 flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> -11% improvement
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 bg-slate-100 dark:bg-slate-800 p-1">
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="segments">Value Segments</TabsTrigger>
          <TabsTrigger value="acquisition">Acquisition</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
          <TabsTrigger value="nps">NPS & Feedback</TabsTrigger>
        </TabsList>

        {/* Demographics Tab */}
        <TabsContent value="demographics" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gender Split */}
            <Card>
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
                <CardDescription>Customer base by gender</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={demographics.genderSplit}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="count"
                      label={({ gender, percentage }) => `${gender}: ${percentage}%`}
                    >
                      <Cell fill="#2563eb" />
                      <Cell fill="#ec4899" />
                    </Pie>
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 mt-4">
                  {demographics.genderSplit.map((g) => (
                    <div key={g.gender} className="text-center">
                      <p className="text-2xl font-bold">{g.count.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">{g.gender}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Age Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Age Distribution</CardTitle>
                <CardDescription>Customer age breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={demographics.ageDistribution} layout="vertical" margin={{ left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="range" type="category" tick={{ fontSize: 11 }} width={55} />
                    <Tooltip formatter={(value: number) => `${value.toLocaleString()} (${(value / demographics.totalCustomers * 100).toFixed(1)}%)`} />
                    <Bar dataKey="count" name="Count" fill="#a855f7" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Geographic Distribution */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-500" />
                  Geographic Distribution (by County)
                </CardTitle>
                <CardDescription>Customer distribution across Kenya counties</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {demographics.geographicDistribution.map((geo) => (
                    <div key={geo.county} className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="font-semibold text-sm truncate">{geo.county}</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{geo.count.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">{geo.percentage}%</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tenure Bands */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  Customer Tenure Bands
                </CardTitle>
                <CardDescription>Distribution by customer age/lifetime</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tenureBands.map((band) => (
                    <div key={band.band} className="flex items-center gap-4">
                      <div className="w-32 shrink-0">
                        <span className="text-sm font-medium">{band.band}</span>
                        <p className="text-xs text-slate-500">{band.description}</p>
                      </div>
                      <div className="flex-1">
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-6 relative overflow-hidden">
                          <div 
                            className="h-6 rounded-full transition-all flex items-center justify-end pr-2"
                            style={{ 
                              width: `${(band.count / demographics.totalCustomers) * 100}%`,
                              backgroundColor: band.color
                            }}
                          >
                            <span className="text-xs font-semibold text-white">{band.count.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="shrink-0 w-16 justify-center">
                        {((band.count / demographics.totalCustomers) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Value Segments Tab */}
        <TabsContent value="segments" className="mt-6 space-y-6">
          {/* Segment Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {valueSegments.map((segment) => (
              <Card key={segment.segment} className="overflow-hidden">
                <div 
                  className="h-2" 
                  style={{ backgroundColor: segment.color }}
                />
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{segment.icon}</span>
                    <div>
                      <p className="font-semibold text-sm">{segment.segment}</p>
                      <p className="text-xs text-slate-500">{segment.percentage}% of customers</p>
                    </div>
                  </div>
                  <div className="space-y-1 mt-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Revenue Share</span>
                      <span className="font-semibold">{segment.revenueContribution}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Avg Loan</span>
                      <span className="font-mono">{formatKES(segment.avgLoanValue)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">PAR Rate</span>
                      <span className={`font-semibold ${
                        segment.parRate <= 5 ? 'text-green-600' : 
                        segment.parRate <= 10 ? 'text-yellow-600' : 'text-red-600'
                      }`}>{segment.parRate}%</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t">
                    <span className={`text-xs font-medium ${
                      segment.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {segment.trend} growth
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Segmentation Scatter Plot */}
          <Card>
            <CardHeader>
              <CardTitle>Segmentation Matrix (Frequency vs Value)</CardTitle>
              <CardDescription>Customer segments plotted by borrowing frequency and average loan value</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    type="number" 
                    dataKey="frequency" 
                    name="Frequency" 
                    unit=" loans/mo" 
                    label={{ value: 'Borrowing Frequency', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="value" 
                    name="Value" 
                    unit="K" 
                    label={{ value: 'Avg Loan Value (K)', angle: -90, position: 'insideLeft' }}
                    tickFormatter={(v) => `KSh${v}K`}
                  />
                  <ZAxis type="number" dataKey="size" range={[60, 400]} />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(value: number, name: string) => {
                      if (name === 'size') return [`${value} customers`, 'Size']
                      return [value, name]
                    }}
                  />
                  <Legend />
                  {segmentationScatterData.map((entry, index) => (
                    <Scatter 
                      key={index}
                      name={entry.name} 
                      data={[entry]} 
                      fill={entry.color}
                      fillOpacity={0.7}
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
              
              {/* Quadrant Labels */}
              <div className="mt-4 grid grid-cols-2 gap-4 text-center text-xs">
                <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded">
                  <strong>High Value Champions</strong><br/>Focus on retention & upsell
                </div>
                <div className="p-2 bg-orange-50 dark:bg-orange-950/20 rounded">
                  <strong>Growing Stars</strong><br/>Nurture for growth potential
                </div>
                <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                  <strong>Volume Drivers</strong><br/>Engage for frequency increase
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-950/20 rounded">
                  <strong>Low Engagement</strong><br/>Reactivation campaigns
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Acquisition Tab */}
        <TabsContent value="acquisition" className="mt-6 space-y-6">
          {/* Acquisition Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>New Customer Acquisition Trends</CardTitle>
              <CardDescription>Monthly new customer signups with channel breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={acquisitionData}>
                  <defs>
                    <linearGradient id="customerGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area 
                    type="monotone" 
                    dataKey="newCustomers" 
                    name="New Customers" 
                    stroke="#a855f7" 
                    fill="url(#customerGradient)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Channel Mix */}
            <Card>
              <CardHeader>
                <CardTitle>Acquisition Channels</CardTitle>
                <CardDescription>Where your customers come from</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Organic', value: 4840, color: '#22c55e' },
                        { name: 'Referral', value: 4360, color: '#3b82f6' },
                        { name: 'SMS Marketing', value: 3200, color: '#a855f7' },
                        { name: 'Social Media', value: 2810, color: '#f97316' },
                        { name: 'Partners', value: 1600, color: '#06b6d4' }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {[
                        { name: 'Organic', color: '#22c55e' },
                        { name: 'Referral', color: '#3b82f6' },
                        { name: 'SMS Marketing', color: '#a855f7' },
                        { name: 'Social Media', color: '#f97316' },
                        { name: 'Partners', color: '#06b6d4' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* CAC Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Acquisition Cost (CAC)</CardTitle>
                <CardDescription>Trend over time by channel efficiency</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={acquisitionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `KSh${v}`} domain={[420, 500]} />
                    <Tooltip formatter={(value: number) => formatKES(value)} />
                    <Line 
                      type="monotone" 
                      dataKey="cac" 
                      name="CAC (KES)" 
                      stroke="#f59e0b" 
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#f59e0b' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Current CAC</span>
                    <span className="text-lg font-bold text-amber-900">
                      {formatKES(acquisitionData[acquisitionData.length - 1].cac)}
                    </span>
                  </div>
                  <p className="text-xs text-amber-600 mt-1">
                    Down from KSh 485 in July • Target: KSh 400
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Retention Tab */}
        <TabsContent value="retention" className="mt-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
              <CardContent className="p-4 text-center">
                <UserCheck className="w-8 h-8 mx-auto text-green-600 mb-2" />
                <p className="text-sm text-green-600 font-medium">Retention Rate</p>
                <p className="text-3xl font-bold text-green-900">{retentionMetrics.overallRetentionRate}%</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20">
              <CardContent className="p-4 text-center">
                <UserX className="w-8 h-8 mx-auto text-red-600 mb-2" />
                <p className="text-sm text-red-600 font-medium">Monthly Churn Rate</p>
                <p className="text-3xl font-bold text-red-900">{retentionMetrics.monthlyChurnRate}%</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
              <CardContent className="p-4 text-center">
                <Activity className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                <p className="text-sm text-blue-600 font-medium">Reactivation Rate</p>
                <p className="text-3xl font-bold text-blue-900">{retentionMetrics.reactivationRate}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Cohort Retention Table */}
          <Card>
            <CardHeader>
              <CardTitle>Cohort Retention Analysis</CardTitle>
              <CardDescription>Customer retention rates by signup cohort over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cohort</TableHead>
                      <TableHead className="text-center">Month 0</TableHead>
                      <TableHead className="text-center">Month 1</TableHead>
                      <TableHead className="text-center">Month 3</TableHead>
                      <TableHead className="text-center">Month 6</TableHead>
                      <TableHead className="text-center">Month 9</TableHead>
                      <TableHead className="text-center">Month 12</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {retentionMetrics.cohortRetention.map((cohort, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{cohort.cohort}</TableCell>
                        {[cohort.month0, cohort.month1, cohort.month3, cohort.month6, cohort.month9, cohort.month12].map((value, i) => (
                          <TableCell key={i} className="text-center">
                            {value !== null ? (
                              <span className={`inline-flex items-center justify-center w-12 h-8 rounded font-mono text-sm ${
                                value >= 80 ? 'bg-green-100 text-green-800' :
                                value >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                value >= 40 ? 'bg-orange-100 text-orange-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {value}%
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NPS & Feedback Tab */}
        <TabsContent value="nps" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* NPS Score Display */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  Net Promoter Score (NPS)
                </CardTitle>
                <CardDescription>Customer loyalty and satisfaction metric</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 mb-4">
                    <span className="text-5xl font-bold text-green-700 dark:text-green-300">
                      {npsData.currentNPS}
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {npsData.currentNPS >= 50 ? 'Excellent' :
                     npsData.currentNPS >= 30 ? 'Good' :
                     npsData.currentNPS >= 0 ? 'Fair' : 'Needs Improvement'}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Based on {npsData.responses.toLocaleString()} responses
                  </p>
                  
                  <div className="flex justify-center gap-8 mt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">62%</p>
                      <p className="text-xs text-slate-500">Promoters</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-600">20%</p>
                      <p className="text-xs text-slate-500">Passives</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">18%</p>
                      <p className="text-xs text-slate-500">Detractors</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* NPS Trend */}
            <Card>
              <CardHeader>
                <CardTitle>NPS & CSAT Trends</CardTitle>
                <CardDescription>Historical scores over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={npsData.trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                    <YAxis yAxisId="left" domain={[30, 50]} tick={{ fontSize: 12 }} stroke="#9ca3af" />
                    <YAxis yAxisId="right" orientation="right" domain={[3.8, 4.5]} tick={{ fontSize: 12 }} stroke="#9ca3af" />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line yAxisId="left" type="monotone" dataKey="nps" name="NPS Score" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} />
                    <Line yAxisId="right" type="monotone" dataKey="csat" name="CSAT (÷10)" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Feedback Themes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                Customer Feedback Themes
              </CardTitle>
              <CardDescription>Most mentioned topics in customer feedback</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {npsData.feedbackThemes.map((theme, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      theme.sentiment === 'positive' ? 'bg-green-100' :
                      theme.sentiment === 'negative' ? 'bg-red-100' : 'bg-yellow-100'
                    }`}>
                      {theme.sentiment === 'positive' && <Heart className="w-5 h-5 text-green-600" />}
                      {theme.sentiment === 'negative' && <Heart className="w-5 h-5 text-red-600" fill="currentColor" />}
                      {theme.sentiment === 'neutral' && <MessageSquare className="w-5 h-5 text-yellow-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{theme.theme}</span>
                        <span className="text-sm text-slate-500">{theme.mentions} mentions</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            theme.sentiment === 'positive' ? 'bg-green-500' :
                            theme.sentiment === 'negative' ? 'bg-red-500' : 'bg-yellow-500'
                          }`}
                          style={{ width: `${theme.percentage}%` }}
                        />
                      </div>
                    </div>
                    <Badge variant={
                      theme.sentiment === 'positive' ? 'outline' :
                      theme.sentiment === 'negative' ? 'destructive' : 'secondary'
                    } className={`shrink-0 ${
                      theme.sentiment === 'positive' ? 'border-green-500 text-green-600' : ''
                    }`}>
                      {theme.percentage}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CustomerSegmentationReport
