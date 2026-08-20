import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

// Sample tenant data representing different DCP types
const tenants = [
  {
    name: 'Abepot Credit',
    slug: 'abepot',
    companyName: 'Abepot Credit Limited',
    licenseNumber: 'DCP-2024-0142',
    phone: '+254700123456',
    email: 'admin@abepot.co.ke',
    physicalAddress: 'Moi Avenue, Nairobi',
    website: null,
    status: 'ACTIVE' as const,
    plan: 'STARTER' as const,
    licenseDate: new Date('2024-03-15'),
    monthlyFee: 5000,
    transactionRate: 1.5
  },
  {
    name: 'Fabilo Credit',
    slug: 'fabilo',
    companyName: 'Fabilo Financial Services Ltd',
    licenseNumber: 'DCP-2023-0089',
    phone: '+254711234567',
    email: 'info@fabilo.com',
    physicalAddress: 'Eldoret Town, Uasin Gishu',
    website: 'https://www.fabilo.com',
    status: 'ACTIVE' as const,
    plan: 'PROFESSIONAL' as const,
    licenseDate: new Date('2023-11-20'),
    monthlyFee: 15000,
    transactionRate: 1.0
  },
  {
    name: 'Signature Capital',
    slug: 'signaturecapital',
    companyName: 'Signature Capital Kenya Ltd',
    licenseNumber: 'DCP-2021-0001',
    phone: '+254722345678',
    email: 'operations@signaturecapital.co.ke',
    physicalAddress: 'Westlands, Nairobi',
    website: 'https://www.signaturecapital.co.ke',
    status: 'ACTIVE' as const,
    plan: 'ENTERPRISE' as const,
    licenseDate: new Date('2021-06-10'),
    monthlyFee: 50000,
    transactionRate: 0.5
  },
  {
    name: 'Karibu Credit',
    slug: 'karibucredit',
    companyName: 'Karibu Credit Solutions Ltd',
    licenseNumber: 'DCP-2026-0025',
    phone: '+254733456789',
    email: 'hello@karibucredit.co.ke',
    physicalAddress: 'Kisumu City, Kisumu County',
    website: 'https://www.karibucredit.co.ke',
    status: 'TRIAL' as const,
    plan: 'STARTER' as const,
    licenseDate: null,
    monthlyFee: 0,
    transactionRate: 1.5
  },
  {
    name: 'ED Partners Africa',
    slug: 'edpartners',
    companyName: 'ED Partners Africa Limited',
    licenseNumber: 'DCP-2022-0056',
    phone: '+254744567890',
    email: 'contact@edpartners.africa',
    physicalAddress: 'Ngong Road, Nairobi',
    website: 'https://www.edpartners.africa',
    status: 'ACTIVE' as const,
    plan: 'ENTERPRISE' as const,
    licenseDate: new Date('2022-02-28'),
    monthlyFee: 50000,
    transactionRate: 0.5
  }
]

// Sample user roles for each tenant
const userRoles = [
  { role: 'TENANT_ADMIN', count: 1 },
  { role: 'MANAGER', count: 2 },
  { role: 'STAFF', count: 3 },
  { role: 'AGENT', count: 2 }
]

// Loan product templates
function generateProducts(tenantId: string) {
  // Generate unique suffix from tenant ID to ensure uniqueness
  const suffix = tenantId.slice(-6).toUpperCase()
  return [
    {
      tenantId,
      name: 'Personal Loan',
      description: 'Flexible personal loan for various needs including emergency expenses, school fees, and personal projects.',
      productCode: `PL-${suffix}-001`,
      category: 'PERSONAL_LOAN',
      minAmount: 5000,
      maxAmount: 200000,
      defaultAmount: 50000,
      interestType: 'FLAT_RATE' as const,
      interestRate: 15,
      processingFee: 300,
      processingFeeType: 'FIXED' as const,
      insuranceFee: 1,
      insuranceFeeType: 'PERCENTAGE' as const,
      minTermDays: 30,
      maxTermDays: 180,
      defaultTermDays: 90,
      repaymentFrequency: 'MONTHLY' as const,
      gracePeriodDays: 5,
      isActive: true
    },
    {
      tenantId,
      name: 'Business Loan',
      description: 'Working capital and business expansion loans for SMEs and entrepreneurs.',
      productCode: `BL-${suffix}-001`,
      category: 'BUSINESS_LOAN',
      minAmount: 10000,
      maxAmount: 500000,
      defaultAmount: 100000,
      interestType: 'FLAT_RATE' as const,
      interestRate: 12,
      processingFee: 500,
      processingFeeType: 'FIXED' as const,
      insuranceFee: 0.5,
      insuranceFeeType: 'PERCENTAGE' as const,
      minTermDays: 60,
      maxTermDays: 365,
      defaultTermDays: 180,
      repaymentFrequency: 'MONTHLY' as const,
      gracePeriodDays: 15,
      isActive: true
    },
    {
      tenantId,
      name: 'Salary Advance',
      description: 'Short-term advance against your salary with quick disbursement.',
      productCode: `SA-${suffix}-001`,
      category: 'SALARY_ADVANCE',
      minAmount: 1000,
      maxAmount: 50000,
      defaultAmount: 15000,
      interestType: 'FLAT_RATE' as const,
      interestRate: 18,
      processingFee: 100,
      processingFeeType: 'FIXED' as const,
      insuranceFee: 0,
      insuranceFeeType: 'PERCENTAGE' as const,
      minTermDays: 7,
      maxTermDays: 30,
      defaultTermDays: 30,
      repaymentFrequency: 'BULLET' as const,
      gracePeriodDays: 0,
      isActive: true
    }
  ]
}

// Generate random Kenyan names
function generateKenyanName() {
  const firstNames = ['John', 'Mary', 'Peter', 'Grace', 'James', 'Faith', 'Daniel', 'Sarah', 'Michael', 'Esther', 
                       'Joseph', 'Ruth', 'David', 'Naomi', 'Samuel', 'Hannah', 'Benjamin', 'Rebecca', 'Andrew', 'Rachel']
  const lastNames = ['Kamau', 'Wanjiku', 'Ochieng', 'Atieno', 'Mwangi', 'Nyokabi', 'Kipchoge', 'Muthoni', 
                      'Odhiambo', 'Akinyi', 'Mutua', 'Wambui', 'Korir', 'Chebet', 'Maina', 'Njeri', 
                      'Njoroge', 'Waithera', 'Kimani', 'Ndirangu']
  
  return {
    firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
    lastName: lastNames[Math.floor(Math.random() * lastNames.length)]
  }
}

// Generate Kenyan phone number
function generateKenyanPhone(): string {
  const prefixes = ['712', '722', '733', '744', '755', '766', '777', '788', '791', '702', '710', '720', '734', '745', '756', '767', '778', '789', '790', '701']
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const suffix = Math.floor(Math.random() * 900000 + 100000)
  return `254${prefix}${suffix}`
}

// Generate customers for a tenant
async function generateCustomers(tenantId: string, count: number) {
  const customers = []
  
  for (let i = 0; i < count; i++) {
    const name = generateKenyanName()
    const employmentStatuses = ['EMPLOYED', 'SELF_EMPLOYED', 'BUSINESS_OWNER', 'CONTRACTOR'] as const
    const counties = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Kiambu', 'Machakos', 'Kajiado', 'Uasin Gishu']
    
    customers.push({
      tenantId,
      firstName: name.firstName,
      lastName: name.lastName,
      email: `${name.firstName.toLowerCase()}.${name.lastName.toLowerCase()}${Math.floor(Math.random() * 100)}@gmail.com`,
      phone: `0${generateKenyanPhone().slice(-9)}`,
      alternativePhone: Math.random() > 0.5 ? `0${generateKenyanPhone().slice(-9)}` : null,
      dateOfBirth: new Date(Date.now() - (Math.random() * 30 + 22) * 365.25 * 24 * 60 * 60 * 1000),
      gender: Math.random() > 0.5 ? ('MALE' as const) : ('FEMALE' as const),
      nationalId: String(Math.floor(Math.random() * 90000000) + 10000000),
      kraPin: Math.random() > 0.3 ? `A${Math.random().toString(36).substring(2, 8).toUpperCase()}Z` : null,
      employmentStatus: employmentStatuses[Math.floor(Math.random() * employmentStatuses.length)],
      employerName: Math.random() > 0.3 ? `${name.lastName} ${['Enterprises', 'Services', 'Ltd', 'Group', 'Solutions'][Math.floor(Math.random() * 5)]}` : null,
      incomeAmount: Math.floor(Math.random() * 150000) + 15000,
      incomeFrequency: 'MONTHLY' as const,
      businessName: Math.random() > 0.6 ? `${name.firstName}'s Shop` : null,
      county: counties[Math.floor(Math.random() * counties.length)],
      city: 'Nairobi',
      bankName: Math.random() > 0.4 ? ['Equity Bank', 'KCB', 'Cooperative Bank', 'NCBA', 'Stanbic', 'Absa'][Math.floor(Math.random() * 6)] : null,
      bankAccount: Math.random() > 0.4 ? String(Math.floor(Math.random() * 9000000000) + 1000000000) : null,
      mpesaPhone: `0${generateKenyanPhone().slice(-9)}`,
      creditScore: Math.floor(Math.random() * 40) + 60,
      crbStatus: Math.random() > 0.85 ? ('LISTED' as const) : ('CLEAN' as const),
      status: Math.random() > 0.95 ? ('BLACKLISTED' as const) : ('ACTIVE' as const),
      riskLevel: Math.random() > 0.7 ? ('HIGH' as const) : Math.random() > 0.4 ? ('MEDIUM' as const) : ('LOW' as const),
      source: ['WALK_IN', 'MOBILE_APP', 'WEB_PORTAL', 'REFERRAL'][Math.floor(Math.random() * 4)] as const
    })
  }

  return await prisma.customer.createMany({
    data: customers
  })
}

// Generate loan applications
async function generateApplications(tenantId: string, customerIds: string[], productIds: string[], count: number) {
  const statuses = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'CONDITIONALLY_APPROVED', 'REJECTED', 'DISBURSED', 'CANCELLED'] as const
  const purposes = ['Emergency expense', 'School fees payment', 'Business working capital', 'Home renovation', 
                    'Medical bills', 'Vehicle purchase', 'Inventory purchase', 'Rent payment', 'Travel expenses', 'Wedding costs']

  const applications = []

  for (let i = 0; i < count; i++) {
    const customerId = customerIds[Math.floor(Math.random() * customerIds.length)]
    const productId = productIds[Math.floor(Math.random() * productIds.length)]
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    
    // Get product to determine amount range
    const product = await prisma.loanProduct.findUnique({ where: { id: productId } })
    if (!product) continue

    const amount = Math.floor(Math.random() * (product.maxAmount - product.minAmount)) + product.minAmount
    
    applications.push({
      tenantId,
      customerId,
      productId,
      requestedAmount: amount,
      approvedAmount: status === 'APPROVED' || status === 'DISBURSED' || status === 'CONDITIONALLY_APPROVED' 
        ? Math.floor(amount * (0.7 + Math.random() * 0.3)) 
        : null,
      termDays: [30, 60, 90, 120, 180][Math.floor(Math.random() * 5)],
      purpose: purposes[Math.floor(Math.random() * purposes.length)],
      status,
      submittedAt: status !== 'DRAFT' ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
      reviewedAt: ['APPROVED', 'REJECTED', 'CONDITIONALLY_APPROVED', 'DISBURSED'].includes(status) 
        ? new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000) 
        : null,
      approvedAt: ['APPROVED', 'DISBURSED'].includes(status) 
        ? new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000) 
        : null,
      rejectedAt: status === 'REJECTED' 
        ? new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000) 
        : null,
      disbursedAt: status === 'DISBURSED' 
        ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000) 
        : null,
      creditScore: Math.floor(Math.random() * 40) + 60,
      riskRating: Math.random() > 0.7 ? 'VERY_HIGH' : Math.random() > 0.5 ? 'HIGH' : Math.random() > 0.3 ? 'MEDIUM' : 'LOW'
    })
  }

  return await prisma.loanApplication.createMany({
    data: applications
  })
}

// Generate active loans from approved/disbursed applications
async function generateLoans(tenantId: string, customerIds: string[], productIds: string[]) {
  // Get disbursed applications that don't have loans yet
  const disbursedApps = await prisma.loanApplication.findMany({
    where: {
      tenantId,
      status: 'DISBURSED',
      loan: null
    },
    take: 50
  })

  const loanStatuses = ['ACTIVE', 'IN_ARREARS', 'DEFAULTED', 'FULLY_PAID', 'PENDING_DISBURSEMENT'] as const
  const arrearsStatuses = ['CURRENT', 'DAYS_1_7', 'DAYS_8_30', 'DAYS_31_60', 'DAYS_61_90', 'DAYS_91_PLUS'] as const

  const loans = []
  
  // Get global loan count for unique numbering
  let globalLoanCount = await prisma.loan.count()

  for (const app of disbursedApps) {
    const status = loanStatuses[Math.floor(Math.random() * loanStatuses.length)]
    const principal = app.approvedAmount || app.requestedAmount
    const months = Math.ceil(app.termDays / 30)
    const totalInterest = principal * 0.15 * months
    const totalRepayable = principal + totalInterest

    const daysInArrears = status === 'ACTIVE' ? 0 : Math.floor(Math.random() * 90)

    globalLoanCount++
    
    loans.push({
      tenantId,
      customerId: app.customerId,
      applicationId: app.id,
      productId: app.productId,
      loanNumber: `LN-${new Date().getFullYear()}-${String(globalLoanCount).padStart(6, '0')}`,
      principal,
      approvedAmount: principal,
      interestRate: 15,
      interestType: 'FLAT_RATE' as const,
      processingFee: 300,
      insuranceFee: principal * 0.01,
      otherFees: 0,
      totalInterest,
      totalFees: 330,
      totalRepayable,
      termDays: app.termDays,
      disbursementDate: app.disbursedAt || new Date(),
      maturityDate: new Date((app.disbursedAt || new Date()).getTime() + app.termDays * 24 * 60 * 60 * 1000),
      repaidPrincipal: status === 'FULLY_PAID' ? principal : status === 'ACTIVE' ? Math.floor(principal * Math.random() * 0.5) : 0,
      repaidInterest: status === 'FULLY_PAID' ? totalInterest : status === 'ACTIVE' ? Math.floor(totalInterest * Math.random() * 0.5) : 0,
      repaidFees: status === 'FULLY_PAID' ? 330 : 0,
      totalRepaid: status === 'FULLY_PAID' ? totalRepayable : 0,
      outstandingBalance: status === 'FULLY_PAID' ? 0 : totalRepayable - (status === 'ACTIVE' ? Math.floor(totalRepayable * Math.random() * 0.5) : 0),
      nextPaymentDue: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      daysInArrears,
      status,
      arrearsStatus: daysInArrears <= 0 ? 'CURRENT' : 
                     daysInArrears <= 7 ? 'DAYS_1_7' :
                     daysInArrears <= 30 ? 'DAYS_8_30' :
                     daysInArrears <= 60 ? 'DAYS_31_60' :
                     daysInArrears <= 90 ? 'DAYS_61_90' : 'DAYS_91_PLUS',
      disbursementMethod: 'MPESA' as const,
      disbursementReference: `MPESA${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
      disbursementAccount: `0${generateKenyanPhone().slice(-9)}`,
      repaymentSchedule: JSON.stringify(generateSchedule(principal, 15, app.termDays))
    })
  }

  if (loans.length > 0) {
    return await prisma.loan.createMany({
      data: loans
    })
  }

  return { count: 0 }
}

// Generate repayment schedule
function generateSchedule(principal: number, rate: number, days: number): Array<object> {
  const schedule = []
  const installments = Math.max(1, Math.ceil(days / 30))
  const perInstallment = principal / installments
  const interestPerInstallment = (principal * rate / 100) / installments

  for (let i = 1; i <= installments; i++) {
    schedule.push({
      installmentNo: i,
      dueDate: new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      principal: Math.round(perInstallment),
      interest: Math.round(interestPerInstallment),
      fees: i === 1 ? 110 : 0,
      total: Math.round(perInstallment + interestPerInstallment + (i === 1 ? 110 : 0)),
      status: i === 1 ? 'PENDING' : 'SCHEDULED'
    })
  }

  return schedule
}

// Generate repayments
async function generateRepayments(tenantId: string) {
  const activeLoans = await prisma.loan.findMany({
    where: {
      tenantId,
      status: { in: ['ACTIVE', 'FULLY_PAID'] },
      repaidPrincipal: { gt: 0 }
    },
    take: 100
  })

  const repayments = []

  for (const loan of activeLoans) {
    const numPayments = Math.floor(Math.random() * 3) + 1
    const remainingToPay = loan.totalRepaid

    for (let i = 0; i < numPayments && remainingToPay > 0; i++) {
      const amount = Math.min(
        Math.round(remainingToPay / (numPayments - i)),
        remainingToPay
      )

      repayments.push({
        tenantId,
        loanId: loan.id,
        customerId: loan.customerId,
        amount,
        principalPortion: Math.round(amount * 0.85),
        interestPortion: Math.round(amount * 0.13),
        feePortion: Math.round(amount * 0.02),
        paymentMethod: 'MPESA' as const,
        referenceNumber: `MPESA${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
        paidBy: null,
        paymentDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() - Math.random() * 35 * 24 * 60 * 60 * 1000),
        status: 'COMPLETED' as const
      })
    }
  }

  if (repayments.length > 0) {
    return await prisma.repayment.createMany({
      data: repayments
    })
  }

  return { count: 0 }
}

// Main seed function
async function main() {
  console.log('🌱 Starting Digital Lending OS database seeding...\n')

  try {
    // Clean existing data (optional - comment out to preserve data)
    console.log('🗑️  Cleaning existing data...')
    await prisma.repayment.deleteMany()
    await prisma.transaction.deleteMany()
    await prisma.loan.deleteMany()
    await prisma.loanApplication.deleteMany()
    await prisma.kycDocument.deleteMany()
    await prisma.notification.deleteMany()
    await prisma.loanProduct.deleteMany()
    await prisma.customer.deleteMany()
    await prisma.user.deleteMany()
    await prisma.auditLog.deleteMany()
    await prisma.tenant.deleteMany()
    console.log('✅ Cleaned existing data\n')

    // Create tenants
    console.log('🏢 Creating tenants...')
    const createdTenants = []
    for (const tenant of tenants) {
      const created = await prisma.tenant.create({ data: tenant })
      createdTenants.push(created)
      console.log(`   ✓ Created: ${created.name} (${created.slug})`)
    }
    console.log(`\n✅ Created ${createdTenants.length} tenants\n`)

    // Create users for each tenant
    console.log('👥 Creating users...')
    let totalUsers = 0
    for (const tenant of createdTenants) {
      for (const userRole of userRoles) {
        for (let i = 0; i < userRole.count; i++) {
          const name = generateKenyanName()
          await prisma.user.create({
            data: {
              tenantId: tenant.id,
              email: `${name.firstName.toLowerCase()}.${userRole.role.toLowerCase()}${i}@${tenant.slug}.co.ke`,
              passwordHash: '$2b$10$placeholder_hash_for_demo',
              name: `${name.firstName} ${name.lastName}`,
              role: userRole.role,
              phone: `0${generateKenyanPhone().slice(-9)}`,
              isActive: true
            }
          })
          totalUsers++
        }
      }
    }
    console.log(`   ✓ Created ${totalUsers} users across all tenants\n`)

    // Create products for each tenant
    console.log('📦 Creating loan products...')
    let totalProducts = 0
    for (const tenant of createdTenants) {
      const products = generateProducts(tenant.id)
      for (const product of products) {
        await prisma.loanProduct.create({ data: product })
        totalProducts++
      }
      console.log(`   ✓ Created 3 products for ${tenant.name}`)
    }
    console.log(`\n✅ Created ${totalProducts} products\n`)

    // Create customers for each tenant
    console.log('👤 Creating customers...')
    let totalCustomers = 0
    for (const tenant of createdTenants) {
      const customerCount = Math.floor(Math.random() * 8) + 10 // 10-17 customers per tenant
      await generateCustomers(tenant.id, customerCount)
      totalCustomers += customerCount
      console.log(`   ✓ Created ~${customerCount} customers for ${tenant.name}`)
    }
    console.log(`\n✅ Created approximately ${totalCustomers} customers\n`)

    // Create loan applications
    console.log('📝 Creating loan applications...')
    let totalApplications = 0
    for (const tenant of createdTenants) {
      const customers = await prisma.customer.findMany({
        where: { tenantId: tenant.id },
        select: { id: true }
      })
      const products = await prisma.loanProduct.findMany({
        where: { tenantId: tenant.id },
        select: { id: true }
      })

      const appCount = Math.floor(Math.random() * 15) + 10 // 10-25 applications per tenant
      await generateApplications(
        tenant.id,
        customers.map(c => c.id),
        products.map(p => p.id),
        appCount
      )
      totalApplications += appCount
      console.log(`   ✓ Created ~${appCount} applications for ${tenant.name}`)
    }
    console.log(`\n✅ Created approximately ${totalApplications} applications\n`)

    // Create loans
    console.log('💰 Creating loans...')
    for (const tenant of createdTenants) {
      const customers = await prisma.customer.findMany({
        where: { tenantId: tenant.id },
        select: { id: true }
      })
      const products = await prisma.loanProduct.findMany({
        where: { tenantId: tenant.id },
        select: { id: true }
      })

      const result = await generateLoans(tenant.id, customers.map(c => c.id), products.map(p => p.id))
      console.log(`   ✓ Created ${result.count} loans for ${tenant.name}`)
    }
    console.log('\n✅ Loans created\n')

    // Create repayments
    console.log('💳 Creating repayments...')
    for (const tenant of createdTenants) {
      const result = await generateRepayments(tenant.id)
      console.log(`   ✓ Created ${result.count} repayments for ${tenant.name}`)
    }
    console.log('\n✅ Repayments created\n')

    // Print summary
    console.log('=' .repeat(50))
    console.log('🎉 SEEDING COMPLETE!')
    console.log('=' .repeat(50))
    console.log('\nSummary:')
    console.log(`   • Tenants: ${createdTenants.length}`)
    console.log(`   • Users: ${totalUsers}`)
    console.log(`   • Products: ${totalProducts}`)
    console.log(`   • Customers: ~${totalCustomers}`)
    console.log(`   • Applications: ~${totalApplications}`)

    const finalLoanCount = await prisma.loan.count()
    const finalRepaymentCount = await prisma.repayment.count()
    console.log(`   • Loans: ${finalLoanCount}`)
    console.log(`   • Repayments: ${finalRepaymentCount}`)
    console.log('\n✨ Database is now ready for use!\n')

  } catch (error) {
    console.error('❌ Error during seeding:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
