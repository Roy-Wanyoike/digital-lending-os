'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle,
  FileText,
  UserCheck,
  Calculator,
  ThumbsUp,
  Send
} from 'lucide-react'

interface ApplicationStep {
  id: string
  title: string
  description: string
  status: 'completed' | 'current' | 'pending' | 'error'
  timestamp?: string
}

export function ApplicationStatusTracker() {
  // Mock application status data
  const applicationId = 'APP-2026-0842'
  const submittedDate = '2026-01-15T10:30:00Z'

  const steps: ApplicationStep[] = [
    {
      id: 'submission',
      title: 'Application Submission',
      description: 'Your loan application has been received and is being processed',
      status: 'completed',
      timestamp: 'Jan 15, 2026 - 10:30 AM'
    },
    {
      id: 'kyc',
      title: 'KYC Verification',
      description: 'Verifying your identity documents and personal information',
      status: 'completed',
      timestamp: 'Jan 15, 2026 - 11:45 AM'
    },
    {
      id: 'assessment',
      title: 'Credit Assessment',
      description: 'Analyzing credit history and calculating affordability score',
      status: 'current',
      timestamp: 'In Progress'
    },
    {
      id: 'approval',
      title: 'Approval Decision',
      description: 'Final review and approval by lending officer',
      status: 'pending'
    },
    {
      id: 'disbursement',
      title: 'Disbursement',
      description: 'Funds transferred to your M-Pesa account',
      status: 'pending'
    }
  ]

  const getStepIcon = (status: ApplicationStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-6 h-6 text-emerald-600" />
      case 'current':
        return <Clock className="w-6 h-6 text-amber-500 animate-pulse" />
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-500" />
      default:
        return <Circle className="w-6 h-6 text-slate-300" />
    }
  }

  const getStepStyle = (status: ApplicationStep['status']) => {
    switch (status) {
      case 'completed':
        return 'border-emerald-200 bg-emerald-50/50'
      case 'current':
        return 'border-amber-300 bg-amber-50 shadow-md'
      case 'error':
        return 'border-red-200 bg-red-50'
      default:
        return 'border-slate-200 bg-slate-50'
    }
  }

  return (
    <div className="space-y-6">
      {/* Application Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-emerald-600" />
                Application Status Tracker
              </CardTitle>
              <CardDescription className="mt-1">
                Track your loan application progress in real-time
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono">
                ID: {applicationId}
              </Badge>
              <Badge className="bg-amber-100 text-amber-800 border-0">
                In Review
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200" />

        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={step.id} className="relative flex gap-6">
              {/* Icon Container */}
              <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center ${
                step.status === 'completed' ? 'bg-emerald-100' :
                step.status === 'current' ? 'bg-amber-100' :
                step.status === 'error' ? 'bg-red-100' : 'bg-slate-100'
              }`}>
                {getStepIcon(step.status)}
              </div>

              {/* Content Card */}
              <Card className={`flex-1 ${getStepStyle(step.status)}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-900">{step.title}</h3>
                      <p className="text-sm text-slate-600 mt-1">{step.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {step.timestamp && (
                        <span className={`text-xs font-medium ${
                          step.status === 'completed' ? 'text-emerald-700' :
                          step.status === 'current' ? 'text-amber-700' : 'text-slate-500'
                        }`}>
                          {step.timestamp}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Step-specific details */}
                  {step.id === 'kyc' && step.status === 'completed' && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1 text-emerald-700">
                          <UserCheck className="w-3 h-3" /> ID Verified
                        </span>
                        <span className="flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" /> CRB Clean
                        </span>
                      </div>
                    </div>
                  )}

                  {step.id === 'assessment' && step.status === 'current' && (
                    <div className="mt-3 pt-3 border-t border-amber-200">
                      <div className="flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-amber-600" />
                        <span className="text-xs text-amber-700">Running credit scoring algorithm...</span>
                      </div>
                    </div>
                  )}

                  {step.id === 'approval' && step.status === 'pending' && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-xs text-slate-500">
                        Expected completion: Within 24 hours of assessment
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Estimated Timeline */}
      <Card className="bg-gradient-to-r from-slate-800 to-slate-900 text-white border-0">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <Send className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
              <p className="text-xs text-slate-400">Submission</p>
              <p className="font-semibold">Instant</p>
            </div>
            <div className="text-center">
              <UserCheck className="w-8 h-8 mx-auto mb-2 text-blue-400" />
              <p className="text-xs text-slate-400">KYC Check</p>
              <p className="font-semibold">&lt; 2 hours</p>
            </div>
            <div className="text-center">
              <Calculator className="w-8 h-8 mx-auto mb-2 text-amber-400" />
              <p className="text-xs text-slate-400">Assessment</p>
              <p className="font-semibold">&lt; 4 hours</p>
            </div>
            <div className="text-center">
              <ThumbsUp className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
              <p className="text-xs text-slate-400">Approval</p>
              <p className="font-semibold">&lt; 24 hours</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="sm">
          Download Application PDF
        </Button>
        <Button variant="outline" size="sm">
          Contact Support
        </Button>
        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
          Withdraw Application
        </Button>
      </div>
    </div>
  )
}
