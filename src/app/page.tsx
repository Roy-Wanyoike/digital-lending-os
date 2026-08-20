'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  History,
  Bell,
  User,
  FolderOpen,
  Calculator,
  Sparkles,
  Shield,
  ArrowRight,
  ClipboardCheck,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Activity,
  BarChart3,
  Users,
  Phone,
  Target
} from 'lucide-react'

// Import all customer portal components
import { EnhancedLoanWizard } from '@/components/lending-os/customer/EnhancedLoanWizard'
import { EnhancedLoanCalculator } from '@/components/lending-os/customer/EnhancedLoanCalculator'
import { CustomerHome } from '@/components/lending-os/customer/CustomerHome'
import { PaymentCenter } from '@/components/lending-os/customer/PaymentCenter'
import { PaymentHistory } from '@/components/lending-os/customer/PaymentHistory'
import { RepaymentSchedule } from '@/components/lending-os/customer/CustomerRepaymentSchedule'
import { NotificationCenter } from '@/components/lending-os/customer/NotificationCenter'
import { CustomerProfile } from '@/components/lending-os/customer/CustomerProfile'
import { DocumentsHub } from '@/components/lending-os/customer/DocumentsHub'

// Import underwriting components
import { ApplicationReviewDashboard } from '@/components/lending-os/underwriting'

// Import collections components
import { CollectionsDashboard } from '@/components/lending-os/collections'

// Import risk & credit components
import { RiskDashboard } from '@/components/lending-os/risk'

// Import customer profile (full)
import { CustomerProfilePage } from '@/components/lending-os/customers'

// Import finance components
import { FinanceDashboard } from '@/components/lending-os/finance'

// Import provider health components
import { ProviderHealthDashboard } from '@/components/lending-os/providers'

// Import reports & analytics
import { ReportsHub } from '@/components/lending-os/reports'

export default function CustomerPortalPage() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Digital Lending OS
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Customer Self-Service Portal
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-600 dark:text-emerald-400">
                <Sparkles className="h-3 w-3 mr-1" />
                Enhanced Portal v2.0
              </Badge>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                Demo Mode
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Feature Highlights */}
        <div className="mb-8 p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl text-white shadow-xl shadow-emerald-500/20">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                🎉 Welcome to Your Enhanced Customer Portal!
              </h2>
              <p className="text-emerald-100 max-w-2xl">
                Experience our completely redesigned self-service platform with enhanced loan applications, 
                seamless payments, and comprehensive account management - all designed for Kenyan borrowers.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                <FileText className="w-4 h-4" />
                <span className="text-sm">Smart Applications</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                <CreditCard className="w-4 h-4" />
                <span className="text-sm">M-Pesa Payments</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                <Bell className="w-4 h-4" />
                <span className="text-sm">Real-time Updates</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-16 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl h-auto">
            {/* Customer Portal Tabs */}
            <TabsTrigger 
              value="dashboard" 
              className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md dark:data-[state=active]:bg-slate-900"
            >
              <LayoutDashboard className="w-4 h-4 hidden sm:block" />
              <span>Home</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="apply" 
              className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md dark:data-[state=active]:bg-slate-900"
            >
              <FileText className="w-4 h-4 hidden sm:block" />
              <span>Apply</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="calculator" 
              className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md dark:data-[state=active]:bg-slate-900"
            >
              <Calculator className="w-4 h-4 hidden sm:block" />
              <span>Calculate</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="payments" 
              className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md dark:data-[state=active]:bg-slate-900"
            >
              <CreditCard className="w-4 h-4 hidden sm:block" />
              <span>Pay</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="history" 
              className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md dark:data-[state=active]:bg-slate-900"
            >
              <History className="w-4 h-4 hidden sm:block" />
              <span>History</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="schedule" 
              className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md dark:data-[state=active]:bg-slate-900"
            >
              <CalendarIcon className="w-4 h-4 hidden sm:block" />
              <span>Schedule</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="notifications" 
              className="gap-2 relative data-[state=active]:bg-white data-[state=active]:shadow-md dark:data-[state=active]:bg-slate-900"
            >
              <Bell className="w-4 h-4 hidden sm:block" />
              <span>Alerts</span>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full" title="3 new notifications" />
            </TabsTrigger>
            
            <TabsTrigger 
              value="documents" 
              className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md dark:data-[state=active]:bg-slate-900"
            >
              <FolderOpen className="w-4 h-4 hidden sm:block" />
              <span>Docs</span>
            </TabsTrigger>
            
            {/* Staff/Admin Portal Tabs */}
            <div className="col-span-3 md:col-span-5 lg:col-span-8 xl:col-span-8 px-2 py-1 text-xs font-semibold text-slate-400 bg-slate-200/50 dark:bg-slate-700/50 rounded-lg flex items-center justify-center">
              <Shield className="w-3 h-3 mr-1" /> Staff Portal
            </div>
            
            <TabsTrigger 
              value="underwriting" 
              className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md dark:data-[state=active]:bg-slate-900"
            >
              <ClipboardCheck className="w-4 h-4 hidden sm:block" />
              <span>Underwriting</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="collections" 
              className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md dark:data-[state=active]:bg-slate-900"
            >
              <Phone className="w-4 h-4 hidden sm:block" />
              <span>Collections</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="risk" 
              className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md dark:data-[state=active]:bg-slate-900"
            >
              <AlertTriangle className="w-4 h-4 hidden sm:block" />
              <span>Risk & Credit</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="customer-profile" 
              className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md dark:data-[state=active]:bg-slate-900"
            >
              <Users className="w-4 h-4 hidden sm:block" />
              <span>Customers</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="finance" 
              className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md dark:data-[state=active]:bg-slate-900"
            >
              <DollarSign className="w-4 h-4 hidden sm:block" />
              <span>Finance</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="providers" 
              className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md dark:data-[state=active]:bg-slate-900"
            >
              <Activity className="w-4 h-4 hidden sm:block" />
              <span>Providers</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="reports" 
              className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md dark:data-[state=active]:bg-slate-900"
            >
              <BarChart3 className="w-4 h-4 hidden sm:block" />
              <span>Reports</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-6">
            <CustomerHome />
          </TabsContent>

          {/* Loan Application Wizard Tab */}
          <TabsContent value="apply" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                  <FileText className="w-6 h-6 text-emerald-600" />
                </div>
                Loan Application Wizard
              </h2>
              <p className="text-muted-foreground mt-1">
                Complete our guided application process in just a few minutes
              </p>
            </div>
            <EnhancedLoanWizard />
          </TabsContent>

          {/* Loan Calculator Tab */}
          <TabsContent value="calculator" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                  <Calculator className="w-6 h-6 text-blue-600" />
                </div>
                Smart Loan Calculator
              </h2>
              <p className="text-muted-foreground mt-1">
                Calculate your loan repayments and see the full cost breakdown
              </p>
            </div>
            <EnhancedLoanCalculator 
              onApply={(data) => {
                console.log('Applying for loan:', data)
                setActiveTab('apply')
              }} 
            />
          </TabsContent>

          {/* Payment Center Tab */}
          <TabsContent value="payments" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
                  <CreditCard className="w-6 h-6 text-green-600" />
                </div>
                Payment Center
              </h2>
              <p className="text-muted-foreground mt-1">
                Make payments via M-Pesa, Bank Transfer, or Card
              </p>
            </div>
            <PaymentCenter />
          </TabsContent>

          {/* Payment History Tab */}
          <TabsContent value="history" className="mt-6">
            <PaymentHistory />
          </TabsContent>

          {/* Repayment Schedule Tab */}
          <TabsContent value="schedule" className="mt-6">
            <RepaymentSchedule />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-6">
            <NotificationCenter />
          </TabsContent>

          {/* Documents Hub Tab */}
          <TabsContent value="documents" className="mt-6">
            <DocumentsHub />
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-6">
            <CustomerProfile />
          </TabsContent>

          {/* Underwriting / Loan Review Tab */}
          <TabsContent value="underwriting" className="mt-6">
            <ApplicationReviewDashboard />
          </TabsContent>

          {/* Collections Module Tab */}
          <TabsContent value="collections" className="mt-6">
            <CollectionsDashboard />
          </TabsContent>

          {/* Risk & Credit Management Tab */}
          <TabsContent value="risk" className="mt-6">
            <RiskDashboard />
          </TabsContent>

          {/* Full Customer Profile Tab */}
          <TabsContent value="customer-profile" className="mt-6">
            <CustomerProfilePage />
          </TabsContent>

          {/* Financial Management Tab */}
          <TabsContent value="finance" className="mt-6">
            <FinanceDashboard />
          </TabsContent>

          {/* Provider Health Monitoring Tab */}
          <TabsContent value="providers" className="mt-6">
            <ProviderHealthDashboard />
          </TabsContent>

          {/* Reports & Analytics Tab */}
          <TabsContent value="reports" className="mt-6">
            <ReportsHub />
          </TabsContent>
        </Tabs>

        {/* API Endpoints Reference */}
        <Card className="mt-12 border-dashed">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CodeIcon className="w-5 h-5" />
              Available API Endpoints
            </CardTitle>
            <CardDescription>
              RESTful APIs for the Customer Portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <EndpointCard 
                method="POST" 
                path="/api/customer/applications" 
                description="Submit loan application"
                color="green"
              />
              <EndpointCard 
                method="GET" 
                path="/api/customer/applications" 
                description="Get application history"
                color="blue"
              />
              <EndpointCard 
                method="POST" 
                path="/api/customer/payments" 
                description="Initiate payment"
                color="green"
              />
              <EndpointCard 
                method="GET" 
                path="/api/customer/payments" 
                description="Payment history"
                color="blue"
              />
              <EndpointCard 
                method="GET" 
                path="/api/customer/notifications" 
                description="Get notifications"
                color="blue"
              />
              <EndpointCard 
                method="PUT" 
                path="/api/customer/notifications" 
                description="Mark as read"
                color="yellow"
              />
              <EndpointCard 
                method="GET" 
                path="/api/customer/profile" 
                description="Get profile"
                color="blue"
              />
              <EndpointCard 
                method="PUT" 
                path="/api/customer/profile" 
                description="Update profile"
                color="yellow"
              />
              <EndpointCard 
                method="GET" 
                path="/api/customer/documents" 
                description="Get documents"
                color="blue"
              />
              <EndpointCard 
                method="POST" 
                path="/api/customer/documents" 
                description="Upload document"
                color="green"
              />
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t">
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>
              Digital Lending OS - Customer Self-Service Portal for Kenyan DCPs
            </p>
            <p className="flex items-center justify-center gap-2">
              <Shield className="h-4 w-4 text-emerald-500" />
              Built with Next.js 16 • TypeScript • shadcn/ui • Tailwind CSS 4
              <ArrowRight className="h-4 w-4" />
            </p>
          </div>
        </footer>
      </main>
    </div>
  )
}

// Helper Components
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function CodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  )
}

function EndpointCard({ 
  method, 
  path, 
  description, 
  color 
}: { 
  method: string; 
  path: string; 
  description: string; 
  color: 'green' | 'blue' | 'yellow' | 'red' 
}) {
  const colors = {
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
    yellow: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
  }

  return (
    <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
      <Badge variant="outline" className={`font-mono text-xs shrink-0 ${colors[color]}`}>
        {method}
      </Badge>
      <div className="min-w-0">
        <code className="text-sm break-all">{path}</code>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  )
}
