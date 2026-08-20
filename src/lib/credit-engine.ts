// ============================================
// Credit Scoring & Risk Assessment Engine
// Digital Lending OS for Kenyan DCPs
// ============================================

// ============================================
// Types & Interfaces
// ============================================

export interface CreditScoreInput {
  // Customer demographics
  age?: number
  employmentStatus?: string
  incomeAmount?: number
  incomeFrequency?: string
  
  // Credit history
  totalBorrowed?: number
  totalRepaid?: number
  outstandingBalance?: number
  daysInArrears?: number
  
  // KYC status
  kycVerified: boolean
  hasNationalId: boolean
  hasKraPin?: boolean
  
  // Account age
  customerSince?: Date
  
  // Previous loans performance
  completedLoans?: number
  onTimeRepayments?: number
  totalRepayments?: number
  
  // Additional factors
  hasBankStatement?: boolean
  hasPayslip?: boolean
  referralCount?: number
  declinedApplicationsCount?: number
}

export interface AffordabilityResult {
  monthlyIncome: number
  existingObligations: number
  recommendedMonthlyPayment: number
  dtiRatio: number
  affordable: boolean
  disposableIncome: number
  maxRecommendedPayment: number
}

export interface ScoreFactors {
  positive: Array<{ factor: string, points: number }>
  negative: Array<{ factor: string, points: number }>
}

export type RiskGrade = 'A' | 'B' | 'C' | 'D' | 'E'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'
export type DecisionType = 'APPROVE' | 'REVIEW' | 'DECLINE'

export interface CreditScoreOutput {
  score: number              // 0-850 (like CRB score)
  grade: RiskGrade           // A-E risk grade
  riskLevel: RiskLevel       // LOW to VERY_HIGH
  maxLoanAmount: number      // Maximum recommended loan (KSh)
  maxTenureDays: number      // Maximum recommended term
  interestRateMultiplier: number  // 1.0 = base rate, 1.5 = 50% premium
  reasons: ScoreFactors
  affordability: AffordabilityResult
  decision: DecisionType
  confidenceLevel: number    // 0-100% confidence in score accuracy
  scoreBreakdown: ScoreBreakdownItem[]
}

export interface ScoreBreakdownItem {
  category: string
  factor: string
  points: number
  weight: number
  description: string
}

// ============================================
// Credit Policy Configuration
// ============================================

export interface CreditPolicy {
  tenantId: string
  minCreditScore: number        // Minimum to approve
  autoApproveThreshold: number  // Auto-approve at or above this
  maxDtiRatio: number
  maxLoanAmount: number
  requireKyc: boolean
  requireEmployment: boolean
  interestRateAdjustments: {
    lowRisk: number     // e.g., 0.9 (10% discount)
    mediumRisk: number  // e.g., 1.0 (base rate)
    highRisk: number    // e.g., 1.3 (30% premium)
    veryHighRisk: number // e.g., 1.6 (60% premium)
  }
  loanLimitsByGrade: {
    [key in RiskGrade]: { maxAmount: number, maxTenureDays: number }
  }
}

// Default credit policy for Kenyan DCPs
export const DEFAULT_CREDIT_POLICY: CreditPolicy = {
  tenantId: 'default',
  minCreditScore: 450,
  autoApproveThreshold: 650,
  maxDtiRatio: 0.50,
  maxLoanAmount: 200000,
  requireKyc: true,
  requireEmployment: false,
  interestRateAdjustments: {
    lowRisk: 0.85,      // 15% discount for low risk
    mediumRisk: 1.0,     // Base rate for medium risk
    highRisk: 1.25,      // 25% premium for high risk
    veryHighRisk: 1.5    // 50% premium for very high risk
  },
  loanLimitsByGrade: {
    A: { maxAmount: 200000, maxTenureDays: 180 },
    B: { maxAmount: 150000, maxTenureDays: 120 },
    C: { maxAmount: 75000, maxTenureDays: 90 },
    D: { maxAmount: 30000, maxTenureDays: 45 },
    E: { maxAmount: 10000, maxTenureDays: 30 }
  }
}

// ============================================
// Scoring Constants
// ============================================

const SCORE_RANGE = {
  MIN: 0,
  MAX: 850,
  BASE_SCORE: 450  // Start at mid-range
}

const GRADE_BOUNDARIES: Record<RiskGrade, { min: number; max: number }> = {
  A: { min: 720, max: 850 },   // LOW risk
  B: { min: 660, max: 719 },   // MEDIUM-LOW
  C: { min: 600, max: 659 },   // MEDIUM
  D: { min: 500, max: 599 },   // HIGH
  E: { min: 0, max: 499 }      // VERY HIGH
}

const RISK_LEVEL_MAP: Record<RiskGrade, RiskLevel> = {
  A: 'LOW',
  B: 'MEDIUM',
  C: 'MEDIUM',
  D: 'HIGH',
  E: 'VERY_HIGH'
}

// ============================================
// Helper Functions
// ============================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function calculateMonthsSince(date: Date | undefined): number {
  if (!date) return 0
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const months = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44))
  return Math.max(0, months)
}

function getMonthlyIncome(incomeAmount: number | undefined, frequency: string | undefined): number {
  if (!incomeAmount || !frequency) return 0
  
  switch (frequency.toUpperCase()) {
    case 'DAILY':
      return incomeAmount * 30
    case 'WEEKLY':
      return incomeAmount * 4.33
    case 'BI_WEEKLY':
      return incomeAmount * 2.17
    case 'MONTHLY':
      return incomeAmount
    case 'ANNUAL':
      return incomeAmount / 12
    default:
      return incomeAmount // Assume monthly if unknown
  }
}

// ============================================
// Core Scoring Algorithm
// ============================================

export function calculateCreditScore(input: CreditScoreInput, policy: CreditPolicy = DEFAULT_CREDIT_POLICY): CreditScoreOutput {
  let score = SCORE_RANGE.BASE_SCORE
  const breakdown: ScoreBreakdownItem[] = []
  const reasons: ScoreFactors = { positive: [], negative: [] }

  // ========================================
  // 1. KYC Verification Factors (+/- 70 points)
  // ========================================
  
  if (input.kycVerified) {
    score += 50
    reasons.positive.push({ factor: 'KYC Verified', points: 50 })
    breakdown.push({ category: 'KYC', factor: 'KYC Verified', points: 50, weight: 8, description: 'Full identity verification completed' })
  } else {
    score -= 20
    reasons.negative.push({ factor: 'KYC Not Verified', points: -20 })
    breakdown.push({ category: 'KYC', factor: 'KYC Not Verified', points: -20, weight: 3, description: 'Identity verification pending' })
  }

  if (input.hasNationalId) {
    score += 10
    reasons.positive.push({ factor: 'National ID Provided', points: 10 })
    breakdown.push({ category: 'KYC', factor: 'National ID on File', points: 10, weight: 1.5, description: 'Valid national ID verified' })
  }

  if (input.hasKraPin) {
    score += 10
    reasons.positive.push({ factor: 'KRA PIN Registered', points: 10 })
    breakdown.push({ category: 'KYC', factor: 'KRA PIN Verified', points: 10, weight: 1.5, description: 'Tax compliance confirmed' })
  }

  // ========================================
  // 2. Employment Status (+/- 30 points)
  // ========================================
  
  const employmentStatus = input.employmentStatus?.toUpperCase()
  
  switch (employmentStatus) {
    case 'EMPLOYED':
      score += 30
      reasons.positive.push({ factor: 'Stable Employment', points: 30 })
      breakdown.push({ category: 'Employment', factor: 'Employed', points: 30, weight: 4, description: 'Regular employment income' })
      break
    case 'SELF_EMPLOYED':
    case 'BUSINESS_OWNER':
      score += 20
      reasons.positive.push({ factor: 'Self-Employed/Business Owner', points: 20 })
      breakdown.push({ category: 'Employment', factor: 'Self-Employed/Business Owner', points: 20, weight: 3, description: 'Business income source' })
      break
    case 'CONTRACTOR':
      score += 15
      reasons.positive.push({ factor: 'Contract Work', points: 15 })
      breakdown.push({ category: 'Employment', factor: 'Contractor', points: 15, weight: 2, description: 'Contract-based income' })
      break
    case 'UNEMPLOYED':
      score -= 25
      reasons.negative.push({ factor: 'Unemployed', points: -25 })
      breakdown.push({ category: 'Employment', factor: 'Unemployed', points: -25, weight: 4, description: 'No verifiable income source' })
      break
    case 'STUDENT':
      score -= 10
      reasons.negative.push({ factor: 'Student Status', points: -10 })
      breakdown.push({ category: 'Employment', factor: 'Student', points: -10, weight: 1.5, description: 'Limited income capacity' })
      break
    default:
      // No change for RETIRED or OTHER
      break
  }

  // ========================================
  // 3. Income Stability (+50 points)
  // ========================================
  
  const monthlyIncome = getMonthlyIncome(input.incomeAmount, input.incomeFrequency)
  
  if (monthlyIncome > 0) {
    let incomePoints = 0
    
    if (monthlyIncome >= 150000) {        // High income (>150K KSh)
      incomePoints = 50
    } else if (monthlyIncome >= 80000) {  // Good income (80-150K)
      incomePoints = 40
    } else if (monthlyIncome >= 45000) {  // Average income (45-80K)
      incomePoints = 30
    } else if (monthlyIncome >= 25000) {  // Below average (25-45K)
      incomePoints = 18
    } else if (monthlyIncome >= 15000) {  // Low income (15-25K)
      incomePoints = 8
    } else {                              // Very low (<15K)
      incomePoints = 0
    }
    
    score += incomePoints
    if (incomePoints > 0) {
      reasons.positive.push({ factor: `Verifiable Income (KSh ${monthlyIncome.toLocaleString()}/mo)`, points: incomePoints })
    }
    breakdown.push({ 
      category: 'Income', 
      factor: 'Monthly Income Level', 
      points: incomePoints, 
      weight: 6, 
      description: `Monthly income: KSh ${monthlyIncome.toLocaleString()}` 
    })

    // Bonus for stable income sources
    if (['MONTHLY', 'WEEKLY'].includes((input.incomeFrequency || '').toUpperCase())) {
      score += 5
      reasons.positive.push({ factor: 'Regular Income Frequency', points: 5 })
    }
  } else {
    reasons.negative.push({ factor: 'No Verifiable Income', points: -15 })
    score -= 15
  }

  // ========================================
  // 4. Credit History Performance (+140 points)
  // ========================================
  
  // Completed loans bonus
  const completedLoans = input.completedLoans || 0
  if (completedLoans > 0) {
    const loanBonus = Math.min(completedLoans * 20, 60)
    score += loanBonus
    reasons.positive.push({ factor: `${completedLoans} Completed Loan(s)`, points: loanBonus })
    breakdown.push({ 
      category: 'Credit History', 
      factor: 'Completed Loans', 
      points: loanBonus, 
      weight: 7, 
      description: `${completedLoans} successfully repaid loans` 
    })
  }

  // On-time repayment ratio (up to +80 points)
  if (input.totalRepayments && input.totalRepayments > 0) {
    const onTimeRatio = (input.onTimeRepayments || 0) / input.totalRepayments
    
    if (onTimeRatio >= 0.95) {
      score += 80
      reasons.positive.push({ factor: 'Excellent Repayment History (95%+ on-time)', points: 80 })
    } else if (onTimeRatio >= 0.85) {
      score += 55
      reasons.positive.push({ factor: 'Good Repayment History (85-94% on-time)', points: 55 })
    } else if (onTimeRatio >= 0.75) {
      score += 35
      reasons.positive.push({ factor: 'Fair Repayment History (75-84% on-time)', points: 35 })
    } else if (onTimeRatio >= 0.60) {
      score += 10
      reasons.positive.push({ factor: 'Below-Average Repayment (60-74% on-time)', points: 10 })
    } else {
      score -= 20
      reasons.negative.push({ factor: 'Poor Repayment History (<60% on-time)', points: -20 })
    }
    
    breakdown.push({
      category: 'Credit History',
      factor: 'On-Time Repayment Ratio',
      points: onTimeRatio >= 0.95 ? 80 : onTimeRatio >= 0.85 ? 55 : onTimeRatio >= 0.75 ? 35 : onTimeRatio >= 0.60 ? 10 : -20,
      weight: 10,
      description: `${Math.round(onTimeRatio * 100)}% of payments made on time`
    })
  }

  // Total amount repaid (trust indicator)
  if (input.totalRepaid && input.totalRepaid > 50000) {
    const repaymentBonus = Math.min(Math.floor(input.totalRepaid / 20000), 20)
    score += repaymentBonus
    reasons.positive.push({ factor: `Strong Repayment Track Record (KSh ${input.totalRepaid.toLocaleString()} total)`, points: repaymentBonus })
  }

  // ========================================
  // 5. Current Arrears Penalty (-150 max)
  // ========================================
  
  const daysInArrears = input.daysInArrears || 0
  
  if (daysInArrears > 0) {
    const arrearsPenalty = Math.min(daysInArrears * 10, 150)
    score -= arrearsPenalty
    reasons.negative.push({ factor: `${daysInArrears} Day(s) in Arrears`, points: -arrearsPenalty })
    breakdown.push({
      category: 'Current Standing',
      factor: 'Days in Arrears',
      points: -arrearsPenalty,
      weight: 12,
      description: `${daysInArrears} days overdue on existing obligations`
    })
  } else {
    reasons.positive.push({ factor: 'No Current Arrears', points: 15 })
    score += 15
  }

  // ========================================
  // 6. Account Age/Loyalty (+40 max)
  // ========================================
  
  const accountAgeMonths = calculateMonthsSince(input.customerSince)
  
  if (accountAgeMonths > 0) {
    const loyaltyBonus = Math.min(accountAgeMonths * 2, 40)
    score += loyaltyBonus
    reasons.positive.push({ factor: `Customer for ${accountAgeMonths} Month(s)`, points: loyaltyBonus })
    breakdown.push({
      category: 'Relationship',
      factor: 'Customer Tenure',
      points: loyaltyBonus,
      weight: 4,
      description: `Account age: ${accountAgeMonths} months`
    })
  } else {
    score -= 10
    reasons.negative.push({ factor: 'New Customer (<1 month)', points: -10 })
  }

  // ========================================
  // 7. DTI Ratio Calculation (+/- 50 points)
  // ========================================
  
  const monthlyObligations = (input.outstandingBalance || 0) * 0.1 // Assume 10% monthly payment rate
  const proposedPayment = monthlyIncome * 0.25 // Assume 25% of income as proposed payment
  const totalObligations = monthlyObligations + proposedPayment
  
  let dtiRatio = 0
  if (monthlyIncome > 0) {
    dtiRatio = totalObligations / monthlyIncome
  }
  
  if (dtiRatio < 0.30) {
    score += 50
    reasons.positive.push({ factor: 'Low Debt-to-Income Ratio', points: 50 })
  } else if (dtiRatio < 0.50) {
    score += 20
    reasons.positive.push({ factor: 'Moderate DTI Ratio', points: 20 })
  } else if (dtiRatio < 0.65) {
    score -= 25
    reasons.negative.push({ factor: 'High DTI Ratio', points: -25 })
  } else {
    score -= 50
    reasons.negative.push({ factor: 'Very High DTI Ratio', points: -50 })
  }

  // ========================================
  // 8. Additional Positive Factors
  // ========================================
  
  if (input.hasBankStatement) {
    score += 15
    reasons.positive.push({ factor: 'Bank Statement Provided', points: 15 })
  }
  
  if (input.hasPayslip) {
    score += 10
    reasons.positive.push({ factor: 'Payslip Verified', points: 10 })
  }
  
  if (input.referralCount && input.referralCount > 0) {
    const referralBonus = Math.min(input.referralCount * 5, 15)
    score += referralBonus
    reasons.positive.push({ factor: `${input.referralCount} Referral(s) from Trusted Members`, points: referralBonus })
  }

  // Declined applications penalty
  if (input.declinedApplicationsCount && input.declinedApplicationsCount > 0) {
    const declinePenalty = Math.min(input.declinedApplicationsCount * 15, 45)
    score -= declinePenalty
    reasons.negative.push({ factor: `${input.declinedApplicationsCount} Previous Decline(s)`, points: -declinePenalty })
  }

  // ========================================
  // Final Score Clamping & Grade Assignment
  // ========================================
  
  score = clamp(score, SCORE_RANGE.MIN, SCORE_RANGE.MAX)
  
  const grade = determineGrade(score)
  const riskLevel = RISK_LEVEL_MAP[grade]
  
  // Calculate interest rate multiplier based on grade
  const interestRateMultipliers: Record<RiskGrade, number> = {
    A: policy.interestRateAdjustments.lowRisk,
    B: policy.interestRateAdjustments.mediumRisk,
    C: policy.interestRateAdjustments.mediumRisk,
    D: policy.interestRateAdjustments.highRisk,
    E: policy.interestRateAdjustments.veryHighRisk
  }

  // Get loan limits based on grade
  const loanLimits = policy.loanLimitsByGrade[grade]
  
  // Calculate affordability
  const affordability = calculateAffordability(
    monthlyIncome,
    monthlyObligations,
    proposedPayment,
    policy.maxDtiRatio
  )

  // Determine decision
  const decision = determineDecision(score, grade, affordability, policy)

  // Calculate confidence level based on data completeness
  const confidenceLevel = calculateConfidence(input)

  return {
    score: Math.round(score),
    grade,
    riskLevel,
    maxLoanAmount: Math.min(loanLimits.maxAmount, affordability.maxLoanAmount),
    maxTenureDays: loanLimits.maxTenureDays,
    interestRateMultiplier: interestRateMultipliers[grade],
    reasons: {
      positive: reasons.positive.map(r => ({ ...r })),
      negative: reasons.negative.map(r => ({ ...r }))
    },
    affordability,
    decision,
    confidenceLevel,
    scoreBreakdown: breakdown
  }
}

// ============================================
// Helper Functions for Scoring
// ============================================

function determineGrade(score: number): RiskGrade {
  if (score >= GRADE_BOUNDARIES.A.min) return 'A'
  if (score >= GRADE_BOUNDARIES.B.min) return 'B'
  if (score >= GRADE_BOUNDARIES.C.min) return 'C'
  if (score >= GRADE_BOUNDARIES.D.min) return 'D'
  return 'E'
}

function calculateAffordability(
  monthlyIncome: number,
  existingObligations: number,
  proposedPayment: number,
  maxDtiRatio: number
): AffordabilityResult {
  const totalObligations = existingObligations + proposedPayment
  const dtiRatio = monthlyIncome > 0 ? totalObligations / monthlyIncome : 1
  const disposableIncome = monthlyIncome - totalObligations
  const maxRecommendedPayment = monthlyIncome * maxDtiRatio - existingObligations

  return {
    monthlyIncome,
    existingObligations,
    recommendedMonthlyPayment: Math.max(0, proposedPayment),
    dtiRatio: Math.round(dtiRatio * 10000) / 100, // Round to 2 decimal places
    affordable: dtiRatio <= maxDtiRatio && disposableIncome > 5000, // Minimum 5K disposable
    disposableIncome: Math.max(0, disposableIncome),
    maxLoanAmount: Math.max(0, maxRecommendedPayment * 4), // ~4 months of payments
    maxRecommendedPayment: Math.max(0, maxRecommendedPayment)
  }
}

function determineDecision(
  score: number,
  grade: RiskGrade,
  affordability: AffordabilityResult,
  policy: CreditPolicy
): DecisionType {
  // Hard declines
  if (score < policy.minCreditScore) return 'DECLINE'
  if (!affordable) return 'DECLINE'
  if (grade === 'E') return 'DECLINE' // Very high risk always decline or review
  
  // Auto-approve for excellent scores
  if (score >= policy.autoApproveThreshold && grade <= 'B') return 'APPROVE'
  
  // Review cases
  return 'REVIEW'
}

function calculateConfidence(input: CreditScoreInput): number {
  let dataPoints = 0
  const requiredPoints = 8
  
  if (input.kycVerified) dataPoints++
  if (input.hasNationalId) dataPoints++
  if (input.incomeAmount && input.incomeAmount > 0) dataPoints++
  if (input.employmentStatus) dataPoints++
  if (input.completedLoans !== undefined) dataPoints++
  if (input.customerSince) dataPoints++
  if (input.totalRepaid !== undefined) dataPoints++
  if (input.hasKraPin) dataPoints++
  if (input.hasBankStatement) dataPoints++
  if (input.hasPayslip) dataPoints++
  
  return Math.min(100, Math.round((dataPoints / requiredPoints) * 100))
}

// ============================================
// Utility Functions
// ============================================

export function formatCurrency(amount: number, currency: string = 'KSh'): string {
  return `${currency} ${amount.toLocaleString('en-KE')}`
}

export function getGradeColor(grade: RiskGrade): string {
  const colors: Record<RiskGrade, string> = {
    A: '#22c55e', // green
    B: '#84cc16', // lime
    C: '#eab308', // yellow
    D: '#f97316', // orange
    E: '#ef4444'  // red
  }
  return colors[grade]
}

export function getGradeLabel(grade: RiskGrade): string {
  const labels: Record<RiskGrade, string> = {
    A: 'Excellent',
    B: 'Good',
    C: 'Fair',
    D: 'Poor',
    E: 'Very Poor'
  }
  return labels[grade]
}

export function getRiskColor(level: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    LOW: '#22c55e',
    MEDIUM: '#eab308',
    HIGH: '#f97316',
    VERY_HIGH: '#ef4444'
  }
  return colors[level]
}

export function getDecisionColor(decision: DecisionType): string {
  const colors: Record<DecisionType, string> = {
    APPROVE: '#22c55e',
    REVIEW: '#eab308',
    DECLINE: '#ef4444'
  }
  return colors[decision]
}

// ============================================
// Sample Data Generators (for demo/testing)
// ============================================

export function generateSampleInput(profileType: 'excellent' | 'good' | 'fair' | 'poor' | 'veryPoor'): CreditScoreInput {
  const baseDate = new Date()
  
  switch (profileType) {
    case 'excellent':
      return {
        age: 38,
        employmentStatus: 'EMPLOYED',
        incomeAmount: 120000,
        incomeFrequency: 'MONTHLY',
        totalBorrowed: 350000,
        totalRepaid: 380000,
        outstandingBalance: 0,
        daysInArrears: 0,
        kycVerified: true,
        hasNationalId: true,
        hasKraPin: true,
        customerSince: new Date(baseDate.setFullYear(baseDate.getFullYear() - 3)),
        completedLoans: 5,
        onTimeRepayments: 48,
        totalRepayments: 48,
        hasBankStatement: true,
        hasPayslip: true,
        referralCount: 3
      }
      
    case 'good':
      return {
        age: 32,
        employmentStatus: 'EMPLOYED',
        incomeAmount: 65000,
        incomeFrequency: 'MONTHLY',
        totalBorrowed: 180000,
        totalRepaid: 165000,
        outstandingBalance: 45000,
        daysInArrears: 0,
        kycVerified: true,
        hasNationalId: true,
        hasKraPin: false,
        customerSince: new Date(baseDate.setFullYear(baseDate.getFullYear() - 1)),
        completedLoans: 3,
        onTimeRepayments: 28,
        totalRepayments: 32,
        hasBankStatement: true,
        hasPayslip: false
      }
      
    case 'fair':
      return {
        age: 28,
        employmentStatus: 'SELF_EMPLOYED',
        incomeAmount: 42000,
        incomeFrequency: 'MONTHLY',
        totalBorrowed: 90000,
        totalRepaid: 72000,
        outstandingBalance: 28000,
        daysInArrears: 5,
        kycVerified: true,
        hasNationalId: true,
        hasKraPin: false,
        customerSince: new Date(baseDate.setMonth(baseDate.getMonth() - 6)),
        completedLoans: 2,
        onTimeRepayments: 14,
        totalRepayments: 18,
        hasBankStatement: false,
        hasPayslip: false
      }
      
    case 'poor':
      return {
        age: 24,
        employmentStatus: 'CONTRACTOR',
        incomeAmount: 28000,
        incomeFrequency: 'WEEKLY',
        totalBorrowed: 60000,
        totalRepaid: 42000,
        outstandingBalance: 32000,
        daysInArrears: 18,
        kycVerified: true,
        hasNationalId: true,
        hasKraPin: false,
        customerSince: new Date(baseDate.setMonth(baseDate.getMonth() - 3)),
        completedLoans: 1,
        onTimeRepayments: 6,
        totalRepayments: 12,
        declinedApplicationsCount: 1
      }
      
    case 'veryPoor':
      return {
        age: 21,
        employmentStatus: 'UNEMPLOYED',
        incomeAmount: 0,
        kycVerified: false,
        hasNationalId: false,
        hasKraPin: false,
        customerSince: new Date(),
        completedLoans: 0,
        daysInArrears: 45,
        outstandingBalance: 55000,
        declinedApplicationsCount: 3
      }
  }
}

// ============================================
// Credit Rule Engine
// ============================================

export interface CreditRule {
  id: string
  name: string
  description: string
  condition: (input: CreditScoreInput, output: CreditScoreOutput) => boolean
  action: 'APPROVE' | 'REVIEW' | 'DECLINE' | 'ADJUST_SCORE' | 'ADJUST_LIMIT'
  actionValue?: number
  priority: number
  isActive: boolean
  createdAt: Date
}

export class CreditRuleEngine {
  private rules: CreditRule[] = []

  addRule(rule: CreditRule): void {
    this.rules.push(rule)
    this.rules.sort((a, b) => b.priority - a.priority)
  }

  removeRule(id: string): void {
    this.rules = this.rules.filter(r => r.id !== id)
  }

  evaluateRules(input: CreditScoreInput, initialOutput: CreditScoreOutput): CreditScoreOutput {
    let output = { ...initialOutput }

    for (const rule of this.rules) {
      if (!rule.isActive) continue
      
      try {
        if (rule.condition(input, output)) {
          switch (rule.action) {
            case 'APPROVE':
              output.decision = 'APPROVE'
              break
            case 'REVIEW':
              output.decision = 'REVIEW'
              break
            case 'DECLINE':
              output.decision = 'DECLINE'
              break
            case 'ADJUST_SCORE':
              if (rule.actionValue !== undefined) {
                output.score = clamp(output.score + rule.actionValue, 0, 850)
                output.grade = determineGrade(output.score)
              }
              break
            case 'ADJUST_LIMIT':
              if (rule.actionValue !== undefined) {
                output.maxLoanAmount = Math.max(0, output.maxLoanAmount + rule.actionValue)
              }
              break
          }
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.name}:`, error)
      }
    }

    return output
  }

  getRules(): CreditRule[] {
    return [...this.rules]
  }

  clearRules(): void {
    this.rules = []
  }
}

// Pre-configured rules for Kenyan market
export function createDefaultRules(): CreditRule[] {
  return [
    {
      id: 'rule-001',
      name: 'Auto-Decline Unemployed without Collateral',
      description: 'Automatically decline unemployed applicants who are not KYC verified',
      condition: (input) => input.employmentStatus?.toUpperCase() === 'UNEMPLOYED' && !input.kycVerified,
      action: 'DECLINE',
      priority: 100,
      isActive: true,
      createdAt: new Date()
    },
    {
      id: 'rule-002',
      name: 'High Arrears Override',
      description: 'Decline applicants with more than 90 days in arrears regardless of score',
      condition: (input) => (input.daysInArrears || 0) > 90,
      action: 'DECLINE',
      priority: 95,
      isActive: true,
      createdAt: new Date()
    },
    {
      id: 'rule-003',
      name: 'Premium Customer Fast Track',
      description: 'Auto-approve customers with excellent history and high income',
      condition: (input, output) => 
        output.score >= 750 && 
        (input.incomeAmount || 0) >= 100000 &&
        (input.completedLoans || 0) >= 3,
      action: 'APPROVE',
      priority: 80,
      isActive: true,
      createdAt: new Date()
    },
    {
      id: 'rule-004',
      name: 'New Customer Limit Cap',
      description: 'Cap maximum loan for customers less than 3 months old',
      condition: (input) => {
        const months = calculateMonthsSince(input.customerSince)
        return months < 3 && months > 0
      },
      action: 'ADJUST_LIMIT',
      actionValue: -50000,
      priority: 70,
      isActive: true,
      createdAt: new Date()
    },
    {
      id: 'rule-005',
      name: 'Referral Bonus',
      description: 'Boost score for customers with multiple referrals',
      condition: (input) => (input.referralCount || 0) >= 3,
      action: 'ADJUST_SCORE',
      actionValue: 25,
      priority: 50,
      isActive: true,
      createdAt: new Date()
    }
  ]
}
