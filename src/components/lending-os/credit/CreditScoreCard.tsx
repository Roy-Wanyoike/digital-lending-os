'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  DollarSign,
  Clock,
  Percent
} from 'lucide-react'
import type { CreditScoreOutput as CreditScoreResult } from '@/lib/credit-engine'
import { formatCurrency, getGradeColor, getGradeLabel, getRiskColor, getDecisionColor } from '@/lib/credit-engine'

interface CreditScoreCardProps {
  result: CreditScoreResult
  showDetails?: boolean
  compact?: boolean
  className?: string
}

export function CreditScoreCard({ 
  result, 
  showDetails = true, 
  compact = false,
  className = '' 
}: CreditScoreCardProps) {
  const gradeColor = getGradeColor(result.grade)
  const riskColor = getRiskColor(result.riskLevel)
  const decisionColor = getDecisionColor(result.decision)

  if (compact) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: gradeColor }}
              >
                {result.score}
              </div>
              <div>
                <p className="font-semibold">Grade {result.grade}</p>
                <p className="text-xs text-muted-foreground">{getGradeLabel(result.grade)}</p>
              </div>
            </div>
            <Badge 
              variant="outline" 
              className="text-white border-0"
              style={{ backgroundColor: decisionColor }}
            >
              {result.decision}
            </Badge>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* Header with gradient based on grade */}
      <CardHeader 
        className="pb-4"
        style={{ 
          background: `linear-gradient(135deg, ${gradeColor}15 0%, ${gradeColor}08 100%)` 
        }}
      >
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="w-5 h-5" style={{ color: gradeColor }} />
          CREDIT ASSESSMENT
        </CardTitle>
        <CardDescription>
          Automated credit scoring and risk evaluation
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-2">
        {/* Score Display */}
        <div className="flex flex-col items-center py-4">
          <div 
            className="relative w-32 h-32 rounded-2xl flex flex-col items-center justify-center shadow-lg"
            style={{ 
              background: `linear-gradient(145deg, ${gradeColor}, ${gradeColor}cc)`,
            }}
          >
            <span className="text-4xl font-bold text-white">{result.score}</span>
            <Badge 
              className="mt-1 bg-white/20 text-white border-0 hover:bg-white/30"
            >
              Grade {result.grade}
            </Badge>
            
            {/* Confidence indicator */}
            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1.5 shadow-md">
              <span className="text-xs font-medium text-muted-foreground">
                {result.confidenceLevel}% conf.
              </span>
            </div>
          </div>
          
          <p className="mt-3 text-sm font-medium" style={{ color: gradeColor }}>
            {getGradeLabel(result.grade)} Credit Profile
          </p>
          
          <Badge 
            variant="outline" 
            className="mt-2"
            style={{ borderColor: riskColor, color: riskColor }}
          >
            {result.riskLevel.replace('_', ' ')} RISK
          </Badge>
        </div>

        {/* Key Metrics */}
        {showDetails && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs">Max Recommended</span>
              </div>
              <p className="font-semibold text-sm">{formatCurrency(result.maxLoanAmount)}</p>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Max Term</span>
              </div>
              <p className="font-semibold text-sm">{result.maxTenureDays} days</p>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Percent className="w-4 h-4" />
                <span className="text-xs">Rate Modifier</span>
              </div>
              <p className={`font-semibold text-sm ${
                result.interestRateMultiplier <= 1 ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {result.interestRateMultiplier <= 1 ? '-' : '+'}
                {Math.abs((result.interestRateMultiplier - 1) * 100).toFixed(0)}%
              </p>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Shield className="w-4 h-4" />
                <span className="text-xs">Decision</span>
              </div>
              <Badge 
                variant="outline" 
                className="text-xs"
                style={{ borderColor: decisionColor, color: decisionColor }}
              >
                {result.decision}
              </Badge>
            </div>
          </div>
        )}

        {/* Positive Factors */}
        {showDetails && result.reasons.positive.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Positive Factors ({result.reasons.positive.length})
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {result.reasons.positive.map((factor, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between text-sm bg-emerald-50 dark:bg-emerald-950/30 rounded px-3 py-2"
                >
                  <span>{factor.factor}</span>
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <TrendingUp className="w-3 h-3" />
                    +{factor.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Negative Factors */}
        {showDetails && result.reasons.negative.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4" />
              Negative Factors ({result.reasons.negative.length})
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {result.reasons.negative.map((factor, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between text-sm bg-red-50 dark:bg-red-950/30 rounded px-3 py-2"
                >
                  <span>{factor.factor}</span>
                  <span className="flex items-center gap-1 text-red-600 font-medium">
                    <TrendingDown className="w-3 h-3" />
                    {factor.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No factors message */}
        {showDetails && result.reasons.positive.length === 0 && result.reasons.negative.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Minus className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No factors recorded</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default CreditScoreCard
