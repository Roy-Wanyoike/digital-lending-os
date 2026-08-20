'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  CheckCircle2,
  XCircle,
  ArrowLeftRight,
  ArrowUpRight,
  User,
  Clock,
  Shield,
  AlertTriangle,
  MessageSquare
} from 'lucide-react'
import { DecisionRecord, PendingApproval, EscalationChain } from './types'
import { formatDate } from './mock-data'

interface DecisionHistoryPanelProps {
  decisions: DecisionRecord[]
  pendingApprovals?: PendingApproval[]
  escalationChain?: EscalationChain
}

export function DecisionHistoryPanel({ 
  decisions, 
  pendingApprovals = [], 
  escalationChain 
}: DecisionHistoryPanelProps) {
  // Get decision icon and style
  const getDecisionStyle = (decision: string) => {
    switch (decision) {
      case 'approved':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
          badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          label: 'Approved',
          borderClass: 'border-l-emerald-500'
        }
      case 'rejected':
        return {
          icon: <XCircle className="w-5 h-5 text-red-500" />,
          badgeClass: 'bg-red-100 text-red-700 border-red-200',
          label: 'Rejected',
          borderClass: 'border-l-red-500'
        }
      case 'returned':
        return {
          icon: <ArrowLeftRight className="w-5 h-5 text-amber-500" />,
          badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
          label: 'Returned to Maker',
          borderClass: 'border-l-amber-500'
        }
      case 'escalated':
        return {
          icon: <ArrowUpRight className="w-5 h-5 text-purple-500" />,
          badgeClass: 'bg-purple-100 text-purple-700 border-purple-200',
          label: 'Escalated',
          borderClass: 'border-l-purple-500'
        }
      default:
        return {
          icon: <Clock className="w-5 h-5 text-slate-400" />,
          badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
          label: decision,
          borderClass: 'border-l-slate-400'
        }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Decision History</h3>
        <p className="text-sm text-muted-foreground">
          Complete record of all decisions made on this application
        </p>
      </div>

      {/* Escalation Chain (if any) */}
      {escalationChain && (
        <Card className="border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                <ArrowUpRight className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-purple-800 dark:text-purple-200">Escalation Active</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  This application was escalated from <strong>{escalationChain.escalatedFrom}</strong> to{' '}
                  <strong>{escalationChain.escalatedTo}</strong> on{' '}
                  {formatDate(escalationChain.escalatedAt)}
                </p>
                <p className="text-sm mt-1">
                  <span className="font-medium">Reason:</span> {escalationChain.reason}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Currently assigned to: <strong>{escalationChain.currentAssignee}</strong>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Decision Timeline */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-5 h-5 text-blue-600" />
            Review Timeline
          </CardTitle>
          <CardDescription>
            {decisions.length} decision{decisions.length !== 1 ? 's' : ''} recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {decisions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No decisions recorded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {decisions.map((decision, index) => {
                const style = getDecisionStyle(decision.decision)
                
                return (
                  <div key={decision.decisionId}>
                    <div className={`flex gap-4 p-4 rounded-lg border-l-4 ${style.borderClass} bg-slate-50 dark:bg-slate-800/50`}>
                      {/* Icon */}
                      <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        decision.decision === 'approved' ? 'bg-emerald-100' :
                        decision.decision === 'rejected' ? 'bg-red-100' :
                        decision.decision === 'returned' ? 'bg-amber-100' :
                        decision.decision === 'escalated' ? 'bg-purple-100' :
                        'bg-slate-100'
                      }`}>
                        {style.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold">{decision.decisionByName}</h4>
                              <Badge variant="outline" className={style.badgeClass}>
                                {style.label}
                              </Badge>
                              {decision.isOverride && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Override
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{decision.role}</p>
                          </div>
                          <div className="text-right text-sm text-muted-foreground shrink-0">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(decision.timestamp)}
                            </div>
                          </div>
                        </div>

                        {/* Comments */}
                        {decision.comments && (
                          <div className="mt-3 p-3 bg-white dark:bg-slate-900 rounded-md text-sm">
                            <p>{decision.comments}</p>
                          </div>
                        )}

                        {/* Conditions (if any) */}
                        {decision.conditions && (
                          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded text-sm">
                            <p className="font-medium text-blue-800 dark:text-blue-200">Conditions:</p>
                            <p className="text-blue-700 dark:text-blue-300">{decision.conditions}</p>
                          </div>
                        )}

                        {/* Override Reason */}
                        {decision.isOverride && decision.overrideReason && (
                          <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded text-sm">
                            <p className="font-medium text-red-800 dark:text-red-200">Override Reason:</p>
                            <p className="text-red-700 dark:text-red-300">{decision.overrideReason}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Connector line */}
                    {index < decisions.length - 1 && (
                      <div className="ml-5 pl-5 border-l-2 border-dashed border-slate-200 dark:border-slate-700 my-2"></div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Approvals Section */}
      {pendingApprovals && pendingApprovals.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="w-5 h-5 text-amber-600" />
              Pending Approvals
            </CardTitle>
            <CardDescription>
              The following approvals are still required for this application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingApprovals.map((approval) => (
                <div 
                  key={approval.approverId}
                  className={`flex items-center gap-4 p-4 rounded-lg border ${
                    approval.status === 'completed' 
                      ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800'
                      : 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    approval.status === 'completed' 
                      ? 'bg-emerald-100 text-emerald-600' 
                      : 'bg-amber-100 text-amber-600'
                  }`}>
                    <User className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{approval.approverName}</p>
                      <Badge variant="outline" className="text-xs">
                        Level {approval.level}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{approval.role}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Required for amounts ≥ KES {approval.requiredForAmount.toLocaleString()}
                    </p>
                  </div>

                  <Badge 
                    variant={approval.status === 'completed' ? 'default' : 'secondary'}
                    className={
                      approval.status === 'completed' 
                        ? 'bg-emerald-600' 
                        : ''
                    }
                  >
                    {approval.status === 'completed' ? (
                      <><CheckCircle2 className="w-3 h-3 mr-1" />Completed</>
                    ) : (
                      <><Clock className="w-3 h-3 mr-1" />Pending</>
                    )}
                  </Badge>
                </div>
              ))}
            </div>

            {/* Approval Progress Indicator */}
            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Approval Progress</span>
                <span className="font-medium">
                  {pendingApprovals.filter(a => a.status === 'completed').length} / {pendingApprovals.length} completed
                </span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all"
                  style={{ 
                    width: `${(pendingApprovals.filter(a => a.status === 'completed').length / pendingApprovals.length) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500 mb-1" />
            <p className="text-2xl font-bold text-emerald-600">
              {decisions.filter(d => d.decision === 'approved').length}
            </p>
            <p className="text-xs text-muted-foreground">Approvals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="w-6 h-6 mx-auto text-red-500 mb-1" />
            <p className="text-2xl font-bold text-red-600">
              {decisions.filter(d => d.decision === 'rejected').length}
            </p>
            <p className="text-xs text-muted-foreground">Rejections</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <ArrowLeftRight className="w-6 h-6 mx-auto text-amber-500 mb-1" />
            <p className="text-2xl font-bold text-amber-600">
              {decisions.filter(d => d.decision === 'returned').length}
            </p>
            <p className="text-xs text-muted-foreground">Returns</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 mx-auto text-purple-500 mb-1" />
            <p className="text-2xl font-bold text-purple-600">
              {decisions.filter(d => d.isOverride).length}
            </p>
            <p className="text-xs text-muted-foreground">Overrides</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DecisionHistoryPanel
