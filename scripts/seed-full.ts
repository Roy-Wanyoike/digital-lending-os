import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const db = new PrismaClient()

const NOW = new Date()
const DAYS_AGO = (d: number) => new Date(NOW.getTime() - d * 86400000)

// ─── Business Data ───────────────────────────────────────────────
const BUSINESSES = [
  { name: 'Nairobi Tech Solutions', legalName: 'Nairobi Tech Solutions Ltd', country: 'Kenya', city: 'Nairobi', industry: 'Technology', website: 'https://nairobitech.ke', employeeCount: 45, annualRevenue: 1200000, description: 'Leading East African SaaS provider specializing in fintech solutions for SMEs.', status: 'verified', verifiedAt: DAYS_AGO(60) },
  { name: 'Lagos Trade Co', legalName: 'Lagos Trade Company Nigeria PLC', country: 'Nigeria', city: 'Lagos', industry: 'Trading', website: 'https://lagostrade.ng', employeeCount: 120, annualRevenue: 5500000, description: 'Major import-export company facilitating cross-border trade across West Africa.', status: 'verified', verifiedAt: DAYS_AGO(45) },
  { name: 'Accra Logistics Hub', legalName: 'Accra Logistics Hub Ghana', country: 'Ghana', city: 'Accra', industry: 'Logistics', website: 'https://accredlogistics.com.gh', employeeCount: 200, annualRevenue: 8200000, description: 'Pan-African logistics company with operations in 12 countries.', status: 'verified', verifiedAt: DAYS_AGO(30) },
  { name: 'Kampala Fresh Farms', legalName: 'Kampala Fresh Farms Uganda', country: 'Uganda', city: 'Kampala', industry: 'Agriculture', website: 'https://kampalafresh.co.ug', employeeCount: 300, annualRevenue: 3400000, description: 'Sustainable agriculture and fresh produce export to European markets.', status: 'verified', verifiedAt: DAYS_AGO(20) },
  { name: 'Dar es Salaam Shipping', legalName: 'Dar es Salaam Shipping Company', country: 'Tanzania', city: 'Dar es Salaam', industry: 'Shipping', website: 'https://darshipping.tz', employeeCount: 85, annualRevenue: 6700000, description: 'Maritime shipping and port logistics services across East Africa.', status: 'verified', verifiedAt: DAYS_AGO(15) },
  { name: 'GlobalPay Financial Services', legalName: 'GlobalPay FS Ltd', country: 'Kenya', city: 'Nairobi', industry: 'Financial Services', website: 'https://globalpay.co.ke', employeeCount: 60, annualRevenue: 2100000, description: 'Digital payments and mobile money aggregation platform serving 500K+ users.', status: 'verified', verifiedAt: DAYS_AGO(50) },
  { name: 'Rwanda Coffee Export', legalName: 'Rwanda Coffee Export Ltd', country: 'Rwanda', city: 'Kigali', industry: 'Agriculture', website: 'https://rwandacoffee.rw', employeeCount: 150, annualRevenue: 2800000, description: 'Premium coffee exporter connecting Rwandan farmers to international buyers.', status: 'pending' },
  { name: 'Johannesburg Mining Supplies', legalName: 'Johannesburg Mining Supplies PTY', country: 'South Africa', city: 'Johannesburg', industry: 'Mining', website: 'https://jburgmining.co.za', employeeCount: 500, annualRevenue: 15000000, description: 'Industrial equipment and supplies for the Southern African mining sector.', status: 'verified', verifiedAt: DAYS_AGO(10) },
]

const ESCROW_DESCRIPTIONS = [
  'Bulk electronics shipment - Nairobi to Lagos',
  'Agricultural equipment - Accra to Kampala',
  'Coffee export payment - Kigali to Amsterdam buyer',
  'Mining supplies - Johannesburg to Dar es Salaam port',
  'Software license - GlobalPay to Lagos Trade Co',
  'Fresh produce shipment - Kampala to Nairobi',
  'Textile order - Lagos to Accra',
  'Shipping container rental - Dar es Salaam',
  'Fintech API integration services',
  'Cross-border mobile money settlement',
  'Warehouse storage fees - Mombasa port',
  'Quality inspection services - Kigali',
]

const CURRENCIES = ['USD', 'KES', 'NGN', 'GHS', 'UGX', 'TZS', 'RWF', 'ZAR']
const CURRENCY_BALANCES: Record<string, number> = {
  USD: 45000, KES: 5200000, NGN: 18000000, GHS: 320000,
  UGX: 85000000, TZS: 120000000, RWF: 45000000, ZAR: 750000,
}

async function main() {
  console.log('🗑️  Clearing existing data...')
  const tableNames = ['ReferralBonus', 'ComplianceScreening', 'ComplianceRule', 'CollectionReminder', 'CollectionCase', 'BusinessMatch', 'FraudAlert', 'FraudRule', 'CryptoWithdrawal', 'CurrencyConversion', 'Withdrawal', 'Deposit', 'WalletTransaction', 'Wallet', 'PaymentLinkPayment', 'PaymentLink', 'GlobalPaymentMethod', 'PaymentMethod', 'PaymentTransaction', 'PaymentIntent', 'CurrencyRate', 'Disbursement', 'Dispute', 'EscrowAuditLog', 'EscrowMilestone', 'EscrowTransaction', 'ReputationEvent', 'Review', 'BusinessRelationship', 'TrustScore', 'FinancialSnapshot', 'FinancialPrediction', 'FinancialMetric', 'FinancialDigitalTwin', 'ComplianceDocument', 'Verification', 'CommercePassport', 'Invoice', 'User', 'Account', 'Business', 'Tenant']
  for (const t of tableNames) {
    try { await db[t as any].deleteMany() } catch { /* table may not exist */ }
  }

  // ─── 1. Tenant ──────────────────────────────────────────────
  console.log('📦 Creating tenant...')
  const tenant = await db.tenant.create({
    data: { name: 'Digital Lending OS', slug: 'digital-lending-os', plan: 'enterprise', status: 'active', maxBusinesses: 50, maxUsers: 100, ownerEmail: 'admin@digitallendingos.co.ke', ownerName: 'DLO Admin', features: '{"escrow":true,"payments":true,"wallet":true,"fraud":true,"compliance":true,"matching":true,"collections":true,"referral":true,"digitalTwin":true,"passport":true,"invoices":true,"paymentLinks":true}' },
  })

  // ─── 2. Account (the demo user) ─────────────────────────────
  console.log('👤 Creating account...')
  const passwordHash = await hash('Demo1234!', 12)
  const account = await db.account.create({
    data: { email: 'admin@digitallendingos.co.ke', passwordHash, name: 'DLO Admin', role: 'admin', tenantId: tenant.id, businessId: undefined, referralCode: 'YSDISCO100', isActive: true, lastLoginAt: DAYS_AGO(0) },
  })

  // ─── 3. Second user (buyer role) ─────────────────────────────
  const buyerAccount = await db.account.create({
    data: { email: 'buyer@digital-lending-os.com', passwordHash: await hash('Buyer1234!', 12), name: 'Amara Osei', role: 'buyer', tenantId: tenant.id, referralCode: 'DLOBUYER01', referredBy: account.id, isActive: true },
  })

  // ─── 4. Businesses ──────────────────────────────────────────
  console.log('🏢 Creating', BUSINESSES.length, 'businesses...')
  const businessIds: string[] = []
  for (const b of BUSINESSES) {
    const biz = await db.business.create({ data: { tenantId: tenant.id, ...b, registrationNo: `REG-${Math.random().toString(36).slice(2,8).toUpperCase()}`, taxId: `TAX-${Math.random().toString(36).slice(2,6).toUpperCase()}` } })
    businessIds.push(biz.id)
  }

  // ─── 5. Wallets (multiple currencies per business) ──────────
  console.log('💰 Creating wallets...')
  for (const bizId of businessIds) {
    // Each business gets USD + their local currency
    const biz = BUSINESSES[businessIds.indexOf(bizId)]
    const localCurrency = biz.country === 'Kenya' ? 'KES' : biz.country === 'Nigeria' ? 'NGN' : biz.country === 'Ghana' ? 'GHS' : biz.country === 'Uganda' ? 'UGX' : biz.country === 'Tanzania' ? 'TZS' : biz.country === 'Rwanda' ? 'RWF' : biz.country === 'South Africa' ? 'ZAR' : 'USD'
    const currencies = ['USD', localCurrency]
    for (const cur of currencies) {
      const base = CURRENCY_BALANCES[cur] || 10000
      const balance = Math.round(base * (0.3 + Math.random() * 1.4))
      await db.wallet.create({ data: { businessId: bizId, currency: cur, balance, availableBalance: Math.round(balance * 0.85), pendingBalance: Math.round(balance * 0.1), frozenBalance: Math.round(balance * 0.05), isDefault: cur === 'USD', status: 'active', label: `${biz.name} ${cur} Account` } })
    }
  }

  // ─── 6. Trust Scores ────────────────────────────────────────
  console.log('⭐ Creating trust scores...')
  for (let i = 0; i < businessIds.length; i++) {
    const overall = BUSINESSES[i].status === 'verified' ? 60 + Math.round(Math.random() * 35) : 40 + Math.round(Math.random() * 20)
    await db.trustScore.create({ data: { businessId: businessIds[i], overallScore: overall, paymentScore: overall + Math.round((Math.random() - 0.5) * 10), deliveryScore: overall + Math.round((Math.random() - 0.5) * 15), qualityScore: overall + Math.round((Math.random() - 0.5) * 12), communicationScore: overall + Math.round((Math.random() - 0.5) * 8), complianceScore: overall + Math.round((Math.random() - 0.5) * 10), totalReviews: Math.floor(Math.random() * 50) + 5, totalTransactions: Math.floor(Math.random() * 200) + 20, scoreVersion: 2 } })
  }

  // ─── 7. Commerce Passports ──────────────────────────────────
  console.log('🛂 Creating commerce passports...')
  const passportLevels = ['basic', 'standard', 'enhanced', 'premium']
  for (let i = 0; i < businessIds.length; i++) {
    if (!BUSINESSES[i].verifiedAt) continue
    const level = passportLevels[Math.min(3, Math.floor(i / 2))]
    await db.commercePassport.create({ data: { businessId: businessIds[i], passportHash: `PASSHASH-${businessIds[i].slice(-8).toUpperCase()}`, credentialLevel: level, kycStatus: level === 'basic' ? 'in_progress' : 'verified', kycVerifiedAt: DAYS_AGO(30), amlStatus: level === 'premium' ? 'cleared' : level === 'enhanced' ? 'cleared' : 'flagged', amlCheckedAt: DAYS_AGO(25), riskRating: ['low', 'medium', 'low', 'high'][i % 4], lastAuditAt: DAYS_AGO(10) } })
  }

  // ─── 8. Verifications ────────────────────────────────────────
  console.log('📋 Creating verifications...')
  const verTypes = ['identity', 'business_registration', 'tax', 'bank_account', 'address']
  const verMethods = ['document', 'api', 'manual', 'third_party']
  for (const bizId of businessIds.slice(0, 6)) {
    for (let j = 0; j < 3; j++) {
      await db.verification.create({ data: { businessId: bizId, type: verTypes[j], method: verMethods[j % verMethods.length], status: j === 0 ? 'approved' : j === 1 ? 'approved' : 'pending', submittedAt: DAYS_AGO(20 - j * 5), verifiedAt: j < 2 ? DAYS_AGO(18 - j * 5) : null, verifiedBy: j < 2 ? account.id : null } })
    }
  }

  // ─── 9. Escrow Transactions ──────────────────────────────────
  console.log('🔒 Creating escrow transactions...')
  const statuses = ['completed', 'completed', 'completed', 'in_escrow', 'funded', 'disputed', 'completed', 'completed', 'created', 'completed', 'partial_release', 'completed']
  const escrowIds: string[] = []
  for (let i = 0; i < 12; i++) {
    const buyerIdx = i % businessIds.length
    let sellerIdx = (i + 2) % businessIds.length
    if (buyerIdx === sellerIdx) sellerIdx = (sellerIdx + 1) % businessIds.length
    const amount = [15000, 42000, 8500, 120000, 67000, 23000, 95000, 31000, 50000, 18000, 74000, 41000][i]
    const currency = ['USD', 'USD', 'USD', 'KES', 'NGN', 'GHS', 'USD', 'TZS', 'USD', 'USD', 'ZAR', 'USD'][i]
    const status = statuses[i]
    const escrow = await db.escrowTransaction.create({
      data: {
        txRef: `ESC-${new Date().getFullYear()}${String(DAYS_AGO(i * 3).getMonth() + 1).padStart(2, '0')}${String(DAYS_AGO(i * 3).getDate()).padStart(2, '0')}-${String(i + 1).padStart(5, '0')}`,
        buyerId: businessIds[buyerIdx],
        sellerId: businessIds[sellerIdx],
        amount, currency,
        description: ESCROW_DESCRIPTIONS[i],
        status,
        currentMilestone: status === 'completed' ? 1 : status === 'partial_release' ? 1 : 0,
        totalMilestones: 1,
        fundedAmount: ['created'].includes(status) ? 0 : amount,
        releasedAmount: status === 'completed' ? amount : status === 'partial_release' ? Math.round(amount * 0.6) : 0,
        refundedAmount: 0,
        feeAmount: Math.round(amount * 0.015 * 100) / 100,
        aiRiskScore: Math.floor(Math.random() * 60) + 10,
        aiRiskLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        expiresAt: DAYS_AGO(-30 + i * 3),
        completedAt: status === 'completed' ? DAYS_AGO(i * 2) : null,
      },
    })
    escrowIds.push(escrow.id)

    // Milestone
    await db.escrowMilestone.create({ data: { escrowId: escrow.id, sequence: 1, title: 'Full Payment', amount, status: status === 'completed' ? 'released' : status === 'partial_release' ? 'released' : 'pending', releasedAt: status === 'completed' ? DAYS_AGO(i * 2) : null } })

    // Audit log
    await db.escrowAuditLog.create({ data: { escrowId: escrow.id, action: 'created', actor: businessIds[buyerIdx], details: `Escrow created for: ${ESCROW_DESCRIPTIONS[i]}`, metadata: `{"riskScore":${escrow.aiRiskScore}}` } })
    if (status === 'completed') {
      await db.escrowAuditLog.create({ data: { escrowId: escrow.id, action: 'completed', actor: businessIds[sellerIdx], details: 'Payment released to seller' } })
    }
  }

  // ─── 10. Payment Intents & Transactions ───────────────────────
  console.log('💳 Creating payment intents...')
  const methods = ['bank_transfer', 'card', 'mobile_money', 'digital_wallet', 'bank_transfer', 'mobile_money']
  const providers = ['stripe', 'paystack', 'flutterwave', 'mpesa', 'wise', 'intasend']
  for (let i = 0; i < 8; i++) {
    const buyerIdx = i % businessIds.length
    let sellerIdx = (i + 1) % businessIds.length
    if (buyerIdx === sellerIdx) sellerIdx = (sellerIdx + 1) % businessIds.length
    const sAmt = [15000, 42000, 8500, 32000, 120000, 67000, 18000, 50000][i]
    const sCur = ['USD', 'USD', 'KES', 'NGN', 'USD', 'TZS', 'USD', 'ZAR'][i]
    const tCur = ['USD', 'KES', 'USD', 'USD', 'NGN', 'USD', 'GHS', 'USD'][i]
    const rate = sCur === tCur ? 1 : [1, 153.5, 0.0065, 1, 0.76, 0.00042, 1, 0.055][i]
    const status = i < 5 ? 'completed' : i < 7 ? 'processing' : 'created'
    const intent = await db.paymentIntent.create({
      data: {
        intentRef: `PI-${String(1000 + i).padStart(6, '0')}`,
        fromBusinessId: businessIds[buyerIdx],
        toBusinessId: businessIds[sellerIdx],
        sourceAmount: sAmt, sourceCurrency: sCur,
        targetAmount: Math.round(sAmt * rate * 100) / 100, targetCurrency: tCur,
        exchangeRate: rate,
        status,
        paymentMethod: methods[i % methods.length],
        routingProvider: providers[i % providers.length],
        routingScore: 70 + Math.round(Math.random() * 25),
        estimatedFee: Math.round(sAmt * 0.02 * 100) / 100,
        actualFee: status === 'completed' ? Math.round(sAmt * 0.018 * 100) / 100 : null,
        estimatedTime: [30, 60, 15, 45, 120][i % 5],
        completedAt: status === 'completed' ? DAYS_AGO(i * 4) : null,
      },
    })
    if (status === 'completed') {
      await db.paymentTransaction.create({ data: { intentId: intent.id, txRef: `TX-${String(2000 + i).padStart(6, '0')}`, provider: providers[i % providers.length], providerTxId: `prov_${Math.random().toString(36).slice(2, 14)}`, amount: sAmt, currency: sCur, status: 'settled', settledAt: DAYS_AGO(i * 4) } })
    }
  }

  // ─── 11. Wallet Transactions (deposits, transfers, fees) ─────
  console.log('📊 Creating wallet transactions...')
  const wallets = await db.wallet.findMany({ take: 8 })
  for (let w = 0; w < wallets.length; w++) {
    const wallet = wallets[w]
    let bal = 0
    for (let t = 0; t < 5; t++) {
      const amt = Math.round((500 + Math.random() * 5000) * 100) / 100
      const balBefore = bal
      bal += amt
      await db.walletTransaction.create({ data: { walletId: wallet.id, txRef: `WTX-${wallet.currency}-${w}${t}`, type: 'deposit', amount: amt, balanceBefore: balBefore, balanceAfter: bal, currency: wallet.currency, description: 'Wallet deposit via bank transfer', referenceType: 'deposit', status: 'completed' } })
    }
    // Update wallet balance to match
    await db.wallet.update({ where: { id: wallet.id }, data: { balance: bal, availableBalance: Math.round(bal * 0.9), pendingBalance: Math.round(bal * 0.08), frozenBalance: Math.round(bal * 0.02) } })
  }

  // ─── 12. Deposits & Withdrawals ─────────────────────────────
  console.log('🏦 Creating deposits and withdrawals...')
  for (let d = 0; d < 6; d++) {
    const w = wallets[d % wallets.length]
    await db.deposit.create({ data: { walletId: w.id, depositRef: `DEP-${String(3000 + d).padStart(6, '0')}`, amount: 1000 + Math.round(Math.random() * 9000), currency: w.currency, paymentMethod: ['bank_transfer', 'card', 'mobile_money'][d % 3], provider: ['paystack', 'stripe', 'flutterwave'][d % 3], status: d < 4 ? 'completed' : 'pending', completedAt: d < 4 ? DAYS_AGO(d * 2) : null } })
  }
  for (let w = 0; w < 4; w++) {
    const wallet = wallets[w % wallets.length]
    await db.withdrawal.create({ data: { walletId: wallet.id, withdrawalRef: `WDR-${String(4000 + w).padStart(6, '0')}`, amount: 500 + Math.round(Math.random() * 3000), currency: wallet.currency, paymentMethod: 'bank_transfer', provider: 'paystack', status: w < 2 ? 'completed' : 'pending', recipientName: BUSINESSES[w % BUSINESSES.length].name, feeAmount: 5, netAmount: 495 + Math.round(Math.random() * 2995), completedAt: w < 2 ? DAYS_AGO(w * 3) : null } })
  }

  // ─── 13. Business Relationships ──────────────────────────────
  console.log('🔗 Creating business relationships...')
  const relTypes = ['supplier', 'buyer', 'partner', 'logistics', 'financial']
  for (let i = 0; i < businessIds.length; i++) {
    const j = (i + 1) % businessIds.length
    await db.businessRelationship.create({ data: { fromBusinessId: businessIds[i], toBusinessId: businessIds[j], type: relTypes[i % relTypes.length], status: 'active', trustLevel: 60 + Math.round(Math.random() * 35), totalTxVolume: Math.round(Math.random() * 500000), totalTxCount: Math.floor(Math.random() * 50) + 5, firstTxDate: DAYS_AGO(90), lastTxDate: DAYS_AGO(2) } })
    if (i < 4) {
      const k = (i + 3) % businessIds.length
      await db.businessRelationship.create({ data: { fromBusinessId: businessIds[i], toBusinessId: businessIds[k], type: relTypes[(i + 2) % relTypes.length], status: i < 2 ? 'active' : 'paused', trustLevel: 50 + Math.round(Math.random() * 30), totalTxVolume: Math.round(Math.random() * 200000), totalTxCount: Math.floor(Math.random() * 20), firstTxDate: DAYS_AGO(60), lastTxDate: DAYS_AGO(10) } })
    }
  }

  // ─── 14. Reviews ────────────────────────────────────────────
  console.log('⭐ Creating reviews...')
  for (let i = 0; i < 10; i++) {
    const fromIdx = i % businessIds.length
    const toIdx = (i + 1) % businessIds.length
    await db.review.create({ data: { fromBusinessId: businessIds[fromIdx], toBusinessId: businessIds[toIdx], escrowId: escrowIds[i % escrowIds.length], rating: 3.5 + Math.random() * 1.5, paymentRating: 3 + Math.random() * 2, deliveryRating: 3 + Math.random() * 2, qualityRating: 3 + Math.random() * 2, communicationRating: 3.5 + Math.random() * 1.5, comment: ['Excellent partner, very reliable deliveries.', 'Good communication throughout the transaction.', 'Slight delay but quality was acceptable.', 'Outstanding service, will trade again.', 'Professional team, smooth process from start to finish.'][i % 5], status: 'published' } })
  }

  // ─── 15. Digital Twins ──────────────────────────────────────
  console.log('🧠 Creating digital twins...')
  for (let i = 0; i < businessIds.length; i++) {
    const health = 55 + Math.round(Math.random() * 40)
    const twin = await db.financialDigitalTwin.create({ data: { businessId: businessIds[i], healthScore: health, cashFlowHealth: health + Math.round((Math.random() - 0.5) * 10), riskAppetite: ['conservative', 'moderate', 'aggressive'][i % 3], creditWorthiness: 60 + Math.round(Math.random() * 35), liquidityScore: 50 + Math.round(Math.random() * 45), growthTrajectory: ['declining', 'stable', 'growing', 'rapid_growth'][i % 4], aiModelVersion: 'v2.1', lastSyncAt: DAYS_AGO(1) } })

    // Metrics (6 months)
    for (let m = 5; m >= 0; m--) {
      const revenue = Math.round((50000 + Math.random() * 200000) * (1 + (5 - m) * 0.03))
      const expenses = Math.round(revenue * (0.6 + Math.random() * 0.2))
      await db.financialMetric.create({ data: { twinId: twin.id, period: 'monthly', periodDate: `${new Date().getFullYear()}-${String(new Date().getMonth() - m).padStart(2, '0')}`, revenue, expenses, netIncome: revenue - expenses, cashBalance: Math.round(revenue * 0.3), transactionCount: Math.floor(Math.random() * 200) + 20, paymentSuccessRate: 85 + Math.random() * 14, disputeRate: Math.round(Math.random() * 8 * 100) / 100, customerCount: Math.floor(Math.random() * 100) + 10, supplierCount: Math.floor(Math.random() * 30) + 5 } })
    }

    // Predictions
    await db.financialPrediction.create({ data: { twinId: twin.id, predictionType: 'revenue', timeframe: '90d', predictedValue: Math.round(250000 + Math.random() * 300000), confidence: 0.75 + Math.random() * 0.2, lowerBound: Math.round(200000 + Math.random() * 100000), upperBound: Math.round(400000 + Math.random() * 200000) } })
    await db.financialPrediction.create({ data: { twinId: twin.id, predictionType: 'cash_flow', timeframe: '60d', predictedValue: Math.round(80000 + Math.random() * 150000), confidence: 0.7 + Math.random() * 0.25, lowerBound: Math.round(60000 + Math.random() * 80000), upperBound: Math.round(150000 + Math.random() * 100000) } })
    await db.financialPrediction.create({ data: { twinId: twin.id, predictionType: 'risk', timeframe: '30d', predictedValue: Math.round(Math.random() * 30), confidence: 0.6 + Math.random() * 0.3 } })

    // Snapshot
    await db.financialSnapshot.create({ data: { twinId: twin.id, snapshotType: 'daily', healthScore: health, cashFlowHealth: health - 2, creditWorthiness: health + 5, liquidityScore: health + 3, topRiskFactors: '["High receivables aging", "Concentration risk"]', topOpportunities: '["New market expansion", "Cost optimization"]', aiSummary: `Business shows ${health > 70 ? 'strong' : 'moderate'} financial health with ${health > 80 ? 'excellent' : 'room for'} growth potential.` } })
  }

  // ─── 16. Fraud Rules & Alerts ────────────────────────────────
  console.log('🚨 Creating fraud rules and alerts...')
  await db.fraudRule.createMany({ data: [
    { name: 'High Value Transaction Alert', description: 'Flag transactions exceeding $50,000', condition: '{"field":"amount","operator":">","value":50000}', action: 'require_review', severity: 'high', isActive: true },
    { name: 'Velocity Breach - 10 tx/hour', description: 'More than 10 transactions per hour from same business', condition: '{"field":"tx_count","period":"1h","operator":">","value":10}', action: 'alert', severity: 'medium', isActive: true },
    { name: 'Geo Mismatch Detection', description: 'Transaction from country different from business registration', condition: '{"field":"country","operator":"!=","source":"business.registration"}', action: 'flag', severity: 'low', isActive: true },
    { name: 'New Account Large Transfer', description: 'Accounts less than 7 days old transferring over $10,000', condition: '{"field":"account_age","operator":"<","value":7,"and":{"amount":{">":10000}}}', action: 'block', severity: 'critical', isActive: true },
    { name: 'Sanctioned Entity Check', description: 'Screen all parties against OFAC/EU sanctions lists', condition: '{"screening":"sanctions","lists":["OFAC","EU","UN"]}', action: 'block', severity: 'critical', isActive: true, triggerCount: 2, lastTriggeredAt: DAYS_AGO(3) },
  ] })

  const fraudTypes = ['unusual_amount', 'velocity_breach', 'geo_mismatch', 'sanctioned_entity']
  const fraudSeverities = ['low', 'medium', 'high', 'critical']
  for (let i = 0; i < 8; i++) {
    await db.fraudAlert.create({ data: { alertRef: `FRA-${String(5000 + i).padStart(6, '0')}`, businessId: businessIds[i % businessIds.length], relatedType: 'escrow', relatedId: escrowIds[i % escrowIds.length], severity: fraudSeverities[i % 4], fraudType: fraudTypes[i % 4], score: 40 + Math.round(Math.random() * 55), description: [`Unusual payment amount detected: $${(10000 + Math.random() * 90000).toFixed(0)}`, `Multiple rapid transactions detected from business`, `Transaction originated from unexpected geographic location`, `Potential match against sanctions list detected`][i % 4], recommendation: ['Review transaction manually', 'Require additional verification', 'Block pending investigation', 'Escalate to compliance team'][i % 4], status: ['resolved', 'investigating', 'false_positive', 'open', 'confirmed_fraud', 'resolved', 'open', 'escalated'][i] } })
  }

  // ─── 17. Compliance Rules & Screenings ───────────────────────
  console.log('⚖️ Creating compliance rules and screenings...')
  await db.complianceRule.createMany({ data: [
    { name: 'KYC Verification Required', description: 'All businesses must complete KYC before transacting', ruleType: 'kyc_requirement', condition: '{"kycStatus":["not_started","in_progress"],"action":"restrict"}', action: 'require_additional_doc', severity: 'high', isActive: true, triggeredCount: 8 },
    { name: 'AML Transaction Threshold', description: 'Flag transactions exceeding $25,000 for AML review', ruleType: 'aml_threshold', condition: '{"amount":">","value":25000}', action: 'flag_for_review', severity: 'high', isActive: true, triggeredCount: 15 },
    { name: 'Country Restriction - Sanctioned', description: 'Block transactions involving sanctioned countries', ruleType: 'country_restriction', condition: '{"countries":["KP","IR","SY","CU"]}', action: 'block', severity: 'critical', isActive: true },
    { name: 'Transaction Limit Check', description: 'Daily transaction limit per business', ruleType: 'transaction_limit', condition: '{"dailyLimit":100000,"currency":"USD"}', action: 'flag_for_review', severity: 'medium', isActive: true, triggeredCount: 3 },
  ] })

  for (let i = 0; i < 6; i++) {
    await db.complianceScreening.create({ data: { businessId: businessIds[i % businessIds.length], transactionType: ['escrow', 'payment', 'wallet'][i % 3], screeningType: ['sanctions', 'pep', 'adverse_media', 'country_risk'][i % 4], result: ['clear', 'clear', 'clear', 'potential_match', 'clear', 'match'][i], riskLevel: ['low', 'low', 'medium', 'high', 'low', 'critical'][i], details: i === 3 ? 'Potential PEP match found - manual review required' : i === 5 ? 'Match found on EU sanctions list' : 'No matches found', matchedLists: i === 3 ? '["PEP Database"]' : i === 5 ? '["EU Consolidated Sanctions"]' : null, status: ['completed', 'completed', 'completed', 'escalated', 'completed', 'in_progress'][i] } })
  }

  // ─── 18. Business Matches ────────────────────────────────────
  console.log('🤝 Creating business matches...')
  for (let i = 0; i < businessIds.length; i++) {
    for (let j = 0; j < 2; j++) {
      let candidateIdx = (i + j + 2) % businessIds.length
      if (candidateIdx === i) candidateIdx = (candidateIdx + 1) % businessIds.length
      await db.businessMatch.create({ data: { seekerId: businessIds[i], candidateId: businessIds[candidateIdx], matchType: relTypes[(i + j) % relTypes.length], matchScore: 65 + Math.round(Math.random() * 30), reasons: JSON.stringify([['Industry complementarity', 'Geographic proximity', 'Trust score alignment', 'Payment method compatibility', 'Currency overlap', 'Similar transaction volumes'][i % 6], ['Strong mutual connections', 'Complementary product lines', 'Payment method compatibility', 'Currency overlap'][j % 4]]), status: ['engaged', 'suggested', 'contacted', 'interested', 'declined'][i % 5] } })
    }
  }

  // ─── 19. Collection Cases ────────────────────────────────────
  console.log('📧 Creating collection cases...')
  for (let i = 0; i < 6; i++) {
    const creditorIdx = i % businessIds.length
    let debtorIdx = (i + 2) % businessIds.length
    if (creditorIdx === debtorIdx) debtorIdx = (debtorIdx + 1) % businessIds.length
    const origAmt = 5000 + Math.round(Math.random() * 45000)
    await db.collectionCase.create({ data: { caseRef: `COL-${String(6000 + i).padStart(6, '0')}`, businessId: businessIds[creditorIdx], debtorId: businessIds[debtorIdx], originalAmount: origAmt, outstandingAmount: Math.round(origAmt * (0.3 + Math.random() * 0.6)), currency: ['USD', 'KES', 'NGN', 'GHS', 'TZS', 'ZAR'][i], agingBucket: ['current', '1-30', '31-60', '61-90', '1-30', '90+'][i], priority: ['normal', 'high', 'urgent', 'normal', 'low', 'high'][i], status: ['active', 'active', 'resolved', 'active', 'paused', 'active'][i], reminderCount: Math.floor(Math.random() * 5), lastReminderAt: i < 5 ? DAYS_AGO(i) : null, aiStrategy: ['Send friendly reminder with payment link', 'Escalate to firm notice', 'Offer payment plan', 'Direct phone contact recommended'][i % 4], resolvedAt: i === 2 ? DAYS_AGO(5) : null } })
  }

  // ─── 20. Payment Links ────────────────────────────────────────
  console.log('🔗 Creating payment links...')
  for (let i = 0; i < 5; i++) {
    await db.paymentLink.create({ data: { linkRef: `PL-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`, businessId: businessIds[i % businessIds.length], title: ['Invoice #1042 Payment', 'Service Fee - Q4', 'Product Order #8891', 'Consultation Fee', 'Shipping Payment'][i], description: ['Payment for invoice #1042 - Electronics shipment', 'Quarterly service fee payment', 'Order payment for product #8891', 'Strategy consultation session payment', 'International shipping charges'][i], amount: [2500, 1500, 8750, 500, 3200][i], currency: 'USD', status: ['active', 'active', 'paused', 'active', 'expired'][i], paymentCount: [3, 1, 0, 5, 2][i], totalCollected: [7500, 1500, 0, 25000, 6400][i], maxPayments: [0, 1, 10, 0, 5][i], createdBy: account.id } })
  }

  // ─── 21. Invoices ────────────────────────────────────────────
  console.log('📄 Creating invoices...')
  for (let i = 0; i < 6; i++) {
    const senderIdx = i % businessIds.length
    const receiverIdx = (i + 2) % businessIds.length
    const amt = [4500, 12000, 3200, 28000, 7500, 15000][i]
    await db.invoice.create({ data: { invoiceRef: `INV-${String(7000 + i).padStart(6, '0')}`, senderId: businessIds[senderIdx], receiverId: businessIds[receiverIdx], amount: amt, currency: 'USD', status: ['paid', 'sent', 'overdue', 'paid', 'sent', 'draft'][i], dueDate: DAYS_AGO(-10 + i * 5), paidAmount: i === 0 || i === 3 ? amt : 0, items: JSON.stringify([{ description: 'Professional services', quantity: 1, unitPrice: amt }]), paidAt: i === 0 ? DAYS_AGO(5) : i === 3 ? DAYS_AGO(2) : null } })
  }

  // ─── 22. Global Payment Methods ──────────────────────────────
  console.log('🌍 Creating global payment methods...')
  await db.globalPaymentMethod.createMany({ data: [
    { methodCode: 'mpesa', methodName: 'M-Pesa', provider: 'Safaricom', type: 'mobile_money', countries: '["KE","TZ","UG"]', currencies: '["KES","TZS","UGX"]', feePercent: 1.5, fixedFee: 0, settlementTime: 5, icon: '📱' },
    { methodCode: 'stripe', methodName: 'Stripe', provider: 'Stripe Inc', type: 'card', countries: '["US","GB","CA","AU","DE","FR"]', currencies: '["USD","EUR","GBP","AUD","CAD"]', feePercent: 2.9, fixedFee: 0.3, settlementTime: 120, icon: '💳' },
    { methodCode: 'paystack', methodName: 'Paystack', provider: 'Paystack', type: 'card', countries: '["NG","GH","KE","ZA"]', currencies: '["NGN","GHS","KES","ZAR"]', feePercent: 1.5, fixedFee: 0, settlementTime: 60, icon: '🟢' },
    { methodCode: 'flutterwave', methodName: 'Flutterwave', provider: 'Flutterwave Inc', type: 'card', countries: '["NG","KE","GH","UG","TZ","ZA","RW"]', currencies: '["NGN","KES","GHS","UGX","TZS","ZAR","RWF"]', feePercent: 1.4, fixedFee: 0, settlementTime: 45, icon: '🦋' },
    { methodCode: 'piasend', methodName: 'IntaSend', provider: 'IntaSend', type: 'mobile_money', countries: '["KE"]', currencies: '["KES"]', feePercent: 1.0, fixedFee: 0, settlementTime: 10, icon: '⚡' },
    { methodCode: 'paypal', methodName: 'PayPal', provider: 'PayPal', type: 'digital_wallet', countries: '["US","GB","DE","FR","AU"]', currencies: '["USD","EUR","GBP","AUD"]', feePercent: 3.49, fixedFee: 0.3, settlementTime: 180, icon: '🅿️' },
    { methodCode: 'upi', methodName: 'UPI', provider: 'NPCI', type: 'real_time_payment', countries: '["IN"]', currencies: '["INR"]', feePercent: 0, fixedFee: 0, settlementTime: 1, icon: '🇮🇳' },
    { methodCode: 'pix', methodName: 'PIX', provider: 'BCB', type: 'real_time_payment', countries: '["BR"]', currencies: '["BRL"]', feePercent: 0, fixedFee: 0, settlementTime: 1, icon: '🇧🇷' },
    { methodCode: 'ach', methodName: 'ACH Transfer', provider: 'Federal Reserve', type: 'bank_transfer', countries: '["US"]', currencies: '["USD"]', feePercent: 0.1, fixedFee: 0.25, settlementTime: 1440, icon: '🏦' },
    { methodCode: 'sepa', methodName: 'SEPA Transfer', provider: 'European Banking Authority', type: 'bank_transfer', countries: '["DE","FR","NL","ES","IT","BE","AT"]', currencies: '["EUR"]', feePercent: 0.1, fixedFee: 0, settlementTime: 60, icon: '🇪🇺' },
  ] })

  // ─── 23. Currency Rates ──────────────────────────────────────
  console.log('💱 Creating currency rates...')
  const ratePairs = [['USD','KES',153.5],['USD','NGN',1580],['USD','GHS',15.2],['USD','UGX',3800],['USD','TZS',2650],['USD','RWF',1280],['USD','ZAR',18.5],['USD','EUR',0.92],['USD','GBP',0.79],['EUR','GBP',0.86],['USD','JPY',157.5],['USD','INR',83.5],['USD','BRL',4.95],['USD','CNY',7.24],['USD','CAD',1.37],['USD','AUD',1.53]]
  for (const [from, to, rate] of ratePairs) {
    await db.currencyRate.create({ data: { fromCurrency: from, toCurrency: to, rate, provider: 'internal', expiresAt: DAYS_AGO(-1) } })
  }

  // ─── 24. Disputes (for some escrows) ─────────────────────────
  console.log('⚡ Creating disputes...')
  for (let i = 0; i < 3; i++) {
    await db.dispute.create({ data: { escrowId: escrowIds[4 + i], raisedBy: i === 0 ? 'buyer' : 'seller', reason: ['Goods not delivered within agreed timeframe', 'Quality significantly below specification', 'Payment not received after delivery confirmation'][i], description: ['The seller has not shipped the goods 15 days past the agreed delivery date. Multiple contact attempts have been unsuccessful.', 'Received goods do not match the sample specification provided before order. Photos attached as evidence.', 'Funds were supposed to be released within 24 hours of delivery confirmation but have not been credited.'][i], status: ['open', 'under_review', 'resolved'][i], resolution: i === 2 ? 'Partial refund issued to buyer. Seller credited 70% of escrow amount.' : null, resolvedAt: i === 2 ? DAYS_AGO(3) : null, aiRecommendation: i === 0 ? 'Recommend extending dispute deadline by 5 days for seller response' : i === 1 ? 'Recommend third-party quality inspection before resolution' : null } })
  }

  console.log('\n✅ Seed complete! Database populated with:\n')
  console.log(`   🏢 ${BUSINESSES.length} businesses (across 8 African countries)`) 
  console.log(`   👤 2 user accounts (admin + buyer)`) 
  console.log(`   💰 ${wallets.length}+ wallets (multi-currency)`) 
  console.log(`   🔒 12 escrow transactions`) 
  console.log(`   💳 8 payment intents + transactions`) 
  console.log(`   ⭐ ${BUSINESSES.length} trust scores + 10 reviews`) 
  console.log(`   🛂 ${BUSINESSES.length} commerce passports + 18 verifications`) 
  console.log(`   🧠 ${BUSINESSES.length} digital twins with metrics + predictions`) 
  console.log(`   🚨 5 fraud rules + 8 alerts`) 
  console.log(`   ⚖️ 4 compliance rules + 6 screenings`) 
  console.log(`   🤝 ${BUSINESSES.length * 2} business matches`) 
  console.log(`   📧 6 collection cases`) 
  console.log(`   🔗 5 payment links`) 
  console.log(`   📄 6 invoices`) 
  console.log(`   🌍 10 global payment methods + 16 currency rates`) 
  console.log(`   ⚡ 3 disputes`) 
  console.log(`   💱 Wallet transactions + deposits + withdrawals`) 
  console.log(`\n   🔐 Login: admin@digitallendingos.co.ke / Demo1234!`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
