// ============================================================
// Comprehensive seed script for Youngsend sample data
// Creates 20 businesses with full related data across all modules
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Helper functions ──────────────────────────────────────────

function cuid(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 25; i++) id += chars[Math.floor(Math.random() * chars.length)];
  // first char must be a letter
  return 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)] + id.slice(1);
}

function daysAgo(d: number): Date { return new Date(Date.now() - d * 86400000); }
function hoursAgo(h: number): Date { return new Date(Date.now() - h * 3600000); }
function randomFrom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randomBetween(min: number, max: number): number { return Math.round((min + Math.random() * (max - min)) * 100) / 100; }

// ── Sample data definitions ───────────────────────────────────

const BUSINESSES = [
  { name: 'Lagos Trade Co.', country: 'Nigeria', city: 'Lagos', industry: 'Agriculture', employeeCount: 45, annualRevenue: 250000, status: 'verified' },
  { name: 'Nairobi Exports Ltd', country: 'Kenya', city: 'Nairobi', industry: 'Manufacturing', employeeCount: 120, annualRevenue: 1200000, status: 'verified' },
  { name: 'Accra Logistics', country: 'Ghana', city: 'Accra', industry: 'Logistics', employeeCount: 30, annualRevenue: 380000, status: 'verified' },
  { name: 'Cape Town Tech', country: 'South Africa', city: 'Cape Town', industry: 'Technology', employeeCount: 85, annualRevenue: 2100000, status: 'verified' },
  { name: 'Kampala Fresh Foods', country: 'Uganda', city: 'Kampala', industry: 'Food & Beverage', employeeCount: 60, annualRevenue: 180000, status: 'verified' },
  { name: 'Dar es Salaam Shipping', country: 'Tanzania', city: 'Dar es Salaam', industry: 'Logistics', employeeCount: 200, annualRevenue: 3500000, status: 'verified' },
  { name: 'Kigali Coffee Traders', country: 'Rwanda', city: 'Kigali', industry: 'Agriculture', employeeCount: 25, annualRevenue: 420000, status: 'verified' },
  { name: 'Dubai Gold Trading', country: 'UAE', city: 'Dubai', industry: 'Commodities', employeeCount: 50, annualRevenue: 8000000, status: 'verified' },
  { name: 'Singapore Marine Supply', country: 'Singapore', city: 'Singapore', industry: 'Marine', employeeCount: 70, annualRevenue: 4500000, status: 'verified' },
  { name: 'London Finance Partners', country: 'United Kingdom', city: 'London', industry: 'Finance', employeeCount: 35, annualRevenue: 6000000, status: 'verified' },
  { name: 'Mumbai Textiles Inc', country: 'India', city: 'Mumbai', industry: 'Textiles', employeeCount: 300, annualRevenue: 1800000, status: 'verified' },
  { name: 'Sao Paulo AgriTech', country: 'Brazil', city: 'Sao Paulo', industry: 'Technology', employeeCount: 55, annualRevenue: 920000, status: 'verified' },
  { name: 'New York Import Co.', country: 'United States', city: 'New York', industry: 'Import/Export', employeeCount: 40, annualRevenue: 5200000, status: 'verified' },
  { name: 'Berlin Green Energy', country: 'Germany', city: 'Berlin', industry: 'Energy', employeeCount: 90, annualRevenue: 3400000, status: 'verified' },
  { name: 'Tokyo Electronics Ltd', country: 'Japan', city: 'Tokyo', industry: 'Electronics', employeeCount: 150, annualRevenue: 9500000, status: 'verified' },
  { name: 'Shanghai Metal Works', country: 'China', city: 'Shanghai', industry: 'Manufacturing', employeeCount: 500, annualRevenue: 12000000, status: 'verified' },
  { name: 'Sydney Wool Export', country: 'Australia', city: 'Sydney', industry: 'Agriculture', employeeCount: 65, annualRevenue: 2800000, status: 'verified' },
  { name: 'Toronto Mining Corp', country: 'Canada', city: 'Toronto', industry: 'Mining', employeeCount: 200, annualRevenue: 7500000, status: 'verified' },
  { name: 'Lagos Fintech Startup', country: 'Nigeria', city: 'Lagos', industry: 'Technology', employeeCount: 15, annualRevenue: 120000, status: 'pending' },
  { name: 'Nairobi Farm Supplies', country: 'Kenya', city: 'Nairobi', industry: 'Agriculture', employeeCount: 20, annualRevenue: 95000, status: 'pending' },
];

const PASSPORT_LEVELS = ['basic', 'standard', 'enhanced', 'premium'];
const KYC_STATUSES = ['verified', 'verified', 'verified', 'in_progress'];
const AML_STATUSES = ['cleared', 'cleared', 'cleared', 'flagged'];
const RISK_RATINGS = ['low', 'low', 'medium', 'medium', 'high'];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'UGX', 'TZS', 'RWF', 'BRL', 'AED', 'SGD', 'INR', 'JPY', 'CNY', 'AUD', 'CAD', 'ZAR', 'MXN', 'CHF'];
const ESCROW_STATUSES = ['created', 'funded', 'in_escrow', 'completed', 'disputed'];
const PAYMENT_METHODS = ['bank_transfer', 'card', 'mobile_money', 'digital_wallet', 'crypto'];
const PROVIDERS = ['stripe', 'wise', 'paypal', 'paystack', 'flutterwave', 'intasend', 'local_bank'];

const GLOBAL_PAYMENT_METHODS = [
  { methodCode: 'mpesa', methodName: 'M-Pesa', provider: 'safaricom', type: 'Mobile Money', countries: '[["KE"]]', currencies: '[["KES"]]', feePercent: 1.5, fixedFee: 0, settlementTime: 5, icon: '\uD83D\uDCF1', isActive: true },
  { methodCode: 'paystack', methodName: 'Paystack', provider: 'paystack', type: 'Digital Wallet', countries: '[["NG","GH","KE","ZA"]]', currencies: '[["NGN","GHS","KES","ZAR"]]', feePercent: 1.5, fixedFee: 0, settlementTime: 30, icon: '\uD83D\uDCB3', isActive: true },
  { methodCode: 'flutterwave', methodName: 'Flutterwave', provider: 'flutterwave', type: 'Bank', countries: '[["NG","GH","KE","UG","TZ","ZA","RW"]]', currencies: '[["NGN","GHS","KES","UGX","TZS","ZAR","RWF"]]', feePercent: 1.4, fixedFee: 0, settlementTime: 60, icon: '\uD83C\uDF0A', isActive: true },
  { methodCode: 'stripe', methodName: 'Stripe', provider: 'stripe', type: 'Card', countries: '[["US","GB","DE","FR","AU","CA","JP","SG","AE","BR","IN"]]', currencies: '[["USD","EUR","GBP","AUD","CAD","JPY","SGD","AED","BRL","INR"]]', feePercent: 2.9, fixedFee: 0.3, settlementTime: 120, icon: '\uD83D\uDCB3', isActive: true },
  { methodCode: 'wise', methodName: 'Wise', provider: 'wise', type: 'Bank Transfer', countries: '[["US","GB","DE","AU","SG","JP","CA","AE","BR","IN"]]', currencies: '[["USD","EUR","GBP","AUD","SGD","JPY","CAD","AED","BRL","INR"]]', feePercent: 0.5, fixedFee: 0, settlementTime: 60, icon: '\uD83D\uDCB1', isActive: true },
  { methodCode: 'paypal', methodName: 'PayPal', provider: 'paypal', type: 'Digital Wallet', countries: '[["US","GB","DE","AU","CA","JP","FR","BR","IN","AE"]]', currencies: '[["USD","EUR","GBP","AUD","CAD","JPY","BRL","INR","AED"]]', feePercent: 3.4, fixedFee: 0.3, settlementTime: 180, icon: '\uD83D\uDCB0', isActive: true },
  { methodCode: 'intasend', methodName: 'IntaSend', provider: 'intasend', type: 'Real-Time', countries: '[["KE","UG","TZ"]]', currencies: '[["KES","UGX","TZS"]]', feePercent: 1.2, fixedFee: 0, settlementTime: 10, icon: '\u26A1', isActive: true },
  { methodCode: 'upi', methodName: 'UPI', provider: 'npci', type: 'Real-Time', countries: '[["IN"]]', currencies: '[["INR"]]', feePercent: 0, fixedFee: 0, settlementTime: 1, icon: '\uD83C\uDFEE', isActive: true },
  { methodCode: 'pix', methodName: 'PIX', provider: 'bcb', type: 'Real-Time', countries: '[["BR"]]', currencies: '[["BRL"]]', feePercent: 0, fixedFee: 0, settlementTime: 2, icon: '\uD83C\uDFE7', isActive: true },
];

const FRAUD_RULES = [
  { name: 'Large Transaction Alert', description: 'Flag transactions exceeding $50,000', condition: '{"field":"amount","operator":">","value":50000}', action: 'flag_for_review', severity: 'high' },
  { name: 'Velocity Check', description: 'More than 10 transactions in 1 hour', condition: '{"field":"tx_count","operator":">","value":10,"window":"1h"}', action: 'alert', severity: 'medium' },
  { name: 'Geo Mismatch Detection', description: 'Transaction from unusual location', condition: '{"field":"geo_mismatch","operator":"==","value":true}', action: 'alert', severity: 'high' },
  { name: 'New Account Limit', description: 'Restrict new accounts to $5,000/day', condition: '{"field":"account_age","operator":"<","value":"7d"}', action: 'require_review', severity: 'medium' },
  { name: 'Sanctioned Country Block', description: 'Block transactions involving sanctioned countries', condition: '{"field":"country","operator":"in","value":["KP","IR","SY","CU"]}', action: 'block', severity: 'critical' },
];

const COMPLIANCE_RULES = [
  { name: 'KYC Verification Required', description: 'All businesses must complete KYC before transactions', ruleType: 'kyc_requirement', condition: '{"required":true}', action: 'block', severity: 'high' },
  { name: 'AML Sanctions Screening', description: 'Screen all parties against sanctions lists', ruleType: 'sanctions_check', condition: '{"lists":["OFAC","EU","UN"]}', action: 'flag_for_review', severity: 'critical' },
  { name: 'Transaction Limit Check', description: 'Flag transactions above $100,000', ruleType: 'aml_threshold', condition: '{"threshold":100000}', action: 'flag_for_review', severity: 'high' },
  { name: 'Country Risk Assessment', description: 'Apply enhanced due diligence for high-risk countries', ruleType: 'country_restriction', condition: '{"high_risk":["KP","IR","SY"]}', action: 'require_additional_doc', severity: 'high' },
  { name: 'Industry Restriction', description: 'Restrict certain high-risk industries', ruleType: 'industry_restriction', condition: '{"restricted":["gambling","weapons"]}', action: 'block', severity: 'critical' },
];

// ── Main seed function ────────────────────────────────────────

async function main() {
  console.log('=== Youngsend Sample Data Seeding ===');
  console.log('Clearing existing data...');

  // Reset - delete in reverse dependency order
  await prisma.referralBonus.deleteMany();
  await prisma.complianceScreening.deleteMany();
  await prisma.complianceRule.deleteMany();
  await prisma.collectionReminder.deleteMany();
  await prisma.collectionCase.deleteMany();
  await prisma.businessMatch.deleteMany();
  await prisma.fraudAlert.deleteMany();
  await prisma.fraudRule.deleteMany();
  await prisma.currencyConversion.deleteMany();
  await prisma.cryptoWithdrawal.deleteMany();
  await prisma.withdrawal.deleteMany();
  await prisma.deposit.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.globalPaymentMethod.deleteMany();
  await prisma.paymentLinkPayment.deleteMany();
  await prisma.paymentLink.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.financialSnapshot.deleteMany();
  await prisma.financialPrediction.deleteMany();
  await prisma.financialMetric.deleteMany();
  await prisma.financialDigitalTwin.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.currencyRate.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.paymentIntent.deleteMany();
  await prisma.escrowAuditLog.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.disbursement.deleteMany();
  await prisma.escrowMilestone.deleteMany();
  await prisma.escrowTransaction.deleteMany();
  await prisma.review.deleteMany();
  await prisma.reputationEvent.deleteMany();
  await prisma.businessRelationship.deleteMany();
  await prisma.trustScore.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.complianceDocument.deleteMany();
  await prisma.commercePassport.deleteMany();
  await prisma.business.deleteMany();
  await prisma.account.deleteMany();
  await prisma.tenant.deleteMany();

  console.log('Creating tenant and admin account...');

  const tenant = await prisma.tenant.create({
    data: {
      id: 't_demo_01',
      name: 'Youngsend Demo',
      slug: 'demo',
      plan: 'professional',
      status: 'active',
      maxBusinesses: 50,
      maxUsers: 25,
      ownerEmail: 'admin@youngsend.demo',
      ownerName: 'Demo Admin',
    },
  });

  // Create admin account (password: demo1234 - bcrypt hash)
  const bcryptHash = '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu6GK';
  const admin = await prisma.account.create({
    data: {
      id: 'a_admin_01',
      email: 'admin@youngsend.demo',
      passwordHash: bcryptHash,
      name: 'Demo Admin',
      role: 'admin',
      tenantId: tenant.id,
      businessId: null,
      referralCode: 'DEMOADMIN',
    },
  });

  console.log(`Created tenant: ${tenant.id}, admin: ${admin.id}`);
  console.log('Creating 20 businesses...');

  const businessIds: string[] = [];
  const businessMap: Record<string, typeof BUSINESSES[0]> = {};

  for (const b of BUSINESSES) {
    const biz = await prisma.business.create({
      data: {
        tenantId: tenant.id,
        name: b.name,
        country: b.country,
        city: b.city,
        industry: b.industry,
        employeeCount: b.employeeCount,
        annualRevenue: b.annualRevenue,
        description: `${b.industry} company based in ${b.city}, ${b.country}`,
        status: b.status,
        verifiedAt: b.status === 'verified' ? daysAgo(Math.floor(Math.random() * 60) + 10) : null,
      },
    });
    businessIds.push(biz.id);
    businessMap[biz.id] = b;
  }

  console.log(`Created ${businessIds.length} businesses`);

  // ── Passports, Trust Scores, Digital Twins ──────────────────
  console.log('Creating passports, trust scores, and digital twins...');

  for (let i = 0; i < businessIds.length; i++) {
    const bizId = businessIds[i];
    const isVerified = BUSINESSES[i].status === 'verified';
    const overallScore = isVerified ? Math.floor(randomBetween(45, 97)) : Math.floor(randomBetween(20, 50));

    await prisma.commercePassport.create({
      data: {
        businessId: bizId,
        passportHash: `passport_hash_${bizId}`,
        credentialLevel: isVerified ? randomFrom(PASSPORT_LEVELS.slice(1)) : 'basic',
        kycStatus: isVerified ? 'verified' : 'in_progress',
        kycVerifiedAt: isVerified ? daysAgo(Math.floor(Math.random() * 30)) : null,
        amlStatus: randomFrom(AML_STATUSES),
        amlCheckedAt: daysAgo(Math.floor(Math.random() * 20) + 1),
        riskRating: randomFrom(RISK_RATINGS),
        lastAuditAt: daysAgo(Math.floor(Math.random() * 60)),
      },
    });

    await prisma.trustScore.create({
      data: {
        businessId: bizId,
        overallScore,
        paymentScore: Math.min(100, overallScore + Math.floor(randomBetween(-10, 10))),
        deliveryScore: Math.min(100, overallScore + Math.floor(randomBetween(-15, 10))),
        qualityScore: Math.min(100, overallScore + Math.floor(randomBetween(-10, 15))),
        communicationScore: Math.min(100, overallScore + Math.floor(randomBetween(-5, 10))),
        complianceScore: Math.min(100, overallScore + Math.floor(randomBetween(-10, 10))),
        totalReviews: isVerified ? Math.floor(randomBetween(5, 50)) : 0,
        totalTransactions: isVerified ? Math.floor(randomBetween(10, 200)) : 0,
      },
    });

    if (isVerified) {
      await prisma.financialDigitalTwin.create({
        data: {
          businessId: bizId,
          healthScore: randomBetween(40, 95),
          cashFlowHealth: randomBetween(35, 90),
          riskAppetite: randomFrom(['conservative', 'moderate', 'moderate', 'aggressive']),
          creditWorthiness: randomBetween(30, 95),
          liquidityScore: randomBetween(25, 90),
          growthTrajectory: randomFrom(['declining', 'stable', 'stable', 'growing', 'rapid_growth']),
          aiModelVersion: 'v2.1',
          lastSyncAt: hoursAgo(Math.floor(Math.random() * 24)),
        },
      });
    }
  }

  // ── Verifications ──────────────────────────────────────────
  console.log('Creating verifications...');

  const verificationTypes = ['identity', 'business_registration', 'tax', 'bank_account', 'address'];
  const verificationMethods = ['document', 'api', 'manual', 'third_party'];
  const verificationStatuses = ['approved', 'approved', 'approved', 'pending', 'rejected'];

  for (let i = 0; i < Math.min(businessIds.length, 20); i++) {
    const types = verificationTypes.slice(0, Math.floor(randomBetween(2, 6)));
    for (const type of types) {
      await prisma.verification.create({
        data: {
          businessId: businessIds[i],
          type,
          method: randomFrom(verificationMethods),
          status: BUSINESSES[i].status === 'verified' ? 'approved' : randomFrom(verificationStatuses),
          submittedAt: daysAgo(Math.floor(randomBetween(10, 90))),
          verifiedAt: BUSINESSES[i].status === 'verified' ? daysAgo(Math.floor(randomBetween(1, 30))) : null,
        },
      });
    }
  }

  // ── Business Relationships ──────────────────────────────────
  console.log('Creating business relationships...');

  const relTypes = ['supplier', 'buyer', 'partner', 'logistics', 'financial'];
  const relCount = 30;
  const usedPairs = new Set<string>();

  for (let i = 0; i < relCount; i++) {
    let fromIdx: number, toIdx: number, type: string;
    let attempts = 0;
    do {
      fromIdx = Math.floor(Math.random() * businessIds.length);
      toIdx = Math.floor(Math.random() * businessIds.length);
      type = randomFrom(relTypes);
      attempts++;
    } while ((fromIdx === toIdx || usedPairs.has(`${fromIdx}-${toIdx}-${type}`)) && attempts < 50);

    if (fromIdx === toIdx) continue;
    usedPairs.add(`${fromIdx}-${toIdx}-${type}`);

    await prisma.businessRelationship.create({
      data: {
        fromBusinessId: businessIds[fromIdx],
        toBusinessId: businessIds[toIdx],
        type,
        status: randomFrom(['active', 'active', 'active', 'paused']),
        trustLevel: randomBetween(20, 98),
        totalTxVolume: randomBetween(1000, 500000),
        totalTxCount: Math.floor(randomBetween(1, 100)),
        firstTxDate: daysAgo(Math.floor(randomBetween(30, 365))),
        lastTxDate: daysAgo(Math.floor(randomBetween(0, 30))),
      },
    });
  }

  // ── Reviews ─────────────────────────────────────────────────
  console.log('Creating reviews...');

  const reviewComments = [
    'Excellent partner, always delivers on time.',
    'Good quality products and reliable shipping.',
    'Very professional communication throughout.',
    'Slight delay in delivery but good overall experience.',
    'Outstanding service, highly recommended.',
    'Fair pricing and consistent quality.',
    'Great communication, would trade again.',
  ];

  for (let i = 0; i < 25; i++) {
    const fromIdx = Math.floor(Math.random() * businessIds.length);
    let toIdx = Math.floor(Math.random() * businessIds.length);
    if (fromIdx === toIdx) toIdx = (toIdx + 1) % businessIds.length;

    await prisma.review.create({
      data: {
        fromBusinessId: businessIds[fromIdx],
        toBusinessId: businessIds[toIdx],
        rating: randomBetween(3, 5),
        paymentRating: randomBetween(3, 5),
        deliveryRating: randomBetween(2, 5),
        qualityRating: randomBetween(3, 5),
        communicationRating: randomBetween(3, 5),
        comment: randomFrom(reviewComments),
        status: 'published',
        createdAt: daysAgo(Math.floor(randomBetween(1, 180))),
      },
    });
  }

  // ── Wallets ─────────────────────────────────────────────────
  console.log('Creating wallets...');

  const walletIds: Record<string, string> = {};
  for (const bizId of businessIds) {
    const numWallets = Math.floor(randomBetween(1, 4));
    const bizCurrencies: string[] = [];
    const bData = Object.values(businessMap).find(b => businessMap[bizId] === b);

    // Primary currency based on country
    const countryCurrencyMap: Record<string, string> = {
      'Nigeria': 'NGN', 'Kenya': 'KES', 'Ghana': 'GHS', 'Uganda': 'UGX',
      'Tanzania': 'TZS', 'Rwanda': 'RWF', 'South Africa': 'ZAR', 'UAE': 'AED',
      'Singapore': 'SGD', 'United Kingdom': 'GBP', 'India': 'INR', 'Brazil': 'BRL',
      'United States': 'USD', 'Germany': 'EUR', 'Japan': 'JPY', 'China': 'CNY',
      'Australia': 'AUD', 'Canada': 'CAD',
    };
    const primaryCurrency = countryCurrencyMap[BUSINESSES[businessIds.indexOf(bizId)]?.country] || 'USD';
    bizCurrencies.push(primaryCurrency);

    // Maybe add USD
    if (primaryCurrency !== 'USD' && Math.random() > 0.3) bizCurrencies.push('USD');
    // Maybe add EUR
    if (primaryCurrency !== 'EUR' && Math.random() > 0.6) bizCurrencies.push('EUR');

    for (let w = 0; w < Math.min(numWallets, bizCurrencies.length); w++) {
      const wallet = await prisma.wallet.create({
        data: {
          businessId: bizId,
          currency: bizCurrencies[w],
          balance: randomBetween(100, 50000),
          availableBalance: randomBetween(50, 45000),
          pendingBalance: randomBetween(0, 5000),
          frozenBalance: randomBetween(0, 1000),
          isDefault: w === 0,
          status: 'active',
        },
      });
      walletIds[`${bizId}-${bizCurrencies[w]}`] = wallet.id;
    }
  }

  console.log(`Created wallets for ${businessIds.length} businesses`);

  // ── Escrow Transactions ─────────────────────────────────────
  console.log('Creating escrow transactions...');

  const escrowCount = 20;
  const escrowIds: string[] = [];

  for (let i = 0; i < escrowCount; i++) {
    const buyerIdx = Math.floor(Math.random() * businessIds.length);
    let sellerIdx = Math.floor(Math.random() * businessIds.length);
    if (buyerIdx === sellerIdx) sellerIdx = (sellerIdx + 1) % businessIds.length;

    const currency = randomFrom(['USD', 'EUR', 'GBP', 'NGN', 'KES']);
    const amount = randomBetween(500, 100000);
    const status = ESCROW_STATUSES[Math.min(i, ESCROW_STATUSES.length - 1)];
    const feeAmount = Math.round(amount * 0.015 * 100) / 100;
    const txRef = `ESC-${String(1000 + i).padStart(6, '0')}`;

    const escrow = await prisma.escrowTransaction.create({
      data: {
        txRef,
        buyerId: businessIds[buyerIdx],
        sellerId: businessIds[sellerIdx],
        amount,
        currency,
        description: `Trade transaction #${i + 1} for ${BUSINESSES[buyerIdx].industry.toLowerCase()} goods`,
        status,
        currentMilestone: status === 'completed' ? 3 : Math.floor(randomBetween(0, 3)),
        totalMilestones: 3,
        fundedAmount: ['created'].includes(status) ? 0 : amount,
        releasedAmount: status === 'completed' ? amount : 0,
        refundedAmount: status === 'disputed' ? amount * 0.3 : 0,
        feeAmount,
        feeCurrency: currency,
        aiRiskScore: randomBetween(5, 75),
        aiRiskLevel: randomFrom(['low', 'low', 'medium', 'high']),
        createdAt: daysAgo(Math.floor(randomBetween(1, 90))),
        completedAt: status === 'completed' ? daysAgo(Math.floor(randomBetween(0, 10))) : null,
      },
    });
    escrowIds.push(escrow.id);

    // Create milestones for each escrow
    const milestoneTitles = ['Initial Deposit', 'Production/Preparation', 'Final Delivery & Release'];
    const milestoneAmounts = [amount * 0.3, amount * 0.4, amount * 0.3];

    for (let m = 0; m < 3; m++) {
      let mStatus = 'pending';
      if (status === 'completed') mStatus = 'released';
      else if (status === 'in_escrow' && m < 1) mStatus = 'released';
      else if (status === 'funded') mStatus = 'ready';
      else if (status === 'disputed' && m === 2) mStatus = 'disputed';

      await prisma.escrowMilestone.create({
        data: {
          escrowId: escrow.id,
          sequence: m + 1,
          title: milestoneTitles[m],
          amount: milestoneAmounts[m],
          status: mStatus,
          releasedAt: mStatus === 'released' ? daysAgo(Math.floor(randomBetween(0, 30))) : null,
        },
      });
    }

    // Add dispute for disputed escrows
    if (status === 'disputed') {
      await prisma.dispute.create({
        data: {
          escrowId: escrow.id,
          raisedBy: Math.random() > 0.5 ? 'buyer' : 'seller',
          reason: 'Goods not meeting quality specifications',
          description: 'The delivered goods did not match the agreed specifications in the contract. Requesting partial refund.',
          status: randomFrom(['open', 'under_review']),
          aiRecommendation: 'Based on contract analysis, recommend mediation with 40% refund to buyer and 60% release to seller.',
          createdAt: daysAgo(Math.floor(randomBetween(1, 14))),
        },
      });
    }
  }

  console.log(`Created ${escrowCount} escrow transactions`);

  // ── Payment Intents ─────────────────────────────────────────
  console.log('Creating payment intents...');

  const paymentIntents = 15;
  const exchangeRates: Record<string, number> = {
    'USD-NGN': 1550, 'USD-KES': 153, 'USD-GHS': 15.2, 'USD-EUR': 0.92, 'USD-GBP': 0.79,
    'EUR-USD': 1.09, 'GBP-USD': 1.27, 'USD-JPY': 157.5, 'USD-INR': 83.5, 'USD-BRL': 4.97,
    'USD-AED': 3.67, 'USD-SGD': 1.34, 'USD-CNY': 7.24, 'USD-AUD': 1.53, 'USD-CAD': 1.36,
    'USD-ZAR': 18.5, 'USD-UGX': 3750, 'USD-TZS': 2650, 'USD-RWF': 1280,
  };

  for (let i = 0; i < paymentIntents; i++) {
    const fromIdx = Math.floor(Math.random() * businessIds.length);
    let toIdx = Math.floor(Math.random() * businessIds.length);
    if (fromIdx === toIdx) toIdx = (toIdx + 1) % businessIds.length;

    const sourceCurrency = randomFrom(['USD', 'EUR', 'GBP', 'NGN', 'KES', 'AED', 'SGD', 'INR']);
    let targetCurrency = randomFrom(['USD', 'EUR', 'GBP', 'NGN', 'KES']);
    if (sourceCurrency === targetCurrency) targetCurrency = 'USD';

    const rate = exchangeRates[`${sourceCurrency}-${targetCurrency}`] || randomBetween(0.5, 1500);
    const sourceAmount = randomBetween(100, 50000);
    const targetAmount = Math.round(sourceAmount * rate * 100) / 100;
    const status = randomFrom(['created', 'processing', 'completed', 'completed', 'completed', 'failed']);
    const routingScore = Math.floor(randomBetween(40, 98));

    await prisma.paymentIntent.create({
      data: {
        intentRef: `PI-${String(2000 + i).padStart(6, '0')}`,
        fromBusinessId: businessIds[fromIdx],
        toBusinessId: businessIds[toIdx],
        sourceAmount,
        sourceCurrency,
        targetAmount,
        targetCurrency,
        exchangeRate: rate,
        status,
        paymentMethod: randomFrom(PAYMENT_METHODS),
        routingProvider: randomFrom(PROVIDERS),
        routingScore,
        estimatedFee: Math.round(sourceAmount * 0.02 * 100) / 100,
        actualFee: status === 'completed' ? Math.round(sourceAmount * 0.018 * 100) / 100 : null,
        estimatedTime: Math.floor(randomBetween(5, 180)),
        completedAt: status === 'completed' ? daysAgo(Math.floor(randomBetween(0, 30))) : null,
        createdAt: daysAgo(Math.floor(randomBetween(1, 60))),
      },
    });

    // Create currency rate entry
    await prisma.currencyRate.create({
      data: {
        fromCurrency: sourceCurrency,
        toCurrency: targetCurrency,
        rate,
        provider: randomFrom(['wise', 'internal', 'ecb']),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
  }

  console.log(`Created ${paymentIntents} payment intents`);

  // ── Payment Links ───────────────────────────────────────────
  console.log('Creating payment links...');

  for (let i = 0; i < 12; i++) {
    const bizIdx = Math.floor(Math.random() * businessIds.length);
    const currency = randomFrom(['USD', 'EUR', 'NGN', 'KES', 'GBP']);
    const status = randomFrom(['active', 'active', 'active', 'paused', 'expired']);
    const amount = Math.random() > 0.3 ? randomBetween(50, 10000) : 0;
    const paymentCount = status === 'active' ? Math.floor(randomBetween(0, 8)) : Math.floor(randomBetween(1, 15));
    const totalCollected = paymentCount * randomBetween(20, 2000);

    const link = await prisma.paymentLink.create({
      data: {
        linkRef: `PL-${String(3000 + i).padStart(6, '0')}`,
        businessId: businessIds[bizIdx],
        title: `${BUSINESSES[bizIdx].name} - Payment ${i + 1}`,
        amount,
        currency,
        status,
        maxPayments: Math.random() > 0.5 ? 0 : Math.floor(randomBetween(1, 20)),
        paymentCount,
        totalCollected,
        createdAt: daysAgo(Math.floor(randomBetween(1, 90))),
      },
    });

    // Create payments for this link
    for (let p = 0; p < Math.min(paymentCount, 5); p++) {
      const payAmount = randomBetween(50, 5000);
      await prisma.paymentLinkPayment.create({
        data: {
          paymentLinkId: link.id,
          payerName: randomFrom(['John Okafor', 'Fatima Ahmed', 'Sarah Kimani', 'Chen Wei', 'Maria Silva', 'David Mwangi', 'Amina Yusuf', 'James Thompson']),
          payerEmail: randomFrom(['john@mail.com', 'fatima@biz.com', 'sarah@co.ke', 'chen@trade.cn', 'maria@br.com', 'david@ke.com', 'amina@ng.com', 'james@us.com']),
          payerCountry: randomFrom(['US', 'GB', 'NG', 'KE', 'IN', 'DE', 'BR', 'CN', 'JP', 'SG', 'AE', 'AU', 'ZA', 'GH', 'UG']),
          amount: payAmount,
          currency,
          paymentMethod: randomFrom(PAYMENT_METHODS),
          provider: randomFrom(PROVIDERS),
          status: randomFrom(['completed', 'completed', 'completed', 'pending', 'failed']),
          feeAmount: Math.round(payAmount * 0.02 * 100) / 100,
          netAmount: Math.round((payAmount - payAmount * 0.02) * 100) / 100,
          createdAt: daysAgo(Math.floor(randomBetween(1, 60))),
        },
      });
    }
  }

  console.log(`Created 12 payment links with payments`);

  // ── Global Payment Methods ──────────────────────────────────
  console.log('Creating global payment methods...');

  for (const gpm of GLOBAL_PAYMENT_METHODS) {
    await prisma.globalPaymentMethod.create({ data: gpm as any });
  }
  console.log(`Created ${GLOBAL_PAYMENT_METHODS.length} global payment methods`);

  // ── Invoices ────────────────────────────────────────────────
  console.log('Creating invoices...');

  for (let i = 0; i < 15; i++) {
    const senderIdx = Math.floor(Math.random() * businessIds.length);
    let receiverIdx = Math.floor(Math.random() * businessIds.length);
    if (senderIdx === receiverIdx) receiverIdx = (receiverIdx + 1) % businessIds.length;

    const amount = randomBetween(200, 80000);
    const status = randomFrom(['draft', 'sent', 'sent', 'paid', 'paid', 'partially_paid', 'overdue']);
    const paidAmount = status === 'paid' ? amount : status === 'partially_paid' ? amount * randomBetween(0.3, 0.8) : 0;

    await prisma.invoice.create({
      data: {
        invoiceRef: `INV-${String(4000 + i).padStart(6, '0')}`,
        senderId: businessIds[senderIdx],
        receiverId: businessIds[receiverIdx],
        amount,
        currency: randomFrom(['USD', 'EUR', 'NGN', 'KES', 'GBP']),
        status,
        dueDate: daysAgo(Math.floor(randomBetween(-30, 60))),
        paidAmount,
        items: JSON.stringify([{ description: 'Goods shipment', quantity: 1, unitPrice: amount }]),
        paidAt: status === 'paid' ? daysAgo(Math.floor(randomBetween(0, 20))) : null,
        createdAt: daysAgo(Math.floor(randomBetween(10, 90))),
      },
    });
  }

  console.log(`Created 15 invoices`);

  // ── Wallet Transactions ─────────────────────────────────────
  console.log('Creating wallet transactions...');

  const txTypes = ['credit', 'debit', 'deposit', 'withdrawal', 'fee', 'conversion', 'refund'];
  let txCount = 0;

  for (const [key, walletId] of Object.entries(walletIds)) {
    const [bizId, currency] = key.split('-', 2);
    const keyRest = key.substring(bizId.length + 1);
    const walletCurrency = keyRest;
    const numTx = Math.floor(randomBetween(3, 12));

    let balance = randomBetween(100, 50000);
    for (let t = 0; t < numTx; t++) {
      const type = randomFrom(txTypes);
      const amount = randomBetween(10, 5000);
      const balanceBefore = balance;
      const balanceAfter = type === 'credit' || type === 'deposit' || type === 'refund'
        ? balance + amount
        : balance - amount;
      balance = Math.max(0, balanceAfter);

      await prisma.walletTransaction.create({
        data: {
          walletId,
          txRef: `WTX-${String(5000 + txCount).padStart(6, '0')}`,
          type,
          amount,
          balanceBefore,
          balanceAfter: Math.max(0, balanceAfter),
          currency: walletCurrency,
          description: `${type} transaction for wallet`,
          referenceType: randomFrom(['escrow', 'payment_link', 'invoice', 'deposit', 'conversion']),
          status: randomFrom(['completed', 'completed', 'completed', 'pending']),
          createdAt: daysAgo(Math.floor(randomBetween(0, 60))),
        },
      });
      txCount++;
    }
  }

  console.log(`Created ${txCount} wallet transactions`);

  // ── Fraud Alerts ────────────────────────────────────────────
  console.log('Creating fraud alerts...');

  const fraudTypes = ['unusual_amount', 'velocity_breach', 'geo_mismatch', 'sanctioned_entity', 'fake_identity', 'account_takeover', 'structure_pattern'];
  const fraudSeverities = ['low', 'medium', 'medium', 'high', 'critical'];
  const fraudStatuses = ['open', 'investigating', 'confirmed_fraud', 'false_positive', 'resolved'];

  for (let i = 0; i < 12; i++) {
    await prisma.fraudAlert.create({
      data: {
        alertRef: `FA-${String(6000 + i).padStart(6, '0')}`,
        businessId: randomFrom(businessIds),
        relatedType: randomFrom(['escrow', 'payment_intent', 'payment_link', 'wallet']),
        severity: randomFrom(fraudSeverities),
        fraudType: randomFrom(fraudTypes),
        score: Math.floor(randomBetween(10, 95)),
        description: `Detected ${fraudTypes[i % fraudTypes.length].replace(/_/g, ' ')} activity on this account. Automated analysis suggests further review is needed.`,
        recommendation: 'Review transaction history and verify business identity before proceeding.',
        status: randomFrom(fraudStatuses),
        createdAt: daysAgo(Math.floor(randomBetween(0, 30))),
      },
    });
  }

  // ── Fraud Rules ─────────────────────────────────────────────
  console.log('Creating fraud rules...');

  for (const rule of FRAUD_RULES) {
    await prisma.fraudRule.create({
      data: {
        name: rule.name,
        description: rule.description,
        condition: rule.condition,
        action: rule.action,
        severity: rule.severity,
        isActive: true,
        triggerCount: Math.floor(randomBetween(0, 25)),
        lastTriggeredAt: daysAgo(Math.floor(randomBetween(0, 7))),
      },
    });
  }

  // ── Business Matches ────────────────────────────────────────
  console.log('Creating business matches...');

  const matchStatuses = ['suggested', 'contacted', 'interested', 'engaged', 'declined'];
  const matchTypes = ['supplier', 'buyer', 'partner', 'logistics', 'financial'];

  for (let i = 0; i < 20; i++) {
    let seekerIdx = Math.floor(Math.random() * businessIds.length);
    let candidateIdx = Math.floor(Math.random() * businessIds.length);
    if (seekerIdx === candidateIdx) candidateIdx = (candidateIdx + 1) % businessIds.length;

    const matchScore = Math.floor(randomBetween(30, 97));
    const reasons = JSON.stringify([
      'Complementary industry verticals',
      'Geographic proximity',
      'Similar transaction volume range',
      'High trust score alignment',
      'Shared currency preferences',
    ].slice(0, Math.floor(randomBetween(2, 5))));

    await prisma.businessMatch.create({
      data: {
        seekerId: businessIds[seekerIdx],
        candidateId: businessIds[candidateIdx],
        matchType: randomFrom(matchTypes),
        matchScore,
        reasons,
        status: randomFrom(matchStatuses),
        createdAt: daysAgo(Math.floor(randomBetween(1, 60))),
      },
    });
  }

  // ── Collection Cases ────────────────────────────────────────
  console.log('Creating collection cases...');

  const agingBuckets = ['current', '1-30', '31-60', '61-90', '90+'];
  const priorities = ['low', 'normal', 'normal', 'high', 'urgent'];
  const collectionStatuses = ['active', 'active', 'active', 'paused', 'resolved', 'written_off'];

  for (let i = 0; i < 15; i++) {
    const bizIdx = Math.floor(Math.random() * businessIds.length);
    let debtorIdx = Math.floor(Math.random() * businessIds.length);
    if (bizIdx === debtorIdx) debtorIdx = (debtorIdx + 1) % businessIds.length;

    const originalAmount = randomBetween(1000, 100000);
    const outstandingPercent = randomBetween(0.2, 1.0);
    const aging = randomFrom(agingBuckets);

    await prisma.collectionCase.create({
      data: {
        caseRef: `COL-${String(7000 + i).padStart(6, '0')}`,
        businessId: businessIds[bizIdx],
        debtorId: businessIds[debtorIdx],
        originalAmount,
        outstandingAmount: Math.round(originalAmount * outstandingPercent * 100) / 100,
        currency: randomFrom(['USD', 'EUR', 'NGN', 'KES', 'GBP']),
        agingBucket: aging,
        priority: randomFrom(priorities),
        status: randomFrom(collectionStatuses),
        reminderCount: Math.floor(randomBetween(0, 8)),
        lastReminderAt: daysAgo(Math.floor(randomBetween(0, 14))),
        aiStrategy: `Send ${randomFrom(['friendly', 'firm', 'final'])} reminder via ${randomFrom(['email', 'whatsapp', 'sms'])}. Consider ${randomFrom(['payment plan', 'partial settlement', 'escalation'])} if no response in 48h.`,
        createdAt: daysAgo(Math.floor(randomBetween(5, 120))),
      },
    });
  }

  // ── Compliance Rules ────────────────────────────────────────
  console.log('Creating compliance rules...');

  for (const rule of COMPLIANCE_RULES) {
    await prisma.complianceRule.create({
      data: {
        name: rule.name,
        description: rule.description,
        ruleType: rule.ruleType,
        condition: rule.condition,
        action: rule.action,
        severity: rule.severity,
        isActive: true,
        triggeredCount: Math.floor(randomBetween(0, 50)),
      },
    });
  }

  // ── Compliance Screenings ───────────────────────────────────
  console.log('Creating compliance screenings...');

  const screeningTypes = ['sanctions', 'pep', 'adverse_media', 'country_risk'];
  const screeningResults = ['clear', 'clear', 'clear', 'potential_match', 'alert'];
  const riskLevels = ['low', 'low', 'medium', 'medium', 'high', 'critical'];

  for (let i = 0; i < 15; i++) {
    await prisma.complianceScreening.create({
      data: {
        businessId: randomFrom(businessIds),
        screeningType: randomFrom(screeningTypes),
        result: randomFrom(screeningResults),
        riskLevel: randomFrom(riskLevels),
        status: randomFrom(['completed', 'completed', 'pending', 'escalated']),
        createdAt: daysAgo(Math.floor(randomBetween(0, 60))),
      },
    });
  }

  // ── Financial Metrics ───────────────────────────────────────
  console.log('Creating financial metrics...');

  for (let i = 0; i < businessIds.length; i++) {
    if (BUSINESSES[i].status !== 'verified') continue;
    const twin = await prisma.financialDigitalTwin.findUnique({ where: { businessId: businessIds[i] } });
    if (!twin) continue;

    // Create 6 months of metrics
    for (let m = 0; m < 6; m++) {
      const monthDate = new Date(Date.now() - m * 30 * 86400000);
      const monthStr = monthDate.toISOString().slice(0, 10);

      await prisma.financialMetric.create({
        data: {
          twinId: twin.id,
          period: 'monthly',
          periodDate: monthStr,
          revenue: BUSINESSES[i].annualRevenue! / 12 * (0.8 + Math.random() * 0.4),
          expenses: BUSINESSES[i].annualRevenue! / 12 * (0.5 + Math.random() * 0.3),
          netIncome: BUSINESSES[i].annualRevenue! / 12 * (0.1 + Math.random() * 0.2),
          transactionCount: Math.floor(randomBetween(10, 200)),
          paymentSuccessRate: randomBetween(0.75, 0.99),
          customerCount: Math.floor(randomBetween(5, 100)),
        },
      });
    }

    // Create predictions
    for (const predType of ['revenue', 'cash_flow', 'risk']) {
      await prisma.financialPrediction.create({
        data: {
          twinId: twin.id,
          predictionType: predType,
          timeframe: randomFrom(['30d', '60d', '90d', '6m', '1y']),
          predictedValue: BUSINESSES[i].annualRevenue! / 12 * (0.7 + Math.random() * 0.6),
          confidence: randomBetween(0.6, 0.95),
        },
      });
    }
  }

  // ── Deposits ────────────────────────────────────────────────
  console.log('Creating deposits...');

  for (const [key, walletId] of Object.entries(walletIds)) {
    const walletCurrency = key.split('-').pop()!;
    if (Math.random() > 0.6) continue;

    await prisma.deposit.create({
      data: {
        depositRef: `DEP-${String(8000 + Math.floor(Math.random() * 1000)).padStart(6, '0')}`,
        walletId,
        amount: randomBetween(100, 25000),
        currency: walletCurrency,
        paymentMethod: randomFrom(PAYMENT_METHODS),
        provider: randomFrom(PROVIDERS),
        status: randomFrom(['completed', 'completed', 'pending', 'failed']),
        completedAt: daysAgo(Math.floor(randomBetween(0, 30))),
        createdAt: daysAgo(Math.floor(randomBetween(1, 60))),
      },
    });
  }

  console.log('=== Seeding Complete ===');
  console.log(`Tenant: ${tenant.id}`);
  console.log(`Admin email: admin@youngsend.demo`);
  console.log(`Admin password: demo1234`);
  console.log(`Businesses: ${businessIds.length}`);
  console.log(`Escrow Transactions: ${escrowCount}`);
  console.log(`Payment Intents: ${paymentIntents}`);
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
