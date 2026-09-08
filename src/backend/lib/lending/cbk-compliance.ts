/**
 * Central Bank of Kenya (CBK) Digital Credit Provider compliance enforcement
 *
 * Key regulations:
 * - Interest rate caps (varies by product type)
 * - Total cost of credit disclosure
 * - Cooling-off period (7 days for new loans)
 * - Loan size limits per borrower
 * - Concurrent loan limits
 */

// CBK interest rate caps (annual %) — as of 2024 guidelines
export const CBK_INTEREST_CAPS: Record<string, number> = {
  personal: 16.0, // 16% APR cap for personal loans
  business: 20.0, // 20% APR cap for business loans
  asset_finance: 22.0, // 22% for asset finance
  emergency: 13.0, // 13% for emergency/digital credit
  chama: 18.0, // 18% for chama/group loans
}

export const COOLING_OFF_DAYS = 7 // CBK mandatory cooling-off period
export const MAX_PROCESSING_FEE_PERCENT = 2.5 // Max 2.5% processing fee
export const MAX_LATE_PENALTY_DAILY_RATE = 0.004 // Max 0.4% per day late penalty

export interface ComplianceCheckResult {
  compliant: boolean
  violations: string[]
  warnings: string[]
  totalCostOfCredit: number // Total cost including interest + fees
  effectiveAPR: number // True APR including all charges
}

export function checkInterestRateCap(
  productType: string,
  proposedRate: number
): { valid: boolean; maxRate: number } {
  const maxRate = CBK_INTEREST_CAPS[productType] ?? 20.0 // default to business cap
  return { valid: proposedRate <= maxRate, maxRate }
}

export function calculateTotalCostOfCredit(
  principal: number,
  interestRate: number,
  tenureMonths: number,
  processingFeePercent: number = 0
): {
  totalInterest: number
  processingFee: number
  totalCostOfCredit: number
  effectiveAPR: number
} {
  // Reducing balance calculation
  const monthlyRate = interestRate / 100 / 12
  const monthlyPayment =
    (principal *
      monthlyRate *
      Math.pow(1 + monthlyRate, tenureMonths)) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1)
  const totalRepayment = monthlyPayment * tenureMonths
  const totalInterest = totalRepayment - principal
  const processingFee = principal * (processingFeePercent / 100)
  const totalCostOfCredit = totalInterest + processingFee
  const effectiveAPR =
    ((totalCostOfCredit / principal) * (12 / tenureMonths)) * 100

  return { totalInterest, processingFee, totalCostOfCredit, effectiveAPR }
}

export function checkCoolingOffPeriod(loanCreatedAt: Date): {
  coolingOffActive: boolean
  daysRemaining: number
  canDisburse: boolean
} {
  const now = new Date()
  const diffMs = now.getTime() - loanCreatedAt.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  const daysRemaining = Math.max(0, COOLING_OFF_DAYS - diffDays)
  return {
    coolingOffActive: daysRemaining > 0,
    daysRemaining: Math.ceil(daysRemaining),
    canDisburse: diffDays >= COOLING_OFF_DAYS,
  }
}

export function checkProcessingFeeCap(processingFeePercent: number): {
  valid: boolean
  maxPercent: number
} {
  return {
    valid: processingFeePercent <= MAX_PROCESSING_FEE_PERCENT,
    maxPercent: MAX_PROCESSING_FEE_PERCENT,
  }
}

export function validateLoanCompliance(params: {
  productType: string
  interestRate: number
  principal: number
  tenureMonths: number
  processingFeePercent: number
  latePenaltyDailyRate: number
}): ComplianceCheckResult {
  const violations: string[] = []
  const warnings: string[] = []

  // Check interest rate cap
  const rateCheck = checkInterestRateCap(params.productType, params.interestRate)
  if (!rateCheck.valid)
    violations.push(
      `Interest rate ${params.interestRate}% exceeds CBK cap of ${rateCheck.maxRate}% for ${params.productType} loans`
    )

  // Check processing fee
  const feeCheck = checkProcessingFeeCap(params.processingFeePercent)
  if (!feeCheck.valid)
    violations.push(
      `Processing fee ${params.processingFeePercent}% exceeds CBK max of ${feeCheck.maxPercent}%`
    )

  // Check late penalty
  if (params.latePenaltyDailyRate > MAX_LATE_PENALTY_DAILY_RATE)
    violations.push(
      `Late penalty rate ${params.latePenaltyDailyRate * 100}%/day exceeds CBK max of ${MAX_LATE_PENALTY_DAILY_RATE * 100}%/day`
    )

  // Calculate total cost of credit
  const costCalc = calculateTotalCostOfCredit(
    params.principal,
    params.interestRate,
    params.tenureMonths,
    params.processingFeePercent
  )

  // Warning if effective APR is significantly higher than stated rate
  if (costCalc.effectiveAPR > params.interestRate * 1.05)
    warnings.push(
      `Effective APR (${costCalc.effectiveAPR.toFixed(2)}%) is notably higher than stated rate (${params.interestRate}%)`
    )

  return {
    compliant: violations.length === 0,
    violations,
    warnings,
    ...costCalc,
  }
}
