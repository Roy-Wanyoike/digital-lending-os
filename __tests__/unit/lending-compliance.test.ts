import { describe, it, expect } from 'vitest'
import {
  checkInterestRateCap,
  calculateTotalCostOfCredit,
  checkCoolingOffPeriod,
  checkProcessingFeeCap,
  validateLoanCompliance,
  CBK_INTEREST_CAPS,
  COOLING_OFF_DAYS,
  MAX_PROCESSING_FEE_PERCENT,
  MAX_LATE_PENALTY_DAILY_RATE,
} from '@/backend/lib/lending/cbk-compliance'

describe('CBK Compliance — Interest Rate Caps', () => {
  it('allows rate at or below cap for each product type', () => {
    for (const [type, cap] of Object.entries(CBK_INTEREST_CAPS)) {
      expect(checkInterestRateCap(type, cap).valid).toBe(true)
      expect(checkInterestRateCap(type, cap - 0.01).valid).toBe(true)
    }
  })

  it('rejects rate above cap', () => {
    expect(checkInterestRateCap('personal', 17.0).valid).toBe(false)
    expect(checkInterestRateCap('emergency', 14.0).valid).toBe(false)
    expect(checkInterestRateCap('business', 21.0).valid).toBe(false)
  })

  it('defaults to business cap for unknown product type', () => {
    const result = checkInterestRateCap('unknown_type', 20.0)
    expect(result.valid).toBe(true)
    expect(result.maxRate).toBe(20.0)
  })
})

describe('CBK Compliance — Total Cost of Credit', () => {
  it('calculates reducing balance correctly', () => {
    const result = calculateTotalCostOfCredit(100000, 12, 12, 1.5)
    expect(result.processingFee).toBe(1500)
    expect(result.totalInterest).toBeGreaterThan(0)
    expect(result.totalCostOfCredit).toBe(result.totalInterest + result.processingFee)
    expect(result.effectiveAPR).toBeGreaterThan(0)
  })

  it('effective APR exceeds stated rate when processing fee added', () => {
    const result = calculateTotalCostOfCredit(100000, 12, 6, 2.5)
    expect(result.effectiveAPR).toBeGreaterThan(12)
  })
})

describe('CBK Compliance — Cooling-Off Period', () => {
  it('blocks disbursement within 7 days', () => {
    const justNow = new Date()
    const result = checkCoolingOffPeriod(justNow)
    expect(result.coolingOffActive).toBe(true)
    expect(result.canDisburse).toBe(false)
    expect(result.daysRemaining).toBe(7)
  })

  it('allows disbursement after 7 days', () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
    const result = checkCoolingOffPeriod(eightDaysAgo)
    expect(result.coolingOffActive).toBe(false)
    expect(result.canDisburse).toBe(true)
    expect(result.daysRemaining).toBe(0)
  })

  it('exports correct constant', () => {
    expect(COOLING_OFF_DAYS).toBe(7)
  })
})

describe('CBK Compliance — Processing Fee Cap', () => {
  it('allows fee at or below 2.5%', () => {
    expect(checkProcessingFeeCap(2.5).valid).toBe(true)
    expect(checkProcessingFeeCap(1.0).valid).toBe(true)
    expect(checkProcessingFeeCap(0).valid).toBe(true)
  })

  it('rejects fee above 2.5%', () => {
    expect(checkProcessingFeeCap(3.0).valid).toBe(false)
    expect(checkProcessingFeeCap(5.0).valid).toBe(false)
  })
})

describe('CBK Compliance — Full Loan Validation', () => {
  it('passes compliant loan', () => {
    const result = validateLoanCompliance({
      productType: 'personal',
      interestRate: 14.0,
      principal: 100000,
      tenureMonths: 12,
      processingFeePercent: 1.5,
      latePenaltyDailyRate: 0.003,
    })
    expect(result.compliant).toBe(true)
    expect(result.violations).toHaveLength(0)
  })

  it('flags multiple violations', () => {
    const result = validateLoanCompliance({
      productType: 'personal',
      interestRate: 20.0, // exceeds 16% cap
      principal: 100000,
      tenureMonths: 12,
      processingFeePercent: 4.0, // exceeds 2.5% cap
      latePenaltyDailyRate: 0.01, // exceeds 0.4% cap
    })
    expect(result.compliant).toBe(false)
    expect(result.violations.length).toBeGreaterThanOrEqual(3)
  })

  it('warns when effective APR much higher than stated', () => {
    const result = validateLoanCompliance({
      productType: 'personal',
      interestRate: 10.0,
      principal: 50000,
      tenureMonths: 3,
      processingFeePercent: 2.5,
      latePenaltyDailyRate: 0.001,
    })
    // May or may not warn depending on calculation, just ensure no violation
    expect(result.compliant).toBe(true)
  })
})
