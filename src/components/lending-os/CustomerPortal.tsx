'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
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

// Interface for prefill data passed from calculator to form
interface PrefillData {
  amount: number
  termDays: number
  productType: string
}

export function CustomerPortal() {
  const [activeSection, setActiveSection] = useState('calculator')
  const [prefillData, setPrefillData] = useState<PrefillData | null>(null)
  
  // Handle "Apply for this Loan" button click in calculator
  const handleApplyFromCalculator = useCallback((data: {
    amount: number
    termDays: number
    productType: string
    calculation: unknown
  }) => {
    // Store the calculator data to prefill the application form
    setPrefillData({
      amount: data.amount,
      termDays: data.termDays,
      productType: data.productType
    })
    
    // Switch to application form tab
    setActiveSection('application')
    
    toast.success('Proceeding to Application', {
      description: `Your loan details have been transferred to the application form.`,
      duration: 4000
    })
  }, [])

  // Handle successful application submission
  const handleApplicationSuccess = useCallback(() => {
    // Clear prefill data
    setPrefillData(null)
    
    // Switch to status tracking tab
    setActiveSection('status')
  }, [])

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
          <TabsTrigger value="application" className="gap-2 relative">
            <FileText className="w-4 h-4" />
            Apply Now
            {prefillData && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse" title="Data ready from calculator" />
            )}
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
          <LoanCalculator onApply={handleApplyFromCalculator} />
        </TabsContent>

        <TabsContent value="application" className="mt-6">
          <ApplicationForm 
            prefillData={prefillData || undefined}
            onSuccess={handleApplicationSuccess}
          />
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
