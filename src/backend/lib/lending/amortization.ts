/**
 * Loan amortization and interest calculation engine
 * Supports: reducing balance, flat rate, and equal installment methods
 */

export type InterestType = 'reducing_balance' | 'flat_rate'

export interface AmortizationSchedule {
  installments: AmortizationInstallment[]
  totalInterest: number
  totalRepayment: number
  monthlyPayment: number
}

export interface AmortizationInstallment {
  installment: number
  principal: number
  interest: number
  totalPayment: number
  remainingBalance: number
  dueDate: Date
}

export function calculateReducingBalance(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  startDate: Date = new Date()
): AmortizationSchedule {
  const monthlyRate = annualRate / 100 / 12
  const monthlyPayment =
    (principal *
      monthlyRate *
      Math.pow(1 + monthlyRate, tenureMonths)) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1)

  let balance = principal
  let totalInterest = 0
  const installments: AmortizationInstallment[] = []

  for (let i = 1; i <= tenureMonths; i++) {
    const interest = balance * monthlyRate
    const principalComponent = monthlyPayment - interest
    balance -= principalComponent
    totalInterest += interest

    const dueDate = new Date(startDate)
    dueDate.setMonth(dueDate.getMonth() + i)

    installments.push({
      installment: i,
      principal: principalComponent,
      interest,
      totalPayment: monthlyPayment,
      remainingBalance: Math.max(0, balance),
      dueDate,
    })
  }

  return {
    installments,
    totalInterest,
    totalRepayment: monthlyPayment * tenureMonths,
    monthlyPayment,
  }
}

export function calculateFlatRate(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  startDate: Date = new Date()
): AmortizationSchedule {
  const totalInterest = principal * (annualRate / 100) * (tenureMonths / 12)
  const totalRepayment = principal + totalInterest
  const monthlyPayment = totalRepayment / tenureMonths
  const monthlyPrincipal = principal / tenureMonths
  const monthlyInterest = totalInterest / tenureMonths

  const installments: AmortizationInstallment[] = []
  let balance = principal

  for (let i = 1; i <= tenureMonths; i++) {
    balance -= monthlyPrincipal
    const dueDate = new Date(startDate)
    dueDate.setMonth(dueDate.getMonth() + i)

    installments.push({
      installment: i,
      principal: monthlyPrincipal,
      interest: monthlyInterest,
      totalPayment: monthlyPayment,
      remainingBalance: Math.max(0, balance),
      dueDate,
    })
  }

  return { installments, totalInterest, totalRepayment, monthlyPayment }
}

export function calculateAmortization(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  interestType: InterestType = 'reducing_balance',
  startDate?: Date
): AmortizationSchedule {
  if (interestType === 'flat_rate')
    return calculateFlatRate(principal, annualRate, tenureMonths, startDate)
  return calculateReducingBalance(principal, annualRate, tenureMonths, startDate)
}
