import { PrismaClient, Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'

const db = new PrismaClient()

// ─── helpers ───────────────────────────────────────────────
const rand = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const rf = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 100) / 100
const ri = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const daysAgo = (d: number) => new Date(Date.now() - ri(0, d) * 86400000)
const futureDays = (d: number) => new Date(Date.now() + ri(1, d) * 86400000)
const pwd = (s: string) => bcrypt.hashSync(s, 10)

const CURRENCIES = ['USD','EUR','GBP','KES','NGN','GHS','UGX','TZS']
const CURRENCIES_MAJOR = ['USD','EUR','GBP']
const AFRICAN_CURRENCIES = ['KES','NGN','GHS','UGX','TZS']
const PAYMENT_METHODS = ['bank_transfer','card','mobile_money','crypto','digital_wallet']
const ROUTING_PROVIDERS = ['flutterwave','paystack','stripe','intasend','wise']
const FRAUD_TYPES = ['velocity_anomaly','amount_anomaly','location_mismatch','device_fingerprint','account_takeover','synthetic_identity']
const COMPLIANCE_TYPES = ['sanctions','pep','aml','kyc','adverse_media']
const MATCH_TYPES = ['supplier','buyer','partner','logistics']
const COLLECTION_CHANNELS = ['email','sms','whatsapp']

// ─── main ──────────────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding Digital Lending OS database...')

  // Clean all tables (order matters for FK constraints)
  const tables = [
    'notification','subscription',
    'reputationEvent','review','financialPrediction','financialMetric','financialSnapshot',
    'disbursement','dispute','escrowAuditLog','escrowMilestone',
    'paymentTransaction','collectionReminder','collectionCase',
    'referralBonus','paymentLinkPayment','paymentLink',
    'fraudAlert','fraudRule','complianceScreening','complianceRule',
    'businessMatch','walletTransaction','cryptoWithdrawal','currencyConversion',
    'withdrawal','deposit','wallet',
    'user','invoice','escrowTransaction','paymentIntent',
    'trustScore','financialDigitalTwin','commercePassport','verification','complianceDocument',
    'businessRelationship','business','account','currencyRate','paymentMethod','globalPaymentMethod',
    'tenant',
  ]
  for (const t of tables) {
    try { await (db as any)[t].deleteMany() } catch {}
  }
  console.log('  ✓ Cleared all tables')

  // ─── 1. Tenant ───────────────────────────────────────────
  const tenant = await db.tenant.create({
    data: {
      name: 'Digital Lending OS Demo',
      slug: 'dlo-demo',
      ownerName: 'Alice Mwangi',
      ownerEmail: 'alice@digitallendingos.co.ke',
      plan: 'business',
      maxBusinesses: 50,
      maxUsers: 100,
    },
  })
  console.log('  ✓ Tenant: ' + tenant.id)

  // ─── 2. Account (for auth/login) ─────────────────────────
  const adminAccount = await db.account.create({
    data: {
      email: 'admin@digitallendingos.co.ke',
      passwordHash: pwd('demo1234'),
      name: 'Alice Mwangi',
      role: 'admin',
      tenantId: tenant.id,
      referralCode: 'ALICE2024',
    },
  })
  console.log('  ✓ Admin account: ' + adminAccount.email)

  // ─── 3. Businesses (4 African businesses) ────────────────
  const bizData = [
    { name: 'AfriPay Solutions',   country: 'KE', city: 'Nairobi',    currency: 'KES', industry: 'FinTech',              annualRevenue: 2500000 },
    { name: 'Lagos Trade Hub',     country: 'NG', city: 'Lagos',      currency: 'NGN', industry: 'Trading & Commerce',   annualRevenue: 5800000 },
    { name: 'Accra Digital Ltd',   country: 'GH', city: 'Accra',      currency: 'GHS', industry: 'IT Services',          annualRevenue: 1200000 },
    { name: 'Nairobi Electronics', country: 'KE', city: 'Nairobi',    currency: 'KES', industry: 'Electronics Retail',   annualRevenue: 3400000 },
  ]
  const businesses: any[] = []
  for (const bd of bizData) {
    const biz = await db.business.create({
      data: {
        tenantId: tenant.id,
        name: bd.name,
        legalName: bd.name + ' Ltd',
        registrationNo: 'REG-' + ri(100000, 999999),
        taxId: 'TAX-' + ri(10000, 99999),
        country: bd.country,
        city: bd.city,
        industry: bd.industry,
        website: 'https://' + bd.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com',
        employeeCount: ri(5, 200),
        annualRevenue: bd.annualRevenue,
        description: bd.name + ' - leading ' + bd.industry + ' company in ' + bd.city,
        status: 'verified',
        verifiedAt: daysAgo(90),
      },
    })
    businesses.push({ ...biz, _currency: bd.currency })
  }
  console.log('  ✓ ' + businesses.length + ' businesses')

  // ─── 4. Users (linked to businesses) ─────────────────────
  const users = []
  const userData = [
    { name: 'Alice Mwangi',    email: 'alice@afripay.ke',    businessIdx: 0, role: 'admin' },
    { name: 'Bob Ochieng',     email: 'bob@afripay.ke',      businessIdx: 0, role: 'operator' },
    { name: 'Carol Njeri',     email: 'carol@nairobi-elec.ke', businessIdx: 3, role: 'admin' },
    { name: 'David Okonkwo',   email: 'david@lagos-trade.ng', businessIdx: 1, role: 'admin' },
    { name: 'Eva Mensah',      email: 'eva@accra-digital.gh',  businessIdx: 2, role: 'operator' },
    { name: 'Frank Kamau',     email: 'frank@afripay.ke',     businessIdx: 0, role: 'viewer' },
  ]
  for (const ud of userData) {
    const user = await db.user.create({
      data: {
        email: ud.email,
        name: ud.name,
        role: ud.role,
        businessId: businesses[ud.businessIdx].id,
        isActive: true,
        lastLoginAt: daysAgo(3),
      },
    })
    users.push(user)
  }
  console.log('  ✓ ' + users.length + ' users')

  // ─── 5. Wallets (2 per business) ─────────────────────────
  const wallets: any[] = []
  for (const biz of businesses) {
    // Primary wallet in local currency
    wallets.push(await db.wallet.create({
      data: {
        businessId: biz.id,
        currency: biz._currency,
        balance: rf(50000, 500000),
        availableBalance: rf(40000, 400000),
        pendingBalance: rf(1000, 50000),
        frozenBalance: rf(0, 5000),
        isDefault: true,
        status: 'active',
        label: 'Primary ' + biz._currency + ' Wallet',
      },
    }))
    // USD wallet
    wallets.push(await db.wallet.create({
      data: {
        businessId: biz.id,
        currency: 'USD',
        balance: rf(1000, 50000),
        availableBalance: rf(800, 40000),
        pendingBalance: rf(100, 5000),
        frozenBalance: rf(0, 1000),
        isDefault: false,
        status: 'active',
        label: 'USD Wallet',
      },
    }))
  }
  console.log('  ✓ ' + wallets.length + ' wallets')

  // ─── 6. Wallet Transactions (20+) ────────────────────────
  for (let i = 0; i < 25; i++) {
    const wallet = rand(wallets)
    const type = rand(['credit','credit','credit','debit','debit'])
    const amount = rf(100, 25000)
    const balBefore = rf(1000, 100000)
    const balAfter = type === 'credit' ? balBefore + amount : Math.max(0, balBefore - amount)
    await db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        txRef: 'WTX-' + Date.now().toString(36) + '-' + ri(1000,9999),
        type,
        amount,
        balanceBefore: balBefore,
        balanceAfter: balAfter,
        currency: wallet.currency,
        description: type === 'credit' ? 'Payment received' : 'Payment sent',
        referenceType: rand(['payment','escrow','deposit','withdrawal','transfer']),
        status: 'completed',
      },
    })
  }
  console.log('  ✓ 25 wallet transactions')

  // ─── 7. Deposits (5) ─────────────────────────────────────
  for (let i = 0; i < 5; i++) {
    const wallet = rand(wallets)
    const statuses = ['completed','completed','completed','pending','failed']
    const st = rand(statuses)
    await db.deposit.create({
      data: {
        depositRef: 'DEP-' + ri(100000,999999),
        walletId: wallet.id,
        amount: rf(5000, 100000),
        currency: wallet.currency,
        paymentMethod: rand(PAYMENT_METHODS),
        provider: rand(ROUTING_PROVIDERS),
        status: st,
        bankName: rand(['Equity Bank','KCB','GTBank','Access Bank','GCB Bank']),
        completedAt: st === 'completed' ? daysAgo(10) : null,
        failedReason: st === 'failed' ? 'Insufficient funds' : null,
      },
    })
  }
  console.log('  ✓ 5 deposits')

  // ─── 8. Withdrawals (4) ──────────────────────────────────
  for (let i = 0; i < 4; i++) {
    const wallet = rand(wallets)
    const st = rand(['completed','completed','pending','processing'])
    await db.withdrawal.create({
      data: {
        withdrawalRef: 'WDR-' + ri(100000,999999),
        walletId: wallet.id,
        amount: rf(2000, 50000),
        currency: wallet.currency,
        paymentMethod: rand(['bank_transfer','mobile_money']),
        provider: rand(ROUTING_PROVIDERS),
        status: st,
        bankName: rand(['Equity Bank','KCB','GTBank','GCB Bank']),
        bankAccount: '****' + ri(1000,9999),
        recipientName: rand(['Alice Mwangi','David Okonkwo','Eva Mensah','Carol Njeri']),
        completedAt: st === 'completed' ? daysAgo(5) : null,
      },
    })
  }
  console.log('  ✓ 4 withdrawals')

  // ─── 9. Escrow Transactions (8) ──────────────────────────
  const escrows: any[] = []
  for (let i = 0; i < 8; i++) {
    const buyer = rand(businesses)
    let seller = rand(businesses)
    while (seller.id === buyer.id) seller = rand(businesses)
    const amount = rf(1000, 200000)
    const st = rand(['created','funded','in_escrow','completed','completed','completed','disputed','cancelled'])
    const escrow = await db.escrowTransaction.create({
      data: {
        buyerId: buyer.id,
        sellerId: seller.id,
        txRef: 'ESC-' + Date.now().toString(36).slice(-6) + '-' + ri(1000,9999),
        amount,
        currency: rand(CURRENCIES_MAJOR),
        description: 'Trade order #' + (i + 1) + ' - ' + rand(['Electronics','Textiles','Agricultural products','Auto parts','Chemicals']),
        status: st,
        currentMilestone: st === 'completed' ? 3 : ri(0, 2),
        totalMilestones: 3,
        fundedAmount: ['funded','in_escrow','completed'].includes(st) ? amount : rf(0, amount * 0.5),
        releasedAmount: st === 'completed' ? amount * 0.8 : rf(0, amount * 0.3),
        refundedAmount: st === 'cancelled' ? amount : 0,
        feeAmount: rf(amount * 0.01, amount * 0.03),
        aiRiskScore: rf(10, 85),
        aiRiskLevel: rand(['low','low','medium','medium','high']),
        expiresAt: futureDays(30),
        completedAt: st === 'completed' ? daysAgo(15) : null,
      },
    })
    escrows.push(escrow)
  }
  console.log('  ✓ 8 escrow transactions')

  // ─── 10. Disputes (3) ─────────────────────────────────────
  for (let i = 0; i < 3; i++) {
    const escrow = rand(escrows.filter(e => e.status !== 'cancelled'))
    const st = rand(['open','open','under_review','resolved'])
    await db.dispute.create({
      data: {
        escrowId: escrow.id,
        raisedBy: escrow.buyerId,
        reason: rand(['Goods not delivered','Quality below standard','Wrong items shipped','Late delivery by 3 weeks']),
        description: 'Dispute regarding escrow ' + escrow.txRef,
        status: st,
        resolution: st === 'resolved' ? 'Partial refund issued to buyer' : null,
        resolvedAt: st === 'resolved' ? daysAgo(5) : null,
        aiRecommendation: st === 'resolved' ? 'Mediated settlement' : 'Review evidence and negotiate',
      },
    })
  }
  console.log('  ✓ 3 disputes')

  // ─── 11. Escrow Milestones (for completed escrows) ───────
  for (const esc of escrows.filter(e => e.status === 'completed')) {
    for (let s = 0; s < 3; s++) {
      await db.escrowMilestone.create({
        data: {
          escrowId: esc.id,
          sequence: s + 1,
          title: ['Order Confirmation','Production & Quality Check','Final Delivery & Release'][s],
          amount: Math.round(esc.amount * [0.3, 0.3, 0.4][s] * 100) / 100,
          status: 'released',
          releasedAt: daysAgo(20 - s * 5),
        },
      })
    }
  }
  console.log('  ✓ Escrow milestones')

  // ─── 12. Disbursements (for completed escrows) ───────────
  for (const esc of escrows.filter(e => e.status === 'completed')) {
    await db.disbursement.create({
      data: {
        escrowId: esc.id,
        amount: esc.releasedAmount,
        currency: esc.currency,
        fromAccount: 'ESCROW_POOL',
        toAccount: 'SELLER_' + esc.sellerId.slice(-6),
        status: 'completed',
        paymentRef: 'DISB-' + ri(100000,999999),
        completedAt: daysAgo(10),
      },
    })
  }
  console.log('  ✓ Disbursements')

  // ─── 13. Payment Intents (12) ────────────────────────────
  const intents: any[] = []
  const rates: Record<string, number> = {
    'USD-EUR': 0.92, 'USD-GBP': 0.79, 'USD-KES': 153.5, 'USD-NGN': 1580,
    'USD-GHS': 15.2, 'EUR-USD': 1.087, 'GBP-USD': 1.266,
    'KES-USD': 0.0065, 'NGN-USD': 0.00063, 'GHS-USD': 0.066,
  }
  for (let i = 0; i < 12; i++) {
    const fromBiz = rand(businesses)
    let toBiz = rand(businesses)
    while (toBiz.id === fromBiz.id) toBiz = rand(businesses)
    const srcCur = rand(CURRENCIES)
    let tgtCur = rand(CURRENCIES)
    while (tgtCur === srcCur) tgtCur = rand(CURRENCIES)
    const srcAmt = rf(500, 100000)
    const rate = rates[srcCur + '-' + tgtCur] || rf(0.5, 2.0)
    const st = rand(['created','processing','completed','completed','completed','failed','cancelled'])
    const intent = await db.paymentIntent.create({
      data: {
        fromBusinessId: fromBiz.id,
        toBusinessId: toBiz.id,
        intentRef: 'PAY-' + Date.now().toString(36).slice(-6) + '-' + ri(1000,9999),
        sourceAmount: srcAmt,
        sourceCurrency: srcCur,
        targetAmount: Math.round(srcAmt * rate * 100) / 100,
        targetCurrency: tgtCur,
        exchangeRate: rate,
        paymentMethod: rand(PAYMENT_METHODS),
        routingProvider: rand(ROUTING_PROVIDERS),
        routingScore: rf(0.6, 0.99),
        estimatedFee: rf(srcAmt * 0.005, srcAmt * 0.025),
        actualFee: st === 'completed' ? rf(srcAmt * 0.005, srcAmt * 0.025) : null,
        estimatedTime: ri(5, 120),
        status: st,
        completedAt: st === 'completed' ? daysAgo(15) : null,
      },
    })
    intents.push(intent)
  }
  console.log('  ✓ 12 payment intents')

  // ─── 14. Payment Transactions (for completed intents) ────
  for (const intent of intents.filter(p => p.status === 'completed')) {
    await db.paymentTransaction.create({
      data: {
        intentId: intent.id,
        txRef: 'PTX-' + ri(100000,999999),
        provider: intent.routingProvider,
        providerTxId: 'prov_' + ri(10000000,99999999),
        amount: intent.sourceAmount,
        currency: intent.sourceCurrency,
        status: 'settled',
        settledAt: daysAgo(10),
      },
    })
  }
  console.log('  ✓ Payment transactions')

  // ─── 15. Invoices (8) ────────────────────────────────────
  const invoices: any[] = []
  for (let i = 0; i < 8; i++) {
    const sender = rand(businesses)
    let receiver = rand(businesses)
    while (receiver.id === sender.id) receiver = rand(businesses)
    const amount = rf(5000, 150000)
    const st = rand(['paid','paid','paid','pending','pending','overdue','cancelled'])
    const inv = await db.invoice.create({
      data: {
        invoiceRef: 'INV-' + String(i + 1).padStart(4, '0') + '-' + ri(1000,9999),
        senderId: sender.id,
        receiverId: receiver.id,
        amount,
        status: st,
        dueDate: futureDays(30),
        paidAmount: st === 'paid' ? amount : rf(0, amount * 0.3),
        notes: 'Payment for goods/services - Order #' + ri(10000, 99999),
        paidAt: st === 'paid' ? daysAgo(7) : null,
      },
    })
    invoices.push(inv)
  }
  console.log('  ✓ 8 invoices')

  // ─── 16. Payment Links (5) ───────────────────────────────
  for (let i = 0; i < 5; i++) {
    const biz = rand(businesses)
    const collected = rf(0, 30000)
    const pl = await db.paymentLink.create({
      data: {
        linkRef: 'PLINK-' + ri(100000,999999),
        businessId: biz.id,
        title: rand(['Invoice Payment','Service Fee','Product Order','Subscription','Deposit']),
        description: 'Payment link for ' + biz.name,
        amount: rf(1000, 50000),
        currency: biz._currency,
        paymentCount: ri(1, 15),
        totalCollected: collected,
        status: ri(0, 10) > 2 ? 'active' : 'expired',
        expiresAt: futureDays(60),
        createdBy: rand(users).id,
      },
    })
    // Add some payments to the link
    for (let j = 0; j < ri(1, 4); j++) {
      await db.paymentLinkPayment.create({
        data: {
          paymentLinkId: pl.id,
          amount: rf(500, 10000),
          currency: biz._currency,
          paymentMethod: rand(PAYMENT_METHODS),
          status: 'completed',
        },
      })
    }
  }
  console.log('  ✓ 5 payment links with payments')

  // ─── 17. Collection Cases (5) ────────────────────────────
  for (let i = 0; i < 5; i++) {
    const biz = rand(businesses)
    let debtor = rand(businesses)
    while (debtor.id === biz.id) debtor = rand(businesses)
    const origAmt = rf(10000, 200000)
    const st = rand(['active','active','pending','resolved','written_off'])
    const bucket = rand(['current','30_days','60_days','90_days','120_plus_days'])
    const cc = await db.collectionCase.create({
      data: {
        caseRef: 'COL-' + ri(100000,999999),
        businessId: biz.id,
        debtorId: debtor.id,
        originalAmount: origAmt,
        outstandingAmount: st === 'resolved' ? 0 : rf(origAmt * 0.3, origAmt * 0.9),
        currency: biz._currency,
        agingBucket: bucket,
        priority: bucket === '120_plus_days' ? 'high' : bucket === '90_days' ? 'medium' : 'low',
        status: st,
        reminderCount: ri(1, 5),
        lastReminderAt: daysAgo(7),
        nextReminderDue: futureDays(3),
        aiStrategy: rand(['friendly_reminder','formal_notice','escalation','legal_notice']),
        resolution: st === 'resolved' ? 'Full payment received' : null,
        resolvedAt: st === 'resolved' ? daysAgo(3) : null,
      },
    })
    // Add reminders
    for (let r = 0; r < ri(1, 3); r++) {
      await db.collectionReminder.create({
        data: {
          caseId: cc.id,
          channel: rand(COLLECTION_CHANNELS),
          template: rand(['first_reminder','second_reminder','final_notice','payment_plan_offer']),
          status: 'sent',
          sentAt: daysAgo(ri(1, 14)),
        },
      })
    }
  }
  console.log('  ✓ 5 collection cases with reminders')

  // ─── 18. Fraud Alerts (6) ────────────────────────────────
  for (let i = 0; i < 6; i++) {
    const biz = rand(businesses)
    const sev = rand(['low','low','medium','medium','high','critical'])
    const st = rand(['new','new','investigating','resolved','dismissed'])
    await db.fraudAlert.create({
      data: {
        alertRef: 'FRD-' + ri(100000,999999),
        businessId: biz.id,
        relatedType: rand(['transaction','account','payment','escrow']),
        fraudType: rand(FRAUD_TYPES),
        score: rf(20, 95),
        description: 'Suspicious ' + rand(['activity','transaction','login','payment']) + ' detected on ' + biz.name,
        recommendation: sev === 'high' || sev === 'critical'
          ? 'Immediate investigation required'
          : 'Monitor and review',
        status: st,
        resolvedBy: st === 'resolved' ? 'alice@afripay.ke' : null,
        resolvedAt: st === 'resolved' ? daysAgo(2) : null,
      },
    })
  }
  console.log('  ✓ 6 fraud alerts')

  // ─── 19. Fraud Rules (5) ─────────────────────────────────
  const FRAUD_RULE_CONDITIONS = [
    { field: 'transaction_count', operator: 'greater_than', value: 5, window_minutes: 60 },
    { field: 'amount', operator: 'greater_than', value: 50000, currency: 'USD' },
    { field: 'ip_country', operator: 'not_equals', value: 'account_country' },
    { field: 'device_fingerprint', operator: 'is_new', value: true },
    { field: 'action_count', operator: 'greater_than', value: 10, window_minutes: 5 },
  ]
  for (let i = 0; i < 5; i++) {
    const condObj = { ...FRAUD_RULE_CONDITIONS[i], _tenantId: tenant.id }
    await db.fraudRule.create({
      data: {
        name: ['Velocity Check','Large Amount Alert','Geo Mismatch','New Device','Rapid Succession'][i],
        description: ['Detect rapid transactions in short window','Flag transactions above threshold','Alert on location/device changes','Flag logins from new devices','Detect multiple rapid actions'][i],
        condition: JSON.stringify(condObj),
        action: rand(['block','flag','flag','monitor','require_review']),
        severity: rand(['low','medium','medium','high','high']),
        isActive: i < 4,
        triggerCount: ri(0, 25),
        lastTriggeredAt: daysAgo(3),
      },
    })
  }
  console.log('  ✓ 5 fraud rules')

  // ─── 20. Compliance Rules (5) ─────────────────────────────
  for (let i = 0; i < 5; i++) {
    await db.complianceRule.create({
      data: {
        name: ['Sanctions Screening','PEP Check','AML Monitoring','KYC Verification','Adverse Media Check'][i],
        description: ['Screen against OFAC/EU/UN sanctions lists','Check Politically Exposed Persons status','Monitor for money laundering patterns','Verify customer identity documents','Screen for negative news coverage'][i],
        ruleType: COMPLIANCE_TYPES[i],
        condition: ['entity in sanctions_list','is_pep == true','suspicious_pattern_score > 70','kyc_status != verified','adverse_media_found == true'][i],
        action: rand(['block','flag','flag','require_review','escalate']),
        severity: rand(['low','medium','medium','high','critical']),
        isActive: true,
        triggeredCount: ri(0, 15),
      },
    })
  }
  console.log('  ✓ 5 compliance rules')

  // ─── 21. Compliance Screenings (6) ───────────────────────
  for (let i = 0; i < 6; i++) {
    const biz = rand(businesses)
    const result = rand(['clear','clear','clear','potential_match','match','hit'])
    await db.complianceScreening.create({
      data: {
        businessId: biz.id,
        screeningType: rand(COMPLIANCE_TYPES),
        result,
        riskLevel: result === 'clear' ? 'low' : result === 'potential_match' ? 'medium' : 'high',
        details: 'Screening result for ' + biz.name + ' - ' + result,
        matchedLists: result !== 'clear' ? 'OFAC SDN List, EU Consolidated List' : null,
        status: result === 'clear' ? 'approved' : rand(['pending_review','escalated','approved']),
        reviewedBy: result === 'clear' ? 'system' : rand(['alice@afripay.ke','david@lagos-trade.ng']),
        reviewedAt: daysAgo(5),
      },
    })
  }
  console.log('  ✓ 6 compliance screenings')

  // ─── 22. Trust Scores (one per business) ─────────────────
  for (const biz of businesses) {
    const overall = rf(55, 95)
    const ts = await db.trustScore.create({
      data: {
        businessId: biz.id,
        overallScore: overall,
        paymentScore: Math.min(100, Math.max(0, overall + rf(-10, 10))),
        deliveryScore: Math.min(100, Math.max(0, overall + rf(-15, 10))),
        qualityScore: Math.min(100, Math.max(0, overall + rf(-10, 15))),
        communicationScore: Math.min(100, Math.max(0, overall + rf(-8, 8))),
        complianceScore: Math.min(100, Math.max(0, overall + rf(-5, 10))),
        totalReviews: ri(5, 80),
        totalTransactions: ri(10, 300),
        scoreVersion: 2,
        lastCalculated: daysAgo(1),
      },
    })
    // Add reputation events
    const events = ['positive_review','successful_payment','dispute_resolved','verification_completed','on_time_delivery']
    for (let e = 0; e < 3; e++) {
      await db.reputationEvent.create({
        data: {
          trustScoreId: ts.id,
          eventType: rand(events),
          scoreImpact: rf(0.5, 3.0),
          description: rand(['Positive review received','Payment completed on time','Dispute resolved amicably','Business verification completed','Delivery ahead of schedule']),
          sourceId: 'evt_' + ri(10000, 99999),
        },
      })
    }
  }
  console.log('  ✓ 4 trust scores + reputation events')

  // ─── 23. Reviews (8) ──────────────────────────────────────
  for (let i = 0; i < 8; i++) {
    const fromBiz = rand(businesses)
    let toBiz = rand(businesses)
    while (toBiz.id === fromBiz.id) toBiz = rand(businesses)
    const rating = rf(2.5, 5.0)
    const st = rand(['published','published','published','pending','moderated'])
    await db.review.create({
      data: {
        fromBusinessId: fromBiz.id,
        toBusinessId: toBiz.id,
        rating,
        paymentRating: rf(2, 5),
        deliveryRating: rf(2, 5),
        qualityRating: rf(2, 5),
        communicationRating: rf(2, 5),
        comment: rand([
          'Excellent partner, highly recommended for cross-border trade',
          'Good communication and timely delivery',
          'Products met quality standards as agreed',
          'Payment was processed smoothly and on time',
          'Reliable supplier with consistent quality',
          'Professional service throughout the transaction',
        ]),
        status: st,
      },
    })
  }
  console.log('  ✓ 8 reviews')

  // ─── 24. Business Relationships (6) ───────────────────────
  for (let i = 0; i < 6; i++) {
    const from = rand(businesses)
    let to = rand(businesses)
    while (to.id === from.id) to = rand(businesses)
    try {
      await db.businessRelationship.create({
        data: {
          fromBusinessId: from.id,
          toBusinessId: to.id,
          type: rand(['supplier','buyer','partner','logistics','financial']),
          trustLevel: rf(40, 95),
          totalTxVolume: rf(50000, 2000000),
          totalTxCount: ri(5, 100),
          firstTxDate: daysAgo(180),
          lastTxDate: daysAgo(3),
          status: rand(['active','active','active','paused']),
        },
      })
    } catch { /* unique constraint skip */ }
  }
  console.log('  ✓ Business relationships')

  // ─── 25. Business Matches (6) ─────────────────────────────
  const matchTypes = ['supplier','buyer','partner','logistics','financial']
  for (let i = 0; i < 10; i++) {
    const seeker = businesses[i % businesses.length]
    const candidate = businesses[(i + 1 + Math.floor(i / businesses.length)) % businesses.length]
    if (seeker.id === candidate.id) continue
    const matchType = matchTypes[i % matchTypes.length]
    const st = rand(['pending','pending','accepted','rejected','expired'])
    try {
      await db.businessMatch.create({
        data: {
          seekerId: seeker.id,
          candidateId: candidate.id,
          matchType,
          matchScore: rf(60, 98),
          reasons: JSON.stringify(['Industry match','Geographic proximity','Trust score compatible','Payment history good','Verified business'].slice(0, ri(1,3))),
          status: st,
          seekerResponse: st !== 'pending' ? rand(['interested','not_interested']) : null,
          candidateResponse: st === 'accepted' ? 'interested' : null,
        },
      })
    } catch { /* unique constraint skip */ }
  }
  console.log('  ✓ 6 business matches')

  // ─── 26. Referral Bonuses (4) ─────────────────────────────
  for (let i = 0; i < 4; i++) {
    const wallet = rand(wallets.filter(w => w.currency === 'USD'))
    await db.referralBonus.create({
      data: {
        bonusRef: 'REF-' + ri(100000,999999),
        referrerId: adminAccount.id,
        refereeId: rand(users.slice(1)).id,
        depositId: 'dep_' + ri(10000, 99999),
        walletId: wallet.id,
        bonusAmount: 100,
        status: rand(['credited','credited','pending','processed']),
        creditedAt: daysAgo(10),
      },
    })
  }
  console.log('  ✓ 4 referral bonuses')

  // ─── 27. Commerce Passports (one per business) ────────────
  for (const biz of businesses) {
    const credLevel = rand(['basic','standard','enhanced','premium'])
    await db.commercePassport.create({
      data: {
        businessId: biz.id,
        passportHash: createHash('sha256').update(biz.id + '-passport').digest('hex'),
        credentialLevel: credLevel,
        kycStatus: credLevel !== 'basic' ? 'verified' : 'in_progress',
        kycVerifiedAt: credLevel !== 'basic' ? daysAgo(30) : null,
        amlStatus: credLevel === 'premium' ? 'cleared' : rand(['cleared','not_started']),
        amlCheckedAt: daysAgo(14),
        riskRating: credLevel === 'premium' ? 'low' : rand(['low','medium']),
        lastAuditAt: daysAgo(30),
        nextAuditDue: futureDays(90),
      },
    })
  }
  console.log('  ✓ 4 commerce passports')

  // ─── 28. Verifications (10) ───────────────────────────────
  for (let i = 0; i < 10; i++) {
    const biz = rand(businesses)
    const st = rand(['approved','approved','approved','pending','in_progress','rejected'])
    await db.verification.create({
      data: {
        businessId: biz.id,
        type: rand(['identity','business_registration','tax','bank_account','address']),
        method: rand(['document','api','manual','third_party']),
        status: st,
        submittedAt: daysAgo(30),
        verifiedAt: st === 'approved' ? daysAgo(15) : null,
        verifiedBy: st === 'approved' ? 'system' : null,
        rejectionReason: st === 'rejected' ? 'Document expired or unclear' : null,
      },
    })
  }
  console.log('  ✓ 10 verifications')

  // ─── 29. Financial Digital Twins (one per business) ──────
  for (const biz of businesses) {
    const health = rf(50, 95)
    const twin = await db.financialDigitalTwin.create({
      data: {
        businessId: biz.id,
        healthScore: health,
        cashFlowHealth: Math.min(100, Math.max(0, health + rf(-15, 15))),
        riskAppetite: rand(['conservative','moderate','moderate','aggressive']),
        creditWorthiness: Math.min(100, Math.max(0, health + rf(-10, 10))),
        liquidityScore: Math.min(100, Math.max(0, health + rf(-20, 15))),
        growthTrajectory: rand(['stable','growing','growing','rapid_growth']),
        aiModelVersion: 'v2.1',
        lastSyncAt: daysAgo(1),
      },
    })
    // Add 3 months of financial metrics
    for (let m = 2; m >= 0; m--) {
      const d = new Date()
      d.setMonth(d.getMonth() - m)
      const periodDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
      const rev = rf(100000, 800000)
      await db.financialMetric.create({
        data: {
          twinId: twin.id,
          period: 'monthly',
          periodDate,
          revenue: rev,
          expenses: rev * rf(0.5, 0.8),
          netIncome: rev * rf(0.1, 0.4),
          cashBalance: rf(50000, 500000),
          transactionCount: ri(20, 200),
          averageTransactionValue: rf(1000, 25000),
          paymentSuccessRate: rf(0.88, 0.98),
          disputeRate: rf(0.01, 0.06),
          customerCount: ri(10, 100),
          supplierCount: ri(5, 30),
        },
      })
    }
  }
  console.log('  ✓ 4 digital twins + financial metrics')

  // ─── 30. Currency Rates ───────────────────────────────────
  const ratePairs = [
    ['USD','EUR',0.92],['USD','GBP',0.79],['USD','KES',153.5],['USD','NGN',1580],
    ['USD','GHS',15.2],['EUR','GBP',0.86],['EUR','KES',166.8],['GBP','KES',194.3],
    ['USD','UGX',3800],['USD','TZS',2650],
  ]
  for (const [from, to, rate] of ratePairs) {
    await db.currencyRate.create({
      data: {
        fromCurrency: from as string,
        toCurrency: to as string,
        rate: rate as number,
        provider: 'dlo-rates',
        expiresAt: futureDays(1),
      },
    })
  }
  console.log('  ✓ 10 currency rates')

  // ─── 17. Notifications ──────────────────────────────────
  const NOTIF_TITLES = [
    { title: 'Payment received', body: 'You received $2,500.00 from Acme Imports via escrow', type: 'payment', category: 'payment_received' },
    { title: 'Escrow funded', body: 'Escrow transaction with Global Logistics has been funded', type: 'escrow', category: 'escrow_funded' },
    { title: 'Invoice overdue', body: 'Invoice INV-2024-003 is now 5 days overdue', type: 'warning', category: 'invoice_overdue' },
    { title: 'New fraud alert', body: 'Unusual transaction pattern detected on your account', type: 'error', category: 'fraud_alert' },
    { title: 'Compliance check passed', body: 'Your KYC verification has been approved', type: 'success', category: 'compliance_alert' },
    { title: 'Collection reminder sent', body: 'Payment reminder sent to debtor for outstanding $12,000', type: 'info', category: 'collection_reminder' },
    { title: 'Referral bonus credited', body: '$100.00 referral bonus has been credited to your wallet', type: 'success', category: 'referral_bonus' },
    { title: 'New business match', body: '3 new supplier matches found based on your requirements', type: 'info', category: 'general' },
  ]
  for (const n of NOTIF_TITLES) {
    await db.notification.create({
      data: {
        accountId: adminAccount.id,
        title: n.title,
        body: n.body,
        type: n.type,
        category: n.category,
        isRead: Math.random() > 0.5,
        readAt: Math.random() > 0.5 ? daysAgo(3) : null,
        createdAt: daysAgo(14),
      },
    })
  }
  console.log('  ✓ 8 notifications')

  // ─── 18. Subscriptions ─────────────────────────────────
  for (const b of businesses.slice(0, 3)) {
    const plan = rand(['starter', 'professional', 'enterprise'])
    const amounts: Record<string, number> = { starter: 29, professional: 99, enterprise: 299 }
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)
    await db.subscription.create({
      data: {
        businessId: b.id,
        planName: plan,
        amount: amounts[plan],
        currency: 'USD',
        interval: 'monthly',
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    })
  }
  console.log('  ✓ 3 subscriptions')

  // ─── FINAL COUNT ─────────────────────────────────────────
  let total = 0
  for (const m of Prisma.dmmf.datamodel.models) {
    try {
      const name = m.name.charAt(0).toLowerCase() + m.name.slice(1)
      const c = await (db as any)[name].count()
      if (c > 0) {
        console.log('    ' + m.name.padEnd(28) + c)
        total += c
      }
    } catch {}
  }
  console.log('\n  TOTAL: ' + total + ' records seeded\n')
  console.log('✅ Seeding complete!')
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
