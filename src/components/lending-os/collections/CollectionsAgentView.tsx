'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  Phone,
  MessageSquare,
  Mail,
  CheckCircle2,
  Clock,
  Target,
  TrendingUp,
  AlertTriangle,
  Calendar,
  User,
  ArrowRight,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import type { OverdueLoan, AgentPerformance, DailyActivity } from './types'

// Mock agent performance data
const mockPerformance: AgentPerformance = {
  agentId: 'agent-001',
  agentName: 'Sarah Chen',
  period: {
    from: '2026-01-01',
    to: '2026-01-20'
  },
  metrics: {
    loansAssigned: 42,
    callsMade: 156,
    callsConnected: 98,
    smsSent: 89,
    emailsSent: 23,
    promisesReceived: 34,
    promisesKept: 28,
    promisesBroken: 6,
    amountsRecovered: 2850000,
    recoveryRate: 67.8
  },
  dailyActivity: [
    { date: '2026-01-20', callsMade: 12, smsSent: 5, promisesReceived: 3, amountsRecovered: 125000 },
    { date: '2026-01-19', callsMade: 15, smsSent: 8, promisesReceived: 4, amountsRecovered: 98000 },
    { date: '2026-01-18', callsMade: 10, smsSent: 6, promisesReceived: 2, amountsRecovered: 75000 },
    { date: '2026-01-17', callsMade: 8, smsSent: 4, promisesReceived: 1, amountsRecovered: 45000 },
    { date: '2026-01-16', callsMade: 14, smsSent: 7, promisesReceived: 5, amountsRecovered: 165000 },
    { date: '2026-01-15', callsMade: 11, smsSent: 5, promisesReceived: 3, amountsRecovered: 89000 },
    { date: '2026-01-14', callsMade: 13, smsSent: 6, promisesReceived: 4, amountsRecovered: 112000 }
  ]
}

// Mock assigned loans for this agent
const mockAssignedLoans: OverdueLoan[] = [
  {
    id: '1',
    loanNumber: 'LN-2026-000042',
    customerId: 'cust-001',
    customerName: 'John Kamau',
    customerPhone: '0712345678',
    principal: 50000,
    outstandingBalance: 42000,
    totalRepaid: 8000,
    daysInArrears: 12,
    status: 'IN_ARREARS',
    arrearsStatus: 'DAYS_8_30',
    assignedCollectorId: 'agent-001',
    collectorName: 'Sarah Chen',
    nextPaymentDue: '2026-02-15',
    riskLevel: 'MEDIUM',
    productName: 'Personal Loan'
  },
  {
    id: '6',
    loanNumber: 'LN-2026-000052',
    customerId: 'cust-006',
    customerName: 'Sarah Muthoni',
    customerPhone: '0767890123',
    principal: 25000,
    outstandingBalance: 15000,
    totalRepaid: 10000,
    daysInArrears: 7,
    status: 'ACTIVE',
    arrearsStatus: 'DAYS_1_7',
    assignedCollectorId: 'agent-001',
    collectorName: 'Sarah Chen',
    nextPaymentDue: '2026-01-28',
    riskLevel: 'LOW',
    productName: 'Salary Advance'
  },
  {
    id: '9',
    loanNumber: 'LN-2025-000095',
    customerId: 'cust-009',
    customerName: 'Lucy Wanjiru',
    customerPhone: '0790123456',
    principal: 35000,
    outstandingBalance: 32000,
    totalRepaid: 3000,
    daysInArrears: 25,
    status: 'IN_ARREARS',
    arrearsStatus: 'DAYS_8_30',
    assignedCollectorId: 'agent-001',
    collectorName: 'Sarah Chen',
    nextPaymentDue: '2026-02-05',
    riskLevel: 'HIGH',
    productName: 'Business Loan'
  },
  {
    id: '10',
    loanNumber: 'LN-2026-000061',
    customerId: 'cust-010',
    customerName: 'David Kimani',
    customerPhone: '0701234567',
    principal: 18000,
    outstandingBalance: 12000,
    totalRepaid: 6000,
    daysInArrears: 5,
    status: 'ACTIVE',
    arrearsStatus: 'DAYS_1_7',
    assignedCollectorId: 'agent-001',
    collectorName: 'Sarah Chen',
    nextPaymentDue: '2026-01-30',
    riskLevel: 'LOW',
    productName: 'Emergency Loan'
  }
]

interface CollectionsAgentViewProps {
  agentId?: string
  tenantId?: string
}

export function CollectionsAgentView({ agentId = 'agent-001', tenantId }: CollectionsAgentViewProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [performance, setPerformance] = useState<AgentPerformance | null>(null)
  const [assignedLoans, setAssignedLoans] = useState<OverdueLoan[]>([])
  const [activeTab, setActiveTab] = useState('queue')

  // Fetch agent data
  const fetchAgentData = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 600))
      
      // In production:
      // const response = await fetch(`/api/collections?tenantId=${tenantId}&assignedCollector=${agentId}`)
      // const result = await response.json()
      
      setPerformance(mockPerformance)
      setAssignedLoans(mockAssignedLoans)
    } catch (error) {
      console.error('Error fetching agent data:', error)
      toast.error('Failed to load agent data')
    } finally {
      setIsLoading(false)
    }
  }, [agentId, tenantId])

  useEffect(() => {
    fetchAgentData()
  }, [fetchAgentData])

  // Format currency
  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) return `KSh ${(amount / 1000000).toFixed(1)}M`
    return `KSh ${amount.toLocaleString()}`
  }

  // Get priority badge color
  const getPriorityBadge = (days: number) => {
    if (days > 30) return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 border-0">High</Badge>
    if (days > 7) return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 border-0">Medium</Badge>
    return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 border-0">Low</Badge>
  }

  // Get today's tasks
  const todayTasks = [
    { id: 1, type: 'call', loan: mockAssignedLoans[0], time: '09:00 AM', status: 'pending' as const },
    { id: 2, type: 'followup', loan: mockAssignedLoans[2], time: '10:30 AM', status: 'pending' as const },
    { id: 3, type: 'sms', loan: mockAssignedLoans[1], time: '11:00 AM', status: 'completed' as const },
    { id: 4, type: 'call', loan: mockAssignedLoans[3], time: '02:00 PM', status: 'pending' as const },
    { id: 5, type: 'promise_followup', loan: mockAssignedLoans[0], time: '04:00 PM', status: 'pending' as const }
  ]

  return (
    <div className="space-y-6">
      {/* Agent Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-xl">
            SC
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              My Collection Queue
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Sarah Chen • {performance?.metrics.loansAssigned || 0} loans assigned
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchAgentData}
          disabled={isLoading}
          className="dark:border-slate-700"
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Performance Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Calls Today */}
        <Card className={isLoading ? "animate-pulse" : ""}>
          <CardContent className="p-4">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Calls Made</span>
                  <Phone className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {performance?.metrics.callsMade || 0}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {performance?.metrics.callsConnected || 0} connected ({((performance?.metrics.callsConnected || 0) / (performance?.metrics.callsMade || 1) * 100).toFixed(0)}%)
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Promises Received */}
        <Card className={isLoading ? "animate-pulse" : ""}>
          <CardContent className="p-4">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Promises</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {performance?.metrics.promisesReceived || 0}
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  {performance?.metrics.promisesKept || 0} kept ({((performance?.metrics.promisesKept || 0) / ((performance?.metrics.promisesKept || 0) + (performance?.metrics.promisesBroken || 1)) * 100).toFixed(0)}% keep rate)
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Amounts Recovered */}
        <Card className={isLoading ? "animate-pulse" : ""}>
          <CardContent className="p-4">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Recovered</span>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(performance?.metrics.amountsRecovered || 0)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  This period
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recovery Rate */}
        <Card className={isLoading ? "animate-pulse" : ""}>
          <CardContent className="p-4">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Recovery Rate</span>
                  <Target className="w-4 h-4 text-purple-500" />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {performance?.metrics.recoveryRate || 0}%
                </p>
                <Progress 
                  value={performance?.metrics.recoveryRate || 0} 
                  className="mt-2 h-2"
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 dark:bg-slate-800 w-full sm:w-auto">
          <TabsTrigger value="queue" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
            My Queue ({assignedLoans.length})
          </TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
            Today's Tasks ({todayTasks.filter(t => t.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
            Activity Log
          </TabsTrigger>
        </TabsList>

        {/* My Queue Tab */}
        <TabsContent value="queue" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4">
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ))
                ) : assignedLoans.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No loans assigned to you</p>
                  </div>
                ) : (
                  assignedLoans.map(loan => (
                    <div 
                      key={loan.id}
                      className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            loan.daysInArrears > 30 ? "bg-red-100 dark:bg-red-900/30" :
                            loan.daysInArrears > 7 ? "bg-amber-100 dark:bg-amber-900/30" :
                            "bg-emerald-100 dark:bg-emerald-900/30"
                          )}>
                            <Clock className={cn(
                              "w-5 h-5",
                              loan.daysInArrears > 30 ? "text-red-600" :
                              loan.daysInArrears > 7 ? "text-amber-600" :
                              "text-emerald-600"
                            )} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">{loan.loanNumber.replace('LN-', '')}</span>
                              {getPriorityBadge(loan.daysInArrears)}
                            </div>
                            <p className="font-medium truncate">{loan.customerName}</p>
                            <p className="text-sm text-slate-500">{loan.customerPhone}</p>
                          </div>
                        </div>
                        
                        <div className="text-right hidden sm:block">
                          <p className="font-bold">{formatCurrency(loan.outstandingBalance)}</p>
                          <p className="text-xs text-slate-500">{loan.daysInArrears} days overdue</p>
                        </div>

                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Phone className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MessageSquare className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8">
                            View <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Today's Tasks Tab */}
        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-500" />
                Daily Task List
              </CardTitle>
              <CardDescription>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todayTasks.map(task => (
                  <div 
                    key={task.id}
                    className={cn(
                      "flex items-center gap-4 p-3 rounded-lg border transition-colors",
                      task.status === 'completed' 
                        ? "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 opacity-60"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                      task.type === 'call' ? "bg-blue-100 dark:bg-blue-900/30" :
                      task.type === 'sms' ? "bg-green-100 dark:bg-green-900/30" :
                      task.type === 'followup' ? "bg-amber-100 dark:bg-amber-900/30" :
                      "bg-purple-100 dark:bg-purple-900/30"
                    )}>
                      {task.type === 'call' && <Phone className="w-5 h-5 text-blue-600" />}
                      {task.type === 'sms' && <MessageSquare className="w-5 h-5 text-green-600" />}
                      {task.type === 'followup' && <Clock className="w-5 h-5 text-amber-600" />}
                      {task.type === 'promise_followup' && <CheckCircle2 className="w-5 h-5 text-purple-600" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{task.loan.customerName}</span>
                        <span className="font-mono text-xs text-slate-500">{task.loan.loanNumber.replace('LN-', '')}</span>
                      </div>
                      <p className="text-sm text-slate-500 capitalize">
                        {task.type.replace('_', ' ')}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-medium">{task.time}</p>
                      {task.status === 'completed' ? (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 border-0 mt-1">
                          Done
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="mt-1">
                          Pending
                        </Badge>
                      )}
                    </div>

                    {task.status !== 'completed' && (
                      <Button size="sm" className="flex-shrink-0">
                        Start
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-slate-500" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performance?.dailyActivity.slice().reverse().map((day, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="text-center min-w-[80px]">
                      <p className="text-sm font-medium">
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    
                    <div className="flex-1 grid grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-lg font-bold text-blue-600">{day.callsMade}</p>
                        <p className="text-xs text-slate-500">Calls</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-green-600">{day.smsSent}</p>
                        <p className="text-xs text-slate-500">SMS</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-emerald-600">{day.promisesReceived}</p>
                        <p className="text-xs text-slate-500">Promises</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-purple-600">{formatCurrency(day.amountsRecovered)}</p>
                        <p className="text-xs text-slate-500">Recovered</p>
                      </div>
                    </div>
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
