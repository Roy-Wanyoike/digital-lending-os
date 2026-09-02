import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'

const db = new PrismaClient()

const BUSINESSSES = [
  { name: 'Shanghai TechExim Co.', country: 'CN', legalName: 'Shanghai Technology Import & Export Co., Ltd', registrationNo: 'CN-310115-2020-001', taxId: '91310000MA1FLXXX', city: 'Shanghai', industry: 'Electronics', employeeCount: 150, annualRevenue: 12000000, description: 'Leading electronics importer/exporter in East China with 15 years of cross-border trade experience.' },
  { name: 'Berlin Trade Haus GmbH', country: 'DE', legalName: 'Berlin Trade Haus Gesellschaft mit beschränkter Haftung', registrationNo: 'DE-HRB-123456', taxId: 'DE123456789', city: 'Berlin', industry: 'Manufacturing', employeeCount: 85, annualRevenue: 8500000, description: 'German manufacturing intermediary specializing in precision engineering components.' },
  { name: 'Lagos Mercantile Ltd', country: 'NG', legalName: 'Lagos Mercantile Nigeria Limited', registrationNo: 'NG-RC-1234567', taxId: 'NG-TIN-98765432', city: 'Lagos', industry: 'Agriculture', employeeCount: 200, annualRevenue: 5200000, description: 'West Africa\'s leading agricultural commodity trading company.' },
  { name: 'São Paulo Industrial SA', country: 'BR', legalName: 'São Paulo Industrial Sociedade Anônima', registrationNo: 'BR-CNPJ-12.345.678/0001-90', taxId: 'BR-CNPJ-12.345.678/0001-90', city: 'São Paulo', industry: 'Automotive', employeeCount: 350, annualRevenue: 25000000, description: 'Major Brazilian automotive parts manufacturer serving global OEMs.' },
  { name: 'Singapore Global Trade Pte', country: 'SG', legalName: 'Singapore Global Trade Private Limited', registrationNo: 'SG-201812345Z', taxId: 'SG-UEN-201812345Z', city: 'Singapore', industry: 'Logistics', employeeCount: 120, annualRevenue: 18000000, description: 'Pan-Asian logistics and freight forwarding with operations in 12 countries.' },
  { name: 'Dubai GoldStar Trading LLC', country: 'AE', legalName: 'Dubai GoldStar Trading LLC', registrationNo: 'AE-DED-123456', taxId: 'AE-TRN-100123456700003', city: 'Dubai', industry: 'Commodities', employeeCount: 60, annualRevenue: 32000000, description: 'UAE-based precious metals and commodities trading house.' },
  { name: 'Mumbai FinTech Solutions Pvt', country: 'IN', legalName: 'Mumbai FinTech Solutions Private Limited', registrationNo: 'IN-CIN-U72200MH2019PTC123456', taxId: 'IN-GST-27AABCM1234A1Z5', city: 'Mumbai', industry: 'Technology', employeeCount: 95, annualRevenue: 6800000, description: 'Indian fintech company providing payment solutions for SME cross-border trade.' },
  { name: 'Tokyo Precision Works Co.', country: 'JP', legalName: 'Tokyo Precision Works Kabushiki Kaisha', registrationNo: 'JP-601-000123456', taxId: 'JP-1234567890', city: 'Tokyo', industry: 'Manufacturing', employeeCount: 280, annualRevenue: 42000000, description: 'Japanese precision manufacturing specializing in semiconductor equipment components.' },
  { name: 'London Bridge Capital Ltd', country: 'GB', legalName: 'London Bridge Capital Limited', registrationNo: 'GB-12345678', taxId: 'GB-VAT-GB123456789', city: 'London', industry: 'Financial Services', employeeCount: 45, annualRevenue: 15000000, description: 'UK-based trade finance provider specializing in emerging market corridors.' },
  { name: 'Nairobi Green Export Ltd', country: 'KE', legalName: 'Nairobi Green Export Limited', registrationNo: 'KE-CPR/2019/123456', taxId: 'KE-PIN-A00XYZ123Z', city: 'Nairobi', industry: 'Agriculture', employeeCount: 175, annualRevenue: 3800000, description: 'Kenyan specialty tea and coffee exporter serving European and Asian markets.' },
  { name: 'Seoul Digital Commerce Inc', country: 'KR', legalName: 'Seoul Digital Commerce Incorporated', registrationNo: 'KR-123-45-67890', taxId: 'KR-123-45-67890', city: 'Seoul', industry: 'Technology', employeeCount: 210, annualRevenue: 22000000, description: 'Korean e-commerce platform operator facilitating cross-border B2B transactions.' },
  { name: 'Mexico Industrial SA de CV', country: 'MX', legalName: 'Mexico Industrial Sociedad Anónima de Capital Variable', registrationNo: 'MX-MX-123456-7', taxId: 'MX-RFC-MIC123456AB8', city: 'Mexico City', industry: 'Manufacturing', employeeCount: 420, annualRevenue: 35000000, description: 'Mexican nearshoring manufacturer serving North American supply chains.' },
]

const RELATIONSHIPS = [
  { from: 0, to: 1, type: 'supplier' },
  { from: 1, to: 0, type: 'buyer' },
  { from: 0, to: 4, type: 'logistics' },
  { from: 2, to: 9, type: 'partner' },
  { from: 3, to: 7, type: 'supplier' },
  { from: 5, to: 8, type: 'financial' },
  { from: 6, to: 10, type: 'partner' },
  { from: 4, to: 11, type: 'supplier' },
  { from: 7, to: 1, type: 'supplier' },
  { from: 9, to: 2, type: 'buyer' },
  { from: 8, to: 5, type: 'financial' },
  { from: 11, to: 3, type: 'buyer' },
  { from: 10, to: 6, type: 'partner' },
  { from: 3, to: 11, type: 'supplier' },
  { from: 0, to: 6, type: 'buyer' },
]

const STATUSES = ['created', 'funded', 'in_escrow', 'completed', 'completed', 'completed', 'disputed', 'completed', 'in_escrow', 'funded', 'completed', 'completed']

function randomFloat(min: number, max: number, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateRef(prefix: string) {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = String(randomInt(10000, 99999))
  return `${prefix}-${y}${m}${d}-${rand}`
}

async function seed() {
  console.log('🌱 Seeding Digital Lending OS database...')

  // Create businesses with passports and trust scores
  const businessIds: string[] = []
  for (const biz of BUSINESSSES) {
    const id = crypto.randomUUID()
    businessIds.push(id)
    const overallScore = randomFloat(35, 98)
    const business = await db.business.create({
      data: {
        id,
        name: biz.name,
        legalName: biz.legalName,
        registrationNo: biz.registrationNo,
        taxId: biz.taxId,
        country: biz.country,
        city: biz.city,
        industry: biz.industry,
        employeeCount: biz.employeeCount,
        annualRevenue: biz.annualRevenue,
        description: biz.description,
        website: `https://${biz.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        status: Math.random() > 0.2 ? 'verified' : 'pending',
        verifiedAt: Math.random() > 0.2 ? new Date() : null,
        passport: {
          create: {
            passportHash: createHash('sha256').update(id + 'dlo').digest('hex'),
            credentialLevel: ['basic', 'standard', 'enhanced', 'premium'][randomInt(0, 3)],
            kycStatus: Math.random() > 0.3 ? 'verified' : 'in_progress',
            kycVerifiedAt: Math.random() > 0.3 ? new Date() : null,
            amlStatus: Math.random() > 0.2 ? 'cleared' : 'flagged',
            amlCheckedAt: Math.random() > 0.2 ? new Date() : null,
            riskRating: ['low', 'medium', 'high'][randomInt(0, 2)],
          },
        },
        trustScore: {
          create: {
            overallScore,
            paymentScore: randomFloat(30, 99),
            deliveryScore: randomFloat(30, 99),
            qualityScore: randomFloat(30, 99),
            communicationScore: randomFloat(30, 99),
            complianceScore: randomFloat(30, 99),
            totalReviews: randomInt(5, 120),
            totalTransactions: randomInt(10, 500),
          },
        },
      },
    })
    console.log(`  ✓ Business: ${business.name} (${business.country})`)
  }

  // Create relationships
  for (const rel of RELATIONSHIPS) {
    await db.businessRelationship.create({
      data: {
        fromBusinessId: businessIds[rel.from],
        toBusinessId: businessIds[rel.to],
        type: rel.type,
        status: 'active',
        trustLevel: randomFloat(30, 95),
        totalTxVolume: randomFloat(50000, 5000000),
        totalTxCount: randomInt(5, 200),
        firstTxDate: new Date(Date.now() - randomInt(30, 730) * 86400000),
        lastTxDate: new Date(Date.now() - randomInt(0, 30) * 86400000),
      },
    })
  }
  console.log(`  ✓ ${RELATIONSHIPS.length} relationships created`)

  // Create reviews
  const reviewPairs = [
    [0, 1], [1, 0], [2, 9], [3, 7], [5, 8], [6, 10], [4, 11], [7, 1], [9, 2], [10, 6],
    [0, 6], [3, 11], [8, 5], [11, 3], [4, 0],
  ]
  for (const [from, to] of reviewPairs) {
    await db.review.create({
      data: {
        fromBusinessId: businessIds[from],
        toBusinessId: businessIds[to],
        rating: randomFloat(2.5, 5.0),
        paymentRating: randomFloat(3, 5),
        deliveryRating: randomFloat(3, 5),
        qualityRating: randomFloat(3, 5),
        communicationRating: randomFloat(3, 5),
        comment: [
          'Excellent partner. Always delivers on time and maintains high quality standards.',
          'Reliable supplier with consistent product quality. Recommended for long-term contracts.',
          'Good communication throughout the transaction. Minor delays but overall satisfactory.',
          'Outstanding service. The team was responsive and professional from start to finish.',
          'Average experience. Product quality was acceptable but payment processing was slow.',
          'Highly professional operation. Will definitely continue doing business with them.',
          'Fair pricing and good delivery times. Some room for improvement in documentation.',
        ][randomInt(0, 6)],
        status: 'published',
      },
    })
  }
  console.log(`  ✓ ${reviewPairs.length} reviews created`)

  // Create escrow transactions
  const escrowIds: string[] = []
  for (let i = 0; i < 12; i++) {
    const buyerIdx = i % businessIds.length
    let sellerIdx = (i + 1 + randomInt(0, 3)) % businessIds.length
    if (sellerIdx === buyerIdx) sellerIdx = (sellerIdx + 1) % businessIds.length

    const amount = randomFloat(5000, 500000)
    const currency = ['USD', 'EUR', 'CNY', 'GBP', 'JPY', 'SGD'][randomInt(0, 5)]
    const status = STATUSES[i]
    const txRef = generateRef('ESC')
    const id = crypto.randomUUID()
    escrowIds.push(id)

    const isMilestoneBased = Math.random() > 0.5
    const milestoneCount = isMilestoneBased ? randomInt(2, 4) : 1
    const milestoneAmounts = isMilestoneBased
      ? Array.from({ length: milestoneCount }, (_, j) =>
          j === milestoneCount - 1
            ? amount - (amount / milestoneCount) * (milestoneCount - 1)
            : amount / milestoneCount
        )
      : [amount]

    const escrowData: Record<string, unknown> = {
      id,
      txRef,
      buyerId: businessIds[buyerIdx],
      sellerId: businessIds[sellerIdx],
      amount,
      currency,
      description: [
        'Bulk order of electronic components',
        'Manufacturing equipment procurement',
        'Agricultural commodity shipment',
        'Automotive parts delivery',
        'Freight forwarding services',
        'Precious metals trade settlement',
        'Software license and services',
        'Semiconductor equipment order',
        'Trade finance facility',
        'Specialty tea export shipment',
      ][i % 10],
      status,
      currentMilestone: status === 'completed' ? milestoneCount : status === 'in_escrow' || status === 'disputed' ? randomInt(1, milestoneCount - 1) : 0,
      totalMilestones: milestoneCount,
      fundedAmount: ['funded', 'in_escrow', 'partial_release', 'completed', 'disputed'].includes(status) ? amount : 0,
      releasedAmount: status === 'completed' ? amount : status === 'partial_release' ? amount * 0.6 : 0,
      refundedAmount: status === 'refunded' ? amount : 0,
      feeAmount: amount * 0.015,
      feeCurrency: currency,
      aiRiskScore: randomFloat(5, 85),
      aiRiskLevel: randomFloat(5, 85) < 30 ? 'low' : randomFloat(5, 85) < 70 ? 'medium' : 'high',
      expiresAt: new Date(Date.now() + 30 * 86400000),
      completedAt: status === 'completed' ? new Date(Date.now() - randomInt(1, 60) * 86400000) : null,
      milestones: {
        create: milestoneAmounts.map((ma, j) => ({
          sequence: j + 1,
          title: isMilestoneBased
            ? [`Deposit`, `Production milestone`, `Quality inspection`, `Final delivery`][j] || `Milestone ${j + 1}`
            : 'Full payment',
          amount: ma,
          status: status === 'completed'
            ? 'released'
            : status === 'in_escrow' && j < randomInt(1, milestoneCount)
              ? 'released'
              : 'pending',
          releasedAt: status === 'completed' ? new Date() : null,
        })),
      },
      auditLog: {
        create: {
          action: 'transaction_created',
          actor: businessIds[buyerIdx],
          details: `Escrow transaction ${txRef} created`,
        },
      },
    }

    await db.escrowTransaction.create({ data: escrowData })
    console.log(`  ✓ Escrow: ${txRef} (${status})`)
  }

  // Create disputes for disputed escrows
  const disputedEscrow = escrowIds[6] // the one with 'disputed' status
  if (disputedEscrow) {
    await db.dispute.create({
      data: {
        escrowId: disputedEscrow,
        raisedBy: 'buyer',
        reason: 'Product quality does not match agreed specifications',
        description: 'The delivered goods show significant deviation from the quality samples provided during negotiation. 15% of the batch fails QC inspection.',
        status: 'under_review',
        aiRecommendation: 'Based on historical transaction patterns and evidence analysis, recommend partial refund of 15% with seller providing replacement for defective units. Confidence: 78%.',
      },
    })
  }
  console.log('  ✓ 1 dispute created')

  // Create payment intents
  const paymentProviders = ['wise', 'stripe', 'paypal', 'local_bank']
  const paymentMethods = ['bank_transfer', 'card', 'crypto', 'mobile_money', 'digital_wallet']
  for (let i = 0; i < 10; i++) {
    const fromIdx = i % businessIds.length
    let toIdx = (i + 3) % businessIds.length
    if (toIdx === fromIdx) toIdx = (toIdx + 1) % businessIds.length

    const sourceCurrency = ['USD', 'EUR', 'CNY', 'GBP', 'JPY'][randomInt(0, 4)]
    const targetCurrency = ['USD', 'EUR', 'CNY', 'GBP', 'JPY'][randomInt(0, 4)]
    const sourceAmount = randomFloat(1000, 200000)
    const rate = randomFloat(0.7, 1.5)

    await db.paymentIntent.create({
      data: {
        intentRef: generateRef('PAY'),
        escrowId: i < escrowIds.length ? escrowIds[i] : null,
        fromBusinessId: businessIds[fromIdx],
        toBusinessId: businessIds[toIdx],
        sourceAmount,
        sourceCurrency,
        targetAmount: sourceAmount * rate,
        targetCurrency,
        exchangeRate: rate,
        status: ['completed', 'completed', 'completed', 'processing', 'failed'][randomInt(0, 4)],
        paymentMethod: paymentMethods[randomInt(0, 4)],
        routingProvider: paymentProviders[randomInt(0, 3)],
        routingScore: randomFloat(0.7, 0.99),
        estimatedFee: sourceAmount * 0.015,
        actualFee: Math.random() > 0.3 ? sourceAmount * randomFloat(0.01, 0.02) : null,
        estimatedTime: randomInt(5, 120),
        completedAt: Math.random() > 0.4 ? new Date(Date.now() - randomInt(1, 30) * 86400000) : null,
      },
    })
  }
  console.log('  ✓ 10 payment intents created')

  // Create payment methods
  for (let i = 0; i < 8; i++) {
    await db.paymentMethod.create({
      data: {
        businessId: businessIds[i],
        type: ['bank_account', 'card', 'bank_account', 'digital_wallet'][i % 4],
        provider: ['wise', 'stripe', 'paypal', 'local_bank'][i % 4],
        label: [
          'Primary Business Account',
          'Corporate Visa Card',
          'USD Settlement Account',
          'Digital Wallet - Main',
          'EUR Bank Account',
          'CNY Settlement',
          'PayPal Business',
          'Local Bank Transfer',
        ][i],
        identifier: `****${randomInt(1000, 9999)}`,
        currency: ['USD', 'EUR', 'CNY', 'SGD', 'GBP', 'JPY', 'USD', 'MXN'][i],
        country: BUSINESSSES[i].country,
        isDefault: i % 4 === 0,
      },
    })
  }
  console.log('  ✓ 8 payment methods created')

  // Create invoices
  for (let i = 0; i < 8; i++) {
    const senderIdx = i % businessIds.length
    const receiverIdx = (i + 2) % businessIds.length
    const amount = randomFloat(2000, 150000)
    const statuses = ['paid', 'paid', 'sent', 'overdue', 'draft', 'paid', 'sent', 'partially_paid']
    const status = statuses[i]

    await db.invoice.create({
      data: {
        invoiceRef: generateRef('INV'),
        senderId: businessIds[senderIdx],
        receiverId: businessIds[receiverIdx],
        amount,
        currency: ['USD', 'EUR', 'CNY', 'GBP'][randomInt(0, 3)],
        status,
        dueDate: new Date(Date.now() + randomInt(-10, 60) * 86400000),
        paidAmount: ['paid'].includes(status) ? amount : status === 'partially_paid' ? amount * 0.5 : 0,
        items: JSON.stringify([
          { description: 'Product shipment - Order #' + randomInt(10000, 99999), quantity: randomInt(10, 500), unitPrice: randomFloat(10, 500) },
          { description: 'Insurance and handling', quantity: 1, unitPrice: randomFloat(100, 2000) },
        ]),
        notes: 'Payment terms: Net 30. Please reference invoice number in remittance.',
        paidAt: ['paid'].includes(status) ? new Date() : null,
      },
    })
  }
  console.log('  ✓ 8 invoices created')

  // Create financial digital twins with metrics
  for (let i = 0; i < 8; i++) {
    const healthScore = randomFloat(30, 95)
    const twin = await db.financialDigitalTwin.create({
      data: {
        businessId: businessIds[i],
        healthScore,
        cashFlowHealth: randomFloat(25, 95),
        riskAppetite: ['conservative', 'moderate', 'aggressive'][randomInt(0, 2)],
        creditWorthiness: randomFloat(30, 95),
        liquidityScore: randomFloat(25, 95),
        growthTrajectory: ['declining', 'stable', 'growing', 'rapid_growth'][randomInt(0, 3)],
        aiModelVersion: 'v1.0',
        metrics: {
          create: Array.from({ length: 6 }, (_, m) => {
            const date = new Date()
            date.setMonth(date.getMonth() - (5 - m))
            const revenue = randomFloat(100000, 5000000)
            const expenses = revenue * randomFloat(0.6, 0.9)
            return {
              period: 'monthly',
              periodDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
              revenue,
              expenses,
              netIncome: revenue - expenses,
              cashBalance: randomFloat(50000, 2000000),
              transactionCount: randomInt(20, 300),
              averageTransactionValue: randomFloat(2000, 50000),
              paymentSuccessRate: randomFloat(0.85, 0.99),
              disputeRate: randomFloat(0, 0.08),
              customerCount: randomInt(5, 50),
              supplierCount: randomInt(3, 30),
            }
          }),
        },
        predictions: {
          create: [
            { predictionType: 'revenue', timeframe: '30d', predictedValue: randomFloat(200000, 6000000), confidence: randomFloat(0.65, 0.95), lowerBound: randomFloat(150000, 4000000), upperBound: randomFloat(300000, 8000000), model: 'ensemble_v2' },
            { predictionType: 'revenue', timeframe: '90d', predictedValue: randomFloat(600000, 18000000), confidence: randomFloat(0.55, 0.85), lowerBound: randomFloat(400000, 12000000), upperBound: randomFloat(800000, 24000000), model: 'ensemble_v2' },
            { predictionType: 'cash_flow', timeframe: '30d', predictedValue: randomFloat(100000, 3000000), confidence: randomFloat(0.7, 0.92), lowerBound: randomFloat(50000, 2000000), upperBound: randomFloat(150000, 4000000), model: 'ensemble_v2' },
            { predictionType: 'risk', timeframe: '30d', predictedValue: randomFloat(0.02, 0.25), confidence: randomFloat(0.6, 0.9), lowerBound: 0, upperBound: randomFloat(0.1, 0.4), model: 'ensemble_v2' },
            { predictionType: 'growth_rate', timeframe: '6m', predictedValue: randomFloat(-5, 25), confidence: randomFloat(0.6, 0.88), lowerBound: randomFloat(-15, 10), upperBound: randomFloat(5, 35), model: 'ensemble_v2' },
          ],
        },
        snapshots: {
          create: {
            snapshotType: 'daily',
            healthScore,
            cashFlowHealth: randomFloat(25, 95),
            creditWorthiness: randomFloat(30, 95),
            liquidityScore: randomFloat(25, 95),
            topRiskFactors: JSON.stringify([
              'High accounts receivable aging (45+ days)',
              'Currency exposure in 3 markets',
              'Concentration risk: Top 3 clients = 65% revenue',
            ]),
            topOpportunities: JSON.stringify([
              'Expand to 2 new markets (Vietnam, Colombia)',
              'Negotiate 10% better payment terms with suppliers',
              'AI-driven demand forecasting could reduce inventory costs by 12%',
            ]),
            aiSummary: `Financial health is ${healthScore > 70 ? 'strong' : healthScore > 50 ? 'moderate' : 'needs attention'} with ${healthScore > 70 ? 'healthy' : 'tight'} cash flow. Revenue trend shows ${healthScore > 60 ? 'positive' : 'flat'} momentum. Key risk areas include receivables management and currency exposure.`,
          },
        },
      },
    })
    console.log(`  ✓ Digital Twin: ${BUSINESSSES[i].name} (health: ${healthScore})`)
  }

  // Create compliance documents
  for (let i = 0; i < 6; i++) {
    const passport = await db.commercePassport.findFirst({
      where: { businessId: businessIds[i] },
    })
    if (passport) {
      const docTypes = ['certificate_of_incorporation', 'tax_registration', 'bank_statement', 'proof_of_address', 'license']
      for (let j = 0; j < 3; j++) {
        await db.complianceDocument.create({
          data: {
            passportId: passport.id,
            docType: docTypes[(i + j) % docTypes.length],
            docName: `${docTypes[(i + j) % docTypes.length].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} - ${BUSINESSSES[i].name}`,
            status: Math.random() > 0.3 ? 'approved' : 'pending',
            expiresAt: new Date(Date.now() + randomInt(180, 730) * 86400000),
          },
        })
      }
    }
  }
  console.log('  ✓ 18 compliance documents created')

  // Create verifications
  for (let i = 0; i < 8; i++) {
    const types = ['identity', 'business_registration', 'tax', 'bank_account', 'address']
    for (const type of types) {
      await db.verification.create({
        data: {
          businessId: businessIds[i],
          type,
          method: ['document', 'api', 'manual', 'third_party'][randomInt(0, 3)],
          status: Math.random() > 0.3 ? 'approved' : Math.random() > 0.5 ? 'in_progress' : 'pending',
          verifiedAt: Math.random() > 0.3 ? new Date(Date.now() - randomInt(1, 90) * 86400000) : null,
        },
      })
    }
  }
  console.log('  ✓ 40 verifications created')

  // Create currency rates
  const rates = [
    { from: 'USD', to: 'EUR', rate: 0.92 },
    { from: 'USD', to: 'GBP', rate: 0.79 },
    { from: 'USD', to: 'CNY', rate: 7.24 },
    { from: 'USD', to: 'JPY', rate: 157.5 },
    { from: 'EUR', to: 'GBP', rate: 0.86 },
    { from: 'USD', to: 'SGD', rate: 1.35 },
    { from: 'USD', to: 'INR', rate: 83.5 },
    { from: 'USD', to: 'BRL', rate: 4.97 },
    { from: 'USD', to: 'KRW', rate: 1375.0 },
    { from: 'USD', to: 'MXN', rate: 17.15 },
  ]
  for (const r of rates) {
    await db.currencyRate.create({
      data: {
        fromCurrency: r.from,
        toCurrency: r.to,
        rate: r.rate + randomFloat(-0.01, 0.01),
        provider: 'dlo_ai',
        source: 'composite_market_feed',
        expiresAt: new Date(Date.now() + 3600000),
      },
    })
  }
  console.log('  ✓ 10 currency rates created')

  console.log('\n✅ Seeding complete!')
  console.log(`   ${BUSINESSSES.length} businesses`)
  console.log(`   ${RELATIONSHIPS.length} relationships`)
  console.log(`   15 reviews`)
  console.log(`   12 escrow transactions`)
  console.log(`   10 payment intents`)
  console.log(`   8 payment methods`)
  console.log(`   8 invoices`)
  console.log(`   8 digital twins`)
  console.log(`   18 compliance documents`)
  console.log(`   40 verifications`)
  console.log(`   10 currency rates`)
}

seed()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })