import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

// Sample tenant data representing different DCP types
const tenants = [
  // Original 5 tenants
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
  },

  // ===== NEW TIER 4 PROSPECTS (20 additional tenants) =====

  // STARTER Plan Tenants
  {
    name: 'Amaze Credit Limited',
    slug: 'amaze',
    companyName: 'Amaze Credit Limited',
    licenseNumber: 'DCP-2025-0089',
    phone: '+254701234567',
    email: 'info@amaze.co.ke',
    physicalAddress: 'Mombasa Road, Nairobi',
    website: null,
    status: 'ACTIVE' as const,
    plan: 'STARTER' as const,
    licenseDate: new Date('2025-01-20'),
    monthlyFee: 5000,
    transactionRate: 1.5
  },
  {
    name: 'Baecot Credit Ltd',
    slug: 'baecot',
    companyName: 'Baecot Credit Limited',
    licenseNumber: 'DCP-2025-0102',
    phone: '+254712345678',
    email: 'admin@baecot.co.ke',
    physicalAddress: 'Nakuru Town, Nakuru County',
    website: null,
    status: 'ACTIVE' as const,
    plan: 'STARTER' as const,
    licenseDate: new Date('2025-03-10'),
    monthlyFee: 5000,
    transactionRate: 1.5
  },
  {
    name: 'Bluewave Cash Limited',
    slug: 'bluewave',
    companyName: 'Bluewave Cash Limited',
    licenseNumber: 'DCP-2024-0188',
    phone: '+254723456789',
    email: 'hello@bluewave.co.ke',
    physicalAddress: 'Kisumu City, Kisumu County',
    website: null,
    status: 'ACTIVE' as const,
    plan: 'STARTER' as const,
    licenseDate: new Date('2024-08-05'),
    monthlyFee: 5000,
    transactionRate: 1.5
  },
  {
    name: 'Dahawi Credit Limited',
    slug: 'dahawi',
    companyName: 'Dahawi Credit Limited',
    licenseNumber: 'DCP-2025-0115',
    phone: '+254734567890',
    email: 'contact@dahawi.co.ke',
    physicalAddress: 'Eldoret Town, Uasin Gishu',
    website: null,
    status: 'ACTIVE' as const,
    plan: 'STARTER' as const,
    licenseDate: new Date('2025-04-12'),
    monthlyFee: 5000,
    transactionRate: 1.5
  },
  {
    name: 'Eversure Credit Limited',
    slug: 'eversure',
    companyName: 'Eversure Credit Limited',
    licenseNumber: 'DCP-2024-0199',
    phone: '+254745678901',
    email: 'support@eversure.co.ke',
    physicalAddress: 'Nyeri Town, Nyeri County',
    website: null,
    status: 'ACTIVE' as const,
    plan: 'STARTER' as const,
    licenseDate: new Date('2024-09-18'),
    monthlyFee: 5000,
    transactionRate: 1.5
  },
  {
    name: 'Finseil Limited',
    slug: 'finseil',
    companyName: 'Finseil Limited',
    licenseNumber: 'DCP-2025-0133',
    phone: '+254756789012',
    email: 'info@finseil.co.ke',
    physicalAddress: 'Machakos Town, Machakos County',
    website: null,
    status: 'ACTIVE' as const,
    plan: 'STARTER' as const,
    licenseDate: new Date('2025-05-22'),
    monthlyFee: 5000,
    transactionRate: 1.5
  },
  {
    name: 'Iboda Credit',
    slug: 'iboda',
    companyName: 'Iboda Credit Limited',
    licenseNumber: 'DCP-2024-0211',
    phone: '+254767890123',
    email: 'admin@iboda.co.ke',
    physicalAddress: 'Thika Town, Kiambu County',
    website: null,
    status: 'ACTIVE' as const,
    plan: 'STARTER' as const,
    licenseDate: new Date('2024-10-30'),
    monthlyFee: 5000,
    transactionRate: 1.5
  },
  {
    name: 'Maison Capital',
    slug: 'maison',
    companyName: 'Maison Capital Limited',
    licenseNumber: 'DCP-2025-0144',
    phone: '+254778901234',
    email: 'hello@maison.co.ke',
    physicalAddress: 'Malindi, Kilifi County',
    website: null,
    status: 'ACTIVE' as const,
    plan: 'STARTER' as const,
    licenseDate: new Date('2025-06-15'),
    monthlyFee: 5000,
    transactionRate: 1.5
  },
  {
    name: 'Malicash Investment',
    slug: 'malicash',
    companyName: 'Malicash Investment Limited',
    licenseNumber: 'DCP-2024-0225',
    phone: '+254789012345',
    email: 'info@malicash.co.ke',
    physicalAddress: 'Naivasha, Nakuru County',
    website: null,
    status: 'ACTIVE' as const,
    plan: 'STARTER' as const,
    licenseDate: new Date('2024-11-08'),
    monthlyFee: 5000,
    transactionRate: 1.5
  },
  {
    name: 'Mimi Credit Limited',
    slug: 'mimicredit',
    companyName: 'Mimi Credit Limited',
    licenseNumber: 'DCP-2025-0167',
    phone: '+254790123456',
    email: 'support@mimicredit.co.ke',
    physicalAddress: 'Meru Town, Meru County',
    website: null,
    status: 'ACTIVE' as const,
    plan: 'STARTER' as const,
    licenseDate: new Date('2025-07-01'),
    monthlyFee: 5000,
    transactionRate: 1.5
  },
  {
    name: 'NJB Limited',
    slug: 'njb',
    companyName: 'NJB Limited',
    licenseNumber: 'DCP-2024-0244',
    phone: '+254702345678',
    email: 'admin@njb.co.ke',
    physicalAddress: 'Garissa Town, Garissa County',
    website: null,
    status: 'ACTIVE' as const,
    plan: 'STARTER' as const,
    licenseDate: new Date('2024-12-14'),
    monthlyFee: 5000,
    transactionRate: 1.5
  },

  // TRIAL Plan Tenants
  {
    name: 'Becalob Credit Limited',
    slug: 'becalob',
    companyName: 'Becalob Credit Limited',
    licenseNumber: 'DCP-2026-0045',
    phone: '+254713456789',
    email: 'info@becalob.co.ke',
    physicalAddress: 'Kitale, Trans Nzoia County',
    website: null,
    status: 'TRIAL' as const,
    plan: 'STARTER' as const,
    licenseDate: null,
    monthlyFee: 0,
    transactionRate: 1.5
  },
  {
    name: 'Equal Reach Limited',
    slug: 'equalreach',
    companyName: 'Equal Reach Limited',
    licenseNumber: 'DCP-2026-0056',
    phone: '+254724567890',
    email: 'hello@equalreach.co.ke',
    physicalAddress: 'Kakamega Town, Kakamega County',
    website: null,
    status: 'TRIAL' as const,
    plan: 'STARTER' as const,
    licenseDate: null,
    monthlyFee: 0,
    transactionRate: 1.5
  },
  {
    name: 'Kechita Credit',
    slug: 'kechita',
    companyName: 'Kechita Credit Limited',
    licenseNumber: 'DCP-2026-0078',
    phone: '+254735678901',
    email: 'contact@kechita.co.ke',
    physicalAddress: 'Nanyuki, Laikipia County',
    website: null,
    status: 'TRIAL' as const,
    plan: 'STARTER' as const,
    licenseDate: null,
    monthlyFee: 0,
    transactionRate: 1.5
  },
  {
    name: 'Mkulimapay Credit',
    slug: 'mkulimapay',
    companyName: 'Mkulimapay Credit Limited',
    licenseNumber: 'DCP-2026-0089',
    phone: '+254746789012',
    email: 'admin@mkulimapay.co.ke',
    physicalAddress: 'Embu Town, Embu County',
    website: null,
    status: 'TRIAL' as const,
    plan: 'STARTER' as const,
    licenseDate: null,
    monthlyFee: 0,
    transactionRate: 1.5
  },

  // PROFESSIONAL Plan Tenants
  {
    name: 'Centenary Micro Enterprise Services',
    slug: 'centenary',
    companyName: 'Centenary Micro Enterprise Services Limited',
    licenseNumber: 'DCP-2023-0134',
    phone: '+254757890123',
    email: 'info@centenary.co.ke',
    physicalAddress: 'Wundanyi, Taita Taveta County',
    website: null,
    status: 'ACTIVE' as const,
    plan: 'PROFESSIONAL' as const,
    licenseDate: new Date('2023-06-25'),
    monthlyFee: 15000,
    transactionRate: 1.0
  },
  {
    name: 'Hawkins Capital',
    slug: 'hawkins',
    companyName: 'Hawkins Capital Limited',
    licenseNumber: 'DCP-2023-0156',
    phone: '+254768901234',
    email: 'operations@hawkins.co.ke',
    physicalAddress: 'Nyahururu, Nyandarua County',
    website: null,
    status: 'ACTIVE' as const,
    plan: 'PROFESSIONAL' as const,
    licenseDate: new Date('2023-08-14'),
    monthlyFee: 15000,
    transactionRate: 1.0
  },
  {
    name: 'Lucason Capital',
    slug: 'lucason',
    companyName: 'Lucason Capital Limited',
    licenseNumber: 'DCP-2022-0178',
    phone: '+254779012345',
    email: 'support@lucason.co.ke',
    physicalAddress: 'Voi Town, Taita Taveta County',
    website: null,
    status: 'ACTIVE' as const,
    plan: 'PROFESSIONAL' as const,
    licenseDate: new Date('2022-10-05'),
    monthlyFee: 15000,
    transactionRate: 1.0
  },
  {
    name: 'Milhan Access Capital',
    slug: 'milhan',
    companyName: 'Milhan Access Capital Limited',
    licenseNumber: 'DCP-2023-0190',
    phone: '+254780123456',
    email: 'hello@milhan.co.ke',
    physicalAddress: 'Bungoma Town, Bungoma County',
    website: null,
    status: 'ACTIVE' as const,
    plan: 'PROFESSIONAL' as const,
    licenseDate: new Date('2023-04-18'),
    monthlyFee: 15000,
    transactionRate: 1.0
  },
  {
    name: 'Novatok Credit',
    slug: 'novatok',
    companyName: 'Novatok Credit Limited',
    licenseNumber: 'DCP-2022-0212',
    phone: '+254791234567',
    email: 'info@novatok.co.ke',
    physicalAddress: 'Marsabit Town, Marsabit County',
    website: null,
    status: 'ACTIVE' as const,
    plan: 'PROFESSIONAL' as const,
    licenseDate: new Date('2022-07-22'),
    monthlyFee: 15000,
    transactionRate: 1.0
  }
]

// Tenant configuration for data generation based on tier
const tenantConfig = {
  STARTER: { customerRange: [5, 10], applicationRange: [5, 10], userCount: 4 },
  TRIAL: { customerRange: [5, 8], applicationRange: [3, 7], userCount: 3 },
  PROFESSIONAL: { customerRange: [10, 15], applicationRange: [8, 15], userCount: 6 },
  ENTERPRISE: { customerRange: [15, 22], applicationRange: [12, 20], userCount: 8 }
}

// Sample user roles for each tenant based on plan
function getUserRoles(plan: string) {
  switch (plan) {
    case 'TRIAL':
      return [
        { role: 'TENANT_ADMIN', count: 1 },
        { role: 'STAFF', count: 2 }
      ]
    case 'STARTER':
      return [
        { role: 'TENANT_ADMIN', count: 1 },
        { role: 'MANAGER', count: 1 },
        { role: 'STAFF', count: 2 },
        { role: 'AGENT', count: 1 }
      ]
    case 'PROFESSIONAL':
      return [
        { role: 'TENANT_ADMIN', count: 1 },
        { role: 'MANAGER', count: 2 },
        { role: 'STAFF', count: 3 },
        { role: 'AGENT', count: 2 }
      ]
    case 'ENTERPRISE':
      return [
        { role: 'TENANT_ADMIN', count: 1 },
        { role: 'MANAGER', count: 3 },
        { role: 'STAFF', count: 4 },
        { role: 'AGENT', count: 3 }
      ]
    default:
      return [
        { role: 'TENANT_ADMIN', count: 1 },
        { role: 'STAFF', count: 2 }
      ]
  }
}

// Loan product templates - varies by plan
function generateProducts(tenantId: string, plan: string) {
  const suffix = tenantId.slice(-6).toUpperCase()
  
  const baseProducts = [
    {
      tenantId,
      name: 'Personal Loan',
      description: 'Flexible personal loan for various needs including emergency expenses, school fees, and personal projects.',
      productCode: `PL-${suffix}-001`,
      category: 'PERSONAL_LOAN',
      minAmount: 5000,
      maxAmount: plan === 'ENTERPRISE' ? 300000 : plan === 'PROFESSIONAL' ? 200000 : 100000,
      defaultAmount: 50000,
      interestType: 'FLAT_RATE' as const,
      interestRate: plan === 'ENTERPRISE' ? 12 : plan === 'PROFESSIONAL' ? 14 : 16,
      processingFee: plan === 'ENTERPRISE' ? 200 : 300,
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
      maxAmount: plan === 'ENTERPRISE' ? 800000 : plan === 'PROFESSIONAL' ? 500000 : 200000,
      defaultAmount: 100000,
      interestType: 'FLAT_RATE' as const,
      interestRate: plan === 'ENTERPRISE' ? 10 : plan === 'PROFESSIONAL' ? 12 : 15,
      processingFee: plan === 'ENTERPRISE' ? 300 : 500,
      processingFeeType: 'FIXED' as const,
      insuranceFee: 0.5,
      insuranceFeeType: 'PERCENTAGE' as const,
      minTermDays: 60,
      maxTermDays: 365,
      defaultTermDays: 180,
      repaymentFrequency: 'MONTHLY' as const,
      gracePeriodDays: 15,
      isActive: true
    }
  ]

  // Add unique third product based on plan type
  if (plan === 'TRIAL') {
    baseProducts.push({
      tenantId,
      name: 'Quick Cash',
      description: 'Fast emergency cash for immediate needs.',
      productCode: `QC-${suffix}-001`,
      category: 'SALARY_ADVANCE',
      minAmount: 500,
      maxAmount: 10000,
      defaultAmount: 3000,
      interestType: 'FLAT_RATE' as const,
      interestRate: 20,
      processingFee: 50,
      processingFeeType: 'FIXED' as const,
      insuranceFee: 0,
      insuranceFeeType: 'PERCENTAGE' as const,
      minTermDays: 7,
      maxTermDays: 14,
      defaultTermDays: 7,
      repaymentFrequency: 'BULLET' as const,
      gracePeriodDays: 0,
      isActive: true
    })
  } else if (plan === 'STARTER') {
    baseProducts.push({
      tenantId,
      name: 'Salary Advance',
      description: 'Short-term advance against your salary with quick disbursement.',
      productCode: `SA-${suffix}-001`,
      category: 'SALARY_ADVANCE',
      minAmount: 1000,
      maxAmount: 30000,
      defaultAmount: 10000,
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
    })
  } else if (plan === 'PROFESSIONAL') {
    baseProducts.push({
      tenantId,
      name: 'Asset Finance',
      description: 'Finance for purchase of assets including equipment, vehicles, and machinery.',
      productCode: `AF-${suffix}-001`,
      category: 'ASSET_FINANCE',
      minAmount: 50000,
      maxAmount: 1000000,
      defaultAmount: 250000,
      interestType: 'REDUCING_BALANCE' as const,
      interestRate: 11,
      processingFee: 1000,
      processingFeeType: 'FIXED' as const,
      insuranceFee: 0.5,
      insuranceFeeType: 'PERCENTAGE' as const,
      minTermDays: 180,
      maxTermDays: 1095,
      defaultTermDays: 730,
      repaymentFrequency: 'MONTHLY' as const,
      gracePeriodDays: 30,
      isActive: true
    })
  } else if (plan === 'ENTERPRISE') {
    baseProducts.push({
      tenantId,
      name: 'Premium Business Loan',
      description: 'Premium business financing for established companies with competitive rates.',
      productCode: `PB-${suffix}-001`,
      category: 'BUSINESS_LOAN',
      minAmount: 100000,
      maxAmount: 2000000,
      defaultAmount: 500000,
      interestType: 'REDUCING_BALANCE' as const,
      interestRate: 9,
      processingFee: 0,
      processingFeeType: 'FIXED' as const,
      insuranceFee: 0.25,
      insuranceFeeType: 'PERCENTAGE' as const,
      minTermDays: 365,
      maxTermDays: 1825,
      defaultTermDays: 1095,
      repaymentFrequency: 'MONTHLY' as const,
      gracePeriodDays: 45,
      isActive: true
    })
  }

  return baseProducts
}

// Generate random Kenyan names
function generateKenyanName() {
  const firstNames = ['John', 'Mary', 'Peter', 'Grace', 'James', 'Faith', 'Daniel', 'Sarah', 'Michael', 'Esther', 
                       'Joseph', 'Ruth', 'David', 'Naomi', 'Samuel', 'Hannah', 'Benjamin', 'Rebecca', 'Andrew', 'Rachel',
                       'Anthony', 'Joyce', 'Patrick', 'Dorothy', 'Charles', 'Catherine', 'Thomas', 'Elizabeth', 'Robert', 'Ann',
                       'Francis', 'Jane', 'Vincent', 'Martha', 'Martin', 'Phyllis', 'George', 'Lucy', 'Henry', 'Susan']
  const lastNames = ['Kamau', 'Wanjiku', 'Ochieng', 'Atieno', 'Mwangi', 'Nyokabi', 'Kipchoge', 'Muthoni', 
                      'Odhiambo', 'Akinyi', 'Mutua', 'Wambui', 'Korir', 'Chebet', 'Maina', 'Njeri', 
                      'Njoroge', 'Waithera', 'Kimani', 'Ndirangu', 'Otieno', 'Moraa', 'Kiptoo', 'Jepchirchir',
                      'Mutiso', 'Mwikali', 'Kirubi', 'Nyambura', 'Too', 'Yego', 'Cherono', 'Langat',
                      'Omondi', 'Auma', 'Kariuki', 'Wairimu', 'Rotich', 'Jepkemoi', 'Gikonyo', 'Muthoni']
  
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
    const counties = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Kiambu', 'Machakos', 'Kajiado', 'Uasin Gishu', 'Nyeri', 'Meru', 'Kakamega', 'Bungoma']
    
    customers.push({
      tenantId,
      firstName: name.firstName,
      lastName: name.lastName,
      email: `${name.firstName.toLowerCase()}.${name.lastName.toLowerCase()}${Math.floor(Math.random() * 100)}@gmail.com`,
      phone: `0${generateKenyanPhone().slice(-9)}`,
      alternativePhone: Math.random() > 0.5 ? `0${generateKenyanPhone().slice(-9)}` : null,
      dateOfBirth: new Date(Date.now() - (Math.random() * 35 + 22) * 365.25 * 24 * 60 * 60 * 1000),
      gender: Math.random() > 0.5 ? ('MALE' as const) : ('FEMALE' as const),
      nationalId: String(Math.floor(Math.random() * 90000000) + 10000000),
      kraPin: Math.random() > 0.3 ? `A${Math.random().toString(36).substring(2, 8).toUpperCase()}Z` : null,
      employmentStatus: employmentStatuses[Math.floor(Math.random() * employmentStatuses.length)],
      employerName: Math.random() > 0.3 ? `${name.lastName} ${['Enterprises', 'Services', 'Ltd', 'Group', 'Solutions'][Math.floor(Math.random() * 5)]}` : null,
      incomeAmount: Math.floor(Math.random() * 180000) + 15000,
      incomeFrequency: 'MONTHLY' as const,
      businessName: Math.random() > 0.6 ? `${name.firstName}'s Shop` : null,
      county: counties[Math.floor(Math.random() * counties.length)],
      city: 'Nairobi',
      bankName: Math.random() > 0.4 ? ['Equity Bank', 'KCB', 'Cooperative Bank', 'NCBA', 'Stanbic', 'Absa', 'Family Bank', 'Diamond Trust'][Math.floor(Math.random() * 8)] : null,
      bankAccount: Math.random() > 0.4 ? String(Math.floor(Math.random() * 9000000000) + 1000000000) : null,
      mpesaPhone: `0${generateKenyanPhone().slice(-9)}`,
      creditScore: Math.floor(Math.random() * 550) + 300, // 300-850 range
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
                    'Medical bills', 'Vehicle purchase', 'Inventory purchase', 'Rent payment', 'Travel expenses', 'Wedding costs',
                    'Farm inputs', 'Electronics purchase', 'Land purchase', 'Building construction']

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
      creditScore: Math.floor(Math.random() * 550) + 300,
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
  console.log('🌱 Starting Digital Lending OS database seeding...')
  console.log(`   Total tenants to create: ${tenants.length}\n`)

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
      console.log(`   ✓ Created: ${created.name} (${created.slug}) - ${tenant.plan} plan`)
    }
    console.log(`\n✅ Created ${createdTenants.length} tenants\n`)

    // Create users for each tenant
    console.log('👥 Creating users...')
    let totalUsers = 0
    for (const tenant of createdTenants) {
      const roles = getUserRoles(tenant.plan)
      for (const userRole of roles) {
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
      console.log(`   ✓ Created users for ${tenant.name}`)
    }
    console.log(`   ✓ Total: ${totalUsers} users across all tenants\n`)

    // Create products for each tenant
    console.log('📦 Creating loan products...')
    let totalProducts = 0
    for (const tenant of createdTenants) {
      const products = generateProducts(tenant.id, tenant.plan)
      for (const product of products) {
        await prisma.loanProduct.create({ data: product })
        totalProducts++
      }
      console.log(`   ✓ Created ${products.length} products for ${tenant.name}`)
    }
    console.log(`\n✅ Created ${totalProducts} products\n`)

    // Create customers for each tenant
    console.log('👤 Creating customers...')
    let totalCustomers = 0
    for (const tenant of createdTenants) {
      const config = tenantConfig[tenant.plan]
      const customerCount = Math.floor(Math.random() * (config.customerRange[1] - config.customerRange[0])) + config.customerRange[0]
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

      const config = tenantConfig[tenant.plan]
      const appCount = Math.floor(Math.random() * (config.applicationRange[1] - config.applicationRange[0])) + config.applicationRange[0]
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
    console.log('=' .repeat(60))
    console.log('🎉 SEEDING COMPLETE!')
    console.log('=' .repeat(60))
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

    // Count by plan
    console.log('\n--- Tenant Breakdown by Plan ---')
    const planCounts = await prisma.tenant.groupBy({
      by: ['plan'],
      _count: true
    })
    for (const pc of planCounts) {
      console.log(`   • ${pc.plan}: ${pc._count} tenants`)
    }

    console.log('\n✨ Database is now ready for use!')
    console.log('\n📊 Platform Statistics:')
    console.log(`   • Licensed DCPs in Kenya: 252 (aspirational target)`)
    console.log(`   • Current platform tenants: ${createdTenants.length}`)
    console.log(`   • Market coverage: ${(createdTenants.length / 252 * 100).toFixed(1)}%\n`)

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
