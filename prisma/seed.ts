import { PrismaClient, Prisma } from '@prisma/client'
import { createHash } from 'crypto'

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
  'Electronics Manufacturing',
  'Textile & Apparel',
  'Agricultural Products',
  'Automotive Parts',
  'Chemical Products',
  'Machinery & Equipment',
  'Food & Beverage',
  'Pharmaceuticals',
  'Technology Services',
  'Logistics & Shipping',
  'Mining & Minerals',
  'Energy & Renewables',
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
const PAYMENT_METHODS = ['bank_transfer', 'card', 'crypto', 'mobile_money', 'digital_wallet']
const ROUTING_PROVIDERS = ['wise', 'stripe', 'paypal', 'local_bank', 'crypto_network']
const VERIFICATION_TYPES = ['identity', 'business_registration', 'tax', 'bank_account', 'address']
const VERIFICATION_METHODS = ['document', 'api', 'manual', 'third_party']
const VERIFICATION_STATUSES = ['approved', 'approved', 'pending', 'in_progress', 'rejected']
const GROWTH_TRAJECTORIES = ['declining', 'stable', 'growing', 'rapid_growth']
const RISK_APPETITES = ['conservative', 'moderate', 'aggressive']
const PREDICTION_TYPES = ['revenue', 'cash_flow', 'risk', 'growth_rate']
const TIMEFRAMES = ['30d', '60d', '90d', '6m', '1y']

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

function randomDate(daysAgo: number): Date {
  const now = new Date()
  return new Date(now.getTime() - randInt(0, daysAgo) * 24 * 60 * 60 * 1000)
}

async function main() {
  console.log('🌱 Seeding database...')

  // Clear existing data
  await db.financialPrediction.deleteMany()
  await db.financialMetric.deleteMany()
  await db.financialSnapshot.deleteMany()
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
  await db.financialDigitalTwin.deleteMany()
  await db.businessRelationship.deleteMany()
  await db.invoice.deleteMany()
  await db.business.deleteMany()
  await db.currencyRate.deleteMany()
  await db.paymentMethod.deleteMany()

  console.log('  ✓ Cleared existing data')

  // 1. Create businesses
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

  // 2. Create passports
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

  // 3. Create trust scores
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

  // 4. Create digital twins
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

  // 5. Create escrow transactions
  const escrowStatuses: Prisma.EscrowTransactionCreateManyInput[] = []
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

    escrowStatuses.push({
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
      fundedAmount: ['funded', 'in_escrow', 'completed'].includes(status) ? amount : randFloat(0, amount * 0.5),
      releasedAmount: status === 'completed' ? amount : randFloat(0, amount * 0.3),
      refundedAmount: status === 'cancelled' ? amount : 0,
      feeAmount: randFloat(amount * 0.005, amount * 0.025),
      feeCurrency: 'USD',
      aiRiskScore,
      aiRiskLevel,
      expiresAt: new Date(Date.now() + randInt(10, 60) * 24 * 60 * 60 * 1000),
      completedAt: status === 'completed' ? randomDate(30) : null,
      createdAt: randomDate(60),
    })
  }
  for (const e of escrowStatuses) {
    await db.escrowTransaction.create({ data: e })
  }
  console.log('  ✓ Created escrow transactions')

  // 6. Create payment intents
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
        paymentMethod: rand(PAYMENT_METHODS),
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

  // 7. Create verifications
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

  // 8. Create financial metrics for twins (monthly data, 6 months)
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
          period: 'monthly',
          periodDate,
          revenue,
          expenses,
          netIncome: revenue - expenses,
          cashBalance: randFloat(10000, 200000),
          transactionCount: randInt(10, 200),
          averageTransactionValue: randFloat(500, 25000),
          paymentSuccessRate: randFloat(0.85, 0.99),
          disputeRate: randFloat(0, 0.08),
          customerCount: randInt(5, 100),
          supplierCount: randInt(2, 30),
        },
      })
    }
  }
  console.log('  ✓ Created financial metrics')

  // 9. Create financial predictions
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
            twinId: twin.id,
            predictionType: predType,
            timeframe: tf,
            predictedValue,
            confidence,
            lowerBound: predictedValue * (1 - (1 - confidence) * 2),
            upperBound: predictedValue * (1 + (1 - confidence) * 2),
            model: 'ensemble',
          },
        })
      }
    }
  }
  console.log('  ✓ Created financial predictions')

  // 10. Create business relationships
  for (let i = 0; i < 40; i++) {
    const from = rand(businesses)
    let to = rand(businesses)
    while (to.id === from.id) to = rand(businesses)
    const relTypes = ['supplier', 'buyer', 'partner', 'logistics', 'financial']
    try {
      await db.businessRelationship.create({
        data: {
          fromBusinessId: from.id,
          toBusinessId: to.id,
          type: rand(relTypes),
          status: rand(['active', 'active', 'active', 'paused', 'terminated'] as const),
          trustLevel: randFloat(20, 98),
          totalTxVolume: randFloat(10000, 2000000),
          totalTxCount: randInt(1, 100),
          firstTxDate: randomDate(365),
          lastTxDate: randomDate(30),
        },
      })
    } catch { /* unique constraint, skip */ }
  }
  console.log('  ✓ Created business relationships')

  console.log('\n✅ Seeding complete!')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })