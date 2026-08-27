'use client'

import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  Users, 
  DollarSign, 
  Activity,
  FileText,
  Download,
  RefreshCw,
  Calendar,
  Filter,
  Settings,
  Bell,
  Loader2
} from 'lucide-react'

// Import report components
import { PortfolioReport } from './PortfolioReport'
import { CustomerReport } from './CustomerReport'
import { FinancialReport } from './FinancialReport'
import { OperationalReport } from './OperationalReport'
import { CustomReportBuilder } from './CustomReportBuilder'
import { ReportExporter } from './ReportExporter'

// Types for report data
interface PortfolioData {
  overview: any
  disbursementTrend: any[]
  repaymentTrend: any[]
  parAnalysis: any
  portfolioByProduct: any[]
  portfolioByRisk: any[]
  vintageAnalysis: any[]
}

interface CustomerData {
  overview: any
  acquisition: any[]
  segmentation: any
  behavior: any
  geography: any[]
}

interface FinancialData {
  revenue: any
  expenses: any
  profitability: any
  metrics: any
  incomeStatement: any[]
  trends: any[]
}

interface OperationalData {
  applications: any
  kyc: any
  payments: any
  staffPerformance: any[]
}

interface ReportsDashboardProps {
  tenantId?: string
  compact?: boolean
}

export function ReportsDashboard({ tenantId = 'default-tenant', compact = false }: ReportsDashboardProps) {
  const [activeTab, setActiveTab] = useState('portfolio')
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  
  // Report data states
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null)
  const [customerData, setCustomerData] = useState<CustomerData | null>(null)
  const [financialData, setFinancialData] = useState<FinancialData | null>(null)
  const [operationalData, setOperationalData] = useState<OperationalData | null>(null)

  // Export dialog state
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportTab, setExportTab] = useState('portfolio')

  // Fetch all report data on mount
  useEffect(() => {
    fetchAllReports()
  }, [tenantId])

  const fetchAllReports = async () => {
    setIsLoading(true)
    
    try {
      // Fetch all reports in parallel
      const [portfolioRes, customerRes, financialRes, operationalRes] = await Promise.all([
        fetch(`/api/reports/portfolio?tenantId=${tenantId}&period=monthly`),
        fetch(`/api/reports/customer?tenantId=${tenantId}`),
        fetch(`/api/reports/financial?tenantId=${tenantId}&period=monthly`),
        fetch(`/api/reports/operational?tenantId=${tenantId}`)
      ])

      if (portfolioRes.ok) {
        const portfolioJson = await portfolioRes.json()
        setPortfolioData(portfolioJson.data)
      }

      if (customerRes.ok) {
        const customerJson = await customerRes.json()
        setCustomerData(customerJson.data)
      }

      if (financialRes.ok) {
        const financialJson = await financialRes.json()
        setFinancialData(financialJson.data)
      }

      if (operationalRes.ok) {
        const operationalJson = await operationalRes.json()
        setOperationalData(operationalJson.data)
      }

      setLastRefreshed(new Date())
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchAllReports()
  }

  const handleExport = (tabType: string) => {
    setExportTab(tabType)
    setShowExportDialog(true)
  }

  if (compact) {
    return (
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-slate-100 dark:bg-slate-800">
            <TabsTrigger value="portfolio" className="text-xs py-2 px-2">
              <BarChart3 className="w-3 h-3 mr-1" />
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="customer" className="text-xs py-2 px-2">
              <Users className="w-3 h-3 mr-1" />
              Customer
            </TabsTrigger>
            <TabsTrigger value="financial" className="text-xs py-2 px-2">
              <DollarSign className="w-3 h-3 mr-1" />
              Financial
            </TabsTrigger>
            <TabsTrigger value="operational" className="text-xs py-2 px-2">
              <Activity className="w-3 h-3 mr-1" />
              Operations
            </TabsTrigger>
            <TabsTrigger value="custom" className="text-xs py-2 px-2">
              <FileText className="w-3 h-3 mr-1" />
              Custom
            </TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="mt-4">
            {isLoading ? <LoadingState /> : portfolioData && <PortfolioReport data={portfolioData} compact />}
          </TabsContent>
          <TabsContent value="customer" className="mt-4">
            {isLoading ? <LoadingState /> : customerData && <CustomerReport data={customerData} compact />}
          </TabsContent>
          <TabsContent value="financial" className="mt-4">
            {isLoading ? <LoadingState /> : financialData && <FinancialReport data={financialData} compact />}
          </TabsContent>
          <TabsContent value="operational" className="mt-4">
            {isLoading ? <LoadingState /> : operationalData && <OperationalReport data={operationalData} compact />}
          </TabsContent>
          <TabsContent value="custom" className="mt-4">
            <CustomReportBuilder tenantId={tenantId} />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-emerald-600" />
            Reports & Analytics
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Comprehensive insights into your lending operations
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleExport(activeTab)}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          
          <Badge variant="secondary" className="text-xs">
            Last updated: {lastRefreshed.toLocaleTimeString()}
          </Badge>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-slate-100 dark:bg-slate-800 p-1 h-auto">
          <TabsTrigger 
            value="portfolio"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-3 px-4"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            <span>Portfolio</span>
          </TabsTrigger>
          <TabsTrigger 
            value="customer"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-3 px-4"
          >
            <Users className="w-4 h-4 mr-2" />
            <span>Customer</span>
          </TabsTrigger>
          <TabsTrigger 
            value="financial"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-3 px-4"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            <span>Financial</span>
          </TabsTrigger>
          <TabsTrigger 
            value="operational"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-3 px-4"
          >
            <Activity className="w-4 h-4 mr-2" />
            <span>Operational</span>
          </TabsTrigger>
          <TabsTrigger 
            value="custom"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-3 px-4"
          >
            <FileText className="w-4 h-4 mr-2" />
            <span>Custom</span>
          </TabsTrigger>
        </TabsList>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="space-y-6">
          {isLoading ? (
            <LoadingState />
          ) : portfolioData ? (
            <PortfolioReport data={portfolioData} />
          ) : (
            <ErrorState onRetry={fetchAllReports} />
          )}
        </TabsContent>

        {/* Customer Tab */}
        <TabsContent value="customer" className="space-y-6">
          {isLoading ? (
            <LoadingState />
          ) : customerData ? (
            <CustomerReport data={customerData} />
          ) : (
            <ErrorState onRetry={fetchAllReports} />
          )}
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-6">
          {isLoading ? (
            <LoadingState />
          ) : financialData ? (
            <FinancialReport data={financialData} />
          ) : (
            <ErrorState onRetry={fetchAllReports} />
          )}
        </TabsContent>

        {/* Operational Tab */}
        <TabsContent value="operational" className="space-y-6">
          {isLoading ? (
            <LoadingState />
          ) : operationalData ? (
            <OperationalReport data={operationalData} />
          ) : (
            <ErrorState onRetry={fetchAllReports} />
          )}
        </TabsContent>

        {/* Custom Report Builder Tab */}
        <TabsContent value="custom" className="space-y-6">
          <CustomReportBuilder tenantId={tenantId} />
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      {showExportDialog && (
        <ReportExporter
          open={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          reportType={exportTab}
          data={
            exportTab === 'portfolio' ? portfolioData :
            exportTab === 'customer' ? customerData :
            exportTab === 'financial' ? financialData :
            exportTab === 'operational' ? operationalData : null
          }
        />
      )}

      {/* Alerts Section */}
      {(portfolioData?.alerts || operationalData?.alerts || financialData?.alerts) && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-600" />
              Active Alerts & Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...(portfolioData?.alerts || []), ...(operationalData?.alerts || []), ...(financialData?.alerts || [])]
                .slice(0, 5)
                .map((alert: any, index: number) => (
                  <div 
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-lg ${
                      alert.type === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30' :
                      alert.type === 'danger' ? 'bg-red-100 dark:bg-red-900/30' :
                      alert.type === 'success' ? 'bg-green-100 dark:bg-green-900/30' :
                      'bg-blue-100 dark:bg-blue-900/30'
                    }`}
                  >
                    <Badge variant="outline" className={`shrink-0 mt-0.5 ${
                      alert.type === 'warning' ? 'border-amber-500 text-amber-700 dark:text-amber-400' :
                      alert.type === 'danger' ? 'border-red-500 text-red-700 dark:text-red-400' :
                      alert.type === 'success' ? 'border-green-500 text-green-700 dark:text-green-400' :
                      'border-blue-500 text-blue-700 dark:text-blue-400'
                    }`}>
                      {alert.metric || alert.title}
                    </Badge>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{alert.message}</p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================
// LOADING STATE COMPONENT
// ============================================

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
      <p className="text-slate-500 dark:text-slate-400">Loading report data...</p>
      <p className="text-xs text-slate-400">This may take a moment for large datasets</p>
    </div>
  )
}

// ============================================
// ERROR STATE COMPONENT
// ============================================

interface ErrorStateProps {
  onRetry: () => void
}

function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
      <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <Activity className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Failed to Load Data
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md">
          We couldn&apos;t load the report data. This might be due to a network issue or server error.
        </p>
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  )
}

export default ReportsDashboard
