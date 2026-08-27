import { NextRequest, NextResponse } from 'next/server'
import type { UserRole } from '@/lib/auth-types'

// ============================================
// WORKSPACE DATA API
// Provides role-specific workspace data
// ============================================

interface WorkspaceDataResponse {
  success: boolean
  role: UserRole
  data: Record<string, unknown>
  timestamp: string
}

// Mock data generators for each role
function getTenantAdminData(tenantId: string, userId: string) {
  return {
    organization: {
      name: 'Abepot Credit Ltd',
      id: tenantId,
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
    },
    overview: {
      customers: { value: 8231, change: 12, trend: 'up' },
      activeLoans: { value: 842, change: 5, trend: 'up' },
      loanBook: { value: 'KSh 2.4B', change: 8, trend: 'up' },
      monthlyRevenue: { value: 'KSh 14M', change: 15, trend: 'up' },
    },
    staff: {
      total: 12,
      active: 10,
      away: 1,
      inactive: 1,
      members: [
        { id: '1', name: 'Rachel Njoroge', role: 'TENANT_ADMIN', status: 'active', lastLogin: '2 min ago' },
        { id: '2', name: 'Samuel Otieno', role: 'MANAGER', status: 'active', lastLogin: '1 hr ago' },
        { id: '3', name: 'Faith Chebet', role: 'TENANT_STAFF', status: 'away', lastLogin: 'Yesterday' },
        { id: '4', name: 'Grace Mwangi', role: 'TENANT_AGENT', status: 'active', lastLogin: '30 min ago' },
        { id: '5', name: 'Michael Kamau', role: 'TENANT_STAFF', status: 'active', lastLogin: '15 min ago' },
        { id: '6', name: 'David Kimani', role: 'TENANT_STAFF', status: 'active', lastLogin: '45 min ago' },
        { id: '7', name: 'Sarah Achieng', role: 'TENANT_STAFF', status: 'active', lastLogin: '2 hrs ago' },
        { id: '8', name: 'Joseph Mutua', role: 'TENANT_AGENT', status: 'inactive', lastLogin: '3 days ago' },
      ],
    },
    systemHealth: {
      status: 'operational',
      apiLatency: 120,
      databaseStatus: 'healthy',
      securityAlerts: 0,
      activeConnections: 47,
    },
    subscription: {
      plan: 'PROFESSIONAL',
      seatsUsed: 8,
      seatsTotal: 15,
      apiCallsUsed: 124000,
      apiCallsTotal: 200000,
      storageUsed: '2.4 GB',
      storageTotal: '10 GB',
      renewsOn: '2026-09-15',
    },
    recentAuditLog: [
      { id: '1', user: 'Rachel N.', action: 'Credit Policy Updated', details: 'Changed min score from 600 to 580', timestamp: '10 min ago', type: 'config' },
      { id: '2', user: 'System', action: 'User Created', details: 'New staff account for James Mwangi', timestamp: '1 hour ago', type: 'create' },
      { id: '3', user: 'Samuel O.', action: 'Loan Limit Increased', details: 'Customer John M. limit increased to KSh 100,000', timestamp: '2 hours ago', type: 'update' },
    ],
  }
}

function getManagerData(tenantId: string, userId: string) {
  return {
    performance: {
      applicationsThisWeek: { value: 45, change: 15, period: 'vs Last Week' },
      approvalRate: { value: 78, change: 3, period: 'vs Last Month' },
      collectionsToday: { value: 'KSh 89K', change: 12, period: 'vs Yesterday' },
    },
    pendingApprovals: [
      { id: 'APP-2026-0845', applicantName: 'John Mwangi', amount: 50000, creditScore: 722, riskLevel: 'LOW', submittedAt: '2 hrs ago' },
      { id: 'APP-2026-0846', applicantName: 'Sarah Achieng', amount: 25000, creditScore: 654, riskLevel: 'MEDIUM', submittedAt: '4 hrs ago' },
      { id: 'APP-2026-0847', applicantName: 'Peter Kamau', amount: 80000, creditScore: 589, riskLevel: 'HIGH', submittedAt: '6 hrs ago' },
    ],
    teamMembers: [
      { id: '1', name: 'Faith Chebet', role: 'LOAN_OFFICER', todayProcessed: 8, todayApproved: 6, weeklyProgress: 80 },
      { id: '2', name: 'David Kimani', role: 'LOAN_OFFICER', todayProcessed: 5, todayApproved: 4, weeklyProgress: 70 },
      { id: '3', name: 'Grace Mwangi', role: 'COLLECTIONS_AGENT', todayProcessed: 12, recovered: 'KSh 45K', weeklyProgress: 75 },
      { id: '4', name: 'Joseph Mutua', role: 'COLLECTIONS_AGENT', todayProcessed: 8, recovered: 'KSh 32K', weeklyProgress: 63 },
    ],
    creditDecisions: {
      approved: 34,
      rejected: 8,
      pending: 3,
      avgProcessingTime: 4.2,
    },
  }
}

function getLoanOfficerData(tenantId: string, userId: string) {
  return {
    dailyTargets: {
      applicationsProcessed: { current: 8, target: 12 },
      approvalsRecommended: { current: 6, target: 8 },
    },
    applicationQueue: [
      { id: 'APP-2026-0848', customerName: 'Mary Wanjiku', amount: 15000, purpose: 'School Fees', status: 'new', priority: 'high' },
      { id: 'APP-2026-0842', customerName: 'James Otieno', amount: 30000, purpose: 'Business Capital', status: 'in_review', priority: 'normal' },
      { id: 'APP-2026-0849', customerName: 'Grace Atieno', amount: 10000, purpose: 'Emergency', status: 'pending_info', priority: 'low' },
      { id: 'APP-2026-0850', customerName: 'Peter Njoroge', amount: 45000, purpose: 'Home Repair', status: 'new', priority: 'normal' },
      { id: 'APP-2026-0851', customerName: 'Alice Mumbi', amount: 20000, purpose: 'Inventory', status: 'new', priority: 'low' },
    ],
    currentReview: {
      applicationId: 'APP-2026-0842',
      customerName: 'James Otieno',
      customerId: 'CUS-78234',
      requestedAmount: 30000,
      term: 30,
      creditScore: 687,
      grade: 'B',
      riskLevel: 'MEDIUM',
      existingLoans: 2,
    },
    todaySummary: {
      approved: 6,
      inProgress: 2,
      awaitingInfo: 1,
      avgProcessingTime: '18 min',
    },
  }
}

function getCollectionsAgentData(tenantId: string, userId: string) {
  return {
    dailyGoals: {
      callsToMake: { current: 18, target: 25 },
      promisesReceived: { current: 8, target: 12 },
      amountRecovered: { current: 45000, target: 60000 },
    },
    assignedAccounts: [
      { id: 'LN-2026-0234', customerName: 'Peter Mwangi', daysOverdue: 45, amountDue: 8500, priority: 'critical', lastContact: '3 days ago' },
      { id: 'LN-2026-0198', customerName: 'Sarah Kamau', daysOverdue: 12, amountDue: 3200, priority: 'high', lastContact: 'Today' },
      { id: 'LN-2026-0212', customerName: 'John Otieno', daysOverdue: 8, amountDue: 2100, priority: 'medium', lastContact: 'Yesterday' },
      { id: 'LN-2026-0189', customerName: 'Grace Wanjiku', daysOverdue: 23, amountDue: 5600, priority: 'high', lastContact: '2 days ago' },
      { id: 'LN-2026-0201', customerName: 'James Kiplagat', daysOverdue: 31, amountDue: 12000, priority: 'critical', lastContact: '5 days ago' },
    ],
    promisesToPay: [
      { id: 'PTP-001', customerName: 'Alice Wanjiku', amount: 4000, promiseDate: 'Tomorrow', status: 'pending' },
      { id: 'PTP-002', customerName: 'Bob Maina', amount: 6000, promiseDate: 'Aug 28', status: 'pending' },
      { id: 'PTP-003', customerName: 'Catherine Atieno', amount: 3500, promiseDate: 'Aug 29', status: 'pending' },
    ],
    recoverySummary: {
      collectedToday: 45000,
      promisedToday: 32000,
      totalPotential: 77000,
    },
    contactLog: [
      { time: '10:30 AM', type: 'call', customerName: 'Peter M.', outcome: 'No answer, left voicemail' },
      { time: '11:15 AM', type: 'sms', customerName: 'Sarah K.', outcome: 'Promise to pay tomorrow - KSh 3,200' },
      { time: '02:15 PM', type: 'whatsapp', customerName: 'John O.', outcome: 'Confirmed payment by EOD' },
    ],
  }
}

function getFinanceOfficerData(tenantId: string, userId: string) {
  return {
    financialSummary: {
      disbursements: 180000,
      collections: 97000,
      feesCollected: 12000,
      netFlow: -71000,
    },
    pendingDisbursements: [
      { id: 'DIS-001', customerName: 'Mary Atieno', amount: 25000, method: 'mpesa', account: '07XX***XX12', status: 'pending' },
      { id: 'DIS-002', customerName: 'John Doe', amount: 50000, method: 'bank', account: '01XX***XX45', status: 'pending' },
      { id: 'DIS-003', customerName: 'Faith Wanjiku', amount: 15000, method: 'mpesa', account: '07XX***XX78', status: 'pending' },
      { id: 'DIS-004', customerName: 'Peter Kamau', amount: 35000, method: 'bank', account: '01XX***XX90', status: 'processing' },
    ],
    settlements: [
      { source: 'M-Pesa', transactionCount: 128, amount: 892000, status: 'pending' },
      { source: 'Bank Transfer', transactionCount: 12, amount: 340000, status: 'settled' },
      { source: 'Airtel Money', transactionCount: 45, amount: 156000, status: 'settled' },
    ],
    reconciliationAlerts: [
      { id: '1', type: 'unmatched', message: '3 unmatched transactions from today', severity: 'warning' },
      { id: '2', type: 'delayed', message: 'M-Pesa settlement delayed by 2 hours', severity: 'warning' },
    ],
    accountBalances: {
      mpesaFloat: { balance: 2450000, percentage: 65, status: 'adequate' },
      operatingAccount: { balance: 8750000, percentage: 87, status: 'healthy' },
      totalLiquidity: 11200000,
    },
  }
}

function getComplianceData(tenantId: string, userId: string) {
  return {
    metrics: {
      kycPendingReview: { value: 12, total: 45 },
      openAMLAlerts: { value: 8 },
      monthlyReportsGenerated: { value: 23, total: 30 },
      auditScore: { value: 94, total: 100 },
    },
    kycQueue: [
      { id: 'KYC-001', customerName: 'John Mwangi', customerId: 'CUS-90123', documentType: 'all', status: 'pending', priority: 'high', riskScore: 15 },
      { id: 'KYC-002', customerName: 'Sarah Achieng', customerId: 'CUS-90124', documentType: 'id', status: 'pending', priority: 'normal', riskScore: 8 },
      { id: 'KYC-003', customerName: 'Peter Kamau', customerId: 'CUS-90125', documentType: 'passport', status: 'reviewing', priority: 'normal', riskScore: 22 },
    ],
    amlAlerts: [
      { id: 'AML-001', type: 'suspicious_activity', description: 'Multiple loan applications from same device', severity: 'high', status: 'open' },
      { id: 'AML-002', type: 'large_transaction', description: 'Unusual large disbursement (KSh 500K)', severity: 'medium', status: 'investigating' },
      { id: 'AML-003', type: 'rapid_movement', description: 'Rapid repayment and re-borrowing pattern', severity: 'medium', status: 'open' },
    ],
    checklists: {
      daily: [
        { task: 'Review all new KYC submissions', completed: true, critical: true },
        { task: 'Process high-risk AML alerts', completed: false, critical: true },
        { task: 'Verify 5 random customer files', completed: true, critical: false },
      ],
      weekly: [
        { task: 'Generate weekly compliance report', progress: 80 },
        { task: 'Review exception reports', progress: 60 },
        { task: 'Sample loan file review (10%)', progress: 40 },
      ],
    },
  }
}

function getSupportData(tenantId: string, userId: string) {
  return {
    metrics: {
      openTickets: { value: 12, change: -3 },
      resolvedToday: { value: 8, change: 2 },
      avgResponseTime: { value: 12, change: -5 }, // minutes
      customerSatisfaction: { value: 94, change: 2 }, // percentage
    },
    tickets: [
      { id: 'TKT-1001', customerName: 'Mary Wanjiku', subject: 'Loan application stuck in review', category: 'loan_application', priority: 'high', status: 'open', createdAt: '10 min ago' },
      { id: 'TKT-1002', customerName: 'John Otieno', subject: 'Cannot make repayment via M-Pesa', category: 'repayment', priority: 'urgent', status: 'in_progress', createdAt: '30 min ago' },
      { id: 'TKT-1003', customerName: 'Grace Kamau', subject: 'Wrong amount deducted from account', category: 'account', priority: 'high', status: 'pending_customer', createdAt: '1 hr ago' },
      { id: 'TKT-1004', customerName: 'Peter Mwangi', subject: 'App not loading on my phone', category: 'technical', priority: 'normal', status: 'open', createdAt: '2 hrs ago' },
    ],
    faqItems: [
      { question: 'How do I apply for a loan?', category: 'Loan Application', usageCount: 245 },
      { question: 'Why was my loan rejected?', category: 'Credit Assessment', usageCount: 189 },
      { question: 'How to update my phone number?', category: 'Account Settings', usageCount: 156 },
    ],
  }
}

function getViewerData(tenantId: string, userId: string) {
  return {
    overview: {
      customers: { value: '8,231', change: '+12%' },
      activeLoans: { value: '842', change: '+5%' },
      loanPortfolio: { value: 'KSh 2.4B', change: '+8%' },
      collectionRate: { value: '94.2%', change: '+0.3%' },
    },
    portfolioSummary: [
      { category: 'Performing', count: 789, percentage: 93.7 },
      { category: 'Watchlist', count: 35, percentage: 4.2 },
      { category: 'Overdue (1-30 days)', count: 14, percentage: 1.7 },
      { category: 'Overdue (30+ days)', count: 4, percentage: 0.5 },
    ],
    recentActivity: [
      { type: 'loan', description: 'New loan disbursed to Mary W. - KSh 25,000', timestamp: '5 min ago' },
      { type: 'payment', description: 'Payment received from John O. - KSh 15,000', timestamp: '15 min ago' },
      { type: 'application', description: 'New application submitted by Peter K.', timestamp: '30 min ago' },
    ],
  }
}

// Main handler
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') as UserRole
    const tenantId = searchParams.get('tenantId') || 'default'
    const userId = searchParams.get('userId') || 'anonymous'

    if (!role) {
      return NextResponse.json(
        { success: false, error: 'Role parameter is required' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles: UserRole[] = ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'TENANT_STAFF', 'TENANT_AGENT', 'CUSTOMER']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role specified' },
        { status: 400 }
      )
    }

    // Get data based on role
    let data: Record<string, unknown>

    switch (role) {
      case 'SUPER_ADMIN':
      case 'TENANT_ADMIN':
        data = getTenantAdminData(tenantId, userId)
        break
      case 'MANAGER':
        data = getManagerData(tenantId, userId)
        break
      case 'TENANT_STAFF':
        data = getLoanOfficerData(tenantId, userId)
        break
      case 'TENANT_AGENT':
        data = getCollectionsAgentData(tenantId, userId)
        break
      case 'CUSTOMER':
        data = getViewerData(tenantId, userId)
        break
      default:
        data = getViewerData(tenantId, userId)
    }

    const response: WorkspaceDataResponse = {
      success: true,
      role,
      data,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Workspace API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
