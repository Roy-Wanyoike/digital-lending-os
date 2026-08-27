'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Settings,
  Save,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Shield,
  AlertCircle,
  CheckCircle2,
  Users,
  DollarSign
} from 'lucide-react'
import type { CreditPolicy } from '@/lib/credit-engine'
import { DEFAULT_CREDIT_POLICY } from '@/lib/credit-engine'

interface CreditPolicyEditorProps {
  initialPolicy?: CreditPolicy
  onPolicyChange?: (policy: CreditPolicy) => void
  onSave?: (policy: CreditPolicy) => Promise<void>
  readOnly?: boolean
  showPreview?: boolean
  className?: string
}

export function CreditPolicyEditor({
  initialPolicy = DEFAULT_CREDIT_POLICY,
  onPolicyChange,
  onSave,
  readOnly = false,
  showPreview = true,
  className = ''
}: CreditPolicyEditorProps) {
  const [policy, setPolicy] = useState<CreditPolicy>(initialPolicy)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const updatePolicy = useCallback((updates: Partial<CreditPolicy>) => {
    setPolicy(prev => {
      const newPolicy = { ...prev, ...updates }
      onPolicyChange?.(newPolicy)
      return newPolicy
    })
  }, [onPolicyChange])

  const updateInterestAdjustments = useCallback(
    (riskLevel: keyof CreditPolicy['interestRateAdjustments'], value: number) => {
      setPolicy(prev => {
        const newPolicy = {
          ...prev,
          interestRateAdjustments: {
            ...prev.interestRateAdjustments,
            [riskLevel]: value / 100 // Convert to decimal
          }
        }
        onPolicyChange?.(newPolicy)
        return newPolicy
      })
    },
    [onPolicyChange]
  )

  const updateLoanLimit = useCallback(
    (grade: keyof CreditPolicy['loanLimitsByGrade'], field: 'maxAmount' | 'maxTenureDays', value: number) => {
      setPolicy(prev => {
        const newPolicy = {
          ...prev,
          loanLimitsByGrade: {
            ...prev.loanLimitsByGrade,
            [grade]: {
              ...prev.loanLimitsByGrade[grade],
              [field]: value
            }
          }
        }
        onPolicyChange?.(newPolicy)
        return newPolicy
      })
    },
    [onPolicyChange]
  )

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave?.(policy)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to save policy:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setPolicy(DEFAULT_CREDIT_POLICY)
    onPolicyChange?.(DEFAULT_CREDIT_POLICY)
  }

  const hasChanges = JSON.stringify(policy) !== JSON.stringify(initialPolicy)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Credit Policy Configuration
              </CardTitle>
              <CardDescription>
                Configure credit scoring thresholds and lending parameters
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  Unsaved changes
                </Badge>
              )}
              {readOnly && (
                <Badge variant="secondary">Read-only mode</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        {!readOnly && (
          <CardContent className="flex gap-3 pb-4">
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || isSaving}
              className="gap-2"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Basic Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            Approval Thresholds
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Minimum Credit Score */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="minScore">Minimum Credit Score</Label>
              <span className="font-mono font-bold text-lg">{policy.minCreditScore}</span>
            </div>
            <Slider
              id="minScore"
              min={300}
              max={700}
              step={10}
              value={[policy.minCreditScore]}
              onValueChange={([value]) => updatePolicy({ minCreditScore: value })}
              disabled={readOnly}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Lenient (300)</span>
              <span>Strict (700)</span>
            </div>
          </div>

          {/* Auto-Approve Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="autoApprove">Auto-Approve Threshold</Label>
              <span className="font-mono font-bold text-lg">{policy.autoApproveThreshold}</span>
            </div>
            <Slider
              id="autoApprove"
              min={500}
              max={800}
              step={10}
              value={[policy.autoApproveThreshold]}
              onValueChange={([value]) => updatePolicy({ autoApproveThreshold: value })}
              disabled={readOnly}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Careful (500)</span>
              <span>Aggressive (800)</span>
            </div>
          </div>

          {/* Max DTI Ratio */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxDti">Maximum DTI Ratio</Label>
              <span className="font-mono font-bold text-lg">{(policy.maxDtiRatio * 100).toFixed(0)}%</span>
            </div>
            <Slider
              id="maxDti"
              min={20}
              max={80}
              step={5}
              value={[Math.round(policy.maxDtiRatio * 100)]}
              onValueChange={([value]) => updatePolicy({ maxDtiRatio: value / 100 })}
              disabled={readOnly}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Conservative (20%)</span>
              <span>Risky (80%)</span>
            </div>
          </div>

          {/* Max Loan Amount */}
          <div className="space-y-2">
            <Label htmlFor="maxAmount">Maximum Loan Amount (KSh)</Label>
            <Input
              id="maxAmount"
              type="number"
              value={policy.maxLoanAmount}
              onChange={(e) => updatePolicy({ maxLoanAmount: Number(e.target.value) })}
              disabled={readOnly}
              className="font-mono"
            />
          </div>
        </CardContent>
      </Card>

      {/* Requirements Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-600" />
            Application Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label>Require KYC Verification</Label>
              <p className="text-xs text-muted-foreground">
                Applicants must complete identity verification
              </p>
            </div>
            <Switch
              checked={policy.requireKyc}
              onCheckedChange={(checked) => updatePolicy({ requireKyc: checked })}
              disabled={readOnly}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label>Require Employment Verification</Label>
              <p className="text-xs text-muted-foreground">
                Applicants must provide proof of employment
              </p>
            </div>
            <Switch
              checked={policy.requireEmployment}
              onCheckedChange={(checked) => updatePolicy({ requireEmployment: checked })}
              disabled={readOnly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Interest Rate Adjustments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            Interest Rate Adjustments by Risk Level
          </CardTitle>
          <CardDescription>
            Multipliers applied to base rate (1.00 = base rate)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {([
            { key: 'lowRisk' as const, label: 'Low Risk (Grade A)', color: 'text-emerald-600', icon: TrendingDown },
            { key: 'mediumRisk' as const, label: 'Medium Risk (Grade B-C)', color: 'text-yellow-600', icon: TrendingUp },
            { key: 'highRisk' as const, label: 'High Risk (Grade D)', color: 'text-orange-600', icon: TrendingUp },
            { key: 'veryHighRisk' as const, label: 'Very High Risk (Grade E)', color: 'text-red-600', icon: TrendingUp }
          ]).map(({ key, label, color, icon: Icon }) => (
            <div key={key} className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${color}`} />
                  {label}
                </Label>
                <span className={`font-mono font-bold ${color}`}>
                  {(policy.interestRateAdjustments[key] * 100).toFixed(0)}%
                </span>
              </div>
              <Slider
                min={50}
                max={200}
                step={5}
                value={[Math.round(policy.interestRateAdjustments[key] * 100)]}
                onValueChange={([value]) => updateInterestAdjustments(key, value)}
                disabled={readOnly}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>-50% discount</span>
                <span>+100% premium</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Loan Limits by Grade */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-amber-600" />
            Loan Limits by Grade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(['A', 'B', 'C', 'D', 'E'] as const).map((grade) => (
              <div 
                key={grade}
                className="grid grid-cols-[60px_1fr_1fr_auto] gap-3 items-center p-3 rounded-lg bg-muted/50"
              >
                <Badge 
                  variant="outline" 
                  className="justify-center font-bold"
                  style={{ 
                    borderColor: grade === 'A' ? '#22c55e' : 
                               grade === 'B' ? '#84cc16' :
                               grade === 'C' ? '#eab308' :
                               grade === 'D' ? '#f97316' : '#ef4444',
                    color: grade === 'A' ? '#22c55e' : 
                           grade === 'B' ? '#84cc16' :
                           grade === 'C' ? '#eab308' :
                           grade === 'D' ? '#f97316' : '#ef4444'
                  }}
                >
                  Grade {grade}
                </Badge>
                
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Max Amount (KSh)</label>
                  <Input
                    type="number"
                    value={policy.loanLimitsByGrade[grade].maxAmount}
                    onChange={(e) => updateLoanLimit(grade, 'maxAmount', Number(e.target.value))}
                    disabled={readOnly}
                    className="h-8 text-sm font-mono"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Max Term (days)</label>
                  <Input
                    type="number"
                    value={policy.loanLimitsByGrade[grade].maxTenureDays}
                    onChange={(e) => updateLoanLimit(grade, 'maxTenureDays', Number(e.target.value))}
                    disabled={readOnly}
                    className="h-8 text-sm font-mono"
                  />
                </div>

                <div className="text-right text-xs text-muted-foreground">
                  ~{(policy.loanLimitsByGrade[grade].maxAmount / policy.loanLimitsByGrade[grade].maxTenureDays * 30).toLocaleString()}/mo*
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground text-right">
              *Estimated monthly payment at maximum terms
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preview Impact Section */}
      {showPreview && hasChanges && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              Policy Change Impact Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <ImpactItem
                label="Approval rate impact"
                before={`${getExpectedApprovalRate(initialPolicy)}%`}
                after={`${getExpectedApprovalRate(policy)}%`}
                improved={getExpectedApprovalRate(policy) > getExpectedApprovalRate(initialPolicy)}
              />
              <ImpactItem
                label="Average loan size"
                before={`KSh ${getAverageLoanSize(initialPolicy).toLocaleString()}`}
                after={`KSh ${getAverageLoanSize(policy).toLocaleString()}`}
                improved={getAverageLoanSize(policy) > getAverageLoanSize(initialPolicy)}
              />
              <ImpactItem
                label="Risk exposure"
                before={initialPolicy.maxDtiRatio > 0.5 ? 'Higher' : 'Standard'}
                after={policy.maxDtiRatio > 0.5 ? 'Higher' : 'Standard'}
                improved={policy.maxDtiRatio <= initialPolicy.maxDtiRatio}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Helper component for impact preview
function ImpactItem({ 
  label, 
  before, 
  after, 
  improved 
}: { 
  label: string; 
  before: string; 
  after: string; 
  improved: boolean 
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-blue-100 dark:border-blue-900 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className="line-through opacity-60">{before}</span>
        <span className={improved ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
          {after}
        </span>
        {improved ? (
          <TrendingUp className="w-4 h-4 text-emerald-600" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-600" />
        )}
      </div>
    </div>
  )
}

// Helper functions for impact calculation
function getExpectedApprovalRate(policy: CreditPolicy): number {
  // Simplified estimation based on threshold settings
  let baseRate = 65
  
  if (policy.minCreditScore < 450) baseRate += 15
  else if (policy.minCreditScore > 550) baseRate -= 20
  
  if (policy.autoApproveThreshold < 600) baseRate += 10
  else if (policy.autoApproveThreshold > 700) baseRate -= 10
  
  if (policy.maxDtiRatio > 0.55) baseRate += 8
  else if (policy.maxDtiRatio < 0.40) baseRate -= 12
  
  return Math.max(20, Math.min(95, baseRate))
}

function getAverageLoanSize(policy: CreditPolicy): number {
  // Weighted average across grades
  const weights = { A: 0.05, B: 0.25, C: 0.35, D: 0.25, E: 0.1 }
  return Object.entries(weights).reduce(
    (sum, [grade, weight]) => sum + policy.loanLimitsByGrade[grade as keyof typeof weights].maxAmount * weight,
    0
  )
}

export default CreditPolicyEditor
