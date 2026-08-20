'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  BarChart3,
  DollarSign,
  Users,
  AlertTriangle,
  TrendingUp,
  FileText,
  Calendar,
  Download,
  Clock,
  Star,
  Search,
  Filter,
  Bell,
  Settings,
  ChevronRight,
  Sparkles,
  Shield,
  Building2,
  PieChart,
  Activity,
  Target,
  FileSpreadsheet,
  FileDown,
  RefreshCw,
  Plus
} from 'lucide-react'

// Import report components
import { PortfolioQualityReport } from './PortfolioQualityReport'
import { DisbursementAnalytics } from './DisbursementAnalytics'
import { CustomerSegmentationReport } from './CustomerSegmentationReport'
import { FinancialPerformanceReport } from './FinancialPerformanceReport'
import { OperationalMetricsReport } from './OperationalMetricsReport'
import { RegulatoryReportGenerator } from './RegulatoryReportGenerator'
import { ReportScheduler } from './ReportScheduler'

// Types
interface ReportCategory {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  color: string
  count: number
  tags: string[]
}

interface RecentReport {
  id: string
  name: string
  category: string
  generatedAt: Date
  status: 'ready' | 'generating' | 'failed'
  format: string
  size?: string
}

interface ScheduledReport {
  id: string
  name: string
  frequency: string
  nextRun: Date
  recipients: number
  status: 'active' | 'paused'
}

// Mock Data
const reportCategories: ReportCategory[] = [
  {
    id: 'portfolio',
    name: 'Portfolio Reports',
    description: 'Loan portfolio quality, PAR analysis, vintage performance',
    icon: <BarChart3 className="w-6 h-6" />,
    color: 'from-emerald-500 to-teal-600',
    count: 12,
    tags: ['PAR', 'Vintage', 'Aging', 'Provisions']
  },
  {
    id: 'financial',
    name: 'Financial Reports',
    description: 'Revenue, expenses, profitability, cash flow analysis',
    icon: <DollarSign className="w-6 h-6" />,
    color: 'from-blue-500 to-indigo-600',
    count: 8,
    tags: ['P&L', 'Revenue', 'Expenses', 'Margins']
  },
  {
    id: 'customer',
    name: 'Customer Analytics',
    description: 'Demographics, segmentation, acquisition, retention',
    icon: <Users className="w-6 h-6" />,
    color: 'from-purple-500 to-violet-600',
    count: 10,
    tags: ['Segments', 'NPS', 'Churn', 'CAC']
  },
  {
    id: 'risk',
    name: 'Risk & Credit Reports',
    description: 'Credit risk assessment, exposure analysis, defaults',
    icon: <AlertTriangle className="w-6 h-6" />,
    color: 'from-red-500 to-orange-600',
    count: 7,
    tags: ['Credit Score', 'Exposure', 'Defaults']
  },
  {
    id: 'operations',
    name: 'Operations Reports',
    description: 'Processing metrics, collections efficiency, staff productivity',
    icon: <Activity className="w-6 h-6" />,
    color: 'from-amber-500 to-yellow-600',
    count: 9,
    tags: ['Processing', 'Collections', 'Staff KPIs']
  },
  {
    id: 'regulatory',
    name: 'Regulatory Reports',
    description: 'CBK compliance, prudential returns, AML reporting',
    icon: <Shield className="w-6 h-6" />,
    color: 'from-slate-600 to-slate-800',
    count: 15,
    tags: ['CBK', 'AML', 'Prudential', 'Compliance']
  }
]

const recentReports: RecentReport[] = [
  {
    id: '1',
    name: 'Monthly Portfolio Quality Report',
    category: 'portfolio',
    generatedAt: new Date(Date.now() - 3600000),
    status: 'ready',
    format: 'PDF',
    size: '2.4 MB'
  },
  {
    id: '2',
    name: 'PAR Analysis - December 2025',
    category: 'portfolio',
    generatedAt: new Date(Date.now() - 86400000),
    status: 'ready',
    format: 'Excel',
    size: '1.8 MB'
  },
  {
    id: '3',
    name: 'Customer Segmentation Q4 2025',
    category: 'customer',
    generatedAt: new Date(Date.now() - 172800000),
    status: 'ready',
    format: 'PDF',
    size: '3.1 MB'
  },
  {
    id: '4',
    name: 'CBK Monthly Returns - Dec 2025',
    category: 'regulatory',
    generatedAt: new Date(Date.now() - 259200000),
    status: 'ready',
    format: 'Excel',
    size: '856 KB'
  },
  {
    id: '5',
    name: 'Financial Performance Summary',
    category: 'financial',
    generatedAt: new Date(),
    status: 'generating',
    format: 'PDF'
  }
]

const scheduledReports: ScheduledReport[] = [
  {
    id: '1',
    name: 'Weekly Portfolio Summary',
    frequency: 'Weekly',
    nextRun: new Date(Date.now() + 86400000 * 2),
    recipients: 5,
    status: 'active'
  },
  {
    id: '2',
    name: 'Monthly PAR Report',
    frequency: 'Monthly',
    nextRun: new Date(Date.now() + 86400000 * 15),
    recipients: 3,
    status: 'active'
  },
  {
    id: '3',
    name: 'CBK Prudential Returns',
    frequency: 'Monthly',
    nextRun: new Date(Date.now() + 86400000 * 18),
    recipients: 2,
    status: 'active'
  },
  {
    id: '4',
    name: 'Daily Disbursement Report',
    frequency: 'Daily',
    nextRun: new Date(Date.now() + 3600000 * 8),
    recipients: 8,
    status: 'paused'
  }
]

const favoriteReports = [
  'Monthly Portfolio Quality Report',
  'PAR Analysis Dashboard',
  'Customer Segmentation Overview',
  'CBK Monthly Returns Template'
]

export function ReportsHub({ tenantId = 'default' }: { tenantId?: string }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [dateRange, setDateRange] = useState('last30days')
  const [exportFormat, setExportFormat] = useState('pdf')
  const [searchQuery, setSearchQuery] = useState('')
  const [showScheduler, setShowScheduler] = useState(false)
  const [activeTab, setActiveTab] = useState('hub')

  const filteredCategories = selectedCategory === 'all' 
    ? reportCategories 
    : reportCategories.filter(c => c.id === selectedCategory)

  const filteredRecentReports = recentReports.filter(report =>
    report.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
              <FileText className="w-6 h-6" />
            </div>
            Reports & Analytics Hub
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 ml-14">
            Comprehensive reporting suite for Kenya DCP operations
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Global Date Range Selector */}
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="last7days">Last 7 Days</SelectItem>
              <SelectItem value="last30days">Last 30 Days</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="thisQuarter">This Quarter</SelectItem>
              <SelectItem value="thisYear">This Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {/* Export Format Selector */}
          <Select value={exportFormat} onValueChange={setExportFormat}>
            <SelectTrigger className="w-[120px]">
              <Download className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
            </SelectContent>
          </Select>

          {/* Schedule Report Button */}
          <Dialog open={showScheduler} onOpenChange={setShowScheduler}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                Schedule Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Report Scheduler</DialogTitle>
                <DialogDescription>
                  Create and manage scheduled reports for automatic delivery
                </DialogDescription>
              </DialogHeader>
              <ReportScheduler onClose={() => setShowScheduler(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 bg-slate-100 dark:bg-slate-800 p-1 h-auto">
          <TabsTrigger value="hub" className="gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5 px-3">
            <BarChart3 className="w-4 h-4 hidden sm:block" />
            <span className="hidden md:inline">Hub</span>
            <span className="md:hidden">All</span>
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5 px-3">
            <PieChart className="w-4 h-4 hidden sm:block" />
            <span className="hidden sm:inline">Portfolio</span>
          </TabsTrigger>
          <TabsTrigger value="disbursements" className="gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5 px-3">
            <TrendingUp className="w-4 h-4 hidden sm:block" />
            <span className="hidden sm:inline">Disbursements</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5 px-3">
            <Users className="w-4 h-4 hidden sm:block" />
            <span className="hidden sm:inline">Customers</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5 px-3">
            <DollarSign className="w-4 h-4 hidden sm:block" />
            <span className="hidden sm:inline">Financial</span>
          </TabsTrigger>
          <TabsTrigger value="operations" className="gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5 px-3">
            <Activity className="w-4 h-4 hidden sm:block" />
            <span className="hidden sm:inline">Operations</span>
          </TabsTrigger>
          <TabsTrigger value="regulatory" className="gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5 px-3">
            <Shield className="w-4 h-4 hidden sm:block" />
            <span className="hidden sm:inline">Regulatory</span>
          </TabsTrigger>
          <TabsTrigger value="scheduler" className="gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5 px-3">
            <Clock className="w-4 h-4 hidden sm:block" />
            <span className="hidden sm:inline">Scheduler</span>
          </TabsTrigger>
        </TabsList>

        {/* Hub Tab Content */}
        <TabsContent value="hub" className="mt-6 space-y-6">
          {/* Quick Stats Banner */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Total Reports</p>
                    <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">61</p>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                    <FileText className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Generated Today</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">12</p>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                    <RefreshCw className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Scheduled</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">{scheduledReports.filter(s => s.status === 'active').length}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Favorites</p>
                    <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-1">{favoriteReports.length}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                    <Star className="w-5 h-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Report Categories Grid */}
          <section>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Report Categories
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportCategories.map((category) => (
                <Card 
                  key={category.id}
                  className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700"
                  onClick={() => {
                    setSelectedCategory(category.id)
                    setActiveTab(category.id === 'portfolio' ? 'portfolio' : 
                               category.id === 'financial' ? 'financial' :
                               category.id === 'customer' ? 'customers' :
                               category.id === 'operations' ? 'operations' :
                               category.id === 'regulatory' ? 'regulatory' :
                               category.id === 'risk' ? 'portfolio' : 'hub')
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${category.color} text-white shadow-lg mb-3`}>
                      {category.icon}
                    </div>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base group-hover:text-emerald-600 transition-colors">
                        {category.name}
                      </CardTitle>
                      <Badge variant="secondary" className="shrink-0">
                        {category.count}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm">
                      {category.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-1.5">
                      {category.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center text-xs text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      View reports <ChevronRight className="w-3 h-3 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Recent & Scheduled Reports Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recently Generated Reports */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    Recently Generated
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs">
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredRecentReports.slice(0, 5).map((report) => (
                    <div 
                      key={report.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 ${
                          report.format === 'PDF' ? 'bg-red-100 text-red-600' :
                          report.format === 'Excel' ? 'bg-green-100 text-green-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {report.format === 'PDF' ? <FileDown className="w-4 h-4" /> :
                           report.format === 'Excel' ? <FileSpreadsheet className="w-4 h-4" /> :
                           <FileText className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                            {report.name}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-2">
                            <span>{formatDate(report.generatedAt)}</span>
                            {report.size && <span>• {report.size}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {report.status === 'ready' && (
                          <>
                            <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-600">
                              Ready
                            </Badge>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Download className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {report.status === 'generating' && (
                          <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                            Generating
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Scheduled Reports */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bell className="w-4 h-4 text-slate-500" />
                    Scheduled Reports
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs"
                    onClick={() => setShowScheduler(true)}
                  >
                    Manage
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scheduledReports.map((schedule) => (
                    <div 
                      key={schedule.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 ${
                          schedule.status === 'active' 
                            ? 'bg-emerald-100 text-emerald-600' 
                            : 'bg-slate-200 text-slate-500'
                        }`}>
                          <Clock className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                            {schedule.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {schedule.frequency} • Next: {schedule.nextRun.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            schedule.status === 'active' 
                              ? 'border-emerald-500 text-emerald-600' 
                              : 'border-slate-400 text-slate-500'
                          }`}
                        >
                          {schedule.recipients} recipient{schedule.recipients > 1 ? 's' : ''}
                        </Badge>
                        <Badge 
                          variant={schedule.status === 'active' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {schedule.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Favorite Reports */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                Favorite Reports
              </CardTitle>
              <CardDescription>Quick access to your most-used reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {favoriteReports.map((name, index) => (
                  <Button 
                    key={index}
                    variant="outline" 
                    className="justify-start h-auto py-3 px-4"
                  >
                    <Star className="w-4 h-4 mr-2 text-amber-500 shrink-0" />
                    <span className="truncate text-left">{name}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="mt-6">
          <PortfolioQualityReport dateRange={dateRange} exportFormat={exportFormat} />
        </TabsContent>

        {/* Disbursements Tab */}
        <TabsContent value="disbursements" className="mt-6">
          <DisbursementAnalytics dateRange={dateRange} exportFormat={exportFormat} />
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="mt-6">
          <CustomerSegmentationReport dateRange={dateRange} exportFormat={exportFormat} />
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="mt-6">
          <FinancialPerformanceReport dateRange={dateRange} exportFormat={exportFormat} />
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="mt-6">
          <OperationalMetricsReport dateRange={dateRange} exportFormat={exportFormat} />
        </TabsContent>

        {/* Regulatory Tab */}
        <TabsContent value="regulatory" className="mt-6">
          <RegulatoryReportGenerator dateRange={dateRange} exportFormat={exportFormat} />
        </TabsContent>

        {/* Scheduler Tab */}
        <TabsContent value="scheduler" className="mt-6">
          <ReportScheduler />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ReportsHub
