'use client'
// Digital Lending OS - Main Dashboard Page with Multi-Portal Authentication

import { useState, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Building2, 
  Users, 
  Shield, 
  Network, 
  Landmark,
  TrendingUp,
  CreditCard
} from 'lucide-react'
import { CustomerPortal } from '@/components/lending-os/CustomerPortal'
import { LenderDashboard } from '@/components/lending-os/LenderDashboard'
import { SuperAdminView } from '@/components/lending-os/SuperAdminView'
import { ArchitectureDiagram } from '@/components/lending-os/ArchitectureDiagram'
import { ThemeToggle } from '@/components/lending-os/ThemeToggle'
import { AuthProvider, useAuthContext } from '@/components/lending-os/AuthProvider'
import { AuthStatusbar } from '@/components/lending-os/AuthStatusbar'
import { LoginScreen } from '@/components/lending-os/LoginScreen'
import type { PortalType } from '@/lib/auth-types'

function DashboardContent() {
  const [activeTab, setActiveTab] = useState<PortalType>('customer')
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  
  const { requireAuth } = useAuthContext()

  const handleLoginClick = useCallback(() => {
    setShowLoginDialog(true)
  }, [])

  const handleLoginSuccess = useCallback(() => {
    setShowLoginDialog(false)
  }, [])

  const handlePortalChange = useCallback((portal: string) => {
    setActiveTab(portal as PortalType)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Landmark className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Digital Lending OS</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                  Multi-Tenant Lending Platform for Kenyan DCPs
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
              <AuthStatusbar 
                onLoginClick={handleLoginClick}
                onPortalChange={(portal) => setActiveTab(portal)}
                compact={true}
              />
              
              <ThemeToggle />
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hidden sm:inline-flex">
                v2.0.0
              </Badge>
              <Badge variant="outline" className="border-amber-300 text-amber-700 hidden sm:inline-flex">
                CBK Licensed
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Auth Status Bar (Full Version) - Shown below header on larger screens */}
        <div className="mb-6 flex justify-end">
          <AuthStatusbar 
            onLoginClick={handleLoginClick}
            onPortalChange={handlePortalChange}
          />
        </div>

        {/* Platform Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-xs md:text-sm">Total Loan Book</p>
                  <p className="text-xl md:text-2xl font-bold">KSh 840M</p>
                </div>
                <TrendingUp className="w-7 h-7 md:w-8 md:h-8 text-emerald-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-slate-700 to-slate-800 text-white border-0 hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-xs md:text-sm">Active Loans</p>
                  <p className="text-xl md:text-2xl font-bold">182,432</p>
                </div>
                <CreditCard className="w-7 h-7 md:w-8 md:h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0 hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-xs md:text-sm">PAR30 Ratio</p>
                  <p className="text-xl md:text-2xl font-bold">4.2%</p>
                </div>
                <Building2 className="w-7 h-7 md:w-8 md:h-8 text-amber-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0 hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-xs md:text-sm">DCP Tenants</p>
                  <p className="text-xl md:text-2xl font-bold">252+</p>
                </div>
                <Users className="w-7 h-7 md:w-8 md:h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PortalType)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-100 dark:bg-slate-800 p-1 h-auto">
            <TabsTrigger 
              value="customer" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5 md:py-3 px-2 md:px-4 text-xs md:text-sm"
            >
              <Users className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Customer Portal</span>
              <span className="sm:hidden">Customer</span>
            </TabsTrigger>
            <TabsTrigger 
              value="lender" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5 md:py-3 px-2 md:px-4 text-xs md:text-sm"
            >
              <Building2 className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Lender Admin</span>
              <span className="sm:hidden">Lender</span>
            </TabsTrigger>
            <TabsTrigger 
              value="admin" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5 md:py-3 px-2 md:px-4 text-xs md:text-sm"
            >
              <Shield className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Super Admin</span>
              <span className="sm:hidden">Admin</span>
            </TabsTrigger>
            <TabsTrigger 
              value="architecture" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5 md:py-3 px-2 md:px-4 text-xs md:text-sm"
            >
              <Network className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Architecture</span>
              <span className="sm:hidden">Arch</span>
            </TabsTrigger>
          </TabsList>

          {/* Customer Portal Tab */}
          <TabsContent value="customer">
            <CustomerPortal />
          </TabsContent>

          {/* Lender Admin Dashboard Tab */}
          <TabsContent value="lender">
            <LenderDashboard />
          </TabsContent>

          {/* Super Admin View Tab */}
          <TabsContent value="admin">
            <SuperAdminView />
          </TabsContent>

          {/* Architecture Diagram Tab */}
          <TabsContent value="architecture">
            <ArchitectureDiagram />
          </TabsContent>
        </Tabs>
      </main>

      {/* Login Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-transparent border-none shadow-2xl">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-6 rounded-xl">
            <LoginScreen 
              portal={activeTab}
              onPortalChange={(portal) => {
                setActiveTab(portal)
              }}
              onSuccess={handleLoginSuccess}
              onClose={() => setShowLoginDialog(false)}
              showPortalSelector={true}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="mt-auto border-t bg-slate-50 dark:bg-slate-900 py-6 mt-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
              <Landmark className="w-5 h-5 text-emerald-600" />
              <span>Digital Lending OS © 2026</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              <span>Regulated by Central Bank of Kenya</span>
              <span>•</span>
              <span>252+ Licensed DCPs</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Main page component wrapped with AuthProvider
export default function Home() {
  return (
    <AuthProvider defaultPortal="customer" requireAuthentication={false}>
      <DashboardContent />
    </AuthProvider>
  )
}
