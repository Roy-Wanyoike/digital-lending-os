'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Eye,
  Users,
  HandCoins,
  TrendingUp,
  FileText,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Download
} from 'lucide-react'

// Types
interface DashboardMetric {
  label: string
  value: string
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
  icon: React.ReactNode
}

interface RecentActivity {
  id: string
  type: 'loan' | 'payment' | 'application' | 'customer'
  description: string
  timestamp: string
}

// Demo Data
const DASHBOARD_METRICS: DashboardMetric[] = [
  { 
    label: 'Total Customers', 
    value: '8,231', 
    change: '+12%', 
    changeType: 'positive',
    icon: <Users className="w-5 h-5 text-blue-600" />
  },
  { 
    label: 'Active Loans', 
    value: '842', 
    change: '+5%', 
    changeType: 'positive',
    icon: <HandCoins className="w-5 h-5 text-emerald-600" />
  },
  { 
    label: 'Loan Portfolio', 
    value: 'KSh 2.4B', 
    change: '+8%', 
    changeType: 'positive',
    icon: <TrendingUp className="w-5 h-5 text-purple-600" />
  },
  { 
    label: 'Collection Rate', 
    value: '94.2%', 
    change: '+0.3%', 
    changeType: 'positive',
    icon: <CheckCircle2 className="w-5 h-5 text-green-600" />
  },
]

const RECENT_ACTIVITY: RecentActivity[] = [
  { id: '1', type: 'loan', description: 'New loan disbursed to Mary W. - KSh 25,000', timestamp: '5 min ago' },
  { id: '2', type: 'payment', description: 'Payment received from John O. - KSh 15,000', timestamp: '15 min ago' },
  { id: '3', type: 'application', description: 'New application submitted by Peter K.', timestamp: '30 min ago' },
  { id: '4', type: 'customer', description: 'New customer registered - Grace A.', timestamp: '1 hr ago' },
  { id: '5', type: 'loan', description: 'Loan APP-2026-0840 fully repaid', timestamp: '2 hrs ago' },
  { id: '6', type: 'payment', description: 'Bulk payment processed - KSh 125,000', timestamp: '3 hrs ago' },
]

const PORTFOLIO_SUMMARY = [
  { category: 'Performing', count: 789, percentage: 93.7, color: 'text-emerald-600 bg-emerald-50' },
  { category: 'Watchlist', count: 35, percentage: 4.2, color: 'text-yellow-600 bg-yellow-50' },
  { category: 'Overdue (1-30 days)', count: 14, percentage: 1.7, color: 'text-orange-600 bg-orange-50' },
  { category: 'Overdue (30+ days)', count: 4, percentage: 0.5, color: 'text-red-600 bg-red-50' },
]

interface ViewerWorkspaceProps {
  tenantId: string
  userId: string
  userName?: string
}

export function ViewerWorkspace({ 
  tenantId, 
  userId, 
  userName = 'Viewer User' 
}: ViewerWorkspaceProps) {
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Eye className="w-8 h-8 text-gray-600" />
            Dashboard View
          </h1>
          <p className="text-muted-foreground mt-1">Welcome, {userName} • Read-only access</p>
        </div>
        <Badge variant="outline" className="gap-1 px-3 py-1">
          <Eye className="w-3 h-3" />
          View Only Mode
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {DASHBOARD_METRICS.map((metric) => (
          <Card key={metric.label} className="bg-gradient-to-br from-gray-50 to-white border-gray-100">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-2">
                {metric.icon}
                <span className={`text-xs font-medium flex items-center gap-1 ${
                  metric.changeType === 'positive' ? 'text-emerald-600' : 
                  metric.changeType === 'negative' ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {metric.change}
                </span>
              </div>
              <p className="text-2xl font-bold">{metric.value}</p>
              <p className="text-sm text-muted-foreground">{metric.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Portfolio Summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Portfolio Summary
            </CardTitle>
            <CardDescription>Loan status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {PORTFOLIO_SUMMARY.map((item) => (
                <div key={item.category} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        item.category === 'Performing' ? 'bg-emerald-500' :
                        item.category === 'Watchlist' ? 'bg-yellow-500' :
                        item.category.includes('1-30') ? 'bg-orange-500' : 'bg-red-500'
                      }`} />
                      <span>{item.category}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{item.count} loans</span>
                      <Badge variant="outline" className={item.color}>
                        {item.percentage}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </div>
              ))}
            </div>

            <Separator className="my-6" />

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xl font-bold text-blue-600">KSh 2.4B</p>
                <p className="text-xs text-muted-foreground">Total Portfolio</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <p className="text-xl font-bold text-emerald-600">KSh 180M</p>
                <p className="text-xs text-muted-foreground">Disbursed This Month</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-xl font-bold text-purple-600">KSh 45M</p>
                <p className="text-xs text-muted-foreground">Collected This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity & Quick Actions */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {RECENT_ACTIVITY.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors">
                    <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                      activity.type === 'loan' ? 'bg-blue-500' :
                      activity.type === 'payment' ? 'bg-emerald-500' :
                      activity.type === 'application' ? 'bg-purple-500' :
                      'bg-gray-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Available Actions */}
          <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-100">
            <CardHeader>
              <CardTitle className="text-lg">Available Actions</CardTitle>
              <CardDescription>Read-only mode limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-2" disabled>
                <Download className="w-4 h-4" />
                Export Reports
                <Badge variant="secondary" className="ml-auto">Allowed</Badge>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" disabled>
                <FileText className="w-4 h-4" />
                View Reports
                <Badge variant="secondary" className="ml-auto">Allowed</Badge>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 opacity-50 cursor-not-allowed">
                <Users className="w-4 h-4" />
                Manage Staff
                <Badge variant="destructive" className="ml-auto">Restricted</Badge>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 opacity-50 cursor-not-allowed">
                <HandCoins className="w-4 h-4" />
                Process Loans
                <Badge variant="destructive" className="ml-auto">Restricted</Badge>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* System Status Banner */}
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="font-medium text-emerald-800">All Systems Operational</p>
              <p className="text-sm text-emerald-700">Last updated: Just now</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-100">
            <ArrowUpRight className="w-3 h-3" />
            View Details
          </Button>
        </CardContent>
      </Card>

      {/* Info Note */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800">View-Only Access Mode</p>
              <p className="text-sm text-blue-700 mt-1">
                You currently have read-only access to this workspace. This means you can view all dashboard data and reports,
                but cannot make changes or perform actions that modify data. Contact your administrator if you need elevated permissions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
