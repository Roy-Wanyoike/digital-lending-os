import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  console.log('Seeding Youngsend auth data...')

  const passwordHash = await bcrypt.hash('Demo1234!', 12)

  // Create default tenant
  const tenant = await db.tenant.upsert({
    where: { slug: 'youngsend-demo' },
    update: {},
    create: {
      name: 'Youngsend Demo',
      slug: 'youngsend-demo',
      plan: 'enterprise',
      ownerEmail: 'youngsharktechnologies@gmail.com',
      ownerName: 'Young Shark',
      features: JSON.stringify({ escrow: true, wallet: true, paymentLinks: true, fraud: true, compliance: true }),
      maxBusinesses: 100,
      maxUsers: 50,
    },
  })
  console.log(`Tenant: ${tenant.name} (${tenant.id})`)

  // Create default business
  const business = await db.business.upsert({
    where: { id: (await db.business.findFirst({ where: { tenantId: tenant.id } }))?.id || '__none__' },
    update: {},
    create: {
      name: 'Young Shark Technologies',
      country: 'KE',
      city: 'Nairobi',
      industry: 'Fintech',
      website: 'https://youngsend.space-z.ai',
      description: 'Building the Financial Operating System for Global Commerce',
      employeeCount: 15,
      annualRevenue: 500000,
      status: 'verified',
      verifiedAt: new Date(),
      tenantId: tenant.id,
      passport: { create: { passportHash: 'demo-passport-hash' } },
      trustScore: { create: {} },
    },
  })
  console.log(`Business: ${business.name} (${business.id})`)

  // Create admin account
  const account = await db.account.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'youngsharktechnologies@gmail.com' } },
    update: { passwordHash },
    create: {
      email: 'youngsharktechnologies@gmail.com',
      passwordHash,
      name: 'Young Shark',
      role: 'admin',
      tenantId: tenant.id,
      businessId: business.id,
    },
  })
  console.log(`Account: ${account.email} (${account.id})`)

  // Create second business for escrow demo
  const sellerBusiness = await db.business.create({
    data: {
      name: 'Global Parts Ltd',
      country: 'NG',
      city: 'Lagos',
      industry: 'Manufacturing',
      tenantId: tenant.id,
      passport: { create: { passportHash: 'seller-passport-hash' } },
      trustScore: { create: {} },
    },
  })
  console.log(`Seller Business: ${sellerBusiness.name} (${sellerBusiness.id})`)

  // Create wallets
  const usdWallet = await db.wallet.upsert({
    where: { businessId_currency: { businessId: business.id, currency: 'USD' } },
    update: {},
    create: {
      businessId: business.id,
      currency: 'USD',
      balance: 50000,
      availableBalance: 45000,
      pendingBalance: 3000,
      frozenBalance: 2000,
      isDefault: true,
    },
  })
  console.log(`USD Wallet: ${usdWallet.balance}`)

  const kesWallet = await db.wallet.upsert({
    where: { businessId_currency: { businessId: business.id, currency: 'KES' } },
    update: {},
    create: {
      businessId: business.id,
      currency: 'KES',
      balance: 5000000,
      availableBalance: 4500000,
      pendingBalance: 300000,
      frozenBalance: 200000,
    },
  })
  console.log(`KES Wallet: ${kesWallet.balance}`)

  // Create a sample escrow transaction
  const escrow = await db.escrowTransaction.create({
    data: {
      txRef: `ESC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-00001`,
      buyerId: business.id,
      sellerId: sellerBusiness.id,
      amount: 15000,
      currency: 'USD',
      description: 'Bulk order of industrial parts',
      status: 'in_escrow',
      fundedAmount: 15000,
      aiRiskScore: 25,
      aiRiskLevel: 'low',
      totalMilestones: 2,
      currentMilestone: 1,
      milestones: {
        create: [
          { sequence: 1, title: 'Initial Delivery', amount: 7500, status: 'released' },
          { sequence: 2, title: 'Final Delivery', amount: 7500, status: 'pending' },
        ],
      },
      auditLog: {
        create: [
          { action: 'created', actor: account.id, details: 'Escrow created' },
          { action: 'funded', actor: account.id, details: 'Funded via wallet' },
          { action: 'activated', actor: account.id, details: 'Moved to in_escrow' },
          { action: 'milestone_released', actor: account.id, details: 'Milestone 1 released' },
        ],
      },
    },
    include: { buyer: true, seller: true, milestones: true },
  })
  console.log(`Escrow: ${escrow.txRef}`)

  // Create a payment link
  const paymentLink = await db.paymentLink.create({
    data: {
      linkRef: 'YS-DEMO-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      businessId: business.id,
      title: 'Invoice #INV-2024-001',
      description: 'Payment for consulting services',
      amount: 2500,
      currency: 'USD',
      status: 'active',
      maxPayments: 1,
    },
  })
  console.log(`Payment Link: ${paymentLink.linkRef}`)

  // Create wallet transactions
  await db.walletTransaction.createMany({
    data: [
      { walletId: usdWallet.id, txRef: 'WT-001', type: 'credit', amount: 50000, balanceBefore: 0, balanceAfter: 50000, currency: 'USD', description: 'Initial deposit', referenceType: 'deposit', status: 'completed' },
      { walletId: usdWallet.id, txRef: 'WT-002', type: 'debit', amount: 15000, balanceBefore: 50000, balanceAfter: 35000, currency: 'USD', description: 'Escrow funding: ' + escrow.txRef, referenceType: 'escrow', referenceId: escrow.id, status: 'completed' },
      { walletId: usdWallet.id, txRef: 'WT-003', type: 'credit', amount: 10000, balanceBefore: 35000, balanceAfter: 45000, currency: 'USD', description: 'Payment received', referenceType: 'payment_link', status: 'completed' },
      { walletId: usdWallet.id, txRef: 'WT-004', type: 'fee', amount: 150, balanceBefore: 45000, balanceAfter: 44850, currency: 'USD', description: 'Processing fee', referenceType: 'fee', status: 'completed' },
      { walletId: kesWallet.id, txRef: 'WT-005', type: 'credit', amount: 5000000, balanceBefore: 0, balanceAfter: 5000000, currency: 'KES', description: 'Initial deposit', referenceType: 'deposit', status: 'completed' },
    ],
  })

  console.log('\n=== Seed Complete ===')
  console.log('Login: youngsharktechnologies@gmail.com')
  console.log('Password: Demo1234!')
  console.log('====================')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
