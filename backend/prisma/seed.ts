/**
 * Database Seed Data
 * 
 * Development and testing seed data for Digital Lending OS.
 * Run with: npx prisma db seed
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

// =============================================================================
// CONFIGURATION
// =============================================================================

const SALT_ROUNDS = 12;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function hashPassword(password: string): Promise<string> {
  return hash(password, SALT_ROUNDS);
}

function generatePhone(): string {
  const prefixes = ['712', '722', '733', '744', '755', '766', '777', '788', '700', '720', '790'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `254${prefix}${suffix}`;
}

function generateIdNumber(): string {
  return Math.floor(Math.random() * 30000000).toString();
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

// =============================================================================
// SEED DATA
// =============================================================================

const TENANTS = [
  {
    name: 'Abepot Finance',
    slug: 'abepot',
    companyName: 'Abepot Finance Limited',
    licenseNumber: 'CBK/DFP/2023/001',
    phone: '+254700000001',
    email: 'info@abepot.co.ke',
    status: 'ACTIVE' as const,
    plan: 'ENTERPRISE' as const,
    monthlyFee: 50000,
    transactionRate: 0.5,
    config: JSON.stringify({
      kycRequirements: ['national_id', 'passport_photo'],
      approvalWorkflow: 'auto_under_50000',
      paymentConfig: { mpesaShortcode: '174379' },
    }),
    branding: JSON.stringify({
      logo: '/logos/abepot.png',
      primaryColor: '#1E40AF',
      secondaryColor: '#3B82F6',
      font: 'Inter',
    }),
  },
  {
    name: 'Fabilo Credit',
    slug: 'fabilo',
    companyName: 'Fabilo Credit Limited',
    licenseNumber: 'CBK/DFP/2023/002',
    phone: '+254700000002',
    email: 'contact@fabilo.co.ke',
    status: 'ACTIVE' as const,
    plan: 'PROFESSIONAL' as const,
    monthlyFee: 25000,
    transactionRate: 1.0,
    config: JSON.stringify({
      kycRequirements: ['national_id', 'bank_statement'],
      approvalWorkflow: 'manual_all',
      paymentConfig: { mpesaShortcode: '298277' },
    }),
    branding: JSON.stringify({
      logo: '/logos/fabilo.png',
      primaryColor: '#059669',
      secondaryColor: '#10B981',
      font: 'Inter',
    }),
  },
  {
    name: 'QuickCash DCP',
    slug: 'quickcash',
    companyName: 'QuickCash Digital Credit Providers Ltd',
    licenseNumber: null, // Trial tenant
    phone: '+254700000003',
    email: 'hello@quickcash.co.ke',
    status: 'TRIAL' as const,
    plan: 'STARTER' as const,
    monthlyFee: 0,
    transactionRate: 2.0,
    config: JSON.stringify({
      kycRequirements: ['national_id'],
      approvalWorkflow: 'auto_only',
      paymentConfig: {},
    }),
    branding: JSON.stringify({
      logo: null,
      primaryColor: '#F59E0B',
      secondaryColor: '#FBBF24',
      font: 'Inter',
    }),
  },
];

const FIRST_NAMES = [
  'John', 'Jane', 'Joseph', 'Mary', 'Peter', 'Grace', 'David', 'Sarah',
  'Michael', 'Anna', 'James', 'Lucy', 'Robert', 'Faith', 'William', 'Hannah',
  'Richard', 'Esther', 'Thomas', 'Ruth', 'Charles', 'Naomi', 'Daniel', 'Rebecca',
  'Matthew', 'Rachel', 'Anthony', 'Deborah', 'Mark', 'Elizabeth'
];

const LAST_NAMES = [
  'Wanjiku', 'Otieno', 'Kamau', 'Akinyi', 'Njoroge', 'Mwangi', 'Ochieng',
  'Mutua', 'Kipchumba', 'Waweru', 'Ndungu', 'Nyongesa', 'Maina', 'Sigei',
  'Gitonga', 'Muthoni', 'Kirubi', 'Atieno', 'Chege', 'Moraa', 'Thuo',
  'Mboya', 'Gichuki', 'Auma', 'Kariuki', 'Njeri', 'Onyango', 'Wanjiru'
];

const COUNTIES = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Nyeri', 'Machakos',
  'Meru', 'Kisii', 'Nanyuki', 'Thika', 'Malindi', 'Kitui', 'Garissa', 'Kakamega'
];

const EMPLOYMENT_STATUSES = [
  'EMPLOYED', 'SELF_EMPLOYED', 'BUSINESS_OWNER', 'CONTRACTOR'
];

const BUSINESS_TYPES = [
  'Retail Shop', 'Salon', 'Restaurant', 'Transport', 'Farming', 'Consulting',
  'Manufacturing', 'Technology', 'Education', 'Healthcare'
];

// =============================================================================
// MAIN SEED FUNCTION
// =============================================================================

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clean existing data (in reverse order of dependencies)
  console.log('🗑️  Cleaning existing data...');
  await prisma.transaction.deleteMany();
  await prisma.repayment.deleteMany();
  await prisma.kycDocument.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.loanApplication.deleteMany();
  await prisma.loanProduct.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.session.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // ===========================================================================
  // CREATE TENANTS
  // ===========================================================================

  console.log('🏢 Creating tenants...');
  const createdTenants = [];

  for (const tenantData of TENANTS) {
    const tenant = await prisma.tenant.create({ data: tenantData });
    createdTenants.push(tenant);
    console.log(`   ✓ Created tenant: ${tenant.name} (${tenant.slug})`);
  }

  // ===========================================================================
  // CREATE USERS
  // ===========================================================================

  console.log('\n👤 Creating users...');
  const users = [];

  // Super Admin
  const superAdminPassword = await hashPassword('Admin123!');
  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@digitallending.os',
      passwordHash: superAdminPassword,
      name: 'System Administrator',
      role: 'SUPER_ADMIN',
      isActive: true,
      emailVerified: true,
    },
  });
  users.push(superAdmin);
  console.log('   ✓ Created super admin: admin@digitallending.os');

  // Tenant Admins and Staff
  for (let i = 0; i < createdTenants.length; i++) {
    const tenant = createdTenants[i];
    
    // Tenant Admin
    const adminPassword = await hashPassword('Admin123!');
    const admin = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `admin@${tenant.slug}.co.ke`,
        passwordHash: adminPassword,
        name: `${tenant.name} Admin`,
        role: 'TENANT_ADMIN',
        isActive: true,
        emailVerified: true,
      },
    });
    users.push(admin);
    console.log(`   ✓ Created tenant admin: admin@${tenant.slug}.co.ke`);

    // Manager
    const managerPassword = await hashPassword('Manager123!');
    const manager = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `manager@${tenant.slug}.co.ke`,
        passwordHash: managerPassword,
        name: `${tenant.name} Manager`,
        role: 'MANAGER',
        isActive: true,
        emailVerified: true,
      },
    });
    users.push(manager);

    // Staff members
    for (let j = 0; j < 2; j++) {
      const staffPassword = await hashPassword('Staff123!');
      const staff = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: `staff${j + 1}@${tenant.slug}.co.ke`,
          passwordHash: staffPassword,
          name: `${randomElement(FIRST_NAMES)} ${randomElement(LAST_NAMES)}`,
          role: randomElement(['STAFF', 'AGENT'] as const),
          isActive: true,
          emailVerified: true,
          phone: generatePhone(),
        },
      });
      users.push(staff);
    }
  }

  // ===========================================================================
  // CREATE LOAN PRODUCTS
  // ===========================================================================

  console.log('\n📦 Creating loan products...');
  const products = [];

  const productTemplates = [
    {
      name: 'Personal Loan',
      productCode: 'PL-001',
      category: 'PERSONAL_LOAN',
      minAmount: 5000,
      maxAmount: 200000,
      defaultAmount: 50000,
      interestRate: 15,
      processingFee: 500,
      insuranceFeeType: 'PERCENTAGE',
      insuranceFee: 1.5,
      minTermDays: 30,
      maxTermDays: 365,
      defaultTermDays: 90,
      repaymentFrequency: 'MONTHLY',
    },
    {
      name: 'Business Loan',
      productCode: 'BL-001',
      category: 'BUSINESS_LOAN',
      minAmount: 10000,
      maxAmount: 1000000,
      defaultAmount: 150000,
      interestRate: 18,
      processingFee: 1000,
      insuranceFeeType: 'PERCENTAGE',
      insuranceFee: 2,
      minTermDays: 90,
      maxTermDays: 730,
      defaultTermDays: 180,
      repaymentFrequency: 'MONTHLY',
    },
    {
      name: 'Salary Advance',
      productCode: 'SA-001',
      category: 'SALARY_ADVANCE',
      minAmount: 1000,
      maxAmount: 50000,
      defaultAmount: 15000,
      interestRate: 10,
      processingFee: 200,
      insuranceFeeType: 'FIXED',
      insuranceFee: 100,
      minTermDays: 7,
      maxTermDays: 30,
      defaultTermDays: 30,
      repaymentFrequency: 'BULLET',
    },
    {
      name: 'Emergency Loan',
      productCode: 'EL-001',
      category: 'EMERGENCY_LOAN',
      minAmount: 2000,
      maxAmount: 30000,
      defaultAmount: 10000,
      interestRate: 20,
      processingFee: 300,
      insuranceFeeType: 'FIXED',
      insuranceFee: 150,
      minTermDays: 14,
      maxTermDays: 60,
      defaultTermDays: 30,
      repaymentFrequency: 'WEEKLY',
    },
    {
      name: 'School Fees Loan',
      productCode: 'SF-001',
      category: 'SCHOOL_FEES',
      minAmount: 10000,
      maxAmount: 200000,
      defaultAmount: 75000,
      interestRate: 12,
      processingFee: 500,
      insuranceFeeType: 'PERCENTAGE',
      insuranceFee: 1,
      minTermDays: 60,
      maxTermDays: 180,
      defaultTermDays: 90,
      repaymentFrequency: 'MONTHLY',
      gracePeriodDays: 30,
    },
  ];

  for (const tenant of createdTenants) {
    for (const template of productTemplates) {
      const product = await prisma.loanProduct.create({
        data: {
          tenantId: tenant.id,
          ...template,
          eligibilityRules: JSON.stringify({
            minCreditScore: template.category === 'PERSONAL_LOAN' ? 400 : 450,
            minIncome: template.category === 'BUSINESS_LOAN' ? 50000 : 25000,
            requiredDocuments: ['national_id', 'payslip'],
          }),
        },
      });
      products.push(product);
    }
    console.log(`   ✓ Created ${productTemplates.length} products for ${tenant.name}`);
  }

  // ===========================================================================
  // CREATE CUSTOMERS
  // ===========================================================================

  console.log('\n👥 Creating customers...');
  const customers = [];

  for (const tenant of createdTenants) {
    const customerCount = tenant.plan === 'ENTERPRISE' ? 50 : tenant.plan === 'PROFESSIONAL' ? 30 : 15;
    
    for (let i = 0; i < customerCount; i++) {
      const firstName = randomElement(FIRST_NAMES);
      const lastName = randomElement(LAST_NAMES);
      const employmentStatus = randomElement(EMPLOYMENT_STATUSES);
      
      const customer = await prisma.customer.create({
        data: {
          tenantId: tenant.id,
          firstName,
          lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
          phone: generatePhone(),
          alternativePhone: Math.random() > 0.5 ? generatePhone() : null,
          dateOfBirth: new Date(1970 + randomInt(18, 55), randomInt(0, 11), randomInt(1, 28)),
          gender: randomElement(['MALE', 'FEMALE'] as const),
          nationalId: generateIdNumber(),
          county: randomElement(COUNTIES),
          city: randomElement(COUNTIES),
          employmentStatus: employmentStatus as any,
          employerName: employmentStatus !== 'SELF_EMPLOYED' && employmentStatus !== 'BUSINESS_OWNER'
            ? `${firstName} Employer Ltd`
            : null,
          businessName: (employmentStatus === 'SELF_EMPLOYED' || employmentStatus === 'BUSINESS_OWNER')
            ? randomElement(BUSINESS_TYPES)
            : null,
          incomeAmount: randomFloat(15000, 250000),
          incomeFrequency: randomElement(['DAILY', 'WEEKLY', 'MONTHLY'] as const),
          bankName: randomElement(['Equity Bank', 'KCB', 'Co-operative Bank', 'NCBA', 'Stanbic']),
          mpesaPhone: generatePhone(),
          creditScore: randomInt(250, 850),
          crbStatus: randomElement(['CLEAN', 'CLEAN', 'CLEAN', 'LISTED'] as const),
          totalBorrowed: randomFloat(0, 500000),
          totalRepaid: randomFloat(0, 400000),
          outstandingBalance: randomFloat(0, 150000),
          status: randomElement(['ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE'] as const),
          riskLevel: randomElement(['LOW', 'LOW', 'MEDIUM', 'MEDIUM', 'HIGH'] as const),
          source: randomElement(['WALK_IN', 'REFERRAL', 'MOBILE_APP', 'AGENT'] as const),
        },
      });
      customers.push(customer);
    }
    console.log(`   ✓ Created ${customerCount} customers for ${tenant.name}`);
  }

  // ===========================================================================
  // CREATE LOAN APPLICATIONS AND LOANS
  // ===========================================================================

  console.log('\n📝 Creating loan applications and loans...');
  const applications = [];
  const loans = [];

  for (const customer of customers.slice(0, Math.ceil(customers.length * 0.7))) {
    const tenantProducts = products.filter(p => p.tenantId === customer.tenantId);
    if (tenantProducts.length === 0) continue;
    
    const product = randomElement(tenantProducts);
    const requestedAmount = randomFloat(product.minAmount, Math.min(product.maxAmount, product.defaultAmount * 1.5));
    
    // Create application
    const statuses = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED'];
    const weights = [5, 10, 15, 35, 10, 25]; // Higher weight for approved/d disbursed
    const status = weightedRandom(statuses, weights);
    
    const application = await prisma.loanApplication.create({
      data: {
        tenantId: customer.tenantId,
        customerId: customer.id,
        productId: product.id,
        requestedAmount,
        termDays: randomInt(product.minTermDays, product.maxTermDays),
        purpose: randomElement([
          'Business expansion',
          'Emergency expenses',
          'School fees',
          'Home renovation',
          'Medical bills',
          'Working capital',
          'Inventory purchase',
        ]),
        status: status as any,
        submittedAt: status !== 'DRAFT' ? randomDate(-30, -1) : null,
        reviewedAt: ['APPROVED', 'REJECTED', 'DISBURSED'].includes(status) ? randomDate(-20, -2) : null,
        approvedAt: ['APPROVED', 'DISBURSED'].includes(status) ? randomDate(-18, -3) : null,
        creditScore: randomInt(300, 800),
        affordabilityScore: randomFloat(50, 100),
        riskRating: randomElement(['LOW', 'MEDIUM', 'HIGH'] as any),
        autoApproved: Math.random() > 0.6,
        currentStep: getApplicationStepForStatus(status),
      },
    });
    applications.push(application);

    // Create loan if approved or disbursed
    if (['APPROVED', 'DISBURSED'].includes(status)) {
      const loanStatuses = ['APPROVED', 'PENDING_DISBURSEMENT', 'ACTIVE', 'IN_ARREARS', 'FULLY_PAID', 'DEFAULTED'];
      const loanWeights = [15, 10, 40, 15, 15, 5];
      const loanStatus = weightedRandom(loanStatuses, loanWeights);
      
      const approvedAmount = requestedAmount * randomFloat(0.8, 1.0);
      const interestRate = product.interestRate;
      const months = Math.ceil(application.termDays / 30);
      const totalInterest = approvedAmount * (interestRate / 100) * months;
      const totalRepayable = approvedAmount + totalInterest + product.processingFee;
      
      const disbursementDate = ['ACTIVE', 'IN_ARREARS', 'FULLY_PAID', 'DEFAULTED'].includes(loanStatus)
        ? randomDate(-90, -1)
        : null;
      
      const maturityDate = disbursementDate 
        ? new Date(disbursementDate.getTime() + application.termDays * 24 * 60 * 60 * 1000)
        : null;
      
      const daysInArrears = loanStatus === 'IN_ARREARS' ? randomInt(1, 120) :
                           loanStatus === 'DEFAULTED' ? randomInt(90, 365) : 0;
      
      const repaidRatio = loanStatus === 'FULLY_PAID' ? 1 :
                         loanStatus === 'ACTIVE' ? randomFloat(0.1, 0.7) :
                         loanStatus === 'IN_ARREARS' ? randomFloat(0.1, 0.5) : 0;
      
      const loan = await prisma.loan.create({
        data: {
          tenantId: customer.tenantId,
          customerId: customer.id,
          applicationId: application.id,
          productId: product.id,
          loanNumber: `LN-${new Date().getFullYear()}-${String(randomInt(1, 999999)).padStart(6, '0')}`,
          principal: approvedAmount,
          approvedAmount,
          interestRate,
          interestType: product.interestType as any,
          processingFee: product.processingFee,
          totalInterest,
          totalFees: product.processingFee + (approvedAmount * (typeof product.insuranceFee === 'number' && product.insuranceFeeType === 'PERCENTAGE' ? product.insuranceFee / 100 : 0)),
          totalRepayable,
          termDays: application.termDays,
          disbursementDate,
          maturityDate,
          repaidPrincipal: totalRepayable * repaidRatio * 0.85,
          repaidInterest: totalRepayable * repaidRatio * 0.13,
          repaidFees: totalRepayable * repaidRatio * 0.02,
          totalRepaid: totalRepayable * repaidRatio,
          outstandingBalance: totalRepayable * (1 - repaidRatio),
          nextPaymentDue: disbursementDate ? new Date(disbursementDate.getTime() + 30 * 24 * 60 * 60 * 1000) : null,
          daysInArrears,
          status: loanStatus as any,
          arrearsStatus: daysInArrears === 0 ? 'CURRENT' :
                        daysInArrears <= 7 ? 'DAYS_1_7' :
                        daysInArrears <= 30 ? 'DAYS_8_30' :
                        daysInArrears <= 60 ? 'DAYS_31_60' :
                        daysInArrears <= 90 ? 'DAYS_61_90' : 'DAYS_91_PLUS',
          disbursementMethod: disbursementDate ? randomElement(['MPESA', 'BANK_TRANSFER'] as any) : null,
          disbursementAccount: disbursementDate ? customer.mpesaPhone : null,
          repaymentSchedule: JSON.stringify(generateRepaymentSchedule(approvedAmount, interestRate, application.termDays)),
          closedAt: loanStatus === 'FULLY_PAID' ? randomDate(-5, -1) : null,
        },
      });
      loans.push(loan);

      // Create repayments for active/paid loans
      if (['ACTIVE', 'IN_ARREARS', 'FULLY_PAID'].includes(loanStatus)) {
        const numPayments = Math.min(
          Math.ceil((disbursementDate ? Date.now() - disbursementDate.getTime() : 0) / (30 * 24 * 60 * 60 * 1000)),
          Math.ceil(application.termDays / 30)
        );
        
        for (let p = 0; p < Math.max(1, numPayments); p++) {
          const isCompleted = p < numPayments - 1 || loanStatus === 'FULLY_PAID';
          const paymentDate = disbursementDate 
            ? new Date(disbursementDate.getTime() + (p + 1) * 30 * 24 * 60 * 60 * 1000 + randomInt(-3, 3) * 24 * 60 * 60 * 1000)
            : new Date();
          
          if (paymentDate > new Date()) break;
          
          const installmentAmount = totalRepayable / Math.ceil(application.termDays / 30);
          
          await prisma.repayment.create({
            data: {
              tenantId: customer.tenantId,
              loanId: loan.id,
              customerId: customer.id,
              amount: installmentAmount,
              principalPortion: installmentAmount * 0.85,
              interestPortion: installmentAmount * 0.13,
              feePortion: installmentAmount * 0.02,
              paymentMethod: randomElement(['MPESA', 'MPESA', 'MPESA', 'BANK_TRANSFER'] as any),
              referenceNumber: `MP${randomInt(10000000, 99999999)}`,
              paidBy: `${customer.firstName} ${customer.lastName}`,
              paymentDate,
              dueDate: disbursementDate ? new Date(disbursementDate.getTime() + (p + 1) * 30 * 24 * 60 * 60 * 1000) : null,
              status: isCompleted ? 'COMPLETED' : randomEnum(['PENDING', 'FAILED', 'PARTIAL']),
            },
          });
        }
      }
    }
  }

  console.log(`   ✓ Created ${applications.length} loan applications`);
  console.log(`   ✓ Created ${loans.length} loans`);

  // ===========================================================================
  // CREATE TRANSACTIONS
  // ===========================================================================

  console.log('\n💰 Creating transactions...');
  let transactionCount = 0;

  for (const loan of loans) {
    if (!loan.disbursementDate) continue;
    
    // Disbursement transaction
    await prisma.transaction.create({
      data: {
        tenantId: loan.tenantId,
        referenceNumber: `TXN-${formatDate(loan.disbursementDate)}-${String(++transactionCount).padStart(5, '0')}`,
        transactionType: 'DISBURSEMENT',
        entityType: 'LOAN',
        entityId: loan.id,
        debitAccount: 'LOANS_PAYABLE',
        creditAccount: 'CASH_AT_BANK',
        amount: loan.approvedAmount,
        description: `Loan disbursement - ${loan.loanNumber}`,
        narration: `Disbursed to ${loan.disbursementAccount}`,
        reconciled: true,
        occurredAt: loan.disbursementDate,
      },
    });

    // Fee transactions
    if (loan.processingFee > 0) {
      await prisma.transaction.create({
        data: {
          tenantId: loan.tenantId,
          referenceNumber: `TXN-${formatDate(loan.disbursementDate)}-${String(++transactionCount).padStart(5, '0')}`,
          transactionType: 'FEE_CHARGED',
          entityType: 'LOAN',
          entityId: loan.id,
          debitAccount: 'RECEIVABLE_FEES',
          creditAccount: 'FEE_INCOME',
          amount: loan.processingFee,
          description: `Processing fee - ${loan.loanNumber}`,
          narration: 'Processing fee charged at disbursement',
          occurredAt: loan.disbursementDate,
        },
      });
    }
  }

  // Repayment transactions
  const repayments = await prisma.repayment.findMany({
    where: { status: 'COMPLETED' },
    take: 100,
  });

  for (const repayment of repayments) {
    await prisma.transaction.create({
      data: {
        tenantId: repayment.tenantId,
        referenceNumber: `TXN-${formatDate(repayment.paymentDate)}-${String(++transactionCount).padStart(5, '0')}`,
        transactionType: 'REPAYMENT_PRINCIPAL',
        entityType: 'REPAYMENT',
        entityId: repayment.id,
        debitAccount: 'CASH_AT_BANK',
        creditAccount: 'LOANS_RECEIVABLE',
        amount: repayment.principalPortion,
        description: `Principal repayment`,
        externalRef: repayment.referenceNumber,
        reconciled: Math.random() > 0.3,
        occurredAt: repayment.paymentDate,
      },
    });

    if (repayment.interestPortion > 0) {
      await prisma.transaction.create({
        data: {
          tenantId: repayment.tenantId,
          referenceNumber: `TXN-${formatDate(repayment.paymentDate)}-${String(++transactionCount).padStart(5, '0')}`,
          transactionType: 'REPAYMENT_INTEREST',
          entityType: 'REPAYMENT',
          entityId: repayment.id,
          debitAccount: 'CASH_AT_BANK',
          creditAccount: 'INTEREST_INCOME',
          amount: repayment.interestPortion,
          description: `Interest repayment`,
          externalRef: repayment.referenceNumber,
          occurredAt: repayment.paymentDate,
        },
      });
    }
  }

  console.log(`   ✓ Created ${transactionCount} transactions`);

  // ===========================================================================
  // CREATE NOTIFICATIONS
  // ===========================================================================

  console.log('\n📬 Creating notifications...');
  
  const notificationTemplates = [
    { channel: 'SMS' as const, subject: 'Payment Reminder', body: 'Your loan payment of KES {amount} is due on {date}. Please pay on time to avoid penalties.' },
    { channel: 'EMAIL' as const, subject: 'Loan Approved!', body: 'Congratulations! Your loan application has been approved.' },
    { channel: 'SMS' as const, subject: 'Payment Received', body: 'We have received your payment of KES {amount}. Thank you!' },
    { channel: 'PUSH' as const, subject: 'New Offer', body: 'You are pre-qualified for a new loan of up to KES {amount}.' },
    { channel: 'SMS' as const, subject: 'Overdue Notice', body: 'Your loan is overdue by {days} days. Please contact us immediately.' },
  ];

  for (let i = 0; i < 50; i++) {
    const customer = randomElement(customers);
    const template = randomElement(notificationTemplates);
    const status = randomEnum(['PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED']);
    
    await prisma.notification.create({
      data: {
        tenantId: customer.tenantId,
        recipientType: 'CUSTOMER',
        recipientId: customer.id,
        recipientContact: Math.random() > 0.5 ? customer.phone : customer.email,
        channel: template.channel,
        subject: template.subject,
        body: template.body.replace('{amount}', String(randomInt(1000, 50000))).replace('{date}', new Date().toISOString().split('T')[0]).replace('{days}', String(randomInt(1, 60))),
        status: status as any,
        sentAt: ['SENT', 'DELIVERED', 'READ', 'FAILED'].includes(status) ? randomDate(-7, -1) : null,
        deliveredAt: ['DELIVERED', 'READ'].includes(status) ? randomDate(-6, -1) : null,
        readAt: status === 'READ' ? randomDate(-5, -1) : null,
        failedAt: status === 'FAILED' ? randomDate(-2, -1) : null,
        failureReason: status === 'FAILED' ? 'Gateway timeout' : null,
        scheduledFor: status === 'PENDING' ? randomDate(1, 7) : null,
      },
    });
  }

  console.log('   ✓ Created 50 notifications');

  // ===========================================================================
  // SUMMARY
  // ===========================================================================

  console.log('\n✅ Seed completed successfully!\n');
  console.log('Summary:');
  console.log(`   Tenants:       ${createdTenants.length}`);
  console.log(`   Users:         ${users.length}`);
  console.log(`   Products:      ${products.length}`);
  console.log(`   Customers:     ${customers.length}`);
  console.log(`   Applications:  ${applications.length}`);
  console.log(`   Loans:         ${loans.length}`);
  console.log(`   Transactions:  ${transactionCount}`);
  
  console.log('\n🔑 Test Credentials:');
  console.log('   Super Admin:  admin@digitallending.os / Admin123!');
  for (const tenant of createdTenants) {
    console.log(`   ${tenant.name}:  admin@${tenant.slug}.co.ke / Admin123!`);
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function weightedRandom<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }
  
  return items[items.length - 1];
}

function randomEnum<T extends string>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

function randomDate(daysBack: number, daysForward: number): Date {
  const now = new Date();
  const from = now.getTime() + daysBack * 24 * 60 * 60 * 1000;
  const to = now.getTime() + daysForward * 24 * 60 * 60 * 1000;
  return new Date(from + Math.random() * (to - from));
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function getApplicationStepForStatus(status: string): string {
  const stepMap: Record<string, string> = {
    'DRAFT': 'SUBMISSION',
    'SUBMITTED': 'KYC_VERIFICATION',
    'UNDER_REVIEW': 'MANUAL_REVIEW',
    'APPROVED': 'DOCUMENT_SIGNING',
    'REJECTED': 'CANCELLED',
    'DISBURSED': 'DISBURSED',
  };
  return stepMap[status] || 'SUBMISSION';
}

function generateRepaymentSchedule(principal: number, annualRate: number, termDays: number): Array<{
  installmentNo: number;
  dueDate: string;
  principal: number;
  interest: number;
  fees: number;
  total: number;
  status: string;
}> {
  const schedule = [];
  const months = Math.ceil(termDays / 30);
  const monthlyInterest = (annualRate / 100) * principal / 12;
  const principalPerInstallment = principal / months;

  for (let i = 1; i <= months; i++) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (termDays / months) * i);

    schedule.push({
      installmentNo: i,
      dueDate: dueDate.toISOString().split('T')[0],
      principal: Math.round(principalPerInstallment * 100) / 100,
      interest: Math.round(monthlyInterest * 100) / 100,
      fees: 0,
      total: Math.round((principalPerInstallment + monthlyInterest) * 100) / 100,
      status: i === 1 ? 'PENDING' : 'SCHEDULED',
    });
  }

  return schedule;
}

// =============================================================================
// RUN SEED
// =============================================================================

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
