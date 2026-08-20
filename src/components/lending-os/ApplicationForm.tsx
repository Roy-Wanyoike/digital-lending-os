'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  User, 
  Building, 
  Phone, 
  Mail, 
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft
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

export function ApplicationForm() {
  const [currentStep, setCurrentStep] = useState(1)
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
    loanAmount: '',
    loanPurpose: '',
    repaymentPeriod: '90',
    bankName: '',
    mpesaPhone: ''
  })

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const canProceed = () => {
    if (currentStep === 1) {
      return formData.firstName && formData.lastName && formData.phone && formData.nationalId
    }
    if (currentStep === 2) {
      return formData.employmentStatus && formData.monthlyIncome
    }
    if (currentStep === 3) {
      return formData.loanAmount && formData.loanPurpose
    }
    return true
  }

  const handleSubmit = () => {
    alert('Application submitted successfully! You will receive a confirmation via SMS.')
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  placeholder="Enter your last name"
                  value={formData.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (M-Pesa) *</Label>
                <Input
                  id="phone"
                  placeholder="07XX XXX XXX"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                />
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
                />
              </div>
            </div>
          )}

          {/* Step 2: Employment */}
          {currentStep === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Employment Status *</Label>
                <Select value={formData.employmentStatus} onValueChange={(v) => updateField('employmentStatus', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employed">Employed</SelectItem>
                    <SelectItem value="self_employed">Self-Employed</SelectItem>
                    <SelectItem value="business_owner">Business Owner</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                  </SelectContent>
                </Select>
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
                />
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
                />
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
                />
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
                    <div className="flex justify-between"><span className="text-slate-500">Name:</span><span>{formData.firstName} {formData.lastName}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Phone:</span><span>{formData.phone}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Email:</span><span>{formData.email || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">ID Number:</span><span>{formData.nationalId}</span></div>
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
                    <div className="flex justify-between"><span className="text-slate-500">Status:</span><span className="capitalize">{formData.employmentStatus.replace('_', ' ')}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Employer:</span><span>{formData.employerName || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Income:</span><span>KSh {Number(formData.monthlyIncome).toLocaleString()}</span></div>
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
                        <p className="font-bold text-lg text-emerald-700">KSh {(Number(formData.loanAmount) * 1.15 / (parseInt(formData.repaymentPeriod) / 30)).toFixed(0)}</p>
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
              disabled={currentStep === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            {currentStep < 4 ? (
              <Button
                onClick={() => setCurrentStep(prev => Math.min(4, prev + 1))}
                disabled={!canProceed()}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Next Step
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                className="bg-emerald-600 hover:bg-emerald-700 px-8"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Submit Application
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
