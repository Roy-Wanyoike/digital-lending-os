'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from '@/components/ui/table'
import { 
  DollarSign,
  TrendingDown,
  AlertTriangle,
  Clock,
  Users,
  Phone,
  MessageSquare,
  Mail,
  RefreshCw,
  Filter,
  Target,
  Percent,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { toast } from 'sonner'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts'
import { AgingBucketChart } from './AgingBucketChart'
import { OverdueLoansTable } from './OverdueLoansTable'
import { CollectionActionsPanel } from './CollectionActionsPanel'
import { CollectionsAgentView } from './CollectionsAgentView'
import type { CollectionSummary, AgingBucket, OverdueLoan, CollectionAgent } from './types'

// Mock data for development (will be replaced with API calls)
const mockSummary: CollectionSummary = {
  dueToday: { amount: 42000000, count: 156 },
  collectedToday: { amount: 31200000, count: 128 },
  overdueTotal: { amount: 11500000, count: 183 },
  par: {
    par1: 8.5,
    par7: 6.2,
    par30: 5.2,
    par90: 2.1
  },
  totalPortfolio: 840000000
}

const mockAgingBuckets: AgingBucket[] = [
  { bucket: '1-30 days', count: 78, amount: 4100000, minDays: 1, maxDays: 30, severity: 'low' },
  { bucket: '31-60 days', count: 45, amount: 2800000, minDays: 31, maxDays: 60, severity: 'medium' },
  { bucket: '61-90 days', count: 28, amount: 2100000, minDays: 61, maxDays: 90, severity: 'high' },
  { bucket: '91-120 days', count: 18, amount: 1500000, minDays: 91, maxDays: 120, severity: 'critical' },
  { bucket: '120+ days', count: 14, amount: 1000000, minDays: 121, maxDays: null, severity: 'severe' }
]

const mockAgents: CollectionAgent[] = [
  { id: '1', name: 'Sarah Chen', email: 'sarah.chen@abepot.co.ke', phone: '0712345678', role: 'AGENT', assignedCount: 42 },
  { id: '2', name: 'James Omondi', email: 'james.omondi@abepot.co.ke', phone: '0723456789', role: 'AGENT', assignedCount: 38 },
  { id: '3', name: 'Grace Wanjiku', email: 'grace.wanjiku@abepot.co.ke', phone: '0734567890', role: 'MANAGER', assignedCount: 55 },
  { id: '4', name: 'Peter Kamau', email: 'peter.kamau@abepot.co.ke', phone: '0745678901', role: 'AGENT', assignedCount: 48 }
]

// PAR Bucket data for donut chart
const PAR_BUCKET_COLORS = ['#22c55e', '#f59e0b', '#f97316', '#ef4444', '#dc2626']

// Collection trend data (last 30 days)
const generateTrendData = () => {
  const data = []
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const baseTarget = 35000000
    const variance = Math.random() * 15000000 - 5000000
    const collected = baseTarget + variance + (Math.random() > 0.3 ? Math.random() * 8000000 : 0)
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      collected: Math.round(collected),
      target: baseTarget + Math.round(Math.random() * 5000000 - 2500000)
    })
  }
  return data
}

const collectionTrendData = generateTrendData()

// Aging summary table data
const agingSummaryData = [
  { bucket: '1-30 Days', count: 78, principal: 3200000, interest: 680000, fees: 220000, total: 4100000, percentage: 35.7 },
  { bucket: '31-60 Days', count: 45, principal: 2150000, interest: 480000, fees: 170000, total: 2800000, percentage: 24.3 },
  { bucket: '61-90 Days', count: 28, principal: 1620000, interest: 360000, fees: 120000, total: 2100000, percentage: 18.3 },
  { bucket: '91-120 Days', count: 18, principal: 1180000, interest: 240000, fees: 80000, total: 1500000, percentage: 13.0 },
  { bucket: '120+ Days', count: 14, principal: 780000, interest: 165000, fees: 55000, total: 1000000, percentage: 8.7 }
]

interface CollectionsDashboardProps {
  tenantId?: string
  agentMode?: boolean
  agentId?: string
}

export function CollectionsDashboard({ tenantId, agentMode = false, agentId }: CollectionsDashboardProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [summary, setSummary] = useState<CollectionSummary | null>(null)
  const [agingBuckets, setAgingBuckets] = useState<AgingBucket[]>([])
  const [agents, setAgents] = useState<CollectionAgent[]>([])
  const [selectedLoan, setSelectedLoan] = useState<OverdueLoan | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [activeQueueTab, setActiveQueueTab] = useState('all')
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null)

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true)
      await new Promise(resolve => setTimeout(resolve, 800))
      
      setSummary(mockSummary)
      setAgingBuckets(mockAgingBuckets)
      setAgents(mockAgents)
    } catch (error) {
      console.error('Error fetching collections data:', error)
      toast.error('Failed to load collections data')
    } finally {
      setIsLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Handle loan selection for actions panel
  const handleLoanSelect = (loan: OverdueLoan) => {
    setSelectedLoan(loan)
    setIsPanelOpen(true)
  }

  // Handle bucket click to filter table
  const handleBucketClick = (bucket: AgingBucket) => {
    setSelectedBucket(selectedBucket === bucket.bucket ? null : bucket.bucket)
  }

  // Format currency helper
  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `KSh ${(amount / 1000000).toFixed(1)}M`
    }
    return `KSh ${amount.toLocaleString()}`
  }

  // Format PAR percentage
  const formatPAR = (value: number): string => `${value.toFixed(1)}%`

  // Calculate collection rate
  const collectionRate = summary ? ((summary.collectedToday.amount / summary.dueToday.amount) * 100).toFixed(1) : '0'

  if (agentMode && agentId) {
    return <CollectionsAgentView agentId={agentId} tenantId={tenantId} />
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <AlertTriangle className="w-7 h-7 text-amber-600" />
            Collections Management
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Monitor and manage loan collections & recoveries
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="dark:border-slate-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="dark:border-slate-700">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Overdue Amount */}
        <Card className={`border-l-4 border-l-red-500 ${isLoading ? 'animate-pulse' : ''}`}>
          <CardContent className="p-4 md:p-5">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Total Overdue</p>
                  <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
                    <DollarSign className="w-4 h-4 text-red-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                  {summary ? formatCurrency(summary.overdueTotal.amount) : '-'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {summary?.overdueTotal.count || 0} loans in arrears
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* PAR >30 Days */}
        <Card className={`border-l-4 border-l-amber-500 ${isLoading ? 'animate-pulse' : ''}`}>
          <CardContent className="p-4 md:p-5">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-28" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500 dark:text-slate-400">PAR &gt;30 Days</p>
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                    <Percent className="w-4 h-4 text-amber-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                  {summary ? formatPAR(summary.par.par30) : '-'}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="w-3 h-3 text-red-500" />
                  <span className="text-xs text-red-500">vs 15% benchmark</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Collection Rate */}
        <Card className={`border-l-4 border-l-emerald-500 ${isLoading ? 'animate-pulse' : ''}`}>
          <CardContent className="p-4 md:p-5">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-28" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Collection Rate</p>
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                    <Target className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                  {collectionRate}%
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowDownRight className="w-3 h-3 text-emerald-500" />
                  <span className="text-xs text-emerald-500">Target: 85%</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Active Agents */}
        <Card className={`border-l-4 border-l-blue-500 ${isLoading ? 'animate-pulse' : ''}`}>
          <CardContent className="p-4 md:p-5">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-28" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Active Agents</p>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                  {agents.length}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {agents.reduce((sum, a) => sum + (a.assignedCount || 0), 0)} loans assigned
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PAR Bucket Donut Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="w-5 h-5 text-slate-500" />
              PAR Bucket Distribution
            </CardTitle>
            <CardDescription>
              Portfolio at Risk by days in arrears
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={agingBuckets.map(b => ({
                        name: b.bucket,
                        value: b.amount
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {agingBuckets.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={PAR_BUCKET_COLORS[index % PAR_BUCKET_COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span className="text-xs">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Collection Trend Line Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-500" />
              Collection Trend (Last 30 Days)
            </CardTitle>
            <CardDescription>
              Daily collections vs target
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={collectionTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11 }}
                      interval={4}
                    />
                    <YAxis 
                      tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(0)}M` : `${(v/1000).toFixed(0)}K`}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="collected" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      dot={false}
                      name="Collected"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="target" 
                      stroke="#94a3b8" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Target"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Aging Summary Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-500" />
            Aging Summary
          </CardTitle>
          <CardDescription>
            Detailed breakdown of overdue portfolio by aging bucket
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bucket</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Principal</TableHead>
                  <TableHead className="text-right">Interest</TableHead>
                  <TableHead className="text-right">Fees</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agingSummaryData.map((row) => (
                  <TableRow key={row.bucket}>
                    <TableCell className="font-medium">{row.bucket}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.principal)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.interest)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.fees)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(row.total)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className={
                        row.percentage > 30 ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400' :
                        row.percentage > 20 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' :
                        'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400'
                      }>
                        {row.percentage}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-slate-50 dark:bg-slate-800/50 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">
                    {agingSummaryData.reduce((sum, r) => sum + r.count, 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(agingSummaryData.reduce((sum, r) => sum + r.principal, 0))}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(agingSummaryData.reduce((sum, r) => sum + r.interest, 0))}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(agingSummaryData.reduce((sum, r) => sum + r.fees, 0))}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(agingSummaryData.reduce((sum, r) => sum + r.total, 0))}
                  </TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Main Content Grid - Aging Buckets and Team */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Aging Buckets Chart - Takes 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-500" />
              Aging Bucket Analysis
            </CardTitle>
            <CardDescription>
              Distribution of overdue loans by days in arrears
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <AgingBucketChart 
                buckets={agingBuckets} 
                onBucketClick={handleBucketClick}
                selectedBucket={selectedBucket}
              />
            )}
          </CardContent>
        </Card>

        {/* Quick Stats Panel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-500" />
              Collection Team
            </CardTitle>
            <CardDescription>Active collection agents</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {agents.map(agent => (
                  <div 
                    key={agent.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    onClick={() => setActiveQueueTab(agent.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-medium">
                        {agent.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{agent.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{agent.assignedCount} loans assigned</p>
                      </div>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={
                        agent.role === 'MANAGER' 
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400' 
                          : ''
                      }
                    >
                      {agent.role}
                    </Badge>
                  </div>
                ))}
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2 dark:border-slate-700"
                  onClick={() => setActiveQueueTab('unassigned')}
                >
                  View Unassigned ({agingBuckets.reduce((sum, b) => sum + b.count, 0)})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Collection Queue Tabs */}
      <Card>
        <CardHeader>
          <Tabs value={activeQueueTab} onValueChange={setActiveQueueTab}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <TabsList className="bg-slate-100 dark:bg-slate-800">
                <TabsTrigger value="all" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
                  All Loans
                </TabsTrigger>
                <TabsTrigger value="mine" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
                  My Assigned
                </TabsTrigger>
                <TabsTrigger value="unassigned" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
                  Unassigned
                </TabsTrigger>
                <TabsTrigger value="high_priority" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
                  High Priority
                </TabsTrigger>
              </TabsList>
              
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-slate-500">
                  <Phone className="w-4 h-4 mr-1" />
                  Call
                </Button>
                <Button variant="ghost" size="sm" className="text-slate-500">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  SMS
                </Button>
                <Button variant="ghost" size="sm" className="text-slate-500">
                  <Mail className="w-4 h-4 mr-1" />
                  Email
                </Button>
              </div>
            </div>

            <TabsContent value="all" className="mt-4">
              <OverdueLoansTable 
                onLoanSelect={handleLoanSelect}
                filterBucket={selectedBucket}
              />
            </TabsContent>
            
            <TabsContent value="mine" className="mt-4">
              <OverdueLoansTable 
                onLoanSelect={handleLoanSelect}
                filterCollector="mine"
                filterBucket={selectedBucket}
              />
            </TabsContent>
            
            <TabsContent value="unassigned" className="mt-4">
              <OverdueLoansTable 
                onLoanSelect={handleLoanSelect}
                filterCollector="unassigned"
                filterBucket={selectedBucket}
              />
            </TabsContent>
            
            <TabsContent value="high_priority" className="mt-4">
              <OverdueLoansTable 
                onLoanSelect={handleLoanSelect}
                highPriorityOnly={true}
                filterBucket={selectedBucket}
              />
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>

      {/* Collection Actions Slide-out Panel */}
      <CollectionActionsPanel
        loan={selectedLoan}
        open={isPanelOpen}
        onOpenChange={setIsPanelOpen}
        agents={agents}
        onUpdate={() => fetchDashboardData()}
      />
    </div>
  )
}

// Export sub-components for individual use
export { AgingBucketChart } from './AgingBucketChart'
export { OverdueLoansTable } from './OverdueLoansTable'
export { CollectionActionsPanel } from './CollectionActionsPanel'
export { PromiseToPayDialog } from './PromiseToPayDialog'
export { ContactLog } from './ContactLog'
export { CollectionsAgentView } from './CollectionsAgentView'
export { CollectionQueue } from './CollectionQueue'
export { PromiseToPayForm } from './PromiseToPayForm'
export { PARCalculator } from './PARCalculator'
export { CallHistoryPanel } from './CallHistoryPanel'
export { SMSCampaignBuilder } from './SMSCampaignBuilder'
