'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import {
  Shield,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  ArrowRight,
  Activity,
  DollarSign,
  Percent,
  AlertOctagon
} from 'lucide-react'

// TypeScript interfaces
export interface RiskKPI {
  label: string
  value: string | number
  change: number
  changeLabel: string
  icon: React.ReactNode
  color: string
  bgColor: string
}

export interface RiskGradeData {
  grade: string
  count: number
  amount: number
  percentage: number
  color: string
}

export interface RiskAlert {
  id: string
  applicantName: string
  phone: string
  riskScore: number
  riskGrade: string
  loanAmount: number
  reason: string
  timestamp: Date
  severity: 'critical' | 'high' | 'medium' | 'low'
}

// Mock data for KPIs
const kpiData: RiskKPI[] = [
  {
    label: 'Total Exposure',
    value: 'KSh 847.5M',
    change: 12.5,
    changeLabel: 'vs last month',
    icon: <DollarSign className="w-5 h-5" />,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/40'
  },
  {
    label: 'Weighted Avg Risk Score',
    value: '624',
    change: -3.2,
    changeLabel: 'vs last month',
    icon: <Shield className="w-5 h-5" />,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/40'
  },
  {
    label: 'Approval Rate',
    value: '68.4%',
    change: 2.1,
    changeLabel: 'vs last month',
    icon: <Percent className="w-5 h-5" />,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/40'
  },
  {
    label: 'Default Rate',
    value: '4.2%',
    change: -0.8,
    changeLabel: 'vs last month',
    icon: <TrendingDown className="w-5 h-5" />,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/40'
  }
]

// Mock data for risk distribution
const riskDistributionData: RiskGradeData[] = [
  { grade: 'A+', count: 28450, amount: 142000000, percentage: 15.6, color: '#059669' },
  { grade: 'A', count: 45230, amount: 198000000, percentage: 24.8, color: '#10b981' },
  { grade: 'B+', count: 38760, amount: 156000000, percentage: 21.3, color: '#84cc16' },
  { grade: 'B', count: 32450, amount: 128000000, percentage: 17.8, color: '#eab308' },
  { grade: 'C', count: 22800, amount: 92000000, percentage: 12.5, color: '#f97316' },
  { grade: 'D', count: 12400, amount: 48000000, percentage: 6.8, color: '#ef4444' },
  { grade: 'E', count: 2932, amount: 12000000, percentage: 1.6, color: '#dc2626' }
]

// Mock data for risk alerts
const mockRiskAlerts: RiskAlert[] = [
  {
    id: 'RA-001',
    applicantName: 'Samuel Omondi',
    phone: '0711***2345',
    riskScore: 185,
    riskGrade: 'E',
    loanAmount: 50000,
    reason: 'Multiple active defaults in CRB - 3 outstanding loans in arrears >90 days',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    severity: 'critical'
  },
  {
    id: 'RA-002',
    applicantName: 'Faith Wanjiru',
    phone: '0722***5678',
    riskScore: 245,
    riskGrade: 'D',
    loanAmount: 75000,
    reason: 'High debt-to-income ratio detected (67%) - exceeds 50% threshold',
    timestamp: new Date(Date.now() - 1000 * 60 * 42),
    severity: 'high'
  },
  {
    id: 'RA-003',
    applicantName: 'Peter Kariuki',
    phone: '0733***9012',
    riskScore: 312,
    riskGrade: 'C',
    loanAmount: 30000,
    reason: 'Unusual application pattern - 5 applications in last 30 days across DCPs',
    timestamp: new Date(Date.now() - 1000 * 60 * 58),
    severity: 'high'
  },
  {
    id: 'RA-004',
    applicantName: 'Mary Atieno',
    phone: '0744***3456',
    riskScore: 356,
    riskGrade: 'C',
    loanAmount: 25000,
    reason: 'ID mismatch alert - Slight variation in registered details vs CRB record',
    timestamp: new Date(Date.now() - 1000 * 60 * 90),
    severity: 'medium'
  },
  {
    id: 'RA-005',
    applicantName: 'James Mwangi',
    phone: '0755***7890',
    riskScore: 398,
    riskGrade: 'B',
    loanAmount: 100000,
    reason: 'Employment verification pending - Employer contact unresponsive',
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    severity: 'medium'
  }
]

export function RiskDashboard() {
  const [alerts] = useState<RiskAlert[]>(mockRiskAlerts)
  
  // Portfolio quality calculation (based on weighted average of grades)
  const portfolioQualityScore = 72 // Out of 100
  
  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600'
    if (score >= 65) return 'text-amber-600'
    if (score >= 50) return 'text-orange-600'
    return 'text-red-600'
  }

  const getQualityLabel = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 65) return 'Good'
    if (score >= 50) return 'Fair'
    return 'Poor'
  }

  const getSeverityBadge = (severity: RiskAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 border-0">Critical</Badge>
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400 border-0">High</Badge>
      case 'medium':
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 border-0">Medium</Badge>
      default:
        return <Badge variant="secondary" className="dark:bg-slate-700 dark:text-slate-300">Low</Badge>
    }
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `KSh ${(value / 1000000).toFixed(1)}M`
    }
    return `KSh ${(value / 1000).toFixed(0)}K`
  }

  const formatNumber = (value: number) => value.toLocaleString()

  const getTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Shield className="w-7 h-7 text-emerald-600" />
            Credit & Risk Dashboard
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Real-time portfolio risk monitoring and management
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="dark:border-slate-700 dark:hover:bg-slate-800">
            <Activity className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20">
            Generate Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi, index) => (
          <Card key={index} className="dark:bg-slate-800/50 dark:border-slate-700">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-start justify-between">
                <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                  <span className={kpi.color}>{kpi.icon}</span>
                </div>
                <div className={`flex items-center text-sm font-medium ${kpi.change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {kpi.change >= 0 ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  {Math.abs(kpi.change)}%
                </div>
              </div>
              <div className="mt-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">{kpi.label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{kpi.value}</p>
                <p className="text-xs text-slate-400 mt-1">{kpi.changeLabel}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution Chart */}
        <Card className="lg:col-span-2 dark:bg-slate-800/50 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart className="w-5 h-5 text-emerald-600" />
              Loan Distribution by Risk Grade
            </CardTitle>
            <CardDescription>Portfolio breakdown across credit risk categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskDistributionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                  <XAxis 
                    dataKey="grade" 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'count') return [formatNumber(value), 'Loan Count']
                      return [formatCurrency(value), 'Amount']
                    }}
                  />
                  <Bar dataKey="count" name="count" radius={[4, 4, 0, 0]}>
                    {riskDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t dark:border-slate-700">
              {riskDistributionData.map((item) => (
                <div key={item.grade} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 dark:text-slate-400">
                    Grade {item.grade}: {formatNumber(item.count)} ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Quality Gauge */}
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              Portfolio Quality
            </CardTitle>
            <CardDescription>Overall health indicator</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            {/* Gauge Visualization */}
            <div className="relative w-48 h-24 mb-6 overflow-hidden">
              {/* Background Arc */}
              <svg viewBox="0 0 200 100" className="w-full h-full">
                {/* Poor Zone (Red) */}
                <path
                  d="M 20 90 A 80 80 0 0 1 50 20"
                  fill="none"
                  stroke="#fecaca"
                  strokeWidth="16"
                  strokeLinecap="round"
                />
                {/* Fair Zone (Orange) */}
                <path
                  d="M 50 20 A 80 80 0 0 1 100 10"
                  fill="none"
                  stroke="#fed7aa"
                  strokeWidth="16"
                  strokeLinecap="round"
                />
                {/* Good Zone (Amber) */}
                <path
                  d="M 100 10 A 80 80 0 0 1 150 20"
                  fill="none"
                  stroke="#fef08a"
                  strokeWidth="16"
                  strokeLinecap="round"
                />
                {/* Excellent Zone (Green) */}
                <path
                  d="M 150 20 A 80 80 0 0 1 180 90"
                  fill="none"
                  stroke="#bbf7d0"
                  strokeWidth="16"
                  strokeLinecap="round"
                />
                
                {/* Needle */}
                <g transform={`rotate(${(portfolioQualityScore / 100) * 180 - 90}, 100, 90)`}>
                  <line x1="100" y1="90" x2="100" y2="25" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="100" cy="90" r="6" fill="#334155" />
                </g>
              </svg>
              
              {/* Center Value */}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center">
                <p className={`text-3xl font-bold ${getQualityColor(portfolioQualityScore)}`}>
                  {portfolioQualityScore}
                </p>
                <p className="text-xs text-slate-500">out of 100</p>
              </div>
            </div>

            {/* Quality Label */}
            <div className={`px-4 py-2 rounded-full ${getQualityColor(portfolioQualityScore).replace('text-', 'bg-').replace('-600', '-100').replace('-400', '/30')} ${getQualityColor(portfolioQualityScore)}`}>
              <span className="font-semibold">{getQualityLabel(portfolioQualityScore)}</span>
            </div>

            {/* Quality Metrics */}
            <div className="w-full space-y-3 mt-6 pt-4 border-t dark:border-slate-700">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">PAR30 Ratio</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">4.2%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">PAR90 Ratio</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">2.1%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Write-off Rate</span>
                <span className="font-medium text-slate-900 dark:text-white">0.8%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Coverage Ratio</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">142%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Alerts Section */}
      <Card className="dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-red-500" />
                Top Risk Alerts
              </CardTitle>
              <CardDescription>Applications flagged for manual review</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="dark:border-slate-700 dark:hover:bg-slate-800">
              View All Alerts
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow className="dark:border-slate-700 hover:dark:bg-slate-800/80">
                  <TableHead>Applicant</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-center">Risk Score</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow key={alert.id} className="dark:border-slate-700 hover:dark:bg-slate-800/50">
                    <TableCell className="font-medium">{alert.applicantName}</TableCell>
                    <TableCell className="font-mono text-sm">{alert.phone}</TableCell>
                    <TableCell className="text-center">
                      <span className={`font-bold ${
                        alert.riskScore < 300 ? 'text-red-600 dark:text-red-400' :
                        alert.riskScore < 450 ? 'text-orange-600 dark:text-orange-400' :
                        alert.riskScore < 650 ? 'text-amber-600 dark:text-amber-400' :
                        'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {alert.riskScore}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={
                          alert.riskGrade === 'A+' || alert.riskGrade === 'A' ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400' :
                          alert.riskGrade === 'B+' || alert.riskGrade === 'B' ? 'border-lime-500 text-lime-700 dark:text-lime-400' :
                          alert.riskGrade === 'C' ? 'border-amber-500 text-amber-700 dark:text-amber-400' :
                          'border-red-500 text-red-700 dark:text-red-400'
                        }
                      >
                        {alert.riskGrade}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      KSh {alert.loanAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-slate-600 dark:text-slate-400">
                      {alert.reason}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {getTimeAgo(alert.timestamp)}
                    </TableCell>
                    <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="dark:hover:bg-slate-800">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Alert Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t dark:border-slate-700">
            <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">12</p>
              <p className="text-xs text-red-600/70 dark:text-red-400/70">Critical</p>
            </div>
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">34</p>
              <p className="text-xs text-orange-600/70 dark:text-orange-400/70">High Priority</p>
            </div>
            <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">67</p>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70">Pending Review</p>
            </div>
            <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">89%</p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Resolved Today</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export type { RiskAlert, RiskGradeData, RiskKPI }
