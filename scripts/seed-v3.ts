import { PrismaClient, Prisma } from '@prisma/client'
import { createHash, randomUUID } from 'crypto'

const db = new PrismaClient()

const COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
]

const INDUSTRIES = [
  'Electronics Manufacturing', 'Textile & Apparel', 'Agricultural Products',
  'Automotive Parts', 'Chemical Products', 'Machinery & Equipment',
  'Food & Beverage', 'Pharmaceuticals', 'Technology Services', 'Logistics & Shipping',
  'Mining & Minerals', 'Energy & Renewables',
]

const BUSINESS_NAMES = [
  'Pacific Trade Co.', 'Berlin Industrie GmbH', 'Shenzhen Tech Solutions',
  'London Bridge Imports', 'Dubai Golden Trade', 'Tokyo Electronics Ltd.',
  'Singapore Global Pte', 'Mumbai Textile Mills', 'São Paulo Agro Ltd.',
  'Lagos Trade Hub', 'Nairobi Export Co.', 'Sydney Mining Corp',
  'Shanghai Steel Works', 'Hamburg Logistics GmbH', 'New York Food Corp',
  'Birmingham Auto Parts', 'Seoul Semiconductor', 'Bangalore IT Solutions',
  'Cape Town Energy', 'Toronto Chemicals Inc.', 'Osaka Machinery Co.',
  'Melbourne Agri Ltd.', 'Abu Dhabi Oil Services', 'Kuala Lumpur Rubber',
  'Jakarta Textile Corp', 'Manila Electronics', 'Hanoi Manufacturing',
  'Chennai Pharma Ltd', 'Milan Fashion Group', 'Stockholm Clean Energy',
  'Zurich Financial Tech', 'Paris Luxury Goods', 'Madrid Olive Oil Exports',
  'Amsterdam Shipping Co.', 'Warsaw Machinery Ltd', 'Prague Automotive',
  'Budapest Chemical Works', 'Copenhagen Wind Power', 'Helsinki Tech Oy',
  'Oslo Maritime Services', 'Dublin Pharma Group', 'Vienna Engineering',
  'Lisbon Cork Exports', 'Athens Shipping Ltd', 'Istanbul Textile Mills',
  'Cairo Trade Center', 'Riyadh Petrochemicals', 'Doha Gas Services',
]

const STATUSES: ('verified' | 'pending' | 'suspended' | 'deactivated')[] = ['verified', 'verified', 'verified', 'verified', 'pending', 'pending', 'suspended']
const CREDENTIAL_LEVELS = ['basic', 'standard', 'enhanced', 'premium']
const KYC_STATUSES = ['verified', 'in_progress', 'not_started', 'rejected']
const AML_STATUSES = ['cleared', 'flagged', 'not_started', 'rejected']
const RISK_RATINGS = ['low', 'medium', 'high', 'critical']
const ESCROW_STATUSES = ['created', 'funded', 'in_escrow', 'completed', 'completed', 'completed', 'disputed', 'cancelled']
const PAYMENT_METHODS_LIST = ['bank_transfer', 'card', 'crypto', 'mobile_money', 'digital_wallet']
const ROUTING_PROVIDERS = ['wise', 'stripe', 'paypal', 'local_bank', 'crypto_network']
const VERIFICATION_TYPES = ['identity', 'business_registration', 'tax', 'bank_account', 'address']
const VERIFICATION_METHODS = ['document', 'api', 'manual', 'third_party']
const VERIFICATION_STATUSES = ['approved', 'approved', 'pending', 'in_progress', 'rejected']
const GROWTH_TRAJECTORIES = ['declining', 'stable', 'growing', 'rapid_growth']
const RISK_APPETITES = ['conservative', 'moderate', 'aggressive']
const PREDICTION_TYPES = ['revenue', 'cash_flow', 'risk', 'growth_rate']
const TIMEFRAMES = ['30d', '60d', '90d', '6m', '1y']
const WALLET_CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'CNY', 'JPY', 'SGD', 'AED', 'BRL', 'AUD', 'INR']

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randFloat(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateTxRef(): string {
  const now = new Date()
  const d = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  return `ESC-${d}-${String(randInt(0, 99999)).padStart(5, '0')}`
}

function generateIntentRef(): string {
  const now = new Date()
  const d = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  return `PAY-${d}-${String(randInt(0, 99999)).padStart(5, '0')}`
}

function generateLinkRef(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'PLINK-'
  for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length))
  return result
}

function randomDate(daysAgo: number): Date {
  const now = new Date()
  return new Date(now.getTime() - randInt(0, daysAgo) * 24 * 60 * 60 * 1000)
}

async function main() {
  console.log('🌱 Seeding database (v3 - full)...')

  // Clear all tables in dependency order
  const tables = [
    'financialPrediction', 'financialSnapshot', 'financialMetric',
    'collectionReminder', 'collectionCase',
    'complianceScreening', 'complianceRule',
    'fraudAlert', 'fraudRule',
    'businessMatch',
    'walletTransaction', 'wallet',
    'paymentLinkPayment', 'paymentLink',
    'globalPaymentMethod', 'paymentMethod',
    'currencyRate',
    'escrowAuditLog', 'disbursement', 'dispute', 'escrowMilestone', 'escrowTransaction',
    'paymentTransaction', 'paymentIntent',
    'reputationEvent', 'review', 'trustScore',
    'complianceDocument', 'verification', 'commercePassport',
    'invoice', 'businessRelationship', 'financialDigitalTwin', 'business', 'user',
  ]
  for (const t of tables) {
    try { await (db as any)[t].deleteMany() } catch { /* table may not exist */ }
  }
  console.log('  ✓ Cleared existing data')

  // 1. Users
  const users = []
  for (let i = 0; i < 10; i++) {
    users.push(await db.user.create({
      data: {
        email: `user${i + 1}@youngsend.com`,
        name: BUSINESS_NAMES[i],
        role: i === 0 ? 'admin' : i < 3 ? 'buyer' : i < 6 ? 'seller' : i < 8 ? 'auditor' : 'viewer',
        businessId: `biz_${i + 1}`,
        isActive: true,
        lastLoginAt: randomDate(7),
      },
    }))
  }
  console.log(`  ✓ Created ${users.length} users`)

  // 2. Businesses
  const businessData = BUSINESS_NAMES.map((name, i) => {
    const country = COUNTRIES[i % COUNTRIES.length]
    const status = rand(STATUSES)
    return {
      id: `biz_${i + 1}`,
      name,
      country: country.code,
      city: `${name.split(' ')[0]} City`,
      industry: rand(INDUSTRIES),
      website: `https://${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      employeeCount: randInt(5, 5000),
      annualRevenue: randFloat(100000, 50000000),
      status,
      verifiedAt: status === 'verified' ? randomDate(180) : null,
    }
  })

  const businesses = []
  for (const bd of businessData) {
    businesses.push(await db.business.create({ data: bd }))
  }
  console.log(`  ✓ Created ${businesses.length} businesses`)

  // 3. Passports
  for (const biz of businesses) {
    const credLevel = rand(CREDENTIAL_LEVELS)
    const kycStatus = credLevel === 'basic' ? rand(KYC_STATUSES.slice(1)) : rand(KYC_STATUSES)
    const amlStatus = credLevel === 'basic' ? rand(AML_STATUSES.slice(1)) : rand(AML_STATUSES)
    await db.commercePassport.create({
      data: {
        businessId: biz.id,
        passportHash: createHash('sha256').update(biz.id + Date.now() + Math.random()).digest('hex'),
        credentialLevel: credLevel,
        kycStatus,
        kycVerifiedAt: kycStatus === 'verified' ? randomDate(90) : null,
        amlStatus: amlStatus === 'cleared' ? 'cleared' : rand(AML_STATUSES),
        amlCheckedAt: randomDate(90),
        riskRating: rand(RISK_RATINGS),
        lastAuditAt: randomDate(60),
        nextAuditDue: new Date(Date.now() + randInt(30, 180) * 24 * 60 * 60 * 1000),
      },
    })
  }
  console.log('  ✓ Created passports')

  // 4. Trust scores
  for (const biz of businesses) {
    const overall = randFloat(20, 98)
    await db.trustScore.create({
      data: {
        businessId: biz.id,
        overallScore: overall,
        paymentScore: Math.min(100, Math.max(0, overall + randFloat(-15, 15))),
        deliveryScore: Math.min(100, Math.max(0, overall + randFloat(-15, 15))),
        qualityScore: Math.min(100, Math.max(0, overall + randFloat(-15, 15))),
        communicationScore: Math.min(100, Math.max(0, overall + randFloat(-10, 10))),
        complianceScore: Math.min(100, Math.max(0, overall + randFloat(-10, 10))),
        totalReviews: randInt(0, 120),
        totalTransactions: randInt(1, 500),
        scoreVersion: randInt(1, 5),
        lastCalculated: randomDate(7),
      },
    })
  }
  console.log('  ✓ Created trust scores')

  // 5. Digital twins
  for (const biz of businesses) {
    const health = randFloat(25, 98)
    await db.financialDigitalTwin.create({
      data: {
        businessId: biz.id,
        healthScore: health,
        cashFlowHealth: Math.min(100, Math.max(0, health + randFloat(-20, 20))),
        riskAppetite: rand(RISK_APPETITES),
        creditWorthiness: Math.min(100, Math.max(0, health + randFloat(-15, 15))),
        liquidityScore: Math.min(100, Math.max(0, health + randFloat(-20, 20))),
        growthTrajectory: rand(GROWTH_TRAJECTORIES),
        aiModelVersion: 'v1.0',
        lastSyncAt: randomDate(2),
      },
    })
  }
  console.log('  ✓ Created digital twins')

  // 6. Escrow transactions WITH milestones
  const escrowIds: string[] = []
  for (let i = 0; i < 60; i++) {
    const buyer = rand(businesses)
    let seller = rand(businesses)
    while (seller.id === buyer.id) seller = rand(businesses)
    const status = rand(ESCROW_STATUSES)
    const amount = randFloat(500, 500000)
    const currencies = ['USD', 'EUR', 'GBP', 'CNY', 'JPY', 'SGD', 'AED', 'AUD']
    const currency = rand(currencies)
    const totalMilestones = randInt(1, 4)
    const currentMilestone = status === 'completed' ? totalMilestones : status === 'cancelled' ? 0 : randInt(0, totalMilestones - 1)
    const aiRiskScore = randFloat(5, 95)
    let aiRiskLevel: string
    if (aiRiskScore < 30) aiRiskLevel = 'low'
    else if (aiRiskScore < 70) aiRiskLevel = 'medium'
    else aiRiskLevel = 'high'

    const escrow = await db.escrowTransaction.create({
      data: {
        id: `esc_${i + 1}`,
        txRef: generateTxRef(),
        buyerId: buyer.id,
        sellerId: seller.id,
        amount,
        currency,
        description: `Trade transaction #${i + 1}`,
        status,
        currentMilestone,
        totalMilestones,
        fundedAmount: ['funded', 'in_escrow', 'completed', 'disputed'].includes(status) ? amount : randFloat(0, amount * 0.5),
        releasedAmount: status === 'completed' ? amount : status === 'in_escrow' ? randFloat(0, amount * 0.6) : 0,
        refundedAmount: status === 'cancelled' ? amount : 0,
        feeAmount: randFloat(amount * 0.005, amount * 0.025),
        feeCurrency: 'USD',
        aiRiskScore,
        aiRiskLevel,
        expiresAt: new Date(Date.now() + randInt(10, 60) * 24 * 60 * 60 * 1000),
        completedAt: status === 'completed' ? randomDate(30) : null,
        createdAt: randomDate(60),
      },
    })
    escrowIds.push(escrow.id)

    // Create milestones
    const milestoneTitles = ['Deposit', 'Production', 'Quality Check', 'Final Delivery', 'Shipping', 'Installation']
    for (let m = 0; m < totalMilestones; m++) {
      const mAmount = m === totalMilestones - 1
        ? Math.round((amount - (amount / totalMilestones) * (totalMilestones - 1)) * 100) / 100
        : Math.round((amount / totalMilestones) * 100) / 100
      const mStatus = status === 'completed' ? 'released' : m < currentMilestone ? 'released' : m === currentMilestone && status === 'in_escrow' ? 'ready' : 'pending'

      const milestone = await db.escrowMilestone.create({
        data: {
          escrowId: escrow.id,
          sequence: m + 1,
          title: milestoneTitles[m % milestoneTitles.length],
          amount: mAmount,
          status: mStatus,
          releasedAt: mStatus === 'released' ? randomDate(30) : null,
          createdAt: randomDate(60),
        },
      })

      // Create disbursements for released milestones
      if (mStatus === 'released') {
        await db.disbursement.create({
          data: {
            escrowId: escrow.id,
            milestoneId: milestone.id,
            amount: mAmount,
            currency,
            status: 'completed',
            paymentRef: `DIS-${escrow.txRef}-${m + 1}`,
            completedAt: randomDate(30),
            createdAt: randomDate(60),
          },
        })
      }
    }

    // Create audit log entries
    await db.escrowAuditLog.create({
      data: { escrowId: escrow.id, action: 'created', actor: buyer.id, details: `Escrow created for ${amount} ${currency}`, createdAt: randomDate(60) },
    })
    if (['funded', 'in_escrow', 'completed', 'disputed'].includes(status)) {
      await db.escrowAuditLog.create({
        data: { escrowId: escrow.id, action: 'funded', actor: buyer.id, details: `Funded with ${amount} ${currency}`, createdAt: randomDate(45) },
      })
    }
    if (['in_escrow', 'completed', 'disputed'].includes(status)) {
      await db.escrowAuditLog.create({
        data: { escrowId: escrow.id, action: 'activated', actor: buyer.id, details: 'Escrow activated', createdAt: randomDate(40) },
      })
    }
    if (status === 'completed') {
      await db.escrowAuditLog.create({
        data: { escrowId: escrow.id, action: 'completed', details: 'All milestones released', createdAt: randomDate(20) },
      })
    }
    if (status === 'disputed') {
      const dispute = await db.dispute.create({
        data: {
          escrowId: escrow.id,
          raisedBy: Math.random() > 0.5 ? 'buyer' : 'seller',
          reason: rand(['Goods not delivered', 'Quality below standard', 'Payment delay', 'Wrong items shipped', 'Documentation mismatch']),
          description: 'Dispute regarding transaction terms',
          status: rand(['open', 'under_review', 'resolved']),
          resolution: Math.random() > 0.5 ? 'Partial refund issued to buyer' : null,
          resolvedAt: Math.random() > 0.5 ? randomDate(10) : null,
          aiRecommendation: 'Review evidence and mediate within 72 hours',
          createdAt: randomDate(30),
        },
      })
      await db.escrowAuditLog.create({
        data: { escrowId: escrow.id, action: 'dispute_raised', details: `Dispute raised: ${dispute.reason}`, createdAt: randomDate(30) },
      })
    }
  }
  console.log(`  ✓ Created ${escrowIds.length} escrow transactions with milestones, disbursements, disputes, audit logs`)

  // 7. Payment intents
  for (let i = 0; i < 45; i++) {
    const fromBiz = rand(businesses)
    let toBiz = rand(businesses)
    while (toBiz.id === fromBiz.id) toBiz = rand(businesses)
    const currencies = ['USD', 'EUR', 'GBP', 'CNY', 'JPY']
    const srcCurrency = rand(currencies)
    let tgtCurrency = rand(currencies)
    while (tgtCurrency === srcCurrency) tgtCurrency = rand(currencies)
    const sourceAmount = randFloat(1000, 200000)
    const rates: Record<string, number> = {
      'USD-EUR': 0.92, 'USD-GBP': 0.79, 'USD-CNY': 7.24, 'USD-JPY': 149.5,
      'EUR-USD': 1.087, 'EUR-GBP': 0.858, 'EUR-CNY': 7.87, 'EUR-JPY': 162.5,
      'GBP-USD': 1.266, 'GBP-EUR': 1.166, 'GBP-CNY': 9.17, 'GBP-JPY': 189.3,
      'CNY-USD': 0.138, 'CNY-EUR': 0.127, 'CNY-GBP': 0.109, 'CNY-JPY': 20.65,
      'JPY-USD': 0.00669, 'JPY-EUR': 0.00615, 'JPY-GBP': 0.00528, 'JPY-CNY': 0.0484,
    }
    const rate = rates[`${srcCurrency}-${tgtCurrency}`] || 1.0
    const status = rand(['created', 'processing', 'completed', 'completed', 'completed', 'failed', 'cancelled'] as const)
    await db.paymentIntent.create({
      data: {
        id: `pay_${i + 1}`,
        intentRef: generateIntentRef(),
        fromBusinessId: fromBiz.id,
        toBusinessId: toBiz.id,
        sourceAmount,
        sourceCurrency: srcCurrency,
        targetAmount: Math.round(sourceAmount * rate * 100) / 100,
        targetCurrency: tgtCurrency,
        exchangeRate: rate,
        status,
        paymentMethod: rand(PAYMENT_METHODS_LIST),
        routingProvider: rand(ROUTING_PROVIDERS),
        routingScore: randFloat(0.6, 0.99),
        estimatedFee: Math.round(sourceAmount * randFloat(0.005, 0.03) * 100) / 100,
        actualFee: status === 'completed' ? Math.round(sourceAmount * randFloat(0.005, 0.03) * 100) / 100 : null,
        estimatedTime: randInt(5, 120),
        completedAt: status === 'completed' ? randomDate(30) : null,
        createdAt: randomDate(60),
      },
    })
  }
  console.log('  ✓ Created payment intents')

  // 8. Verifications
  for (let i = 0; i < 80; i++) {
    const biz = rand(businesses)
    const status = rand(VERIFICATION_STATUSES)
    await db.verification.create({
      data: {
        id: `ver_${i + 1}`,
        businessId: biz.id,
        type: rand(VERIFICATION_TYPES),
        method: rand(VERIFICATION_METHODS),
        status,
        submittedAt: randomDate(60),
        verifiedAt: status === 'approved' ? randomDate(30) : null,
        verifiedBy: status === 'approved' ? 'system' : null,
        rejectionReason: status === 'rejected' ? 'Document unclear or expired' : null,
      },
    })
  }
  console.log('  ✓ Created verifications')

  // 9. Financial metrics
  for (const biz of businesses.slice(0, 30)) {
    for (let m = 5; m >= 0; m--) {
      const date = new Date()
      date.setMonth(date.getMonth() - m)
      const periodDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const revenue = randFloat(50000, 500000)
      const expenses = revenue * randFloat(0.5, 0.85)
      await db.financialMetric.create({
        data: {
          id: `fm_${biz.id}_${periodDate}`,
          twinId: (await db.financialDigitalTwin.findUnique({ where: { businessId: biz.id } }))!.id,
          period: 'monthly', periodDate, revenue, expenses,
          netIncome: revenue - expenses, cashBalance: randFloat(10000, 200000),
          transactionCount: randInt(10, 200), averageTransactionValue: randFloat(500, 25000),
          paymentSuccessRate: randFloat(0.85, 0.99), disputeRate: randFloat(0, 0.08),
          customerCount: randInt(5, 100), supplierCount: randInt(2, 30),
        },
      })
    }
  }
  console.log('  ✓ Created financial metrics')

  // 10. Financial predictions
  for (const biz of businesses.slice(0, 20)) {
    const twin = await db.financialDigitalTwin.findUnique({ where: { businessId: biz.id } })
    if (!twin) continue
    for (const predType of PREDICTION_TYPES) {
      for (const tf of TIMEFRAMES.slice(0, 3)) {
        const predictedValue = randFloat(10000, 1000000)
        const confidence = randFloat(0.6, 0.95)
        await db.financialPrediction.create({
          data: {
            id: `fp_${biz.id}_${predType}_${tf}`,
            twinId: twin.id, predictionType: predType, timeframe: tf,
            predictedValue, confidence,
            lowerBound: predictedValue * (1 - (1 - confidence) * 2),
            upperBound: predictedValue * (1 + (1 - confidence) * 2),
            model: 'ensemble',
          },
        })
      }
    }
  }
  console.log('  ✓ Created financial predictions')

  // 11. Business relationships
  for (let i = 0; i < 40; i++) {
    const from = rand(businesses)
    let to = rand(businesses)
    while (to.id === from.id) to = rand(businesses)
    try {
      await db.businessRelationship.create({
        data: {
          fromBusinessId: from.id, toBusinessId: to.id,
          type: rand(['supplier', 'buyer', 'partner', 'logistics', 'financial']),
          status: rand(['active', 'active', 'active', 'paused', 'terminated'] as const),
          trustLevel: randFloat(20, 98), totalTxVolume: randFloat(10000, 2000000),
          totalTxCount: randInt(1, 100), firstTxDate: randomDate(365), lastTxDate: randomDate(30),
        },
      })
    } catch { /* unique constraint */ }
  }
  console.log('  ✓ Created business relationships')

  // 12. Reviews
  const REVIEW_COMMENTS = [
    'Excellent partner, always delivers on time.',
    'Good quality products, communication could be better.',
    'Reliable supplier with competitive pricing.',
    'Outstanding service, highly recommended.',
    'Some delays but overall satisfactory.',
    'Great experience working together on this order.',
    'Professional and responsive throughout the process.',
    'Product quality exceeded expectations.',
  ]
  for (let i = 0; i < 60; i++) {
    const from = rand(businesses)
    let to = rand(businesses)
    while (to.id === from.id) to = rand(businesses)
    const rating = randFloat(2.5, 5.0)
    await db.review.create({
      data: {
        fromBusinessId: from.id, toBusinessId: to.id,
        escrowId: escrowIds[i % escrowIds.length] || null,
        rating: Math.round(rating * 10) / 10,
        paymentRating: Math.min(5, Math.max(1, Math.round((rating + randFloat(-0.5, 0.5)) * 10) / 10)),
        deliveryRating: Math.min(5, Math.max(1, Math.round((rating + randFloat(-0.5, 0.5)) * 10) / 10)),
        qualityRating: Math.min(5, Math.max(1, Math.round((rating + randFloat(-0.5, 0.5)) * 10) / 10)),
        communicationRating: Math.min(5, Math.max(1, Math.round((rating + randFloat(-0.3, 0.3)) * 10) / 10)),
        comment: rand(REVIEW_COMMENTS),
        response: Math.random() > 0.6 ? 'Thank you for your feedback!' : null,
        respondedAt: Math.random() > 0.6 ? randomDate(14) : null,
        status: rand(['published', 'published', 'published', 'hidden', 'flagged']),
        createdAt: randomDate(90),
      },
    })
  }
  console.log('  ✓ Created reviews')

  // 13. Invoices
  const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled']
  for (let i = 0; i < 50; i++) {
    const sender = rand(businesses)
    let receiver = rand(businesses)
    while (receiver.id === sender.id) receiver = rand(businesses)
    const amount = randFloat(1000, 100000)
    const status = rand(INVOICE_STATUSES)
    await db.invoice.create({
      data: {
        id: `inv_${i + 1}`,
        invoiceRef: `INV-${String(i + 1).padStart(4, '0')}`,
        senderId: sender.id, receiverId: receiver.id,
        escrowId: escrowIds[i % escrowIds.length] || null,
        amount, currency: rand(['USD', 'EUR', 'GBP', 'CNY']),
        status,
        dueDate: new Date(Date.now() + randInt(-30, 60) * 24 * 60 * 60 * 1000),
        paidAmount: ['paid', 'partially_paid'].includes(status) ? randFloat(amount * 0.3, amount) : 0,
        items: JSON.stringify([{ description: 'Trade goods', quantity: randInt(1, 100), unitPrice: Math.round(amount / randInt(1, 100)) }]),
        notes: 'Payment due within 30 days',
        paidAt: status === 'paid' ? randomDate(30) : null,
        createdAt: randomDate(90),
      },
    })
  }
  console.log('  ✓ Created invoices')

  // 14. Wallets + Transactions
  for (let b = 0; b < Math.min(30, businesses.length); b++) {
    const biz = businesses[b]
    const numCurrencies = randInt(1, 3)
    const bizCurrencies = [...new Set(Array.from({ length: numCurrencies }, () => rand(WALLET_CURRENCIES)))]

    for (const currency of bizCurrencies) {
      const balance = randFloat(100, 500000)
      const wallet = await db.wallet.create({
        data: {
          businessId: biz.id, currency, balance,
          availableBalance: Math.round(balance * randFloat(0.7, 1.0) * 100) / 100,
          pendingBalance: Math.round(balance * randFloat(0, 0.2) * 100) / 100,
          frozenBalance: Math.round(balance * randFloat(0, 0.1) * 100) / 100,
          isDefault: currency === 'USD',
          status: 'active',
        },
      })

      // Create wallet transactions
      const txTypes: Array<{ type: string; refType: string }> = [
        { type: 'credit', refType: 'escrow' }, { type: 'credit', refType: 'payment_link' },
        { type: 'debit', refType: 'escrow' }, { type: 'fee', refType: 'conversion' },
        { type: 'transfer_in', refType: 'transfer' }, { type: 'transfer_out', refType: 'transfer' },
        { type: 'refund', refType: 'escrow' }, { type: 'credit', refType: 'invoice' },
      ]
      const numTx = randInt(3, 12)
      let runningBalance = balance
      for (let t = 0; t < numTx; t++) {
        const txType = rand(txTypes)
        const isCredit = txType.type === 'credit' || txType.type === 'transfer_in' || txType.type === 'refund'
        const amount = randFloat(50, 25000)
        const balanceBefore = runningBalance
        const balanceAfter = isCredit
          ? Math.round((balanceBefore + amount) * 100) / 100
          : Math.round((balanceBefore - amount) * 100) / 100
        if (balanceAfter < 0) continue
        runningBalance = balanceAfter

        await db.walletTransaction.create({
          data: {
            walletId: wallet.id,
            txRef: `WTX-${randomUUID().slice(0, 8).toUpperCase()}`,
            type: txType.type,
            amount, balanceBefore, balanceAfter, currency,
            description: `${txType.type === 'credit' ? 'Received' : txType.type === 'debit' ? 'Sent' : txType.type} ${txType.refType}`,
            referenceType: txType.refType,
            referenceId: `ref_${randInt(1, 999)}`,
            status: rand(['completed', 'completed', 'completed', 'pending']),
            createdAt: randomDate(60),
          },
        })
      }
    }
  }
  console.log('  ✓ Created wallets with transactions')

  // 15. Payment Links + Payments
  const PLINK_TITLES = [
    'Q4 2024 Invoice Payment', 'Trade Deposit', 'Sample Order Payment',
    'Bulk Order - 50% Advance', 'Consultation Fee', 'Express Shipping Fee',
    'Custom Manufacturing', 'Annual Subscription', 'Product Sample', 'Order Fulfillment',
  ]
  for (let i = 0; i < 40; i++) {
    const biz = rand(businesses)
    const currency = rand(['USD', 'EUR', 'GBP', 'NGN', 'KES', 'CNY'])
    const maxPayments = rand([1, 1, 1, 5, 10, 0]) // 0 = unlimited
    const linkStatus = rand(['active', 'active', 'active', 'paused', 'expired', 'depleted'])
    const paymentCount = linkStatus === 'depleted' ? maxPayments || 5 : linkStatus === 'active' ? randInt(0, maxPayments || 3) : 0
    const amt = Math.random() > 0.3 ? randFloat(50, 25000) : 0 // 0 = open amount

    const link = await db.paymentLink.create({
      data: {
        linkRef: generateLinkRef(),
        businessId: biz.id,
        title: PLINK_TITLES[i % PLINK_TITLES.length],
        description: `Payment link for ${PLINK_TITLES[i % PLINK_TITLES.length].toLowerCase()}`,
        amount: amt, currency,
        allowedMethods: JSON.stringify(['bank_transfer', 'card', 'mobile_money']),
        allowedCountries: Math.random() > 0.5 ? JSON.stringify(['US', 'GB', 'NG', 'KE']) : null,
        maxPayments,
        paymentCount,
        totalCollected: Math.round(paymentCount * (amt || randFloat(100, 5000)) * 100) / 100,
        status: linkStatus,
        expiresAt: Math.random() > 0.7 ? new Date(Date.now() + randInt(1, 90) * 24 * 60 * 60 * 1000) : null,
        createdAt: randomDate(60),
      },
    })

    // Create payments for this link
    for (let p = 0; p < paymentCount; p++) {
      const payAmount = amt || randFloat(100, 5000)
      const fee = Math.round(payAmount * 0.015 * 100) / 100
      await db.paymentLinkPayment.create({
        data: {
          paymentLinkId: link.id,
          payerName: `Payer ${randInt(1, 200)}`,
          payerEmail: `payer${randInt(1, 200)}@example.com`,
          payerCountry: rand(['US', 'GB', 'NG', 'KE', 'IN', 'DE', 'BR']),
          amount: payAmount, currency: link.currency,
          paymentMethod: rand(['bank_transfer', 'card', 'mobile_money', 'digital_wallet']),
          provider: rand(['stripe', 'paypal', 'wise', 'mpesa']),
          status: rand(['completed', 'completed', 'completed', 'pending', 'failed']),
          feeAmount: fee,
          netAmount: Math.round((payAmount - fee) * 100) / 100,
          providerTxId: `ptx_${randomUUID().slice(0, 12)}`,
          completedAt: Math.random() > 0.2 ? randomDate(30) : null,
          createdAt: randomDate(60),
        },
      })
    }
  }
  console.log('  ✓ Created payment links with payments')

  // 16. Fraud rules & alerts
  const FRAUD_RULE_DATA = [
    { name: 'Unusual Amount Detection', description: 'Flags transactions exceeding 3x average', condition: '{"field":"amount","operator":">","value":"avg_3x"}', action: 'flag', severity: 'high' },
    { name: 'Velocity Breach', description: 'More than 5 transactions in 10 minutes', condition: '{"field":"tx_count","window":"10m","threshold":5}', action: 'block', severity: 'critical' },
    { name: 'Geo Mismatch', description: 'Payer country differs from business country', condition: '{"field":"country","operator":"mismatch"}', action: 'require_review', severity: 'medium' },
    { name: 'New Account Large Payment', description: 'Accounts < 7 days with payments > $10K', condition: '{"field":"account_age","max_days":7,"min_amount":10000}', action: 'flag', severity: 'high' },
    { name: 'Sanctioned Entity Check', description: 'Check against OFAC/EU sanctions lists', condition: '{"field":"sanctions_check","lists":["ofac","eu","un"]}', action: 'block', severity: 'critical' },
    { name: 'Structuring Pattern', description: 'Multiple transactions just below reporting threshold', condition: '{"field":"amount_pattern","threshold":9000,"window":"24h","count":3}', action: 'alert', severity: 'high' },
  ]
  for (const ruleData of FRAUD_RULE_DATA) {
    await db.fraudRule.create({
      data: {
        ...ruleData, isActive: Math.random() > 0.2,
        triggerCount: randInt(0, 45),
        lastTriggeredAt: Math.random() > 0.3 ? randomDate(14) : null,
      },
    })
  }

  const FRAUD_TYPES = ['unusual_amount', 'velocity_breach', 'geo_mismatch', 'sanctioned_entity', 'fake_identity', 'account_takeover', 'structure_pattern']
  const FRAUD_ALERT_DESCRIPTIONS = [
    'Transaction amount of $125,000 exceeds 3x the account average of $35,000',
    '12 transactions initiated within 10 minutes from same IP',
    'Payer in Nigeria but business registered in Germany — potential geo mismatch',
    'New account (2 days old) attempting payment of $50,000',
    'Name matches entity on OFAC SDN list — requires immediate review',
    '3 transactions of $8,500 each within 24 hours — potential structuring',
  ]
  for (let i = 0; i < 25; i++) {
    await db.fraudAlert.create({
      data: {
        alertRef: `FRAUD-${String(i + 1).padStart(4, '0')}`,
        businessId: rand(businesses).id,
        relatedType: rand(['escrow', 'payment_intent', 'payment_link', 'wallet']),
        relatedId: `rel_${randInt(1, 999)}`,
        severity: rand(['low', 'medium', 'medium', 'high', 'critical']),
        fraudType: rand(FRAUD_TYPES),
        score: randFloat(15, 98),
        description: FRAUD_ALERT_DESCRIPTIONS[i % FRAUD_ALERT_DESCRIPTIONS.length],
        recommendation: rand(['Block transaction', 'Require manual review', 'Request additional verification', 'Allow with monitoring', 'Escalate to compliance team']),
        status: rand(['open', 'open', 'investigating', 'confirmed_fraud', 'false_positive', 'resolved']),
        metadata: Math.random() > 0.5 ? JSON.stringify({ actionTaken: 'Under investigation' }) : null,
        resolvedAt: Math.random() > 0.7 ? randomDate(10) : null,
        createdAt: randomDate(30),
      },
    })
  }
  console.log('  ✓ Created fraud rules & alerts')

  // 17. Compliance rules & screenings
  const COMPLIANCE_RULE_DATA = [
    { name: 'KYC Verification Required', description: 'All businesses must complete KYC before transactions', ruleType: 'kyc_requirement', condition: '{"require":"kyc_verified","block_if":false}', action: 'block', severity: 'high' },
    { name: 'AML Threshold Check', description: 'Transactions above $10,000 require AML screening', ruleType: 'aml_threshold', condition: '{"threshold":10000,"require":"aml_clear"}', action: 'flag_for_review', severity: 'medium' },
    { name: 'Sanctions Screening', description: 'Screen all counterparties against sanctions lists', ruleType: 'sanctions_check', condition: '{"lists":["ofac","eu","un","hmt"]}', action: 'block', severity: 'critical' },
    { name: 'Country Restriction', description: 'Restricted countries require enhanced due diligence', ruleType: 'country_restriction', condition: '{"restricted":["KP","IR","SY","CU"]}', action: 'require_additional_doc', severity: 'high' },
    { name: 'Transaction Limit', description: 'Single transaction limit of $500,000', ruleType: 'transaction_limit', condition: '{"max_amount":500000}', action: 'flag_for_review', severity: 'medium' },
  ]
  for (const ruleData of COMPLIANCE_RULE_DATA) {
    await db.complianceRule.create({
      data: { ...ruleData, isActive: Math.random() > 0.15, triggeredCount: randInt(0, 100) },
    })
  }

  const SCREENING_TYPES = ['sanctions', 'pep', 'adverse_media', 'country_risk']
  for (let i = 0; i < 30; i++) {
    const screeningType = rand(SCREENING_TYPES)
    const result = rand(['clear', 'clear', 'clear', 'potential_match', 'alert'])
    await db.complianceScreening.create({
      data: {
        businessId: rand(businesses).id,
        transactionType: rand(['escrow', 'payment', 'wallet']),
        transactionId: `tx_${randInt(1, 500)}`,
        screeningType,
        result,
        riskLevel: result === 'clear' ? 'low' : result === 'potential_match' ? 'medium' : 'high',
        details: result === 'clear' ? 'No matches found' : `Potential match on ${screeningType} list — manual review required`,
        matchedLists: result !== 'clear' ? JSON.stringify([`${screeningType}_watchlist`]) : null,
        status: rand(['pending', 'in_progress', 'completed', 'completed', 'escalated']),
        createdAt: randomDate(45),
      },
    })
  }
  console.log('  ✓ Created compliance rules & screenings')

  // 18. Business matches
  const MATCH_TYPES = ['supplier', 'buyer', 'partner', 'logistics', 'financial']
  const MATCH_REASONS = [
    'Industry complementarity', 'Geographic proximity', 'Trust score alignment',
    'Payment method overlap', 'Shared business relationships', 'Currency overlap',
    'Similar transaction volumes', 'Compliance compatibility',
  ]
  for (let i = 0; i < 35; i++) {
    const seeker = rand(businesses)
    let candidate = rand(businesses)
    while (candidate.id === seeker.id) candidate = rand(businesses)
    try {
      await db.businessMatch.create({
        data: {
          seekerId: seeker.id, candidateId: candidate.id,
          matchType: rand(MATCH_TYPES),
          matchScore: randFloat(45, 98),
          reasons: JSON.stringify(Array.from({ length: randInt(1, 3) }, () => rand(MATCH_REASONS))),
          status: rand(['suggested', 'suggested', 'contacted', 'interested', 'engaged', 'declined']),
          seekerResponse: Math.random() > 0.5 ? 'Interested in exploring partnership' : null,
          candidateResponse: Math.random() > 0.6 ? 'Open to discussion' : null,
          createdAt: randomDate(30),
        },
      })
    } catch { /* unique constraint */ }
  }
  console.log('  ✓ Created business matches')

  // 19. Collection cases
  for (let i = 0; i < 25; i++) {
    const creditor = rand(businesses)
    let debtor = rand(businesses)
    while (debtor.id === creditor.id) debtor = rand(businesses)
    const agingBucket = rand(['current', '1-30', '31-60', '61-90', '90+'])
    const originalAmount = randFloat(5000, 200000)
    const caseStatus = rand(['active', 'active', 'active', 'paused', 'resolved', 'written_off', 'escalated'])
    await db.collectionCase.create({
      data: {
        caseRef: `COL-${String(i + 1).padStart(4, '0')}`,
        businessId: creditor.id, debtorId: debtor.id,
        invoiceId: `inv_${randInt(1, 50)}`,
        originalAmount, outstandingAmount: Math.round(originalAmount * randFloat(0.2, 1.0) * 100) / 100,
        currency: rand(['USD', 'EUR', 'GBP', 'NGN']),
        agingBucket, priority: rand(['low', 'normal', 'normal', 'high', 'urgent']),
        status: caseStatus,
        reminderCount: randInt(0, 8),
        lastReminderAt: Math.random() > 0.3 ? randomDate(14) : null,
        nextReminderDue: new Date(Date.now() + randInt(1, 14) * 24 * 60 * 60 * 1000),
        aiStrategy: rand(['Friendly reminder', 'Formal notice', 'Payment plan offer', 'Escalate to legal', 'Partial settlement proposal']),
        resolution: caseStatus === 'resolved' ? 'Full payment received' : null,
        resolvedAt: caseStatus === 'resolved' ? randomDate(10) : null,
        createdAt: randomDate(90),
      },
    })
  }
  console.log('  ✓ Created collection cases')

  // 20. Global payment methods catalog
  const GLOBAL_METHODS = [
    { methodCode: 'mpesa', methodName: 'M-Pesa', provider: 'safaricom', type: 'mobile_money', countries: '["KE","TZ","UG"]', currencies: '["KES","TZS","UGX"]', icon: '📱' },
    { methodCode: 'upi', methodName: 'UPI', provider: 'npci', type: 'real_time_payment', countries: '["IN"]', currencies: '["INR"]', icon: '🇮🇳' },
    { methodCode: 'pix', methodName: 'PIX', provider: 'bcb', type: 'real_time_payment', countries: '["BR"]', currencies: '["BRL"]', icon: '🇧🇷' },
    { methodCode: 'alipay', methodName: 'Alipay', provider: 'ant_group', type: 'digital_wallet', countries: '["CN"]', currencies: '["CNY"]', icon: '💰' },
    { methodCode: 'wechat_pay', methodName: 'WeChat Pay', provider: 'tencent', type: 'digital_wallet', countries: '["CN"]', currencies: '["CNY"]', icon: '💬' },
    { methodCode: 'gcash', methodName: 'GCash', provider: 'gamma', type: 'mobile_money', countries: '["PH"]', currencies: '["PHP"]', icon: '📱' },
    { methodCode: 'sepa', methodName: 'SEPA Transfer', provider: 'ecb', type: 'bank_transfer', countries: '["DE","FR","NL","IT","ES"]', currencies: '["EUR"]', icon: '🏦' },
    { methodCode: 'ach', methodName: 'ACH Transfer', provider: 'fed', type: 'bank_transfer', countries: '["US"]', currencies: '["USD"]', icon: '🏦' },
    { methodCode: 'swift', methodName: 'SWIFT Wire', provider: 'swift', type: 'bank_transfer', countries: '["US","GB","DE","JP","SG","AE","AU"]', currencies: '["USD","EUR","GBP","JPY","SGD","AED","AUD"]', icon: '🌍' },
    { methodCode: 'stripe_card', methodName: 'Card Payment', provider: 'stripe', type: 'card', countries: '["US","GB","DE","FR","AU","JP","SG"]', currencies: '["USD","EUR","GBP","AUD","JPY","SGD"]', icon: '💳' },
    { methodCode: 'paypal', methodName: 'PayPal', provider: 'paypal', type: 'digital_wallet', countries: '["US","GB","DE","FR","AU"]', currencies: '["USD","EUR","GBP","AUD"]', icon: '🅿️' },
    { methodCode: 'wise', methodName: 'Wise Transfer', provider: 'wise', type: 'bank_transfer', countries: '["US","GB","DE","SG","AU"]', currencies: '["USD","EUR","GBP","SGD","AUD"]', icon: '✈️' },
  ]
  for (const gm of GLOBAL_METHODS) {
    await db.globalPaymentMethod.create({
      data: {
        methodCode: gm.methodCode, methodName: gm.methodName, provider: gm.provider,
        type: gm.type, countries: gm.countries, currencies: gm.currencies,
        minAmount: 1, maxAmount: 500000,
        feePercent: randFloat(0.5, 3.5), fixedFee: randFloat(0, 5),
        settlementTime: randInt(1, 1440), isActive: true, icon: gm.icon,
      },
    })
  }
  console.log('  ✓ Created global payment methods')

  // 21. Currency rates
  const RATE_PAIRS = [
    ['USD','EUR',0.92], ['USD','GBP',0.79], ['USD','CNY',7.24], ['USD','JPY',149.5],
    ['USD','NGN',1550], ['USD','KES',153], ['USD','INR',83.5], ['USD','BRL',4.97],
    ['USD','AUD',1.53], ['USD','SGD',1.34], ['USD','AED',3.67], ['USD','CAD',1.36],
    ['EUR','GBP',0.858], ['EUR','CNY',7.87], ['GBP','JPY',189.3],
  ]
  for (const [from, to, rate] of RATE_PAIRS) {
    await db.currencyRate.create({
      data: {
        fromCurrency: from as string, toCurrency: to as string,
        rate: rate as number, provider: 'youngsend', source: 'seed',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })
  }
  console.log('  ✓ Created currency rates')

  console.log('\n✅ Full seeding complete!')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })