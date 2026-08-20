'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calculator, 
  FileText, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  User,
  Building,
  Phone,
  Mail
} from 'lucide-react'
import { LoanCalculator } from './LoanCalculator'
import { ApplicationForm } from './ApplicationForm'
import { ApplicationStatusTracker } from './ApplicationStatusTracker'
import { RepaymentSchedule } from './RepaymentSchedule'

export function CustomerPortal() {
  const [activeSection, setActiveSection] = useState('calculator')

  return (
    <div className="space-y-6">
      {/* Portal Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl p-6 text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Customer Portal</h2>
            <p className="text-emerald-100 max-w-xl">
              Apply for loans, track your applications, and manage repayments. 
              Quick approval within 24 hours for qualified applicants.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-white/20 text-white border-0">
              <Clock className="w-3 h-3 mr-1" />
              24hr Approval
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white border-0">
              M-Pesa Disbursement
            </Badge>
          </div>
        </div>
      </div>

      {/* Portal Navigation */}
      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="grid w-full grid-cols-4 bg-slate-100">
          <TabsTrigger value="calculator" className="gap-2">
            <Calculator className="w-4 h-4" />
            Loan Calculator
          </TabsTrigger>
          <TabsTrigger value="application" className="gap-2">
            <FileText className="w-4 h-4" />
            Apply Now
          </TabsTrigger>
          <TabsTrigger value="status" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Track Status
          </TabsTrigger>
          <TabsTrigger value="repayment" className="gap-2">
            <ArrowRight className="w-4 h-4" />
            Repayments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="mt-6">
          <LoanCalculator />
        </TabsContent>

        <TabsContent value="application" className="mt-6">
          <ApplicationForm />
        </TabsContent>

        <TabsContent value="status" className="mt-6">
          <ApplicationStatusTracker />
        </TabsContent>

        <TabsContent value="repayment" className="mt-6">
          <RepaymentSchedule />
        </TabsContent>
      </Tabs>
    </div>
  )
}
