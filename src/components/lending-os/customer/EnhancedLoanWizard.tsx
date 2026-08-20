'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  User,
  Building2,
  DollarSign,
  FileText,
  CheckCircle2,
  PartyPopper,
  ArrowLeft,
  ArrowRight,
  Upload,
  Calendar,
  Phone,
  Mail,
  CreditCard,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { DocumentUploader } from './DocumentUploader'

// Types
interface PersonalInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  idNumber: string
}

interface EmploymentInfo {
  employmentStatus: string
  employerName: string
  monthlyIncome: number
  payDate: string
}

interface LoanRequest {
  amount: number
  purpose: string
  termDays: number
}

interface ApplicationData {
  personalInfo: PersonalInfo
  employmentInfo: EmploymentInfo
  loanRequest: LoanRequest
  documents: UploadedDocument[]
  agreedToTerms: boolean
  consentToCRB: boolean
}

interface UploadedDocument {
  type: string
  name: string
  size: number
  url?: string
  uploaded: boolean
}

// Step configuration
const STEPS = [
  { id: 1, title: 'Personal Info', icon: User, description: 'Tell us about yourself' },
  { id: 2, title: 'Employment', icon: Building2, description: 'Your income details' },
  { id: 3, title: 'Loan Request', icon: DollarSign, description: 'How much do you need?' },
  { id: 4, title: 'Documents', icon: FileText, description: 'Verify your identity' },
  { id: 5, title: 'Review', icon: CheckCircle2, description: 'Check your application' },
  { id: 6, title: 'Complete!', icon: PartyPopper, description: 'Application submitted' }
]

const LOAN_PURPOSES = [
  'Personal Expenses',
  'Emergency',
  'School Fees',
  'Business Capital',
  'Medical',
  'Rent',
  'Home Improvement',
  'Travel',
  'Other'
]

const EMPLOYMENT_STATUSES = [
  'Employed',
  'Self-Employed',
  'Business Owner',
  'Contractor',
  'Freelancer',
  'Other'
]

const REQUIRED_DOCUMENTS = [
  { type: 'NATIONAL_ID', label: 'National ID', required: true, icon: '🆔' },
  { type: 'KRA_PIN_CERTIFICATE', label: 'KRA PIN Certificate', required: true, icon: '📄' },
  { type: 'PASSPORT_PHOTO', label: 'Passport Photo', required: true, icon: '👤' },
  { type: 'PAYSLIP', label: 'Recent Payslip', required: false, icon: '📊' }
]

// Helper functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0
  }).format(amount)
}

const calculateRepayment = (principal: number, termDays: number, rate: number = 0.13) => {
  const interest = principal * rate * (termDays / 30)
  const processingFee = Math.min(principal * 0.02, 500)
  return {
    principal,
    interest: Math.round(interest * 100) / 100,
    processingFee,
    total: principal + Math.round(interest * 100) / 100 + processingFee,
    dueDate: new Date(Date.now() + termDays * 24 * 60 * 60 * 1000),
    rate
  }
}

export function EnhancedLoanWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [applicationRef, setApplicationRef] = useState('')
  
  // Form data state
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    idNumber: ''
  })
  
  const [employmentInfo, setEmploymentInfo] = useState<EmploymentInfo>({
    employmentStatus: '',
    employerName: '',
    monthlyIncome: 0,
    payDate: ''
  })
  
  const [loanRequest, setLoanRequest] = useState<LoanRequest>({
    amount: 25000,
    purpose: 'Personal Expenses',
    termDays: 30
  })
  
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [consentToCRB, setConsentToCRB] = useState(false)

  // Calculate repayment details
  const repaymentCalc = calculateRepayment(loanRequest.amount, loanRequest.termDays)

  // Navigation handlers
  const goToNextStep = useCallback(() => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1)
    }
  }, [currentStep])

  const goToPrevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const goToStep = useCallback((step: number) => {
    if (step < currentStep || currentStep === 6) {
      setCurrentStep(step)
    }
  }, [currentStep])

  // Validation helpers
  const validatePersonalInfo = (): boolean => {
    return !!(personalInfo.firstName && personalInfo.lastName && 
             personalInfo.phone && personalInfo.idNumber)
  }

  const validateEmploymentInfo = (): boolean => {
    return !!(employmentInfo.employmentStatus && employmentInfo.monthlyIncome > 0)
  }

  const validateDocuments = (): boolean => {
    const requiredDocs = REQUIRED_DOCUMENTS.filter(d => d.required)
    return requiredDocs.every(doc => 
      documents.some(d => d.type === doc.type && d.uploaded)
    )
  }

  // Submit handler
  const handleSubmit = async () => {
    if (!agreedToTerms || !consentToCRB) {
      toast.error('Please agree to terms and consent to CRB check')
      return
    }

    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/customer/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalInfo,
          employmentInfo,
          loanRequest,
          documents: documents.filter(d => d.uploaded)
        })
      })

      if (!response.ok) throw new Error('Failed to submit application')
      
      const data = await response.json()
      setApplicationRef(data.referenceNumber || `LA-${Date.now()}`)
      
      toast.success('Application Submitted Successfully!', {
        description: `Reference: ${data.referenceNumber || applicationRef}`
      })
      
      goToNextStep()
    } catch (error) {
      toast.error('Submission Failed', {
        description: 'Please try again later'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset wizard
  const handleReset = () => {
    setCurrentStep(1)
    setPersonalInfo({
      firstName: '', lastName: '', email: '', phone: '',
      dateOfBirth: '', idNumber: ''
    })
    setEmploymentInfo({
      employmentStatus: '', employerName: '', monthlyIncome: 0, payDate: ''
    })
    setLoanRequest({ amount: 25000, purpose: 'Personal Expenses', termDays: 30 })
    setDocuments([])
    setAgreedToTerms(false)
    setConsentToCRB(false)
    setApplicationRef('')
  }

  // Progress calculation
  const progressPercentage = ((currentStep - 1) / (STEPS.length - 1)) * 100

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <User className="w-12 h-12 mx-auto mb-3 text-emerald-600" />
              <h3 className="text-xl font-semibold">Tell us about yourself</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Please provide your personal information
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={personalInfo.firstName}
                  onChange={(e) => setPersonalInfo(p => ({ ...p, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  placeholder="Mwangi"
                  value={personalInfo.lastName}
                  onChange={(e) => setPersonalInfo(p => ({ ...p, lastName: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={personalInfo.email}
                  onChange={(e) => setPersonalInfo(p => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Phone Number *
                </Label>
                <div className="flex gap-2">
                  <span className="flex items-center px-3 py-2 bg-muted rounded-md text-sm font-medium border">
                    +254
                  </span>
                  <Input
                    id="phone"
                    placeholder="712 345 678"
                    value={personalInfo.phone}
                    onChange={(e) => setPersonalInfo(p => ({ ...p, phone: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dob">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date of Birth
                </Label>
                <Input
                  id="dob"
                  type="date"
                  value={personalInfo.dateOfBirth}
                  onChange={(e) => setPersonalInfo(p => ({ ...p, dateOfBirth: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="idNumber">
                  <CreditCard className="w-4 h-4 inline mr-1" />
                  ID Number *
                </Label>
                <Input
                  id="idNumber"
                  placeholder="12345678"
                  value={personalInfo.idNumber}
                  onChange={(e) => setPersonalInfo(p => ({ ...p, idNumber: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-emerald-600" />
              <h3 className="text-xl font-semibold">Employment Details</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Help us understand your income situation
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employment Status *</Label>
                <Select
                  value={employmentInfo.employmentStatus}
                  onValueChange={(v) => setEmploymentInfo(e => ({ ...e, employmentStatus: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_STATUSES.map(status => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employer">Employer / Business Name</Label>
                <Input
                  id="employer"
                  placeholder="Company name or business name"
                  value={employmentInfo.employerName}
                  onChange={(e) => setEmploymentInfo(e => ({ ...e, employerName: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="income">Monthly Income (KSh) *</Label>
                <Input
                  id="income"
                  type="number"
                  placeholder="45000"
                  value={employmentInfo.monthlyIncome || ''}
                  onChange={(e) => setEmploymentInfo(e => ({ ...e, monthlyIncome: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payDate">Typical Pay Date</Label>
                <Input
                  id="payDate"
                  type="date"
                  value={employmentInfo.payDate}
                  onChange={(e) => setEmploymentInfo(e => ({ ...e, payDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Income Visualization */}
            {employmentInfo.monthlyIncome > 0 && (
              <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Monthly Income</span>
                    <span className="font-bold text-lg text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(employmentInfo.monthlyIncome)}
                    </span>
                  </div>
                  <div className="h-8 bg-emerald-100 dark:bg-emerald-900/50 rounded-full overflow-hidden flex items-center px-2">
                    <div 
                      className="h-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((employmentInfo.monthlyIncome / 200000) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Recommended loan amount: up to {formatCurrency(employmentInfo.monthlyIncome * 0.5)}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <DollarSign className="w-12 h-12 mx-auto mb-3 text-emerald-600" />
              <h3 className="text-xl font-semibold">How much do you need?</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Select your desired loan amount and term
              </p>
            </div>

            {/* Amount Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-medium">Loan Amount</Label>
                <Badge variant="outline" className="text-lg px-4 py-1">
                  {formatCurrency(loanRequest.amount)}
                </Badge>
              </div>
              
              <Slider
                value={[loanRequest.amount]}
                onValueChange={(v) => setLoanRequest(l => ({ ...l, amount: v[0] }))}
                min={5000}
                max={100000}
                step={1000}
                className="py-4"
              />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>KSh 5,000</span>
                <span>KSh 100,000</span>
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex flex-wrap gap-2 justify-center">
              {[10000, 25000, 50000, 75000].map(amount => (
                <Button
                  key={amount}
                  variant={loanRequest.amount === amount ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLoanRequest(l => ({ ...l, amount }))}
                  className="min-w-[80px]"
                >
                  {formatCurrency(amount)}
                </Button>
              ))}
            </div>

            <Separator />

            {/* Purpose & Term */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loan Purpose</Label>
                <Select
                  value={loanRequest.purpose}
                  onValueChange={(v) => setLoanRequest(l => ({ ...l, purpose: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOAN_PURPOSES.map(purpose => (
                      <SelectItem key={purpose} value={purpose}>
                        {purpose}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Loan Term</Label>
                <Select
                  value={String(loanRequest.termDays)}
                  onValueChange={(v) => setLoanRequest(l => ({ ...l, termDays: Number(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="60">60 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                      </SelectContent>
                    </Select>
              </div>
            </div>

            <Separator />

            {/* Repayment Summary */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Estimated Repayment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Principal</span>
                  <span>{formatCurrency(repaymentCalc.principal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Interest (13%)</span>
                  <span>{formatCurrency(repaymentCalc.interest)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Processing Fee</span>
                  <span>{formatCurrency(repaymentCalc.processingFee)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Repayment</span>
                  <span className="text-emerald-600">{formatCurrency(repaymentCalc.total)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                  <Calendar className="w-4 h-4" />
                  <span>Due: {repaymentCalc.dueDate.toLocaleDateString('en-KE', { 
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                  })}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <FileText className="w-12 h-12 mx-auto mb-3 text-emerald-600" />
              <h3 className="text-xl font-semibold">Verify Your Identity</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Upload the required documents to proceed
              </p>
            </div>

            <DocumentUploader
              documents={documents}
              onDocumentsChange={setDocuments}
              requiredDocuments={REQUIRED_DOCUMENTS}
            />

            {/* Upload Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Documents Uploaded</span>
                <span>{documents.filter(d => d.uploaded).length}/{REQUIRED_DOCUMENTS.length}</span>
              </div>
              <Progress 
                value={(documents.filter(d => d.uploaded).length / REQUIRED_DOCUMENTS.length) * 100} 
                className="h-2"
              />
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-600" />
              <h3 className="text-xl font-semibold">Review Your Application</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Please verify all information before submitting
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="w-4 h-4" /> Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Name:</span> {personalInfo.firstName} {personalInfo.lastName}</div>
                  <div><span className="text-muted-foreground">Phone:</span> +254 {personalInfo.phone}</div>
                  <div><span className="text-muted-foreground">Email:</span> {personalInfo.email || 'N/A'}</div>
                  <div><span className="text-muted-foreground">ID:</span> {personalInfo.idNumber}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Employment Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Status:</span> {employmentInfo.employmentStatus}</div>
                  <div><span className="text-muted-foreground">Income:</span> {formatCurrency(employmentInfo.monthlyIncome)}/mo</div>
                  {employmentInfo.employerName && (
                    <div className="col-span-2"><span className="text-muted-foreground">Employer:</span> {employmentInfo.employerName}</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> Loan Request
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-semibold">{formatCurrency(loanRequest.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Purpose:</span>
                    <span>{loanRequest.purpose}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Term:</span>
                    <span>{loanRequest.termDays} days</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total Repayment:</span>
                    <span className="text-emerald-600">{formatCurrency(repaymentCalc.total)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Due: {repaymentCalc.dueDate.toLocaleDateString('en-KE', { 
                      year: 'numeric', month: 'long', day: 'numeric' 
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {REQUIRED_DOCUMENTS.map(doc => {
                      const uploaded = documents.some(d => d.type === doc.type && d.uploaded)
                      return (
                        <div key={doc.type} className="flex items-center justify-between text-sm">
                          <span>{doc.icon} {doc.label} {doc.required && '*'}</span>
                          {uploaded ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Terms and Consent */}
            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(!!checked)}
                    className="mt-1"
                  />
                  <label htmlFor="terms" className="text-sm cursor-pointer">
                    I agree to the{' '}
                    <a href="#" className="text-emerald-600 underline hover:text-emerald-700">
                      Terms and Conditions
                    </a>{' '}
                    and acknowledge that I have read and understood the loan agreement, 
                    including all fees, interest rates, and repayment terms.
                  </label>
                </div>
                
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="crb"
                    checked={consentToCRB}
                    onCheckedChange={(checked) => setConsentToCRB(!!checked)}
                    className="mt-1"
                  />
                  <label htmlFor="crb" className="text-sm cursor-pointer">
                    I consent to a credit reference bureau (CRB) check being performed 
                    on my credit history as part of this loan application process.
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 6:
        return (
          <div className="text-center space-y-6 py-8">
            <div className="relative">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center animate-bounce">
                <PartyPopper className="w-12 h-12 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-lg">
                🎉
              </div>
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-emerald-600 mb-2">
                Application Submitted Successfully!
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Your loan application has been received and is currently under review.
                You will be notified via SMS once a decision is made.
              </p>
            </div>

            <Card className="max-w-sm mx-auto">
              <CardContent className="pt-6 space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Reference Number</p>
                  <p className="text-2xl font-mono font-bold text-emerald-600">
                    {applicationRef || `LA-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`}
                  </p>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/30 py-2 px-4 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Under Review</span>
                </div>
                
                <div className="text-center text-sm text-muted-foreground">
                  <ClockIcon className="w-4 h-4 inline mr-1" />
                  Expected decision within 2 hours
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => window.location.href = '#status'} variant="outline">
                View Application Status
              </Button>
              <Button onClick={handleReset}>
                Apply for Another Loan
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Determine if can proceed
  const canProceed = () => {
    switch (currentStep) {
      case 1: return validatePersonalInfo()
      case 2: return validateEmploymentInfo()
      case 3: return loanRequest.amount >= 5000
      case 4: return validateDocuments()
      case 5: return agreedToTerms && consentToCRB
      default: return true
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const isActive = step.id === currentStep
            const isCompleted = step.id < currentStep
            
            return (
              <button
                key={step.id}
                onClick={() => goToStep(step.id)}
                className={`flex flex-col items-center relative ${
                  step.id <= currentStep ? 'cursor-pointer' : 'cursor-default'
                }`}
                disabled={step.id > currentStep && currentStep !== 6}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-emerald-500 text-white'
                      : isActive
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 dark:ring-emerald-900'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`text-xs mt-2 hidden sm:block ${
                    isActive ? 'font-semibold text-emerald-600' : 'text-muted-foreground'
                  }`}
                >
                  {step.title}
                </span>
                
                {/* Connector line */}
                {index < STEPS.length - 1 && (
                  <div
                    className={`absolute top-5 left-full w-full h-0.5 -z-10 hidden sm:block ${
                      step.id < currentStep ? 'bg-emerald-500' : 'bg-muted'
                    }`}
                    style={{ width: 'calc(100% - 2.5rem)', marginLeft: '1.25rem' }}
                  />
                )}
              </button>
            )
          })}
        </div>
        
        {/* Progress bar for mobile */}
        <Progress value={progressPercentage} className="sm:hidden h-2" />
        
        {/* Current step info */}
        <div className="text-center mt-4 sm:hidden">
          <p className="font-medium">Step {currentStep} of {STEPS.length}</p>
          <p className="text-sm text-muted-foreground">{STEPS[currentStep - 1]?.description}</p>
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6 md:p-8">
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      {currentStep < 6 && (
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={goToPrevStep}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          
          {currentStep === 5 ? (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <PartyPopper className="w-4 h-4" />
                  Submit Application
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={goToNextStep}
              disabled={!canProceed()}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Clock icon helper
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
