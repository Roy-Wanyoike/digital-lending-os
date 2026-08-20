'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts'
import {
  Calculator,
  User,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Info,
  TrendingUp,
  Shield,
  FileText
} from 'lucide-react'

// TypeScript interfaces
export interface ScoreFactor {
  id: string
  name: string
  weight: number // percentage weight
  maxScore: number
  currentScore: number
  description: string
  icon: React.ReactNode
}

export interface CreditApplicant {
  id: string
  fullName: string
  phone: string
  nationalId: string
  employmentStatus: string
  employerName?: string
  monthlyIncome: number
  age: number
  mpesaAgeMonths: number
}

export interface CreditAssessment {
  totalScore: number
  grade: string
  recommendation: 'APPROVE' | 'APPROVE_CONDITIONS' | 'REFER' | 'DECLINE'
  maxLoanAmount: number
  recommendedInterestRate: number
  factors: ScoreFactor[]
}

// Sample applicant data
const sampleApplicants: CreditApplicant[] = [
  {
    id: 'APP-001',
    fullName: 'Grace Wanjiku Mwangi',
    phone: '+254 723 456 789',
    nationalId: '28456789',
    employmentStatus: 'EMPLOYED',
    employerName: 'Safaricom PLC',
    monthlyIncome: 85000,
    age: 32,
    mpesaAgeMonths: 48
  },
  {
    id: 'APP-002',
    fullName: 'Daniel Kipchoge',
    phone: '+254 711 234 567',
    nationalId: '12345678',
    employmentStatus: 'SELF_EMPLOYED',
    employerName: 'Kipchoge Logistics Ltd',
    monthlyIncome: 120000,
    age: 28,
    mpesaAgeMonths: 24
  },
  {
    id: 'APP-003',
    fullName: 'Mary Atieno Oloo',
    phone: '+254 734 567 890',
    nationalId: '34567890',
    employmentStatus: 'EMPLOYED',
    employerName: 'Equity Bank Kenya',
    monthlyIncome: 65000,
    age: 45,
    mpesaAgeMonths: 72
  }
]

// Initial score factors with weights
const initialFactors: ScoreFactor[] = [
  {
    id: 'crb-history',
    name: 'CRB History',
    weight: 30,
    maxScore: 300,
    currentScore: 265,
    description: 'Credit Reference Bureau record including defaults, inquiries, and credit utilization history',
    icon: <FileText className="w-5 h-5" />
  },
  {
    id: 'repayment-behavior',
    name: 'Repayment Behavior',
    weight: 25,
    maxScore: 250,
    currentScore: 220,
    description: 'Historical loan repayment patterns, timeliness, and consistency across all lenders',
    icon: <TrendingUp className="w-5 h-5" />
  },
  {
    id: 'income-stability',
    name: 'Income Stability',
    weight: 20,
    maxScore: 200,
    currentScore: 175,
    description: 'Employment duration, income regularity, and source reliability assessment',
    icon: <Shield className="w-5 h-5" />
  },
  {
    id: 'loan-utilization',
    name: 'Loan Utilization',
    weight: 15,
    maxScore: 150,
    currentScore: 125,
    description: 'Current debt levels relative to income and available credit limits',
    icon: <Calculator className="w-5 h-5" />
  },
  {
    id: 'tenure-age',
    name: 'Tenure / Customer Age',
    weight: 10,
    maxScore: 100,
    currentScore: 82,
    description: 'M-Pesa account age, banking relationship duration, and customer loyalty metrics',
    icon: <User className="w-5 h-5" />
  }
]

// Helper functions
const getGradeFromScore = (score: number): string => {
  if (score >= 800) return 'A+'
  if (score >= 700) return 'A'
  if (score >= 600) return 'B+'
  if (score >= 500) return 'B'
  if (score >= 400) return 'C'
  if (score >= 300) return 'D'
  return 'E'
}

const getRecommendation = (score: number): CreditAssessment['recommendation'] => {
  if (score >= 700) return 'APPROVE'
  if (score >= 550) return 'APPROVE_CONDITIONS'
  if (score >= 400) return 'REFER'
  return 'DECLINE'
}

const getRecommendationConfig = (rec: CreditAssessment['recommendation']) => {
  switch (rec) {
    case 'APPROVE':
      return {
        label: 'Approve',
        icon: <CheckCircle2 className="w-6 h-6" />,
        color: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/40',
        borderColor: 'border-emerald-500'
      }
    case 'APPROVE_CONDITIONS':
      return {
        label: 'Approve with Conditions',
        icon: <AlertTriangle className="w-6 h-6" />,
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-100 dark:bg-amber-900/40',
        borderColor: 'border-amber-500'
      }
    case 'REFER':
      return {
        label: 'Refer for Review',
        icon: <HelpCircle className="w-6 h-6" />,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/40',
        borderColor: 'border-blue-500'
      }
    default:
      return {
        label: 'Decline',
        icon: <XCircle className="w-6 h-6" />,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/40',
        borderColor: 'border-red-500'
      }
  }
}

const getScoreColor = (score: number): string => {
  if (score >= 800) return '#059669'
  if (score >= 700) return '#10b981'
  if (score >= 600) return '#84cc16'
  if (score >= 500) return '#eab308'
  if (score >= 400) return '#f97316'
  if (score >= 300) return '#ef4444'
  return '#dc2626'
}

export function CreditScoringEngine() {
  const [selectedApplicant, setSelectedApplicant] = useState<CreditApplicant>(sampleApplicants[0])
  const [factors, setFactors] = useState<ScoreFactor[]>(initialFactors)
  
  // Calculate total score
  const totalScore = useMemo(() => {
    return factors.reduce((sum, factor) => sum + factor.currentScore, 0)
  }, [factors])
  
  const grade = useMemo(() => getGradeFromScore(totalScore), [totalScore])
  const recommendation = useMemo(() => getRecommendation(totalScore), [totalScore])
  const recConfig = getRecommendationConfig(recommendation)
  
  // Radar chart data
  const radarData = useMemo(() => 
    factors.map(f => ({
      factor: f.name.split(' ')[0],
      score: f.currentScore,
      fullMark: f.maxScore
    })),
    [factors]
  )

  // Handle slider change
  const handleFactorChange = (factorId: string, value: number[]) => {
    setFactors(prev => prev.map(factor =>
      factor.id === factorId
        ? { ...factor, currentScore: value[0] }
        : factor
    ))
  }

  // Reset to initial values
  const resetScores = () => {
    setFactors(initialFactors.map(f => ({ ...f })))
  }

  // Format currency
  const formatCurrency = (value: number) => `KSh ${value.toLocaleString()}`

  // Calculate max loan based on score
  const maxLoanAmount = useMemo(() => {
    const baseAmount = selectedApplicant.monthlyIncome * 3
    const scoreMultiplier = totalScore / 800
    return Math.round(baseAmount * Math.min(scoreMultiplier, 1.5))
  }, [selectedApplicant, totalScore])

  // Recommended interest rate based on risk
  const recommendedRate = useMemo(() => {
    if (totalScore >= 800) return 8.5
    if (totalScore >= 700) return 12.0
    if (totalScore >= 600) return 15.5
    if (totalScore >= 500) return 19.0
    if (totalScore >= 400) return 24.0
    return 30.0
  }, [totalScore])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Calculator className="w-7 h-7 text-emerald-600" />
            Credit Scoring Engine
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Interactive credit assessment and scoring simulation
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetScores} className="dark:border-slate-700 dark:hover:bg-slate-800">
          <RefreshCw className="w-4 h-4 mr-2" />
          Reset Scores
        </Button>
      </div>

      {/* Applicant Selection & Score Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Applicant Info */}
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              Applicant Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Applicant Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Select Applicant</label>
              <select
                value={selectedApplicant.id}
                onChange={(e) => {
                  const applicant = sampleApplicants.find(a => a.id === e.target.value)
                  if (applicant) setSelectedApplicant(applicant)
                }}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {sampleApplicants.map(app => (
                  <option key={app.id} value={app.id}>{app.fullName}</option>
                ))}
              </select>
            </div>

            <Separator className="dark:bg-slate-700" />

            {/* Applicant Details */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Full Name</span>
                <span className="font-medium">{selectedApplicant.fullName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Phone</span>
                <span className="font-mono text-sm">{selectedApplicant.phone}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">National ID</span>
                <span className="font-mono text-sm">{selectedApplicant.nationalId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Employment</span>
                <Badge variant="secondary" className="dark:bg-slate-700 dark:text-slate-300">
                  {selectedApplicant.employmentStatus.replace('_', ' ')}
                </Badge>
              </div>
              {selectedApplicant.employerName && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Employer</span>
                  <span className="font-medium">{selectedApplicant.employerName}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Monthly Income</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(selectedApplicant.monthlyIncome)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Age</span>
                <span>{selectedApplicant.age} years</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">M-Pesa Age</span>
                <span>{selectedApplicant.mpesaAgeMonths} months</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credit Score Visualization */}
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              Credit Score Result
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-4">
            {/* Score Circle */}
            <div className="relative w-48 h-48 mb-6">
              <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                {/* Background circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="14"
                  className="dark:stroke-slate-700"
                />
                {/* Progress circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  fill="none"
                  stroke={getScoreColor(totalScore)}
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={`${(totalScore / 1000) * 534} 534`}
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              
              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold" style={{ color: getScoreColor(totalScore) }}>
                  {totalScore}
                </span>
                <span className="text-sm text-slate-500 mt-1">out of 1000</span>
                
                {/* Grade Badge */}
                <Badge 
                  className={`mt-2 px-3 py-1 text-lg font-bold border-2 ${recConfig.borderColor}`}
                  style={{ backgroundColor: `${getScoreColor(totalScore)}20`, color: getScoreColor(totalScore) }}
                >
                  Grade {grade}
                </Badge>
              </div>
            </div>

            {/* Recommendation Badge */}
            <div className={`w-full p-4 rounded-xl border-2 ${recConfig.borderColor} ${recConfig.bgColor}`}>
              <div className="flex items-center justify-center gap-3">
                <span className={recConfig.color}>{recConfig.icon}</span>
                <div className="text-center">
                  <p className={`font-bold text-lg ${recConfig.color}`}>{recConfig.label}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Max Loan: {formatCurrency(maxLoanAmount)} @ {recommendedRate}% p.a.
                  </p>
                </div>
              </div>
            </div>

            {/* Score Scale Legend */}
            <div className="w-full mt-6 space-y-2">
              <p className="text-xs text-slate-500 mb-2">Score Scale:</p>
              <div className="flex rounded-full overflow-hidden h-3">
                <div className="bg-red-500 flex-1" title="0-300: E" />
                <div className="bg-orange-500 flex-1" title="300-400: D" />
                <div className="bg-amber-500 flex-1" title="400-500: C" />
                <div className="bg-yellow-500 flex-1" title="500-600: B" />
                <div className="bg-lime-500 flex-1" title="600-700: B+" />
                <div className="bg-green-500 flex-1" title="700-800: A" />
                <div className="bg-emerald-500 flex-1" title="800-1000: A+" />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>0</span>
                <span>300</span>
                <span>500</span>
                <span>700</span>
                <span>1000</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Radar Chart */}
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-5 h-5 text-emerald-600" />
              Score Breakdown
            </CardTitle>
            <CardDescription>Performance across all factors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" className="dark:stroke-slate-700" />
                  <PolarAngleAxis 
                    dataKey="factor" 
                    tick={{ fill: '#64748b', fontSize: 11 }}
                  />
                  <PolarRadiusAxis 
                    angle={90}
                    domain={[0, 'dataMax']}
                    tick={{ fill: '#94a3b8', fontSize: 9 }}
                  />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#059669"
                    fill="#059669"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Factor Summary */}
            <div className="space-y-2 mt-4 pt-4 border-t dark:border-slate-700">
              {factors.map((factor) => (
                <div key={factor.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">{factor.name}</span>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={(factor.currentScore / factor.maxScore) * 100} 
                      className="w-20 h-2"
                    />
                    <span className="font-mono text-xs w-12 text-right">
                      {factor.currentScore}/{factor.maxScore}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Adjustable Factors Section */}
      <Card className="dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-emerald-600" />
            Score Factor Adjustments
          </CardTitle>
          <CardDescription>
            Adjust sliders to simulate how different factors affect the overall credit score
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {factors.map((factor) => (
              <div key={factor.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-emerald-600 dark:text-emerald-400">
                      {factor.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">{factor.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Weight: {factor.weight}%
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {factor.currentScore}
                    </p>
                    <p className="text-xs text-slate-400">/ {factor.maxScore}</p>
                  </div>
                </div>

                <Slider
                  value={[factor.currentScore]}
                  onValueChange={(value) => handleFactorChange(factor.id, value)}
                  max={factor.maxScore}
                  step={5}
                  className="py-2"
                />

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {factor.description}
                </p>

                <div className="flex items-center gap-2 text-xs">
                  <Progress value={(factor.currentScore / factor.maxScore) * 100} className="flex-1 h-1.5" />
                  <span className="text-slate-500 min-w-[40px] text-right">
                    {Math.round((factor.currentScore / factor.maxScore) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Total Score Impact Summary */}
          <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Score</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalScore}/1000</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Risk Grade</p>
                <p className="text-2xl font-bold" style={{ color: getScoreColor(totalScore) }}>{grade}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Max Loan Amount</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(maxLoanAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Interest Rate</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{recommendedRate}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export type { ScoreFactor, CreditApplicant, CreditAssessment }
