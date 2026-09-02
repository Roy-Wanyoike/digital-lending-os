import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

const db = new PrismaClient()

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function randFloat(min: number, max: number): number { return Math.round((Math.random() * (max - min) + min) * 100) / 100 }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min }
function randomDate(daysAgo: number): Date { return new Date(Date.now() - randInt(0, daysAgo) * 86400000) }

const CURRENCIES = ['USD', 'EUR', 'GBP', 'KES', 'NGN']
const ESCROW_STATUSES = ['Created', 'Funded', 'In Escrow', 'Completed', 'Completed', 'Disputed']
const PAYMENT_STATUSES = ['completed', 'completed', 'completed', 'processing', 'failed']

async function main() {
  console.log('Seeding...')

  // Clear everything first
  await db.referralBonus.deleteMany()
  await db.collectionReminder.deleteMany()
  await db.collectionCase.deleteMany()
  await db.complianceScreening.deleteMany()
  await db.complianceRule.deleteMany()
  await db.businessMatch.deleteMany()
  await db.fraudAlert.deleteMany()
  await db.fraudRule.deleteMany()
  await db.invoice.deleteMany()
  await db.financialPrediction.deleteMany()
  await db.financialMetric.deleteMany()
  await db.financialSnapshot.deleteMany()
  await db.financialDigitalTwin.deleteMany()
  await db.disbursement.deleteMany()
  await db.dispute.deleteMany()
  await db.escrowAuditLog.deleteMany()
  await db.escrowMilestone.deleteMany()
  await db.escrowTransaction.deleteMany()
  await db.paymentTransaction.deleteMany()
  await db.paymentIntent.deleteMany()
  await db.reputationEvent.deleteMany()
  await db.review.deleteMany()
  await db.verification.deleteMany()
  await db.complianceDocument.deleteMany()
  await db.commercePassport.deleteMany()
  await db.trustScore.deleteMany()
  await db.businessRelationship.deleteMany()
  await db.currencyConversion.deleteMany()
  await db.cryptoWithdrawal.deleteMany()
  await db.withdrawal.deleteMany()
  await db.deposit.deleteMany()
  await db.walletTransaction.deleteMany()
  await db.wallet.deleteMany()
  await db.paymentLinkPayment.deleteMany()
  await db.paymentLink.deleteMany()
  await db.currencyRate.deleteMany()
  await db.paymentMethod.deleteMany()
  await db.user.deleteMany()
  await db.account.deleteMany()
  await db.business.deleteMany()
  await db.tenant.deleteMany()
  console.log('Cleared all data')

  // 1. Tenant + Account + Business
  const tenant = await db.tenant.create({
    data: {
      name: 'Digital Lending OS Demo',
      slug: 'dlo-demo',
      plan: 'professional',
      ownerEmail: 'youngsharktechnologies@gmail.com',
      ownerName: 'Young Shark',
    },
  })

  const hashedPw = await bcrypt.hash('Demo1234!', 12)
  const account = await db.account.create({
    data: {
      email: 'youngsharktechnologies@gmail.com',
      name: 'Young Shark',
      passwordHash: hashedPw,
      role: 'admin',
      tenantId: tenant.id,
      isActive: true,
      referralCode: 'YSD3MO7X',
    },
  })

  const business = await db.business.create({
    data: { name: 'Digital Lending OS Demo Co.', country: 'US', city: 'San Francisco', industry: 'Technology Services', status: 'verified', verifiedAt: new Date(), tenantId: tenant.id },
  })
  await db.account.update({ where: { id: account.id }, data: { businessId: business.id } })

  // 2. Wallets
  const wallets = []
  for (const cur of CURRENCIES) {
    const bal = cur === 'USD' ? 25430.50 : cur === 'EUR' ? 12300.00 : cur === 'GBP' ? 8500.75 : cur === 'KES' ? 1500000 : 5000000
    wallets.push(await db.wallet.create({
      data: { businessId: business.id, currency: cur, balance: bal, availableBalance: bal, pendingBalance: 0, frozenBalance: 0, isDefault: cur === 'USD', status: 'active' },
    }))
  }

  // 3. Wallet Transactions
  for (const w of wallets) {
    for (let i = 0; i < 8; i++) {
      const amt = randFloat(100, 5000)
      const before = randFloat(1000, 20000)
    await db.walletTransaction.create({
      data: {
        walletId: w.id, txRef: `WTX-${randomUUID().slice(0, 8).toUpperCase()}`,
        type: rand(['deposit', 'withdrawal', 'conversion', 'bonus'] as const),
        amount: amt, balanceBefore: before, balanceAfter: Math.round((before + amt) * 100) / 100,
        currency: w.currency, description: `${rand(['Deposit', 'Withdrawal', 'Conversion', 'Bonus'])} via ${rand(['Stripe', 'M-Pesa', 'Bank Transfer', 'Referral'])}`,
        referenceType: rand(['deposit', 'withdrawal', 'conversion'] as const),
        referenceId: randomUUID(), status: 'completed', createdAt: randomDate(30),
      },
    })
  }
  }

  // 4. Deposits
  for (const w of wallets) {
    for (let i = 0; i < 4; i++) {
      await db.deposit.create({
        data: {
          depositRef: `DEP-${randomUUID().slice(0, 8).toUpperCase()}`, walletId: w.id,
          amount: randFloat(200, 10000), currency: w.currency,
          paymentMethod: rand(['card', 'bank_transfer', 'mobile_money'] as const),
          provider: rand(['stripe', 'mpesa', 'paystack', 'demo'] as const),
          status: rand(['completed', 'completed', 'pending'] as const),
          completedAt: randomDate(14), createdAt: randomDate(30),
        },
      })
    }
  }

  // 5. Other businesses for escrow/payments/trust
  const bizNames = ['Pacific Trade Co.', 'Berlin Industrie GmbH', 'Shenzhen Tech Solutions', 'London Bridge Imports', 'Dubai Golden Trade', 'Tokyo Electronics Ltd.', 'Nairobi Export Co.', 'Lagos Trade Hub']
  const otherBiz = []
  for (const name of bizNames) {
    otherBiz.push(await db.business.create({
      data: { name, country: rand(['US', 'GB', 'DE', 'CN', 'JP', 'KE', 'NG', 'AE']), industry: rand(['Electronics', 'Textile', 'Logistics', 'Technology', 'Agriculture']), status: rand(['verified', 'verified', 'pending']), tenantId: tenant.id },
    }))
  }

  // 6. Trust Scores
  for (const b of [business, ...otherBiz]) {
    const score = randFloat(40, 98)
    await db.trustScore.create({
      data: { businessId: b.id, overallScore: score, paymentScore: Math.min(100, score + randFloat(-10, 10)), deliveryScore: Math.min(100, score + randFloat(-10, 10)), qualityScore: Math.min(100, score + randFloat(-10, 10)), communicationScore: Math.min(100, score + randFloat(-10, 10)), complianceScore: Math.min(100, score + randFloat(-10, 10)), totalReviews: randInt(5, 80), totalTransactions: randInt(10, 300), scoreVersion: 2, lastCalculated: new Date() },
    })
    await db.commercePassport.create({
      data: { businessId: b.id, passportHash: randomUUID().replace(/-/g, ''), credentialLevel: rand(['basic', 'standard', 'enhanced', 'premium']), kycStatus: rand(['verified', 'in_progress', 'not_started']), amlStatus: rand(['cleared', 'flagged', 'not_started']), riskRating: rand(['low', 'medium', 'high']), lastAuditAt: randomDate(60) },
    })
  }

  // 7. Escrow Transactions
  for (let i = 0; i < 25; i++) {
    const buyer = rand(otherBiz)
    let seller = rand(otherBiz)
    while (seller.id === buyer.id) seller = rand(otherBiz)
    const amt = randFloat(1000, 100000)
    const status = rand(ESCROW_STATUSES)
    const ms = randInt(1, 4)
    await db.escrowTransaction.create({
      data: { txRef: `ESC-${randomUUID().slice(0, 8).toUpperCase()}`, buyerId: buyer.id, sellerId: seller.id, amount: amt, currency: rand(CURRENCIES), description: `Trade order #${i + 1}`, status, currentMilestone: status === 'Completed' ? ms : randInt(0, ms - 1), totalMilestones: ms, fundedAmount: ['Funded', 'In Escrow', 'Completed'].includes(status) ? amt : 0, releasedAmount: status === 'Completed' ? amt : 0, refundedAmount: 0, feeAmount: randFloat(amt * 0.005, amt * 0.02), feeCurrency: 'USD', aiRiskScore: randFloat(5, 80), aiRiskLevel: rand(['low', 'medium', 'high']), createdAt: randomDate(60) },
    })
  }

  // 8. Payment Intents
  for (let i = 0; i < 20; i++) {
    const from = rand([business, ...otherBiz])
    let to = rand(otherBiz)
    while (to.id === from.id) to = rand(otherBiz)
    const srcCur = rand(CURRENCIES)
    let tgtCur = rand(CURRENCIES)
    while (tgtCur === srcCur) tgtCur = rand(CURRENCIES)
    const srcAmt = randFloat(500, 50000)
    const rates: Record<string, number> = { 'USD-EUR': 0.92, 'USD-GBP': 0.79, 'USD-KES': 153.5, 'USD-NGN': 1580, 'EUR-USD': 1.087, 'GBP-USD': 1.266, 'KES-USD': 0.0065, 'NGN-USD': 0.00063 }
    const rate = rates[`${srcCur}-${tgtCur}`] || 1.0
    await db.paymentIntent.create({
      data: { intentRef: `PAY-${randomUUID().slice(0, 8).toUpperCase()}`, fromBusinessId: from.id, toBusinessId: to.id, sourceAmount: srcAmt, sourceCurrency: srcCur, targetAmount: Math.round(srcAmt * rate * 100) / 100, targetCurrency: tgtCur, exchangeRate: rate, status: rand(PAYMENT_STATUSES), paymentMethod: rand(['card', 'bank_transfer', 'mobile_money']), routingProvider: rand(['stripe', 'paystack', 'mpesa', 'flutterwave']), routingScore: randFloat(0.7, 0.99), estimatedFee: randFloat(5, 150), actualFee: null, estimatedTime: randInt(5, 120), createdAt: randomDate(45) },
    })
  }

  // 9. Fraud Alerts
  for (let i = 0; i < 8; i++) {
    await db.fraudAlert.create({
      data: { alertRef: `FRD-${randomUUID().slice(0, 8).toUpperCase()}`, businessId: rand(otherBiz).id, relatedType: 'transaction', severity: rand(['Critical', 'High', 'Medium', 'Low']), fraudType: rand(['unusual_amount', 'velocity_breach', 'sanction_match', 'identity_mismatch']), score: randFloat(40, 98), description: `Suspicious activity detected in transaction #${i + 1}`, status: rand(['Open', 'Investigating', 'Confirmed', 'Resolved']), createdAt: randomDate(20) },
    })
  }

  // 10. Collection Cases
  for (let i = 0; i < 6; i++) {
    await db.collectionCase.create({
      data: { caseRef: `COL-${randomUUID().slice(0, 8).toUpperCase()}`, businessId: business.id, debtorId: rand(otherBiz).id, originalAmount: randFloat(5000, 50000), outstandingAmount: randFloat(1000, 30000), currency: rand(CURRENCIES), agingBucket: rand(['Current', '1-30', '31-60', '61-90', '90+']), priority: rand(['Urgent', 'High', 'Normal', 'Low']), status: rand(['active', 'active', 'paused', 'resolved']), reminderCount: randInt(0, 5), aiStrategy: rand(['friendly_reminder', 'formal_notice', 'escalation', 'legal_review']) },
    })
  }

  // 11. Payment Links
  for (let i = 0; i < 5; i++) {
    await db.paymentLink.create({
      data: { linkRef: `PL-${randomUUID().slice(0, 8).toUpperCase()}`, businessId: business.id, title: `Payment for Order #${i + 100}`, description: `Invoice payment link`, amount: randFloat(100, 10000), currency: rand(CURRENCIES), status: rand(['active', 'active', 'expired']), maxPayments: 1, createdAt: randomDate(30) },
    })
  }

  // 12. Compliance Rules + Screenings
  for (let i = 0; i < 5; i++) {
    await db.complianceRule.create({
      data: { name: rand(['Sanctions Check', 'KYC Requirement', 'AML Threshold', 'Transaction Limit', 'Country Restriction']), ruleType: rand(['sanctions_check', 'kyc_requirement', 'aml_threshold', 'transaction_limit', 'country_restriction']), condition: '{}', action: rand(['block', 'flag_for_review', 'require_additional_doc', 'allow']), severity: rand(['low', 'medium', 'high', 'critical']), isActive: true, triggeredCount: randInt(0, 20) },
    })
  }
  for (let i = 0; i < 8; i++) {
    await db.complianceScreening.create({
      data: { businessId: rand(otherBiz).id, screeningType: rand(['sanctions', 'pep', 'adverse_media', 'country_risk']), result: rand(['clear', 'match', 'potential_match', 'alert']), riskLevel: rand(['low', 'medium', 'high', 'critical']), status: rand(['completed', 'pending', 'escalated']), createdAt: randomDate(30) },
    })
  }

  // 13. Business Matches
  for (let i = 0; i < 8; i++) {
    const cBiz = rand(otherBiz)
    const mType = rand(['supplier', 'buyer', 'partner'])
    try {
      await db.businessMatch.create({
        data: { seekerId: business.id, candidateId: cBiz.id, matchType: mType, matchScore: randFloat(50, 98), reasons: 'Industry alignment and geographic proximity', status: rand(['Suggested', 'Contacted', 'Interested', 'Engaged', 'Declined']) },
      })
    } catch { /* unique, skip */ }
  }

  // 14. Digital Twins
  for (const b of [business, ...otherBiz.slice(0, 5)]) {
    const health = randFloat(40, 95)
    await db.financialDigitalTwin.create({
      data: { businessId: b.id, healthScore: health, cashFlowHealth: Math.min(100, health + randFloat(-15, 15)), riskAppetite: rand(['conservative', 'moderate', 'aggressive']), creditWorthiness: Math.min(100, health + randFloat(-10, 10)), liquidityScore: Math.min(100, health + randFloat(-15, 15)), growthTrajectory: rand(['declining', 'stable', 'growing', 'rapid_growth']), aiModelVersion: 'v1.2', lastSyncAt: new Date() },
    })
  }

  // 15. Invoices
  for (let i = 0; i < 6; i++) {
    await db.invoice.create({
      data: { invoiceRef: `INV-${randomUUID().slice(0, 8).toUpperCase()}`, senderId: business.id, receiverId: rand(otherBiz).id, amount: randFloat(1000, 25000), currency: rand(CURRENCIES), status: rand(['draft', 'sent', 'paid', 'overdue']), dueDate: new Date(Date.now() + randInt(-30, 60) * 86400000) },
    })
  }

  console.log('Done! Login: youngsharktechnologies@gmail.com / Demo1234!')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
