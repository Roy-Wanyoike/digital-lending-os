'use client'

import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp } from 'lucide-react'

// Color constants
export const CHART_COLORS = {
  emerald: '#059669',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
  slate: '#64748b',
  purple: '#8b5cf6',
  teal: '#14b8a6',
}

// Custom tooltip styles
const CustomTooltip = ({ active, payload, label, formatter }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
  formatter?: (value: number) => string
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatter ? formatter(entry.value) : entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    )
  }
  return null
}

// Loading skeleton for charts
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="w-full" style={{ height }} />
    </div>
  )
}

// ============================================
// LENDER DASHBOARD CHARTS
// ============================================

// Portfolio Distribution Pie Chart Data
const portfolioDistributionData = [
  { name: 'Active', value: 156420, color: CHART_COLORS.emerald },
  { name: 'In Arrears', value: 18500, color: CHART_COLORS.amber },
  { name: 'Fully Paid', value: 45200, color: CHART_COLORS.slate },
  { name: 'Defaulted', value: 7312, color: CHART_COLORS.red },
]

interface PortfolioDistributionProps {
  data?: Array<{ name: string; value: number; color: string }>
  title?: string
  description?: string
}

export function PortfolioDistributionChart({ 
  data = portfolioDistributionData,
  title = "Portfolio Distribution",
  description = "Loan status breakdown"
}: PortfolioDistributionProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null // Hide label for small slices
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 1.4
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="#334155" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    )
  }

  return (
    <Card className="h-full dark:bg-slate-800/50 dark:border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              label={renderCustomLabel}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip 
              content={<CustomTooltip formatter={(value) => `${value.toLocaleString()} loans`} />}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value, entry: any) => (
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {value} ({entry.payload?.value?.toLocaleString()})
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3 mt-2 pt-3 border-t dark:border-slate-700">
          <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Total Loans</p>
            <p className="text-lg font-bold text-emerald-800 dark:text-emerald-300">{total.toLocaleString()}</p>
          </div>
          <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Active Rate</p>
            <p className="text-lg font-bold text-blue-800 dark:text-blue-300">
              {((data.find(d => d.name === 'Active')?.value || 0) / total * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Monthly Disbursements Bar Chart Data
const monthlyDisbursementData = [
  { month: 'Mar', disbursements: 112000000, count: 24500 },
  { month: 'Apr', disbursements: 124000000, count: 27800 },
  { month: 'May', disbursements: 145000000, count: 31200 },
  { month: 'Jun', disbursements: 158000000, count: 34100 },
  { month: 'Jul', disbursements: 132000000, count: 29500 },
  { month: 'Aug', disbursements: 168000000, count: 38200 },
]

interface MonthlyDisbursementsProps {
  data?: Array<{ month: string; disbursements: number; count: number }>
  title?: string
  description?: string
}

export function MonthlyDisbursementsChart({ 
  data = monthlyDisbursementData,
  title = "Monthly Disbursements",
  description = "Last 6 months loan disbursements"
}: MonthlyDisbursementsProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `KSh ${(value / 1000000).toFixed(0)}M`
    }
    return `KSh ${(value / 1000).toFixed(0)}K`
  }

  return (
    <Card className="h-full dark:bg-slate-800/50 dark:border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickFormatter={formatCurrency}
            />
            <Tooltip 
              content={
                <CustomTooltip 
                  formatter={(value) => formatCurrency(value as number)}
                />
              }
            />
            <Bar 
              dataKey="disbursements" 
              name="Amount"
              fill={CHART_COLORS.emerald}
              radius={[6, 6, 0, 0]}
              maxBarSize={60}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS.emerald} opacity={0.85 + (index * 0.03)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {/* Summary row */}
        <div className="flex justify-between items-center pt-3 border-t mt-2 dark:border-slate-700">
          <div className="flex gap-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Disbursed</p>
              <p className="font-semibold text-slate-900 dark:text-white">KSh 839M</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Avg. Monthly</p>
              <p className="font-semibold text-slate-900 dark:text-white">KSh 139.8M</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded">
            <span className="text-xs font-medium">+19.8%</span>
            <span className="text-xs">vs prev period</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Collections Trend Line Chart Data
const generateCollectionsData = () => {
  const data = []
  let actualBase = 15000000
  let targetBase = 18000000
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
    const dayMonth = date.getDate()
    
    // Generate realistic-looking data with some variance
    actualBase += (Math.random() - 0.4) * 2000000
    targetBase = 18000000 + (Math.random() - 0.5) * 500000
    
    data.push({
      day: `${dayName} ${dayMonth}`,
      actual: Math.max(12000000, actualBase),
      target: targetBase,
    })
  }
  return data
}

const collectionsData = generateCollectionsData()

interface CollectionsTrendProps {
  data?: Array<{ day: string; actual: number; target: number }>
  title?: string
  description?: string
}

export function CollectionsTrendChart({ 
  data = collectionsData,
  title = "Collections Trend",
  description = "Last 30 days performance vs target"
}: CollectionsTrendProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `KSh ${(value / 1000000).toFixed(1)}M`
    }
    return `KSh ${(value / 1000).toFixed(0)}K`
  }

  // Show only every 5th label to avoid crowding
  const tickData = data.filter((_, i) => i % 5 === 0)

  return (
    <Card className="h-full dark:bg-slate-800/50 dark:border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-600" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis 
              dataKey="day" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
              interval={4}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickFormatter={formatCurrency}
            />
            <Tooltip 
              content={
                <CustomTooltip 
                  formatter={(value) => formatCurrency(value as number)}
                />
              }
            />
            <Legend 
              verticalAlign="top" 
              align="right"
              iconType="line"
              iconSize={12}
            />
            <Line 
              type="monotone" 
              dataKey="actual" 
              name="Actual"
              stroke={CHART_COLORS.emerald} 
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
            />
            <Line 
              type="monotone" 
              dataKey="target" 
              name="Target"
              stroke={CHART_COLORS.slate} 
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
        {/* Performance summary */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t mt-2 dark:border-slate-700">
          <div className="text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Collected</p>
            <p className="font-bold text-slate-900 dark:text-white">KSh 467M</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">Target Achievement</p>
            <p className="font-bold text-emerald-600">86.5%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">Best Day</p>
            <p className="font-bold text-slate-900 dark:text-white">KSh 21.2M</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// SUPER ADMIN CHARTS
// ============================================

// Tenant Growth Area Chart Data
const tenantGrowthData = [
  { month: 'Sep', tenants: 145, newTenants: 12 },
  { month: 'Oct', tenants: 162, newTenants: 17 },
  { month: 'Nov', tenants: 178, newTenants: 16 },
  { month: 'Dec', tenants: 195, newTenants: 17 },
  { month: 'Jan', tenants: 218, newTenants: 23 },
  { month: 'Feb', tenants: 252, newTenants: 34 },
]

interface TenantGrowthProps {
  data?: Array<{ month: string; tenants: number; newTenants: number }>
  title?: string
  description?: string
}

export function TenantGrowthChart({ 
  data = tenantGrowthData,
  title = "Tenant Growth",
  description = "New tenants onboarded per month"
}: TenantGrowthProps) {
  return (
    <Card className="h-full dark:bg-slate-800/50 dark:border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="tenantGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <Tooltip 
              content={
                <CustomTooltip 
                  formatter={(value) => `${value} tenants`}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="newTenants"
              name="New Tenants"
              stroke={CHART_COLORS.blue}
              strokeWidth={2.5}
              fill="url(#tenantGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
        {/* Growth metrics */}
        <div className="flex justify-between items-center pt-3 border-t mt-2 dark:border-slate-700">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Growth Rate (MoM)</p>
            <p className="text-lg font-bold text-emerald-600">+15.6%</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Active</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">238</p>
          </div>
          <div className="flex items-center gap-1 text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded">
            <span className="text-xs font-medium">↑ 183%</span>
            <span className="text-xs">vs 6mo ago</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Plan Distribution Donut Chart Data
const planDistributionData = [
  { name: 'Enterprise', value: 42, color: '#8b5cf6' },
  { name: 'Professional', value: 98, color: '#3b82f6' },
  { name: 'Starter', value: 98, color: '#059669' },
  { name: 'Custom', value: 14, color: '#f59e0b' },
]

interface PlanDistributionProps {
  data?: Array<{ name: string; value: number; color: string }>
  title?: string
  description?: string
}

export function PlanDistributionChart({ 
  data = planDistributionData,
  title = "Plan Distribution",
  description = "Subscription plan breakdown"
}: PlanDistributionProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card className="h-full dark:bg-slate-800/50 dark:border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip 
              content={
                <CustomTooltip 
                  formatter={(value) => `${value} tenants (${((value as number) / total * 100).toFixed(1)}%)`}
                />
              }
            />
            <Legend 
              layout="horizontal" 
              verticalAlign="bottom" 
              align="center"
              formatter={(value) => (
                <span className="text-sm text-slate-600 dark:text-slate-400">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Plan details */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          {data.map((plan) => (
            <div key={plan.name} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: plan.color }} />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{plan.name}</span>
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">{plan.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Regional Distribution Data
const regionalData = [
  { county: 'Nairobi', dcpCount: 86, loans: 450000, percentage: 34.1 },
  { county: 'Mombasa', dcpCount: 42, loans: 125000, percentage: 16.7 },
  { county: 'Kisumu', dcpCount: 35, loans: 98000, percentage: 13.9 },
  { county: 'Nakuru', dcpCount: 31, loans: 85000, percentage: 12.3 },
  { county: 'Eldoret', dcpCount: 24, loans: 52000, percentage: 9.5 },
  { county: 'Other', dcpCount: 34, loans: 130000, percentage: 13.5 },
]

interface RegionalDistributionProps {
  data?: Array<{ county: string; dcpCount: number; loans: number; percentage: number }>
  title?: string
  description?: string
}

export function RegionalDistributionChart({ 
  data = regionalData,
  title = "Regional Distribution",
  description = "DCP operations by county"
}: RegionalDistributionProps) {
  // Colors for horizontal bars
  const barColors = [
    CHART_COLORS.blue,
    CHART_COLORS.emerald,
    CHART_COLORS.teal,
    CHART_COLORS.purple,
    CHART_COLORS.amber,
    CHART_COLORS.slate,
  ]

  return (
    <Card className="h-full lg:col-span-2 dark:bg-slate-800/50 dark:border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-teal-600" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart 
            data={data} 
            layout="vertical"
            margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
            <XAxis 
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 11 }}
            />
            <YAxis 
              type="category"
              dataKey="county"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#334155', fontSize: 12, fontWeight: 500 }}
              width={65}
            />
            <Tooltip 
              content={
                <CustomTooltip 
                  formatter={(value, name) => {
                    if (name === 'dcpCount') return `${value} DCPs`
                    return `${(value as number).toLocaleString()} loans`
                  }}
                />
              }
            />
            <Bar 
              dataKey="dcpCount" 
              name="DCPs"
              radius={[0, 6, 6, 0]}
              maxBarSize={28}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {/* County summary */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 pt-3 border-t mt-2 dark:border-slate-700">
          {data.slice(0, 6).map((region) => (
            <div key={region.county} className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{region.county}</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{region.dcpCount}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{region.percentage}%</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// SPARKLINE COMPONENT FOR KPI CARDS
// ============================================

interface SparklineProps {
  data: number[]
  color?: string
  width?: number
  height?: number
  showArea?: boolean
  positive?: boolean
}

export function SparklineChart({ 
  data, 
  color = CHART_COLORS.emerald,
  width = 80,
  height = 32,
  showArea = true,
  positive = true 
}: SparklineProps) {
  const minVal = Math.min(...data)
  const maxVal = Math.max(...data)
  const range = maxVal - minVal || 1
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - minVal) / range) * height
    return `${x},${y}`
  }).join(' ')
  
  const areaPoints = `0,${height} ${points} ${width},${height}`
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`sparkGradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      
      {showArea && (
        <polygon
          points={areaPoints}
          fill={`url(#sparkGradient-${color.replace('#', '')})`}
        />
      )}
      
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* End dot */}
      <circle
        cx={width}
        cy={height - ((data[data.length - 1] - minVal) / range) * height}
        r="3"
        fill={color}
      />
    </svg>
  )
}

// Pre-built sparkline data generators
export const sparklineDataGenerators = {
  upward: () => Array.from({ length: 12 }, (_, i) => 20 + Math.random() * 20 + i * 3),
  downward: () => Array.from({ length: 12 }, (_, i) => 80 - Math.random() * 20 - i * 3),
  volatile: () => Array.from({ length: 12 }, (_, i) => 40 + Math.sin(i) * 20 + Math.random() * 15),
  stable: () => Array.from({ length: 12 }, () => 45 + Math.random() * 10),
}
