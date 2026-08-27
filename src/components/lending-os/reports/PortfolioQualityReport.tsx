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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Cell,
  Treemap
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Info,
  Download,
  Calculator,
  Shield,
  Users,
  DollarSign,
  Clock
} from 'lucide-react'

// Types
interface PortfolioQualityReportProps {
  dateRange?: string
  exportFormat?: string
}

// Mock Data - Kenya DCP Context (KES currency)
const portfolioOverview = {
  totalLoans: 12847,
  outstandingPrincipal: 487650000, // KES 487.65M
  averageLoanSize: 37950,
  totalDisbursed: 1250000000, // KES 1.25B
  totalRepaid: 762350000 // KES 762.35M
}

// PAR Data with CBK Definitions
const parData = {
  par1: 3.2,    // >1 day past due
  par7: 5.8,    // >7 days past due
  par30: 8.4,   // >30 days past due (CBK key metric)
  par60: 5.2,   // >60 days past due
  par90: 3.8,   // >90 days past due (CBK key metric)
  par180: 2.1,  // >180 days past due
  comparison: {
    direction: 'improvement',
    change: -0.8
  }
}

// PAR Trends over 12 months
const parTrendData = [
  { month: 'Jan', par1: 4.1, par30: 9.2, par90: 5.1, industryAvg: 10.5 },
  { month: 'Feb', par1: 3.8, par30: 8.9, par90: 4.8, industryAvg: 10.3 },
  { month: 'Mar', par1: 4.5, par30: 9.5, par90: 5.4, industryAvg: 10.8 },
  { month: 'Apr', par1: 3.9, par30: 8.7, par90: 4.6, industryAvg: 10.2 },
  { month: 'May', par1: 3.6, par30: 8.2, par90: 4.3, industryAvg: 9.9 },
  { month: 'Jun', par1: 4.2, par30: 9.0, par90: 4.9, industryAvg: 10.4 },
  { month: 'Jul', par1: 3.7, par30: 8.5, par90: 4.4, industryAvg: 10.1 },
  { month: 'Aug', par1: 3.4, par30: 8.1, par90: 4.1, industryAvg: 9.8 },
  { month: 'Sep', par1: 3.8, par30: 8.6, par90: 4.5, industryAvg: 10.2 },
  { month: 'Oct', par1: 3.5, par30: 8.3, par90: 4.2, industryAvg: 10.0 },
  { month: 'Nov', par1: 3.3, par30: 8.0, par90: 4.0, industryAvg: 9.7 },
  { month: 'Dec', par1: 3.2, par30: 8.4, par90: 3.8, industryAvg: 9.9 }
]

// Aging Bucket Distribution by Month
const agingBucketData = [
  { 
    month: 'Jan', 
    current: 45000000, 
    days1_30: 8500000, 
    days31_60: 5200000, 
    days61_90: 3800000, 
    days91_180: 2800000, 
    days180_plus: 1500000 
  },
  { 
    month: 'Feb', 
    current: 48200000, 
    days1_30: 9200000, 
    days31_60: 5800000, 
    days61_90: 4100000, 
    days91_180: 3100000, 
    days180_plus: 1700000 
  },
  { 
    month: 'Mar', 
    current: 51200000, 
    days1_30: 10100000, 
    days31_60: 6400000, 
    days61_90: 4500000, 
    days91_180: 3400000, 
    days180_plus: 1900000 
  },
  { 
    month: 'Apr', 
    current: 49800000, 
    days1_30: 9500000, 
    days31_60: 5900000, 
    days61_90: 4200000, 
    days91_180: 3200000, 
    days180_plus: 1800000 
  },
  { 
    month: 'May', 
    current: 52500000, 
    days1_30: 10200000, 
    days31_60: 6200000, 
    days61_90: 4300000, 
    days91_180: 3000000, 
    days180_plus: 1600000 
  },
  { 
    month: 'Jun', 
    current: 54800000, 
    days1_30: 10800000, 
    days31_60: 6800000, 
    days61_90: 4800000, 
    days91_180: 3500000, 
    days180_plus: 2000000 
  }
]

// Loan Status Breakdown
const loanStatusData = [
  { name: 'Active & Current', value: 10542, color: '#22c55e' },
  { name: 'Active (1-30 Days)', value: 1120, color: '#84cc16' },
  { name: 'Active (31-60 Days)', value: 584, color: '#eab308' },
  { name: 'Active (61-90 Days)', value: 298, color: '#f97316' },
  { name: 'Active (90+ Days)', value: 203, color: '#ef4444' },
  { name: 'Paid Off', value: 28456, color: '#06b6d4' },
  { name: 'Restructured', value: 145, color: '#a855f7' },
  { name: 'Written Off', value: 89, color: '#6b7280' }
]

// Vintage Analysis (Cohort Performance)
const vintageAnalysisData = [
  { quarter: 'Q1 2024', originationVolume: 85000000, remainingBalance: 32500000, par: 4.2, nplRatio: 2.1 },
  { quarter: 'Q2 2024', originationVolume: 92000000, remainingBalance: 38500000, par: 3.8, nplRatio: 1.8 },
  { quarter: 'Q3 2024', originationVolume: 105000000, remainingBalance: 52000000, par: 3.5, nplRatio: 1.5 },
  { quarter: 'Q4 2024', originationVolume: 118000000, remainingBalance: 72000000, par: 3.2, nplRatio: 1.2 },
  { quarter: 'Q1 2025', originationVolume: 125000000, remainingBalance: 95000000, par: 2.9, nplRatio: 0.9 },
  { quarter: 'Q2 2025', originationVolume: 132000000, remainingBalance: 110000000, par: 2.6, nplRatio: 0.7 },
  { quarter: 'Q3 2025', originationVolume: 140000000, remainingBalance: 128000000, par: 2.4, nplRatio: 0.5 },
  { quarter: 'Q4 2025', originationVolume: 148000000, remainingBalance: 148000000, par: 2.1, nplRatio: 0.3 }
]

// Vintage Heatmap Data for Treemap
const vintageHeatmapData = vintageAnalysisData.map(v => ({
  name: v.quarter,
  size: v.originationVolume / 1000000,
  par: v.par
}))

// CBK Provisioning Requirements
const provisioningRules = [
  { bucket: 'Performing (Current)', rate: 1.0, description: 'Loans not past due' },
  { bucket: 'Watch (1-30 days)', rate: 5.0, description: 'Slightly overdue loans' },
  { bucket: 'Substandard (31-90 days)', rate: 25.0, description: 'Doubtful collectibility' },
  { bucket: 'Doubtful (91-180 days)', rate: 50.0, description: 'Highly doubtful' },
  { bucket: 'Loss (180+ days)', rate: 100.0, description: 'Uncollectible' }
]

// Top 10 Largest Exposures
const topExposures = [
  { rank: 1, customerName: 'Kamau Enterprises Ltd', loanId: 'LN-2024-08921', exposure: 2500000, concentration: 5.13, status: 'Current', sector: 'Trade' },
  { rank: 2, customerName: 'Ochieng Trading Co.', loanId: 'LN-2024-07654', exposure: 2200000, concentration: 4.51, status: 'Current', sector: 'Agriculture' },
  { rank: 3, customerName: 'Wanjiku Holdings', loanId: 'LN-2025-00123', exposure: 1850000, concentration: 3.79, status: 'Current', sector: 'Real Estate' },
  { rank: 4, customerName: 'Mutiso Logistics Ltd', loanId: 'LN-2024-11234', exposure: 1600000, concentration: 3.28, status: 'Watch', sector: 'Transport' },
  { rank: 5, customerName: 'Auma Manufacturing', loanId: 'LN-2024-09876', exposure: 1450000, concentration: 2.97, status: 'Current', sector: 'Manufacturing' },
  { rank: 6, customerName: 'Ngugi Farm Supplies', loanId: 'LN-2025-00245', exposure: 1300000, concentration: 2.67, status: 'Current', sector: 'Agriculture' },
  { rank: 7, customerName: 'Muthoni Retail Chain', loanId: 'LN-2024-08543', exposure: 1150000, concentration: 2.36, status: 'Current', sector: 'Retail' },
  { rank: 8, customerName: 'Owino Construction', loanId: 'LN-2024-10456', exposure: 1000000, concentration: 2.05, status: 'Substandard', sector: 'Construction' },
  { rank: 9, customerName: 'Nyaga Tech Solutions', loanId: 'LN-2025-00356', exposure: 900000, concentration: 1.85, status: 'Current', sector: 'Technology' },
  { rank: 10, customerName: 'Adhiambo Services', loanId: 'LN-2024-07890', exposure: 850000, concentration: 1.74, status: 'Current', sector: 'Services' }
]

// Helper Functions
const formatKES = (value: number): string => {
  if (value >= 1000000) return `KSh ${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `KSh ${(value / 1000).toFixed(0)}K`
  return `KSh ${value.toFixed(0)}`
}

const getParColor = (par: number) => {
  if (par <= 3) return '#22c55e'
  if (par <= 5) return '#84cc16'
  if (par <= 8) return '#eab308'
  if (par <= 12) return '#f97316'
  return '#ef4444'
}

export function PortfolioQualityReport({ dateRange = 'last30days', exportFormat = 'pdf' }: PortfolioQualityReportProps) {
  const [selectedView, setSelectedView] = useState('overview')

  // Calculate provisioning requirements
  const calculateProvisions = () => {
    const totalOutstanding = portfolioOverview.outstandingPrincipal
    const bucketDistribution = [
      { name: 'Performing', percentage: 100 - parData.par30, amount: totalOutstanding * (100 - parData.par30) / 100 },
      { name: 'Watch (1-30d)', percentage: parData.par30 - parData.par60, amount: totalOutstanding * (parData.par30 - parData.par60) / 100 },
      { name: 'Substandard (31-90d)', percentage: parData.par60 - parData.par90, amount: totalOutstanding * (parData.par60 - parData.par90) / 100 },
      { name: 'Doubtful (91-180d)', percentage: parData.par90 - parData.par180, amount: totalOutstanding * (parData.par90 - parData.par180) / 100 },
      { name: 'Loss (180d+)', percentage: parData.par180, amount: totalOutstanding * parData.par180 / 100 }
    ]

    let totalProvision = 0
    const provisions = bucketDistribution.map((bucket, index) => {
      const provisionAmount = bucket.amount * (provisioningRules[index].rate / 100)
      totalProvision += provisionAmount
      return {
        ...bucket,
        provisionRate: provisioningRules[index].rate,
        provisionAmount,
        coverage: (provisionAmount / bucket.amount) * 100
      }
    })

    return { provisions, totalProvision, coverageRatio: (totalProvision / totalOutstanding) * 100 }
  }

  const provisioningResult = calculateProvisions()

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-600" />
            Portfolio Quality Report
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            CBK-compliant portfolio analysis • Period: {dateRange.replace(/([A-Z])/g, ' $1').trim()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-emerald-500 text-emerald-600">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            PAR30: {parData.par30}%
          </Badge>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export {exportFormat.toUpperCase()}
          </Button>
        </div>
      </div>

      {/* Portfolio Overview KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Total Loans</p>
            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">
              {portfolioOverview.totalLoans.toLocaleString()}
            </p>
            <p className="text-xs text-emerald-600/70 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +12.3% vs last period
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Outstanding Principal</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
              {formatKES(portfolioOverview.outstandingPrincipal)}
            </p>
            <p className="text-xs text-blue-600/70 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +8.7% vs last period
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Average Loan Size</p>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">
              {formatKES(portfolioOverview.averageLoanSize)}
            </p>
            <p className="text-xs text-purple-600/70 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +5.2% vs last period
            </p>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${
          parData.par30 <= 5 ? 'from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20' :
          parData.par30 <= 8 ? 'from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20' :
          'from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20'
        }`}>
          <CardContent className="p-4">
            <p className={`text-xs font-medium ${
              parData.par30 <= 5 ? 'text-green-600 dark:text-green-400' :
              parData.par30 <= 8 ? 'text-yellow-600 dark:text-yellow-400' :
              'text-red-600 dark:text-red-400'
            }`}>PAR30 (CBK Key Metric)</p>
            <p className={`text-2xl font-bold mt-1 ${
              parData.par30 <= 5 ? 'text-green-900 dark:text-green-100' :
              parData.par30 <= 8 ? 'text-yellow-900 dark:text-yellow-100' :
              'text-red-900 dark:text-red-100'
            }`}>{parData.par30}%</p>
            <p className={`text-xs mt-1 flex items-center gap-1 ${
              parData.comparison.direction === 'improvement' ? 'text-green-600/70' : 'text-red-600/70'
            }`}>
              {parData.comparison.direction === 'improvement' ? 
                <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
              {Math.abs(parData.comparison.change)}% vs last period
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Required Provisions</p>
            <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-1">
              {formatKES(provisioningResult.totalProvision)}
            </p>
            <p className="text-xs text-amber-600/70 mt-1 flex items-center gap-1">
              <Calculator className="w-3 h-3" /> Coverage: {provisioningResult.coverageRatio.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedView} onValueChange={setSelectedView}>
        <TabsList className="grid w-full grid-cols-4 bg-slate-100 dark:bg-slate-800 p-1">
          <TabsTrigger value="overview">PAR Analysis</TabsTrigger>
          <TabsTrigger value="aging">Aging & Vintage</TabsTrigger>
          <TabsTrigger value="status">Loan Status</TabsTrigger>
          <TabsTrigger value="exposures">Concentration</TabsTrigger>
        </TabsList>

        {/* PAR Analysis Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* PAR Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'PAR >1 Day', value: parData.par1, color: getParColor(parData.par1) },
              { label: 'PAR >7 Days', value: parData.par7, color: getParColor(parData.par7) },
              { label: 'PAR >30 Days', value: parData.par30, color: getParColor(parData.par30), highlight: true },
              { label: 'PAR >60 Days', value: parData.par60, color: getParColor(parData.par60) },
              { label: 'PAR >90 Days', value: parData.par90, color: getParColor(parData.par90), highlight: true },
              { label: 'PAR >180 Days', value: parData.par180, color: getParColor(parData.par180) }
            ].map((item) => (
              <Card key={item.label} className={`${item.highlight ? 'ring-2 ring-emerald-500/50' : ''}`}>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                  <p className="text-2xl font-bold" style={{ color: item.color }}>
                    {item.value}%
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* PAR Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>PAR Trends (12 Months)</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                    Below Industry Avg
                  </Badge>
                </div>
              </CardTitle>
              <CardDescription>
                Portfolio at Risk metrics compared to Kenya DCP industry average (~10%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={parTrendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" domain={[0, 15]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3">
                          <p className="font-medium text-sm mb-2">{label}</p>
                          {payload.map((entry: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                              <span className="text-slate-600">{entry.name}:</span>
                              <span className="font-semibold">{entry.value}%</span>
                            </div>
                          ))}
                        </div>
                      )
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="par1" name="PAR >1 Day" stroke="#84cc16" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="par30" name="PAR >30 Days (CBK)" stroke="#f97316" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="par90" name="PAR >90 Days (CBK)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="industryAvg" name="Industry Average" stroke="#6b7280" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Provisioning Calculator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-600" />
                Provisioning Calculator (CBK Guidelines)
              </CardTitle>
              <CardDescription>
                Required loan loss provisions based on CBK prudential guidelines
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Risk Bucket</TableHead>
                      <TableHead className="text-right">Outstanding (KES)</TableHead>
                      <TableHead className="text-right">% of Portfolio</TableHead>
                      <TableHead className="text-right">Provision Rate</TableHead>
                      <TableHead className="text-right">Required Provision</TableHead>
                      <TableHead className="text-right">Coverage %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {provisioningResult.provisions.map((prov, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getParColor(prov.provisionRate * 2) }}
                            />
                            {prov.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatKES(prov.amount)}</TableCell>
                        <TableCell className="text-right">{prov.percentage.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={prov.provisionRate >= 50 ? 'destructive' : 'outline'}>
                            {prov.provisionRate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatKES(prov.provisionAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-slate-200 rounded-full h-2">
                              <div 
                                className="h-2 rounded-full"
                                style={{ 
                                  width: `${prov.coverage}%`,
                                  backgroundColor: getParColor(prov.coverage / 2)
                                }}
                              />
                            </div>
                            <span className="text-xs">{prov.coverage.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-slate-50 dark:bg-slate-800 font-semibold">
                      <TableCell>Total Portfolio</TableCell>
                      <TableCell className="text-right font-mono">{formatKES(portfolioOverview.outstandingPrincipal)}</TableCell>
                      <TableCell className="text-right">100%</TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right font-mono text-amber-600">
                        {formatKES(provisioningResult.totalProvision)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="border-amber-500 text-amber-600">
                          {provisioningResult.coverageRatio.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* CBK Guidelines Info */}
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">CBK Prudential Guidelines (2023)</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Digital Credit Providers must maintain minimum provisions as per risk bucket classification</li>
                      <li>Total coverage ratio should not fall below regulatory minimum of 100% of NPLs</li>
                      <li>Provisions are tax-deductible expenses under Income Tax Act</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aging & Vintage Tab */}
        <TabsContent value="aging" className="mt-6 space-y-6">
          {/* Aging Bucket Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Aging Bucket Distribution (Stacked)</CardTitle>
              <CardDescription>Monthly breakdown of loan aging categories in KES Millions</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={agingBucketData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `KSh${(v/1000000).toFixed(0)}M`} />
                  <Tooltip 
                    formatter={(value: number) => formatKES(value)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="current" name="Current" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="days1_30" name="1-30 Days" stackId="a" fill="#84cc16" />
                  <Bar dataKey="days31_60" name="31-60 Days" stackId="a" fill="#eab308" />
                  <Bar dataKey="days61_90" name="61-90 Days" stackId="a" fill="#f97316" />
                  <Bar dataKey="days91_180" name="91-180 Days" stackId="a" fill="#ef4444" />
                  <Bar dataKey="days180_plus" name="180+ Days" stackId="a" fill="#991b1b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Vintage Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Vintage Heatmap */}
            <Card>
              <CardHeader>
                <CardTitle>Vintage Performance (Cohort Analysis)</CardTitle>
                <CardDescription>PAR performance by loan origination quarter</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <Treemap
                    data={vintageHeatmapData}
                    dataKey="size"
                    aspectRatio={4 / 3}
                    stroke="#fff"
                    strokeWidth={2}
                    content={({ x, y, width, height, name, par }: any) => (
                      <g>
                        <rect
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill={getParColor(par || 0)}
                          rx={4}
                          style={{ opacity: 0.85 }}
                        />
                        {width > 70 && height > 50 && (
                          <>
                            <text
                              x={x + width / 2}
                              y={y + height / 2 - 10}
                              textAnchor="middle"
                              fill="#fff"
                              fontSize={13}
                              fontWeight={600}
                            >
                              {name}
                            </text>
                            <text
                              x={x + width / 2}
                              y={y + height / 2 + 12}
                              textAnchor="middle"
                              fill="#fff"
                              fontSize={15}
                              fontWeight={700}
                            >
                              PAR: {par?.toFixed(1)}%
                            </text>
                          </>
                        )}
                      </g>
                    )}
                  />
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                  <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500"></span> &lt;3%</div>
                  <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-lime-500"></span> 3-5%</div>
                  <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500"></span> 5-8%</div>
                  <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500"></span> 8-12%</div>
                  <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500"></span> &gt;12%</div>
                </div>
              </CardContent>
            </Card>

            {/* Vintage Details Table */}
            <Card>
              <CardHeader>
                <CardTitle>Vintage Details</CardTitle>
                <CardDescription>Cohort-level performance tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quarter</TableHead>
                        <TableHead className="text-right">Origination</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                        <TableHead className="text-right">PAR</TableHead>
                        <TableHead className="text-right">NPL Ratio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vintageAnalysisData.map((vintage, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{vintage.quarter}</TableCell>
                          <TableCell className="text-right font-mono">{formatKES(vintage.originationVolume)}</TableCell>
                          <TableCell className="text-right font-mono">{formatKES(vintage.remainingBalance)}</TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold" style={{ color: getParColor(vintage.par) }}>
                              {vintage.par}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={vintage.nplRatio <= 1 ? 'outline' : 'secondary'}>
                              {vintage.nplRatio}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Loan Status Tab */}
        <TabsContent value="status" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Donut Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Loan Status Breakdown</CardTitle>
                <CardDescription>Distribution across all loan statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={loanStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={130}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {loanStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                    <Legend 
                      layout="vertical" 
                      align="right" 
                      verticalAlign="middle"
                      wrapperStyle={{ fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Status Summary</CardTitle>
                <CardDescription>Key metrics by loan status category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loanStatusData.map((status, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div 
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{ backgroundColor: status.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{status.name}</span>
                          <span className="text-sm font-mono">{status.value.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full transition-all"
                            style={{ 
                              width: `${(status.value / loanStatusData.reduce((a, b) => a + b.value, 0)) * 100}%`,
                              backgroundColor: status.color
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-xs text-slate-500">Active Loans</p>
                      <p className="text-xl font-bold text-slate-900 dark:text-white">
                        {loanStatusData.slice(0, 5).reduce((a, b) => a + b.value, 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Non-Performing (90+)</p>
                      <p className="text-xl font-bold text-red-600">
                        {(loanStatusData[4]?.value || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Concentration Risk Tab */}
        <TabsContent value="exposures" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    Top 10 Largest Exposures
                  </CardTitle>
                  <CardDescription>Concentration risk analysis - Single borrower limit monitoring</CardDescription>
                </div>
                <Badge variant="outline" className="border-amber-500 text-amber-600">
                  CBK Limit: 10% per borrower
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Loan ID</TableHead>
                      <TableHead>Sector</TableHead>
                      <TableHead className="text-right">Exposure (KES)</TableHead>
                      <TableHead className="text-right">Concentration %</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topExposures.map((exp) => (
                      <TableRow key={exp.rank}>
                        <TableCell className="font-medium text-slate-500">{exp.rank}</TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">{exp.customerName}</TableCell>
                        <TableCell className="font-mono text-xs">{exp.loanId}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{exp.sector}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">{formatKES(exp.exposure)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-slate-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  exp.concentration > 8 ? 'bg-red-500' :
                                  exp.concentration > 5 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, exp.concentration * 10)}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono w-10 text-right">{exp.concentration}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={
                              exp.status === 'Current' ? 'outline' :
                              exp.status === 'Watch' ? 'secondary' : 'destructive'
                            }
                            className={
                              exp.status === 'Current' ? 'border-emerald-500 text-emerald-600' :
                              exp.status === 'Watch' ? 'border-amber-500 text-amber-600' : ''
                            }
                          >
                            {exp.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Concentration Summary */}
              <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-500">Top 10 Exposure Total</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {formatKES(topExposures.reduce((a, b) => a + b.exposure, 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">% of Total Portfolio</p>
                    <p className="text-lg font-bold text-amber-600">
                      {(topExposures.reduce((a, b) => a + b.exposure, 0) / portfolioOverview.outstandingPrincipal * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Max Single Exposure</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {formatKES(topExposures[0].exposure)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Herfindahl Index</p>
                    <p className="text-lg font-bold text-emerald-600">Low</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default PortfolioQualityReport
