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
  Cell
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Download,
  Clock,
  Target,
  MapPin,
  CreditCard,
  Building2,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  Zap,
  BarChart3
} from 'lucide-react'

// Types
interface DisbursementAnalyticsProps {
  dateRange?: string
  exportFormat?: string
}

// Mock Data - Kenya DCP Context (KES currency)
const formatKES = (value: number): string => {
  if (value >= 1000000) return `KSh ${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `KSh ${(value / 1000).toFixed(0)}K`
  return `KSh ${value.toFixed(0)}`
}

// Daily Disbursement Trends (Last 30 days)
const dailyDisbursementData = Array.from({ length: 30 }, (_, i) => {
  const date = new Date()
  date.setDate(date.getDate() - (29 - i))
  const dayOfWeek = date.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const baseVolume = isWeekend ? 2500000 : 5500000 + Math.random() * 3000000
  
  return {
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    volume: Math.round(baseVolume),
    count: Math.round(baseVolume / 35000),
    target: isWeekend ? 3000000 : 6000000,
    approvals: Math.round(baseVolume * 0.72 / 35000),
    applications: Math.round(baseVolume / 28000)
  }
})

// Weekly/Monthly Aggregated Data
const monthlyDisbursementData = [
  { month: 'Jul', volume: 142000000, count: 4120, target: 150000000, avgTicket: 34466 },
  { month: 'Aug', volume: 156000000, count: 4380, target: 155000000, avgTicket: 35616 },
  { month: 'Sep', volume: 168000000, count: 4620, target: 160000000, avgTicket: 36364 },
  { month: 'Oct', volume: 175000000, count: 4850, target: 170000000, avgTicket: 36082 },
  { month: 'Nov', volume: 182000000, count: 5080, target: 175000000, avgTicket: 35827 },
  { month: 'Dec', volume: 148000000, count: 3920, target: 140000000, avgTicket: 37755 },
  { month: 'Jan', volume: 165000000, count: 4560, target: 160000000, avgTicket: 36184 },
  { month: 'Feb', volume: 178000000, count: 4920, target: 170000000, avgTicket: 36179 }
]

// Channel Mix Distribution
const channelMixData = [
  { name: 'M-Pesa', value: 78.5, volume: 139830000, color: '#059669' },
  { name: 'Bank Transfer', value: 12.3, volume: 21914000, color: '#2563eb' },
  { name: 'Mobile Wallet (Other)', value: 6.2, volume: 11036000, color: '#7c3aed' },
  { name: 'Cash Pickup', value: 2.0, volume: 3560000, color: '#d97706' },
  { name: 'Other', value: 1.0, volume: 1780000, color: '#6b7280' }
]

// Product Performance
const productPerformanceData = [
  { product: 'QuickLoan Express', count: 2850, volume: 71250000, avgSize: 25000, par: 6.2, approvalRate: 85.3 },
  { product: 'Salary Advance', count: 1920, volume: 48000000, avgSize: 25000, par: 3.1, approvalRate: 92.1 },
  { product: 'Business Growth', count: 680, volume: 44200000, avgSize: 65000, par: 4.8, approvalRate: 68.5 },
  { product: 'Education Loan', count: 420, volume: 25200000, avgSize: 60000, par: 2.4, approvalRate: 88.9 },
  { product: 'Emergency Fund', count: 380, volume: 11400000, avgSize: 30000, par: 9.5, approvalRate: 94.2 },
  { product: 'Asset Finance', count: 120, volume: 18000000, avgSize: 150000, par: 1.8, approvalRate: 55.3 }
]

// Approval Funnel Data
const approvalFunnelData = [
  { stage: 'Applications Received', value: 15240, rate: 100, icon: '📝' },
  { stage: 'Eligibility Checked', value: 13890, rate: 91.1, icon: '✅' },
  { stage: 'Credit Assessed', value: 12450, rate: 81.7, icon: '🔍' },
  { stage: 'Approved', value: 8920, rate: 58.5, icon: '✅' },
  { stage: 'Disbursed', value: 6370, rate: 41.8, icon: '💰' },
  { stage: 'Activated', value: 6050, rate: 39.7, icon: '🎯' }
]

// Geographic Distribution (Kenya Counties)
const geographicData = [
  { county: 'Nairobi', volume: 58500000, count: 1680, percentage: 32.9 },
  { county: 'Mombasa', volume: 22400000, count: 650, percentage: 12.6 },
  { county: 'Kisumu', volume: 15400000, count: 450, percentage: 8.7 },
  { county: 'Nakuru', volume: 14000000, count: 410, percentage: 7.9 },
  { county: 'Eldoret', volume: 11200000, count: 320, percentage: 6.3 },
  { county: 'Kiambu', volume: 9800000, count: 285, percentage: 5.5 },
  { county: 'Machakos', volume: 7000000, count: 205, percentage: 3.9 },
  { county: 'Uasin Gishu', volume: 6300000, count: 182, percentage: 3.5 },
  { county: 'Kilifi', volume: 5600000, count: 162, percentage: 3.2 },
  { county: 'Others', volume: 27600000, count: 806, percentage: 15.5 }
]

// Time to Disburse Metrics
const timeToDisburseData = [
  { period: 'Week 1', avgHours: 4.2, medianHours: 3.1, p90Hours: 8.5, targetHours: 6 },
  { period: 'Week 2', avgHours: 4.5, medianHours: 3.3, p90Hours: 9.1, targetHours: 6 },
  { period: 'Week 3', avgHours: 3.9, medianHours: 2.8, p90Hours: 7.8, targetHours: 6 },
  { period: 'Week 4', avgHours: 3.6, medianHours: 2.6, p90Hours: 7.2, targetHours: 6 },
  { period: 'Week 5', avgHours: 3.4, medianHours: 2.5, p90Hours: 6.9, targetHours: 6 },
  { period: 'Week 6', avgHours: 3.2, medianHours: 2.4, p90Hours: 6.5, targetHours: 6 },
  { period: 'Week 7', avgHours: 3.0, medianHours: 2.2, p90Hours: 6.1, targetHours: 6 },
  { period: 'Week 8', avgHours: 2.8, medianHours: 2.1, p90Hours: 5.8, targetHours: 6 }
]

// Average Ticket Size Trend
const ticketSizeTrend = [
  { month: 'Jul', quickLoan: 24500, salaryAdvance: 24200, businessGrowth: 62000, education: 58000, overall: 34466 },
  { month: 'Aug', quickLoan: 24800, salaryAdvance: 24800, businessGrowth: 63500, education: 59500, overall: 35616 },
  { month: 'Sep', quickLoan: 25200, salaryAdvance: 25100, businessGrowth: 64200, education: 60200, overall: 36364 },
  { month: 'Oct', quickLoan: 24900, salaryAdvance: 24900, businessGrowth: 64800, education: 59800, overall: 36082 },
  { month: 'Nov', quickLoan: 25100, salaryAdvance: 25200, businessGrowth: 65200, education: 60500, overall: 35827 },
  { month: 'Dec', quickLoan: 26500, salaryAdvance: 26800, businessGrowth: 67000, education: 62000, overall: 37755 },
  { month: 'Jan', quickLoan: 25300, salaryAdvance: 25400, businessGrowth: 65500, education: 61000, overall: 36184 },
  { month: 'Feb', quickLoan: 25500, salaryAdvance: 25600, businessGrowth: 66000, education: 61500, overall: 36179 }
]

export function DisbursementAnalytics({ dateRange = 'last30days', exportFormat = 'pdf' }: DisbursementAnalyticsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('daily')
  const [activeTab, setActiveTab] = useState('trends')

  // Calculate variance for targets
  const currentMonth = monthlyDisbursementData[monthlyDisbursementData.length - 1]
  const variance = ((currentMonth.volume - currentMonth.target) / currentMonth.target * 100).toFixed(1)

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Disbursement Analytics
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Loan disbursement trends, channel performance & operational metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export {exportFormat.toUpperCase()}
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total Disbursed (MTD)</p>
            <p className="text-xl font-bold text-blue-900 dark:text-blue-100 mt-1">
              {formatKES(currentMonth.volume)}
            </p>
            <p className={`text-xs mt-1 flex items-center gap-1 ${parseFloat(variance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {parseFloat(variance) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {variance}% vs Target
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Loans Disbursed</p>
            <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">
              {currentMonth.count.toLocaleString()}
            </p>
            <p className="text-xs text-green-600/70 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +8.2% vs last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Avg Ticket Size</p>
            <p className="text-xl font-bold text-purple-900 dark:text-purple-100 mt-1">
              {formatKES(currentMonth.avgTicket)}
            </p>
            <p className="text-xs text-green-600/70 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +2.1% vs last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Time to Disburse</p>
            <p className="text-xl font-bold text-amber-900 dark:text-amber-100 mt-1">
              {timeToDisburseData[timeToDisburseData.length - 1].avgHours}h
            </p>
            <p className="text-xs text-green-600/70 mt-1 flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> -12% improvement
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-950/20 dark:to-sky-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">Approval Rate</p>
            <p className="text-xl font-bold text-cyan-900 dark:text-cyan-100 mt-1">
              {(approvalFunnelData[3].value / approvalFunnelData[0].value * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-green-600/70 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +1.5pp vs last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 bg-slate-100 dark:bg-slate-800 p-1">
          <TabsTrigger value="trends">Disbursement Trends</TabsTrigger>
          <TabsTrigger value="channels">Channel Mix</TabsTrigger>
          <TabsTrigger value="products">Product Performance</TabsTrigger>
          <TabsTrigger value="funnel">Approval Funnel</TabsTrigger>
          <TabsTrigger value="geographic">Geographic</TabsTrigger>
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends" className="mt-6 space-y-6">
          {/* Main Trend Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Disbursement Volume & Count</CardTitle>
                  <CardDescription>
                    {selectedPeriod === 'daily' ? 'Daily disbursement activity over last 30 days' :
                     selectedPeriod === 'weekly' ? 'Weekly aggregated disbursement data' :
                     'Monthly disbursement trends'}
                  </CardDescription>
                </div>
                <Badge variant={parseFloat(variance) >= 0 ? 'outline' : 'destructive'}
                       className={parseFloat(variance) >= 0 ? 'border-emerald-500 text-emerald-600' : ''}>
                  Target: {parseFloat(variance) >= 0 ? 'Exceeded' : 'Below'} ({variance}%)
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart 
                  data={selectedPeriod === 'monthly' ? monthlyDisbursementData : dailyDisbursementData.slice(-14)} 
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d97706" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey={selectedPeriod === 'monthly' ? 'month' : 'date'} 
                    tick={{ fontSize: 11 }} 
                    stroke="#9ca3af"
                    angle={-30}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => formatKES(v)} />
                  <Tooltip formatter={(value: number) => formatKES(value)} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area 
                    type="monotone" 
                    dataKey="volume" 
                    name="Disbursement Volume" 
                    stroke="#2563eb" 
                    fill="url(#volumeGradient)" 
                    strokeWidth={2}
                  />
                  {selectedPeriod === 'monthly' && (
                    <Area 
                      type="monotone" 
                      dataKey="target" 
                      name="Target" 
                      stroke="#d97706" 
                      fill="url(#targetGradient)" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Ticket Size Trend & Time to Disburse */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Average Ticket Size Trend</CardTitle>
                <CardDescription>Monthly average loan amount by product type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={ticketSizeTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `KSh${(v/1000).toFixed(0)}K`} />
                    <Tooltip formatter={(value: number) => formatKES(value)} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" dataKey="overall" name="Overall Avg" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="quickLoan" name="QuickLoan" stroke="#059669" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                    <Line type="monotone" dataKey="businessGrowth" name="Business" stroke="#7c3aed" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Time to Disburse (Hours)
                </CardTitle>
                <CardDescription>Application submit → Cash in hand</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={timeToDisburseData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" domain={[0, 12]} />
                    <Tooltip formatter={(value: number) => `${value}h`} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="avgHours" name="Average (hrs)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="p90Hours" name="P90 (hrs)" fill="#f97316" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="targetHours" name="Target (6h)" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Channels Tab */}
        <TabsContent value="channels" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Channel Mix Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Disbursement Channel Mix</CardTitle>
                <CardDescription>Distribution by payment channel</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={channelMixData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {channelMixData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Channel Details */}
            <Card>
              <CardHeader>
                <CardTitle>Channel Performance</CardTitle>
                <CardDescription>Volume and transaction details by channel</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {channelMixData.map((channel, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${channel.color}20` }}
                      >
                        {channel.name === 'M-Pesa' && <Smartphone className="w-5 h-5" style={{ color: channel.color }} />}
                        {channel.name === 'Bank Transfer' && <Building2 className="w-5 h-5" style={{ color: channel.color }} />}
                        {channel.name.includes('Mobile') && <CreditCard className="w-5 h-5" style={{ color: channel.color }} />}
                        {channel.name === 'Cash Pickup' && <Target className="w-5 h-5" style={{ color: channel.color }} />}
                        {channel.name === 'Other' && <Zap className="w-5 h-5" style={{ color: channel.color }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{channel.name}</span>
                          <span className="font-mono text-sm">{formatKES(channel.volume)}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${channel.value}%`, backgroundColor: channel.color }}
                          />
                        </div>
                      </div>
                      <Badge variant="secondary" className="shrink-0 ml-2">
                        {channel.value}%
                      </Badge>
                    </div>
                  ))}
                </div>

                {/* M-Pesa Highlight */}
                <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-200">
                    <Smartphone className="w-4 h-4" />
                    <span><strong>M-Pesa</strong> remains the dominant channel with 78.5% of all disbursements</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Performance Summary</CardTitle>
              <CardDescription>Disbursement metrics broken down by loan product</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Volume (KES)</TableHead>
                      <TableHead className="text-right">Avg Size</TableHead>
                      <TableHead className="text-right">PAR %</TableHead>
                      <TableHead className="text-right">Approval Rate</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productPerformanceData.map((product, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{product.product}</TableCell>
                        <TableCell className="text-right">{product.count.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono">{formatKES(product.volume)}</TableCell>
                        <TableCell className="text-right font-mono">{formatKES(product.avgSize)}</TableCell>
                        <TableCell className="text-right">
                          <span className={`font-semibold ${
                            product.par <= 3 ? 'text-emerald-600' :
                            product.par <= 5 ? 'text-yellow-600' :
                            product.par <= 8 ? 'text-orange-600' : 'text-red-600'
                          }`}>
                            {product.par}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">{product.approvalRate}%</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={
                            product.approvalRate >= 85 ? 'outline' :
                            product.approvalRate >= 70 ? 'secondary' : 'destructive'
                          } className={
                            product.approvalRate >= 85 ? 'border-emerald-500 text-emerald-600' : ''
                          }>
                            {product.approvalRate >= 85 ? 'Strong' :
                             product.approvalRate >= 70 ? 'Moderate' : 'Review'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Product Volume Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Disbursement Volume by Product</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productPerformanceData} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `KSh${(v/1000000).toFixed(0)}M`} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="product" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip formatter={(value: number) => formatKES(value)} />
                  <Bar dataKey="volume" name="Volume (KES)" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Funnel Tab */}
        <TabsContent value="funnel" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Loan Approval Funnel
              </CardTitle>
              <CardDescription>Conversion rates through each stage of the lending process</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-2xl mx-auto">
                {approvalFunnelData.map((stage, index) => (
                  <div key={index} className="relative mb-3">
                    <div 
                      className="flex items-center gap-4 p-4 rounded-lg transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      style={{
                        marginLeft: `${index * 8}%`,
                        marginRight: `${index * 8}%`,
                        background: `linear-gradient(to right, #2563eb${15 + index * 10}%, #3b82f6${15 + index * 10}%)`
                      }}
                    >
                      <span className="text-2xl">{stage.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-white">{stage.stage}</span>
                          <span className="text-white font-mono">{stage.value.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-blue-100 text-sm">
                            {index > 0 ? `${((stage.value / approvalFunnelData[index - 1].value) * 100).toFixed(1)}% conversion` : 'Starting point'}
                          </span>
                          <Badge variant="secondary" className="bg-white/20 text-white border-0">
                            {stage.rate.toFixed(1)}% of total
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {index < approvalFunnelData.length - 1 && (
                      <div className="flex justify-center my-1">
                        <ArrowRight className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Key Metrics */}
                <div className="mt-8 grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                    <p className="text-xs text-emerald-600">Overall Conversion</p>
                    <p className="text-2xl font-bold text-emerald-900">
                      {((approvalFunnelData[approvalFunnelData.length - 1].value / approvalFunnelData[0].value) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <p className="text-xs text-blue-600">Approval Rate</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {((approvalFunnelData[3].value / approvalFunnelData[0].value) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                    <p className="text-xs text-amber-600">Activation Rate</p>
                    <p className="text-2xl font-bold text-amber-900">
                      {((approvalFunnelData[5].value / approvalFunnelData[4].value) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Geographic Tab */}
        <TabsContent value="geographic" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* County Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-red-600" />
                  Disbursement by County
                </CardTitle>
                <CardDescription>Top counties by disbursement volume</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={geographicData.slice(0, 9)} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `KSh${(v/1000000).toFixed(0)}M`} tick={{ fontSize: 11 }} />
                    <YAxis dataKey="county" type="category" tick={{ fontSize: 11 }} width={75} />
                    <Tooltip formatter={(value: number) => formatKES(value)} />
                    <Bar dataKey="volume" name="Volume (KES)" fill="#ef4444" radius={[0, 4, 4, 0]}>
                      {geographicData.slice(0, 9).map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index === 0 ? '#dc2626' : index < 3 ? '#f97316' : '#fbbf24'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* County Table */}
            <Card>
              <CardHeader>
                <CardTitle>County Breakdown</CardTitle>
                <CardDescription>Detailed view of geographic distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>County</TableHead>
                        <TableHead className="text-right">Volume</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">% Share</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {geographicData.map((geo, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-red-500" />
                            {geo.county}
                          </TableCell>
                          <TableCell className="text-right font-mono">{formatKES(geo.volume)}</TableCell>
                          <TableCell className="text-right">{geo.count.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-slate-200 rounded-full h-2">
                                <div 
                                  className="h-2 rounded-full bg-red-500"
                                  style={{ width: `${geo.percentage}%` }}
                                />
                              </div>
                              <span className="text-xs w-10 text-right">{geo.percentage}%</span>
                            </div>
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
      </Tabs>
    </div>
  )
}

export default DisbursementAnalytics
