'use client'
// Digital Lending OS - Main Dashboard Page

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

export default function Home() {
  const [activeTab, setActiveTab] = useState('customer')

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                <Landmark className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Digital Lending OS</h1>
                <p className="text-xs text-slate-500 hidden sm:block">
                  Multi-Tenant Lending Platform for Kenyan DCPs
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                v2.0.0
              </Badge>
              <Badge variant="outline" className="border-amber-300 text-amber-700">
                CBK Licensed
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Platform Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm">Total Loan Book</p>
                  <p className="text-2xl font-bold">KSh 840M</p>
                </div>
                <TrendingUp className="w-8 h-8 text-emerald-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-slate-700 to-slate-800 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm">Active Loans</p>
                  <p className="text-2xl font-bold">182,432</p>
                </div>
                <CreditCard className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm">PAR30 Ratio</p>
                  <p className="text-2xl font-bold">4.2%</p>
                </div>
                <Building2 className="w-8 h-8 text-amber-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">DCP Tenants</p>
                  <p className="text-2xl font-bold">252+</p>
                </div>
                <Users className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-100 p-1 h-auto">
            <TabsTrigger 
              value="customer" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-3 px-4"
            >
              <Users className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Customer Portal</span>
              <span className="sm:hidden">Customer</span>
            </TabsTrigger>
            <TabsTrigger 
              value="lender" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-3 px-4"
            >
              <Building2 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Lender Admin</span>
              <span className="sm:hidden">Lender</span>
            </TabsTrigger>
            <TabsTrigger 
              value="admin" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-3 px-4"
            >
              <Shield className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Super Admin</span>
              <span className="sm:hidden">Admin</span>
            </TabsTrigger>
            <TabsTrigger 
              value="architecture" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-3 px-4"
            >
              <Network className="w-4 h-4 mr-2" />
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

      {/* Footer */}
      <footer className="mt-auto border-t bg-slate-50 py-6 mt-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-600 text-sm">
              <Landmark className="w-5 h-5 text-emerald-600" />
              <span>Digital Lending OS © 2026</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
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
