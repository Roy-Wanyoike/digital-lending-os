'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  CheckCircle2,
  Circle,
  Loader2,
  Clock,
  ChevronDown,
  ChevronRight,
  User,
  Calendar,
  MessageSquare,
  AlertTriangle,
  ArrowLeftRight,
  FileText
} from 'lucide-react'
import { WorkflowHistory } from './types'
import { formatDate } from './mock-data'

interface ApprovalWorkflowTrackerProps {
  workflowHistory: WorkflowHistory
}

export function ApprovalWorkflowTracker({ workflowHistory }: ApprovalWorkflowTrackerProps) {
  const [showAuditTrail, setShowAuditTrail] = useState(false)

  // Get step icon based on status
  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-6 h-6 text-emerald-500" />
      case 'current':
        return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      case 'skipped':
        return <Circle className="w-6 h-6 text-slate-300" />
      default:
        return <Circle className="w-6 h-6 text-slate-300" />
    }
  }

  // Get step color classes
  const getStepClasses = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30'
      case 'current':
        return 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30 ring-2 ring-blue-200'
      case 'skipped':
        return 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/30 opacity-50'
      default:
        return 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/30'
    }
  }

  // Calculate SLA status for current step
  const getCurrentStepSLA = () => {
    const currentStep = workflowHistory.steps.find(s => s.status === 'current')
    if (!currentStep || !currentStep.slaTarget) return null
    
    const elapsed = currentStep.duration || 0
    const target = currentStep.slaTarget
    const percentage = Math.min(100, (elapsed / target) * 100)
    
    if (percentage > 100) return { percentage: 100, status: 'overdue' as const, text: `${Math.ceil(elapsed - target)}h overdue` }
    if (percentage > 75) return { percentage, status: 'warning' as const, text: `${Math.ceil(target - elapsed)}h remaining` }
    return { percentage, status: 'on-track' as const, text: `${Math.ceil(target - elapsed)}h remaining` }
  }

  const slaStatus = getCurrentStepSLA()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Application Workflow</h3>
          <p className="text-sm text-muted-foreground">
            Track the progress of this application through each stage
          </p>
        </div>
        <Badge variant="outline" className={workflowHistory.currentStep === 'disbursement' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}>
          Current Stage: <span className="capitalize ml-1">{workflowHistory.currentStep.replace('_', ' ')}</span>
        </Badge>
      </div>

      {/* Visual Stepper */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            {/* Connection Line */}
            <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

            {/* Steps */}
            <div className="space-y-0">
              {workflowHistory.steps.map((step, index) => {
                const isLast = index === workflowHistory.steps.length - 1
                const isCurrent = step.status === 'current'

                return (
                  <div key={step.step} className={`relative flex gap-4 ${!isLast ? 'pb-8 sm:pb-10' : ''}`}>
                    {/* Step Icon */}
                    <div className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${getStepClasses(step.status)}`}>
                      {getStepIcon(step.status)}
                    </div>

                    {/* Step Content */}
                    <div className={`flex-1 pt-1 min-w-0 ${isCurrent ? '-mt-1' : ''}`}>
                      <div className={`rounded-lg p-4 border transition-all ${getStepClasses(step.status)}`}>
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className={`font-semibold ${step.status === 'pending' ? 'text-muted-foreground' : ''}`}>
                              {step.stepName}
                            </h4>
                            {step.assignedUser && (
                              <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                                <User className="w-3 h-3" />
                                <span>{step.assignedUser}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge 
                              variant="outline"
                              className={
                                step.status === 'completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                step.status === 'current' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                step.status === 'skipped' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                'bg-slate-100 text-slate-500 border-slate-200'
                              }
                            >
                              {step.status === 'completed' && <>Completed</>}
                              {step.status === 'current' && <>In Progress</>}
                              {step.status === 'pending' && <>Pending</>}
                              {step.status === 'skipped' && <>Skipped</>}
                            </Badge>
                          </div>
                        </div>

                        {/* Timestamp and Comments */}
                        {(step.timestamp || step.comments) && (
                          <div className="mt-3 space-y-2">
                            {step.timestamp && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                <span>{formatDate(step.timestamp)}</span>
                                {step.duration !== undefined && (
                                  <Badge variant="secondary" className="ml-2 text-xs">
                                    {step.duration}h
                                  </Badge>
                                )}
                              </div>
                            )}
                            {step.comments && (
                              <div className="flex items-start gap-2 p-2 bg-white/50 dark:bg-black/10 rounded text-sm">
                                <MessageSquare className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />
                                <span>{step.comments}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* SLA Indicator for current step */}
                        {isCurrent && slaStatus && (
                          <div className="mt-3 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                SLA Status
                              </span>
                              <span className={
                                slaStatus.status === 'overdue' ? 'text-red-600 font-medium' :
                                slaStatus.status === 'warning' ? 'text-amber-600 font-medium' :
                                'text-emerald-600 font-medium'
                              }>
                                {slaStatus.text}
                              </span>
                            </div>
                            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all ${
                                  slaStatus.status === 'overdue' ? 'bg-red-500' :
                                  slaStatus.status === 'warning' ? 'bg-amber-500' :
                                  'bg-emerald-500'
                                }`}
                                style={{ width: `${slaStatus.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Return Loopback Arrow (if applicable) */}
                    {!isLast && workflowHistory.returnHistory?.some(r => r.toStep === step.step) && (
                      <div className="absolute right-0 top-16 hidden lg:block">
                        <div className="flex items-center gap-1 text-amber-600 text-xs">
                          <ArrowLeftRight className="w-4 h-4" />
                          <span>Returned</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Return History (if any) */}
          {workflowHistory.returnHistory && workflowHistory.returnHistory.length > 0 && (
            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-3 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4" />
                Return History
              </h4>
              <div className="space-y-2">
                {workflowHistory.returnHistory.map((returnEvent) => (
                  <div key={returnEvent.eventId} className="flex items-center gap-3 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <span className="text-amber-800 dark:text-amber-200">
                        Returned from <strong>{returnEvent.fromStep.replace('_', ' ')}</strong> to{' '}
                        <strong>{returnEvent.toStep.replace('_', ' ')}</strong>
                      </span>
                      <span className="text-muted-foreground ml-2">by {returnEvent.returnedBy}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{returnEvent.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Trail */}
      <Card>
        <Collapsible open={showAuditTrail} onOpenChange={setShowAuditTrail}>
          <CardHeader className="cursor-pointer" onClick={() => setShowAuditTrail(!showAuditTrail)}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-500" />
                Audit Trail
              </CardTitle>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {showAuditTrail ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
            <CardDescription>
              Complete history of all actions on this application ({workflowHistory.auditTrail.length} entries)
            </CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {[...workflowHistory.auditTrail].reverse().map((entry) => (
                  <div key={entry.entryId} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{entry.action.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{entry.details}</p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(entry.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">by {entry.user}</span>
                        {entry.previousStatus && entry.newStatus && (
                          <>
                            <Badge variant="outline" className="text-xs py-0 px-1.5">
                              {entry.previousStatus}
                            </Badge>
                            <span className="text-xs text-muted-foreground">→</span>
                            <Badge variant="outline" className="text-xs py-0 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200">
                              {entry.newStatus}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  )
}

export default ApprovalWorkflowTracker
