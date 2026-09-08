import { describe, it, expect } from 'vitest'
import {
  calculateReducingBalance,
  calculateFlatRate,
  calculateAmortization,
} from '@/backend/lib/lending/amortization'

describe('Amortization — Reducing Balance', () => {
  it('produces correct number of installments', () => {
    const schedule = calculateReducingBalance(100000, 12, 12)
    expect(schedule.installments).toHaveLength(12)
  })

  it('total repayment equals sum of installment payments', () => {
    const schedule = calculateReducingBalance(100000, 12, 12)
    const sumPayments = schedule.installments.reduce(
      (sum, inst) => sum + inst.totalPayment,
      0
    )
    expect(sumPayments).toBeCloseTo(schedule.totalRepayment, 2)
  })

  it('total interest = total repayment - principal', () => {
    const schedule = calculateReducingBalance(100000, 12, 12)
    expect(schedule.totalRepayment - 100000).toBeCloseTo(
      schedule.totalInterest,
      2
    )
  })

  it('last installment has near-zero remaining balance', () => {
    const schedule = calculateReducingBalance(100000, 12, 12)
    const lastInst = schedule.installments[schedule.installments.length - 1]
    expect(lastInst.remainingBalance).toBeLessThan(1) // rounding residual
  })

  it('interest decreases and principal increases over time', () => {
    const schedule = calculateReducingBalance(100000, 12, 12)
    for (let i = 1; i < schedule.installments.length; i++) {
      expect(schedule.installments[i].interest).toBeLessThan(
        schedule.installments[i - 1].interest
      )
      expect(schedule.installments[i].principal).toBeGreaterThan(
        schedule.installments[i - 1].principal
      )
    }
  })

  it('uses custom start date', () => {
    const startDate = new Date('2025-01-15')
    const schedule = calculateReducingBalance(100000, 12, 6, startDate)
    expect(schedule.installments[0].dueDate.getMonth()).toBe(1) // February
    expect(schedule.installments[5].dueDate.getMonth()).toBe(6) // July
  })
})

describe('Amortization — Flat Rate', () => {
  it('produces correct number of installments', () => {
    const schedule = calculateFlatRate(100000, 12, 12)
    expect(schedule.installments).toHaveLength(12)
  })

  it('equal principal and interest components across installments', () => {
    const schedule = calculateFlatRate(100000, 12, 12)
    const firstPrincipal = schedule.installments[0].principal
    const firstInterest = schedule.installments[0].interest
    for (const inst of schedule.installments) {
      expect(inst.principal).toBeCloseTo(firstPrincipal, 4)
      expect(inst.interest).toBeCloseTo(firstInterest, 4)
    }
  })

  it('total interest = principal * rate * (months/12)', () => {
    const schedule = calculateFlatRate(100000, 12, 12)
    expect(schedule.totalInterest).toBeCloseTo(12000, 2)
  })

  it('total repayment = principal + total interest', () => {
    const schedule = calculateFlatRate(100000, 12, 12)
    expect(schedule.totalRepayment).toBeCloseTo(112000, 2)
  })

  it('last installment has near-zero remaining balance', () => {
    const schedule = calculateFlatRate(100000, 12, 12)
    expect(
      schedule.installments[schedule.installments.length - 1].remainingBalance
    ).toBeLessThan(0.01) // floating point rounding residual
  })
})

describe('Amortization — Unified calculateAmortization', () => {
  it('defaults to reducing balance', () => {
    const result = calculateAmortization(100000, 12, 12)
    expect(result.installments).toHaveLength(12)
    // Reducing balance: first interest > last interest
    expect(result.installments[0].interest).toBeGreaterThan(
      result.installments[11].interest
    )
  })

  it('flat_rate produces equal installments', () => {
    const result = calculateAmortization(100000, 12, 12, 'flat_rate')
    expect(result.installments[0].totalPayment).toBeCloseTo(
      result.installments[11].totalPayment,
      4
    )
  })

  it('reducing_balance produces decreasing interest', () => {
    const result = calculateAmortization(100000, 12, 12, 'reducing_balance')
    expect(result.installments[0].interest).toBeGreaterThan(
      result.installments[1].interest
    )
  })
})
