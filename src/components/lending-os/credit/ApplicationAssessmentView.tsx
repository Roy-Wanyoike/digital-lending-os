'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { 
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Shield,
  TrendingUp,
  TrendingDown,
  Eye,
  Edit3,
  Save,
  RotateCcw,
  MessageSquare,
  History
} from 'lucide-react'
import type { CreditScoreOutput as CreditScoreResult } from '@/lib/credit-engine'
import { formatCurrency, getGradeColor, getGradeLabel, getDecisionColor } from '@/lib/credit-engine'
import { CreditScoreCard } from './CreditScoreCard'
import { AffordabilityCalculator } from './AffordabilityCalculator'

interface AuditEntry {
  id: string
  timestamp: Date
  user: string
  action: string
  previousValue?: string
  newValue: string
  notes?: string
}

interface ApplicationAssessmentViewProps {
  applicationId: string
  customerName: string
  requestedAmount: number
  termDays: number
  purpose: string
  submittedAt: Date
  result: CreditScoreResult
  riskFlags: Array<{ level: 'info' | 'warning' | 'critical'; message: string }>
  comparableLoans?: Array<{
    score: number
    amount: number
    decision: string
    outcome?: string
  }>
  onOverride?: (decision: 'APPROVE' | 'REVIEW' | 'DECLINE', reason: string) => void
  canOverride?: boolean
  className?: string
}

export function ApplicationAssessmentView({
  applicationId,
  customerName,
  requestedAmount,
  termDays,
  purpose,
  submittedAt,
  result,
  riskFlags = [],
  comparableLoans = [],
  onOverride,
  canOverride = false,
  className = ''
}: ApplicationAssessmentViewProps) {
  const [showOverridePanel, setShowOverridePanel] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')
  const [selectedDecision, setSelectedDecision] = useState<'APPROVE' | 'REVIEW' | 'DECLINE'>('REVIEW')
  const [activeTab, setActiveTab] = useState<'assessment' | 'audit' | 'comparable'>('assessment')

  // Mock audit trail data
  const auditTrail: AuditEntry[] = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 3600000),
      user: 'System',
      action: 'SCORE_CALCULATED',
      newValue: `Score: ${result.score}, Grade: ${result.grade}`,
      notes: 'Automated credit scoring completed'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 3500000),
      user: 'System',
      action: 'ASSESSMENT_GENERATED',
      newValue: `Decision: ${result.decision}`,
      notes: 'Full assessment generated'
    }
  ]

  const handleOverride = () => {
    if (overrideReason.trim() && onOverride) {
      onOverride(selectedDecision, overrideReason)
      setShowOverridePanel(false)
      setOverrideReason('')
    }
  }

  const decisionColor = getDecisionColor(result.decision)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Loan Application Assessment
              </CardTitle>
              <CardDescription>
                Application ID: {applicationId}
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge 
                variant="outline" 
                className="text-white border-0 px-4 py-1.5"
                style={{ backgroundColor: decisionColor }}
              >
                {result.decision}
              </Badge>
              
              {canOverride && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowOverridePanel(!showOverridePanel)}
                  className="gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Override Decision
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Application Summary */}
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" /> Applicant
              </p>
              <p className="font-medium text-sm">{customerName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Requested Amount</p>
              <p className="font-medium text-sm">{formatCurrency(requestedAmount)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Term</p>
              <p className="font-medium text-sm">{termDays} days</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Submitted</p>
              <p className="font-medium text-sm">
                {submittedAt.toLocaleDateString('en-KE', { 
                  day: 'numeric', 
                  month: 'short', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
          
          {purpose && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Purpose</p>
              <p className="text-sm">{purpose}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Override Panel */}
      {showOverridePanel && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Decision Override
            </CardTitle>
            <CardDescription>
              Manager override requires documented reasoning for compliance purposes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              {(['APPROVE', 'REVIEW', 'DECLINE'] as const).map((decision) => (
                <Button
                  key={decision}
                  variant={selectedDecision === decision ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDecision(decision)}
                  style={selectedDecision === decision ? { backgroundColor: getDecisionColor(decision) } : {}}
                >
                  {decision}
                </Button>
              ))}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Override Reason (Required)</label>
              <Textarea
                placeholder="Explain why this decision is being overridden..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="flex gap-3">
              <Button onClick={handleOverride} disabled={!overrideReason.trim()} className="gap-2">
                <Save className="w-4 h-4" />
                Confirm Override
              </Button>
              <Button variant="outline" onClick={() => setShowOverridePanel(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - Score & Affordability */}
        <div className="space-y-6">
          <CreditScoreCard result={result} showDetails={true} />
          <AffordabilityCalculator affordability={result.affordability} showBreakdown={true} />
        </div>

        {/* Right Column - Details */}
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex gap-2 bg-muted/50 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('assessment')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'assessment' 
                  ? 'bg-background shadow-sm' 
                  : 'hover:bg-background/50'
              }`}
            >
              <Shield className="w-4 h-4 inline mr-2" />
              Assessment
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'audit' 
                  ? 'bg-background shadow-sm' 
                  : 'hover:bg-background/50'
              }`}
            >
              <History className="w-4 h-4 inline mr-2" />
              Audit Trail
            </button>
            <button
              onClick={() => setActiveTab('comparable')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'comparable' 
                  ? 'bg-background shadow-sm' 
                  : 'hover:bg-background/50'
              }`}
            >
              <Eye className="w-4 h-4 inline mr-2" />
              Comparables
            </button>
          </div>

          {/* Assessment Tab Content */}
          {activeTab === 'assessment' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detailed Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Risk Flags */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Risk Flags</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {riskFlags.map((flag, index) => (
                      <div 
                        key={index}
                        className={`flex items-start gap-2 p-2 rounded-md ${
                          flag.level === 'critical' ? 'bg-red-50 dark:bg-red-950/30' :
                          flag.level === 'warning' ? 'bg-amber-50 dark:bg-amber-950/30' :
                          'bg-blue-50 dark:bg-blue-950/30'
                        }`}
                      >
                        {flag.level === 'critical' && <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />}
                        {flag.level === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />}
                        {flag.level === 'info' && <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />}
                        <span className={`text-sm ${
                          flag.level === 'critical' ? 'text-red-700 dark:text-red-300' :
                          flag.level === 'warning' ? 'text-amber-700 dark:text-amber-300' :
                          'text-blue-700 dark:text-blue-300'
                        }`}>
                          {flag.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Recommended Terms */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Recommended Terms</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">Max Approved Amount</p>
                      <p className="font-bold text-emerald-700 dark:text-emerald-300">
                        {formatCurrency(result.maxLoanAmount)}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">Maximum Term</p>
                      <p className="font-bold text-blue-700 dark:text-blue-300">
                        {result.maxTenureDays} days
                      </p>
                    </div>
                  </div>
                  
                  {requestedAmount > result.maxLoanAmount && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        ⚠️ Requested amount exceeds recommendation by{' '}
                        {formatCurrency(requestedAmount - result.maxLoanAmount)}
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Decision Reasoning */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Decision Rationale</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                      Credit score of <strong>{result.score}</strong> places applicant in Grade{' '}
                      <strong>{result.grade}</strong> ({getGradeLabel(result.grade)})
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                      Confidence in score accuracy:{' '}
                      <strong>{result.confidenceLevel}%</strong> (data completeness)
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                      DTI ratio of <strong>{result.affordability.dtiRatio}%</strong>{' '}
                      {result.affordability.affordable 
                        ? 'is within acceptable limits' 
                        : 'exceeds recommended threshold'}
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                      Interest rate adjustment:{' '}
                      <strong>
                        {result.interestRateMultiplier <= 1 
                          ? `${((1 - result.interestRateMultiplier) * 100).toFixed(0)}% discount`
                          : `${((result.interestRateMultiplier - 1) * 100).toFixed(0)}% premium`
                        }
                      </strong>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Audit Trail Tab Content */}
          {activeTab === 'audit' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Audit Trail</CardTitle>
                <CardDescription>
                  Complete history of actions on this assessment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                  
                  <div className="space-y-4">
                    {auditTrail.map((entry, index) => (
                      <div key={entry.id} className="relative pl-10">
                        {/* Timeline dot */}
                        <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-background ${
                          entry.action.includes('OVERRIDE') ? 'bg-amber-500' :
                          entry.action.includes('APPROVE') || entry.action.includes('SCORE') ? 'bg-emerald-500' :
                          'bg-blue-500'
                        }`} />
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{entry.action.replace(/_/g, ' ')}</span>
                            <Badge variant="outline" className="text-xs">
                              {entry.user}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{entry.newValue}</p>
                          {entry.notes && (
                            <p className="text-xs italic text-muted-foreground">{entry.notes}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {entry.timestamp.toLocaleString('en-KE')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comparable Loans Tab Content */}
          {activeTab === 'comparable' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Comparable Applications</CardTitle>
                <CardDescription>
                  Similar profiles and their outcomes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {comparableLoans.length > 0 ? (
                  <div className="space-y-3">
                    {comparableLoans.map((loan, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold">{loan.score}</span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                loan.decision === 'APPROVE' ? 'border-emerald-500 text-emerald-600' :
                                loan.decision === 'DECLINE' ? 'border-red-500 text-red-600' :
                                'border-amber-500 text-amber-600'
                              }`}
                            >
                              {loan.decision}
                            </Badge>
                            {loan.outcome && (
                              <Badge variant="secondary" className="text-xs">
                                {loan.outcome}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(loan.amount)}
                          </p>
                        </div>
                        
                        {/* Visual comparison to current */}
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm">
                            {loan.score > result.score ? (
                              <TrendingUp className="w-4 h-4 text-emerald-600" />
                            ) : loan.score < result.score ? (
                              <TrendingDown className="w-4 h-4 text-red-600" />
                            ) : null}
                            <span className="text-muted-foreground">
                              {loan.score - result.score > 0 ? '+' : ''}{loan.score - result.score} pts
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Showing {comparableLoans.length} similar applications
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No comparable loans available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default ApplicationAssessmentView
