'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  FileText,
  User,
  DollarSign,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react'
import { LoanApplication, BulkActionResult } from './types'
import { formatCurrency, getRiskScoreColor, getPriorityBadge } from './mock-data'

interface BulkApprovalModalProps {
  open: boolean
  onClose: () => void
  applications: LoanApplication[]
  onComplete: (result: BulkActionResult) => void
}

export function BulkApprovalModal({ 
  open, 
  onClose, 
  applications, 
  onComplete 
}: BulkApprovalModalProps) {
  const [commonTerms, setCommonTerms] = useState(true)
  const [commonAmount, setCommonAmount] = useState<'requested' | 'custom'>('requested')
  const [commonInterestRate, setCommonInterestRate] = useState(18)
  const [comment, setComment] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState(0)
  const [showRiskDetails, setShowRiskDetails] = useState(false)
  const [result, setResult] = useState<BulkActionResult | null>(null)

  // Check for risk warnings
  const riskWarnings = applications.filter(app => 
    app.riskScore < 60 || app.amountRequested > 200000 || app.priority === 'high'
  )

  // Handle bulk approval
  const handleBulkApprove = async () => {
    if (confirmText !== 'APPROVE') {
      toast.error('Please type APPROVE to confirm')
      return
    }

    setIsProcessing(true)
    setResult(null)

    // Simulate processing steps
    const totalSteps = applications.length + 1
    
    for (let i = 0; i <= applications.length; i++) {
      setProcessingStep(i)
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    // Simulate result
    const successCount = Math.floor(applications.length * 0.9)
    const errorCount = applications.length - successCount

    const mockResult: BulkActionResult = {
      success: errorCount === 0,
      processed: applications.length,
      approved: successCount,
      rejected: 0,
      errors: errorCount > 0 ? applications.slice(0, errorCount).map(app => ({
        applicationId: app.id,
        error: 'Exposure limit exceeded'
      })) : [],
      warnings: riskWarnings.map(app => ({
        applicationId: app.id,
        warning: `High-risk application (score: ${app.riskScore})`
      }))
    }

    setResult(mockResult)
    setIsProcessing(false)

    if (errorCount === 0) {
      toast.success(`${successCount} applications approved successfully`)
    } else {
      toast.warning(`${successCount} approved, ${errorCount} had errors`)
    }
  }

  // Handle close with result
  const handleClose = () => {
    if (result) {
      onComplete(result)
    }
    // Reset state
    setCommonTerms(true)
    setCommonAmount('requested')
    setCommonInterestRate(18)
    setComment('')
    setConfirmText('')
    setIsProcessing(false)
    setProcessingStep(0)
    setShowRiskDetails(false)
    setResult(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Batch Approve Applications
          </DialogTitle>
          <DialogDescription>
            You are about to approve {applications.length} application{applications.length !== 1 ? 's' : ''} in batch
          </DialogDescription>
        </DialogHeader>

        {!result && !isProcessing && (
          <div className="space-y-6 py-4">
            {/* Risk Warnings */}
            {riskWarnings.length > 0 && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      Risk Warnings ({riskWarnings.length} application{riskWarnings.length !== 1 ? 's' : ''})
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Some applications have risk factors that may require individual review.
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-amber-700 p-0 h-auto mt-1"
                      onClick={() => setShowRiskDetails(!showRiskDetails)}
                    >
                      {showRiskDetails ? (
                        <><EyeOff className="w-4 h-4 mr-1" />Hide details</>
                      ) : (
                        <><Eye className="w-4 h-4 mr-1" />Show details</>
                      )}
                    </Button>

                    {showRiskDetails && (
                      <div className="mt-3 space-y-2">
                        {riskWarnings.map(app => {
                          const priority = getPriorityBadge(app.priority)
                          return (
                            <div key={app.id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded text-sm">
                              <div className="flex items-center gap-2">
                                <code className="font-mono">{app.applicationNumber}</code>
                                <span>{app.customerName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getRiskScoreColor(app.riskScore)}`}>
                                  Score: {app.riskScore}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${priority.className}`}>
                                  {priority.label}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Applications Summary */}
            <div>
              <h4 className="font-medium mb-3">Applications to Process</h4>
              <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">ID</th>
                      <th className="text-left p-2 font-medium">Customer</th>
                      <th className="text-right p-2 font-medium">Amount</th>
                      <th className="text-center p-2 font-medium">Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {applications.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-2 font-mono text-xs">{app.applicationNumber}</td>
                        <td className="p-2">{app.customerName}</td>
                        <td className="p-2 text-right font-medium">{formatCurrency(app.amountRequested)}</td>
                        <td className="p-2 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getRiskScoreColor(app.riskScore)}`}>
                            {app.riskScore}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Total Amount */}
              <div className="mt-3 flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                <span className="font-medium text-emerald-800 dark:text-emerald-200">Total Amount to Approve:</span>
                <span className="text-xl font-bold text-emerald-600">
                  {formatCurrency(applications.reduce((sum, app) => sum + app.amountRequested, 0))}
                </span>
              </div>
            </div>

            <Separator />

            {/* Approval Settings */}
            <div className="space-y-4">
              <h4 className="font-medium">Approval Settings</h4>

              {/* Common Terms Toggle */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <input
                  type="checkbox"
                  id="commonTerms"
                  checked={commonTerms}
                  onChange={(e) => setCommonTerms(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="commonTerms" className="cursor-pointer">
                  Apply same terms to all applications
                </Label>
              </div>

              {commonTerms ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6">
                  <div className="space-y-2">
                    <Label>Approved Amount</Label>
                    <Select value={commonAmount} onValueChange={(v) => setCommonAmount(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="requested">Use Requested Amount</SelectItem>
                        <SelectItem value="custom">Custom Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Interest Rate (% p.a.)</Label>
                    <Input
                      type="number"
                      value={commonInterestRate}
                      onChange={(e) => setCommonInterestRate(Number(e.target.value))}
                      min={10}
                      max={30}
                      step={0.5}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                  Each application will be reviewed individually during processing.
                </div>
              )}

              {/* Comment */}
              <div className="space-y-2">
                <Label>Comment (required)</Label>
                <Textarea
                  placeholder="Provide justification for this batch approval..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <Separator />

            {/* Confirmation */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-500" />
                Final Confirmation
              </h4>
              
              <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                  This action will approve all listed applications. This cannot be undone easily.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="confirmText">
                    Type <strong>APPROVE</strong> to confirm:
                  </Label>
                  <Input
                    id="confirmText"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                    placeholder="APPROVE"
                    className="font-mono uppercase"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="py-8 space-y-6">
            <div className="text-center">
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-emerald-500 mb-4" />
              <h3 className="text-lg font-semibold">Processing Applications...</h3>
              <p className="text-muted-foreground mt-1">
                Please wait while we process your request
              </p>
            </div>

            <Progress 
              value={(processingStep / (applications.length + 1)) * 100} 
              className="h-3"
            />

            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{processingStep} of {applications.length + 1} steps completed</span>
              <span>{Math.round((processingStep / (applications.length + 1)) * 100)}%</span>
            </div>

            {processingStep > 0 && processingStep <= applications.length && (
              <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm">
                <FileText className="w-4 h-4 shrink-0" />
                <span>Processing: {applications[processingStep - 1]?.applicationNumber} - {applications[processingStep - 1]?.customerName}</span>
              </div>
            )}
          </div>
        )}

        {/* Result State */}
        {result && !isProcessing && (
          <div className="py-4 space-y-6">
            <div className={`text-center p-6 rounded-lg ${
              result.success 
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
            }`}>
              {result.success ? (
                <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500 mb-4" />
              ) : (
                <AlertTriangle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
              )}
              <h3 className="text-xl font-bold">
                {result.success ? 'Batch Approval Complete!' : 'Batch Approval Completed with Issues'}
              </h3>
            </div>

            {/* Results Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  <p className="text-3xl font-bold text-emerald-600">{result.approved}</p>
                  <p className="text-sm text-muted-foreground">Approved</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <XCircle className="w-8 h-8 mx-auto text-red-500 mb-2" />
                  <p className="text-3xl font-bold text-red-600">{result.rejected}</p>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                  <p className="text-3xl font-bold text-amber-600">{result.errors.length}</p>
                  <p className="text-sm text-muted-foreground">Errors</p>
                </CardContent>
              </Card>
            </div>

            {/* Errors List */}
            {result.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-600">Applications with Errors:</h4>
                {result.errors.map((err, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-sm">
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <code className="font-mono">{err.applicationId}</code>
                    <span className="text-red-700 dark:text-red-300">{err.error}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Warnings List */}
            {result.warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-amber-600">Warnings:</h4>
                {result.warnings.map((warn, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <code className="font-mono">{warn.applicationId}</code>
                    <span className="text-amber-700 dark:text-amber-300">{warn.warning}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <DialogFooter>
          {!result && !isProcessing && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button 
                onClick={handleBulkApprove}
                disabled={!comment.trim() || confirmText !== 'APPROVE'}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirm Batch Approval
              </Button>
            </>
          )}
          
          {result && !isProcessing && (
            <Button onClick={handleClose} className="w-full">
              Close and Return to Queue
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BulkApprovalModal
