'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { 
  User, 
  Building, 
  Phone, 
  Mail, 
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle
} from 'lucide-react'

interface FormData {
  // Personal Information
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  nationalId: string
  
  // Employment
  employmentStatus: string
  employerName: string
  monthlyIncome: string
  employmentDuration: string
  
  // Loan Details
  loanAmount: string
  loanPurpose: string
  repaymentPeriod: string
  
  // Banking
  bankName: string
  mpesaPhone: string
}

interface ValidationErrors {
  [key: string]: string
}

interface ApplicationFormProps {
  prefillData?: {
    amount?: number
    termDays?: number
    productType?: string
  }
  onSuccess?: () => void
}

export function ApplicationForm({ prefillData, onSuccess }: ApplicationFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    nationalId: '',
    employmentStatus: '',
    employerName: '',
    monthlyIncome: '',
    employmentDuration: '',
    loanAmount: prefillData?.amount?.toString() || '',
    loanPurpose: '',
    repaymentPeriod: prefillData?.termDays?.toString() || '90',
    bankName: '',
    mpesaPhone: ''
  })

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateStep = (step: number): boolean => {
    const errors: ValidationErrors = {}

    if (step === 1) {
      if (!formData.firstName.trim()) errors.firstName = 'First name is required'
      else if (formData.firstName.trim().length < 2) errors.firstName = 'First name must be at least 2 characters'
      
      if (!formData.lastName.trim()) errors.lastName = 'Last name is required'
      else if (formData.lastName.trim().length < 2) errors.lastName = 'Last name must be at least 2 characters'
      
      if (!formData.phone.trim()) errors.phone = 'Phone number is required'
      else if (!/^(\+254|0)?[7]\d{8}$/.test(formData.phone.replace(/\s/g, ''))) {
        errors.phone = 'Please enter a valid Kenyan phone number (e.g., 0712345678)'
      }
      
      if (!formData.nationalId.trim()) errors.nationalId = 'National ID is required'
      else if (!/^\d{5,8}$/.test(formData.nationalId.trim())) {
        errors.nationalId = 'Please enter a valid ID number (5-8 digits)'
      }
      
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Please enter a valid email address'
      }
    }

    if (step === 2) {
      if (!formData.employmentStatus) errors.employmentStatus = 'Please select employment status'
      
      if (!formData.monthlyIncome.trim()) errors.monthlyIncome = 'Monthly income is required'
      else if (isNaN(Number(formData.monthlyIncome)) || Number(formData.monthlyIncome) <= 0) {
        errors.monthlyIncome = 'Please enter a valid income amount'
      }
    }

    if (step === 3) {
      if (!formData.loanAmount.trim()) errors.loanAmount = 'Loan amount is required'
      else if (isNaN(Number(formData.loanAmount)) || Number(formData.loanAmount) < 5000) {
        errors.loanAmount = 'Minimum loan amount is KSh 5,000'
      }
      else if (Number(formData.loanAmount) > 500000) {
        errors.loanAmount = 'Maximum loan amount is KSh 500,000'
      }
      
      if (!formData.loanPurpose.trim()) errors.loanPurpose = 'Please describe the purpose of the loan'
      else if (formData.loanPurpose.trim().length < 10) {
        errors.loanPurpose = 'Please provide more details (at least 10 characters)'
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const canProceed = () => {
    return validateStep(currentStep)
  }

  const handleNext = () => {
    if (canProceed()) {
      setCurrentStep(prev => Math.min(4, prev + 1))
      toast.success(`Step ${currentStep + 1}`, {
        description: `Moving to ${getStepTitle(currentStep + 1)}`
      })
    } else {
      toast.error('Validation Error', {
        description: 'Please fill in all required fields correctly'
      })
    }
  }

  const getStepTitle = (step: number): string => {
    const titles = ['', 'Personal Info', 'Employment', 'Loan Details', 'Review & Submit']
    return titles[step] || ''
  }

  const handleSubmit = async () => {
    // Validate all steps before submission
    let isValid = true
    for (let i = 1; i <= 3; i++) {
      if (!validateStep(i)) {
        isValid = false
      }
    }
    
    if (!isValid) {
      setCurrentStep(1)
      toast.error('Validation Failed', {
        description: 'Please correct the errors in your application'
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Create application via API
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: 'default-tenant', // Using default tenant for demo
          customerId: 'new-customer', // Will be created or matched
          productId: getProductIdFromType(prefillData?.productType || 'personal'),
          requestedAmount: formData.loanAmount,
          termDays: formData.repaymentPeriod,
          purpose: formData.loanPurpose,
          customerData: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            nationalId: formData.nationalId,
            dateOfBirth: formData.dateOfBirth,
            employmentStatus: formData.employmentStatus,
            employerName: formData.employerName,
            monthlyIncome: formData.monthlyIncome,
            employmentDuration: formData.employmentDuration,
            bankName: formData.bankName,
            mpesaPhone: formData.mpesaPhone
          }
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success('Application Submitted Successfully!', {
          description: `Your application ${result.data?.id || 'has been'} submitted. Reference: APP-${Date.now().toString(36).toUpperCase()}`,
          duration: 5000
        })
        
        // Call success callback to switch tabs
        if (onSuccess) {
          setTimeout(() => onSuccess(), 1500)
        }
        
        // Reset form
        resetForm()
      } else {
        throw new Error(result.error || 'Failed to submit application')
      }
    } catch (error) {
      console.error('Submission error:', error)
      toast.error('Submission Failed', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
        duration: 6000
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      nationalId: '',
      employmentStatus: '',
      employerName: '',
      monthlyIncome: '',
      employmentDuration: '',
      loanAmount: '',
      loanPurpose: '',
      repaymentPeriod: '90',
      bankName: '',
      mpesaPhone: ''
    })
    setCurrentStep(1)
    setValidationErrors({})
  }

  const getProductIdFromType = (type: string): string => {
    const productMap: Record<string, string> = {
      personal: 'personal-loan-product',
      business: 'business-loan-product',
      salary: 'salary-advance-product',
      emergency: 'emergency-loan-product'
    }
    return productMap[type] || 'personal-loan-product'
  }

  const steps = [
    { id: 1, title: 'Personal Info', icon: User },
    { id: 2, title: 'Employment', icon: Building },
    { id: 3, title: 'Loan Details', icon: FileText },
    { id: 4, title: 'Review & Submit', icon: CheckCircle2 }
  ]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center gap-2 ${currentStep >= step.id ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    currentStep > step.id 
                      ? 'bg-emerald-600 text-white' 
                      : currentStep === step.id 
                        ? 'bg-emerald-100 text-emerald-600 border-2 border-emerald-600' 
                        : 'bg-slate-100 text-slate-400'
                  }`}>
                    {currentStep > step.id ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className="hidden sm:block font-medium text-sm">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 md:w-24 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-emerald-600' : 'bg-slate-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Form Content */}
      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep - 1].title}</CardTitle>
          <CardDescription>
            Step {currentStep} of {steps.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  placeholder="Enter your first name"
                  value={formData.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  className={validationErrors.firstName ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {validationErrors.firstName && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.firstName}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  placeholder="Enter your last name"
                  value={formData.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  className={validationErrors.lastName ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {validationErrors.lastName && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.lastName}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className={validationErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {validationErrors.email && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.email}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (M-Pesa) *</Label>
                <Input
                  id="phone"
                  placeholder="07XX XXX XXX"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className={validationErrors.phone ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {validationErrors.phone && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.phone}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => updateField('dateOfBirth', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationalId">National ID Number *</Label>
                <Input
                  id="nationalId"
                  placeholder="12345678"
                  value={formData.nationalId}
                  onChange={(e) => updateField('nationalId', e.target.value)}
                  className={validationErrors.nationalId ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {validationErrors.nationalId && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.nationalId}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Employment */}
          {currentStep === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Employment Status *</Label>
                <Select value={formData.employmentStatus} onValueChange={(v) => updateField('employmentStatus', v)}>
                  <SelectTrigger className={validationErrors.employmentStatus ? 'border-red-500 focus-visible:ring-red-500' : ''}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employed">Employed</SelectItem>
                    <SelectItem value="self_employed">Self-Employed</SelectItem>
                    <SelectItem value="business_owner">Business Owner</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.employmentStatus && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.employmentStatus}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="employerName">Employer / Business Name</Label>
                <Input
                  id="employerName"
                  placeholder="Company or business name"
                  value={formData.employerName}
                  onChange={(e) => updateField('employerName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyIncome">Monthly Income (KSh) *</Label>
                <Input
                  id="monthlyIncome"
                  type="number"
                  placeholder="50000"
                  value={formData.monthlyIncome}
                  onChange={(e) => updateField('monthlyIncome', e.target.value)}
                  className={validationErrors.monthlyIncome ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {validationErrors.monthlyIncome && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.monthlyIncome}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Employment Duration</Label>
                <Select value={formData.employmentDuration} onValueChange={(v) => updateField('employmentDuration', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="less_than_6_months">&lt; 6 months</SelectItem>
                    <SelectItem value="6_to_12_months">6 - 12 months</SelectItem>
                    <SelectItem value="1_to_3_years">1 - 3 years</SelectItem>
                    <SelectItem value="over_3_years">&gt; 3 years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 3: Loan Details */}
          {currentStep === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="loanAmount">Loan Amount Requested (KSh) *</Label>
                <Input
                  id="loanAmount"
                  type="number"
                  placeholder="50000"
                  value={formData.loanAmount}
                  onChange={(e) => updateField('loanAmount', e.target.value)}
                  className={validationErrors.loanAmount ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {validationErrors.loanAmount && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.loanAmount}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Repayment Period *</Label>
                <Select value={formData.repaymentPeriod} onValueChange={(v) => updateField('repaymentPeriod', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days (1 month)</SelectItem>
                    <SelectItem value="60">60 days (2 months)</SelectItem>
                    <SelectItem value="90">90 days (3 months)</SelectItem>
                    <SelectItem value="180">180 days (6 months)</SelectItem>
                    <SelectItem value="365">365 days (12 months)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="loanPurpose">Loan Purpose *</Label>
                <Textarea
                  id="loanPurpose"
                  placeholder="Describe how you intend to use this loan..."
                  rows={3}
                  value={formData.loanPurpose}
                  onChange={(e) => updateField('loanPurpose', e.target.value)}
                  className={validationErrors.loanPurpose ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {validationErrors.loanPurpose && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.loanPurpose}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name (Optional)</Label>
                <Input
                  id="bankName"
                  placeholder="Your bank name"
                  value={formData.bankName}
                  onChange={(e) => updateField('bankName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mpesaPhone">M-Pesa Disbursement Phone</Label>
                <Input
                  id="mpesaPhone"
                  placeholder="07XX XXX XXX"
                  value={formData.mpesaPhone}
                  onChange={(e) => updateField('mpesaPhone', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <h4 className="font-semibold text-emerald-800 mb-2">Application Summary</h4>
                <p className="text-sm text-emerald-700">
                  Please review all information before submitting. By submitting, you agree to our terms and conditions.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-600" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Name:</span><span className="font-medium">{formData.firstName} {formData.lastName}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Phone:</span><span className="font-medium">{formData.phone || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Email:</span><span>{formData.email || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">ID Number:</span><span>{formData.nationalId || '-'}</span></div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building className="w-4 h-4 text-emerald-600" />
                      Employment Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Status:</span><span className="capitalize font-medium">{formData.employmentStatus.replace('_', ' ') || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Employer:</span><span>{formData.employerName || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Income:</span><span className="font-medium">KSh {Number(formData.monthlyIncome).toLocaleString() || '-'}</span></div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-emerald-800">
                      <FileText className="w-4 h-4" />
                      Loan Request Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-slate-500">Amount</p>
                        <p className="font-bold text-lg text-emerald-700">KSh {Number(formData.loanAmount).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Term</p>
                        <p className="font-bold text-lg text-emerald-700">{formData.repaymentPeriod} days</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Interest Rate</p>
                        <p className="font-bold text-lg text-emerald-700">15%/month</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Est. Monthly</p>
                        <p className="font-bold text-lg text-emerald-700">KSh {(Number(formData.loanAmount) * 1.15 / (parseInt(formData.repaymentPeriod) / 30)).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-emerald-200">
                      <p className="text-slate-500 mb-1">Purpose:</p>
                      <p className="text-slate-800">{formData.loanPurpose}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1 || isSubmitting}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            {currentStep < 4 ? (
              <Button
                onClick={handleNext}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Next Step
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 px-8"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Submit Application
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
