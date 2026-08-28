/**
 * Credit & Risk Assessment Routes
 * 
 * Credit scoring, eligibility rules, CRB integration.
 */

import { Router } from 'express';
import { db } from '../../prisma/client';
import { authenticate, requireRoles, requireTenantAccess } from '../middleware/auth';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  paginatedResponse,
  badRequestResponse,
} from '../utils/response';
import { AuthRequest } from '../types';

export const creditRoutes = Router();

creditRoutes.use(authenticate);
creditRoutes.use(requireTenantAccess);

/**
 * GET /api/v1/credit
 * Credit dashboard with scoring overview
 */
creditRoutes.get('/', async (req: AuthRequest, res) => {
  try {
    const tenantId = (req.query.tenantId as string) || req.user?.tenantId;

    if (!tenantId) {
      return badRequestResponse(res, 'tenantId is required');
    }

    // Get credit statistics
    const [totalAssessments, avgScore, scoreDistribution] = await Promise.all([
      // Mock - would query credit_assessments table
      Promise.resolve(1250),
      Promise.resolve(680),
      Promise.resolve([
        { range: '800-1000 (A+)', count: 180, percentage: 14.4 },
        { range: '700-799 (A)', count: 320, percentage: 25.6 },
        { range: '600-699 (B)', count: 410, percentage: 32.8 },
        { range: '500-599 (C)', count: 220, percentage: 17.6 },
        { range: 'Below 500 (D-F)', count: 120, percentage: 9.6 },
      ]),
    ]);

    return successResponse(res, {
      summary: {
        totalAssessments,
        averageScore: avgScore,
        approvalRate: 72.5,
        defaultRate: 8.2,
      },
      scoreDistribution,
      riskMetrics: {
        highRiskApplications: 150,
        mediumRiskApplications: 380,
        lowRiskApplications: 720,
      },
    });
  } catch (error) {
    console.error('Error fetching credit data:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to fetch credit data');
  }
});

/**
 * POST /api/v1/credit/assessment
 * Perform credit assessment for a customer
 */
creditRoutes.post('/assessment', async (req: AuthRequest, res) => {
  try {
    const { customerId, requestedAmount, termDays, includeCRBCheck } = req.body;

    if (!customerId || !requestedAmount) {
      return badRequestResponse(res, 'customerId and requestedAmount are required');
    }

    // Verify customer exists
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      include: { loans: true, repayments: true },
    });

    if (!customer) {
      return notFoundResponse(res, 'Customer');
    }

    // Perform credit scoring calculation
    const assessmentResult = performCreditScoring(customer, requestedAmount, termDays || 30);

    return successResponse(res, {
      ...assessmentResult,
      assessedAt: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });
  } catch (error) {
    console.error('Error performing credit assessment:', error);
    return require('../utils/response').errorResponse(res, 500, 'Credit assessment failed');
  }
});

/**
 * GET /api/v1/credit/rules
 * List eligibility rules
 */
creditRoutes.get('/rules', async (_req: AuthRequest, res) => {
  const rules = [
    {
      id: 'rule-1',
      name: 'Minimum Income Check',
      description: 'Customer must have verifiable monthly income of at least KSh 15,000',
      condition: 'incomeAmount >= 15000',
      enabled: true,
      priority: 1,
      action: 'REJECT',
    },
    {
      id: 'rule-2',
      name: 'Maximum Debt-to-Income Ratio',
      description: 'Total debt repayments must not exceed 50% of monthly income',
      condition: 'debtToIncomeRatio <= 0.5',
      enabled: true,
      priority: 2,
      action: 'REVIEW',
    },
    {
      id: 'rule-3',
      name: 'Active Loan Limit',
      description: 'Customer cannot have more than 3 active loans',
      condition: 'activeLoans < 3',
      enabled: true,
      priority: 3,
      action: 'REJECT',
    },
    {
      id: 'rule-4',
      name: 'No Recent Defaults',
      description: 'No loan defaults in the last 12 months',
      condition: 'daysSinceLastDefault > 365 OR noDefaults',
      enabled: true,
      priority: 4,
      action: 'REVIEW',
    },
    {
      id: 'rule-5',
      name: 'Age Requirement',
      description: 'Customer must be between 18 and 65 years old',
      condition: 'age >= 18 AND age <= 65',
      enabled: true,
      priority: 5,
      action: 'REJECT',
    },
  ];

  return successResponse(res, { rules, totalRules: rules.length });
});

/**
 * PUT /api/v1/credit/rules/:id
 * Update eligibility rule
 */
creditRoutes.put('/rules/:id', requireRoles(['SUPER_ADMIN', 'TENANT_ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // In production: Update rule in database
    const updatedRule = {
      id,
      ...updates,
      updatedAt: new Date(),
      updatedBy: req.user!.id,
    };

    return successResponse(res, updatedRule, 'Rule updated successfully');
  } catch (error) {
    console.error('Error updating rule:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to update rule');
  }
});

/**
 * GET /api/v1/credit/policies
 * Get credit policies and limits
 */
creditRoutes.get('/policies', async (_req: AuthRequest, res) => {
  const policies = [
    {
      id: 'policy-1',
      name: 'Standard Consumer Lending Policy',
      version: '2.1',
      effectiveDate: '2024-01-01',
      status: 'ACTIVE',
      limits: {
        minLoanAmount: 500,
        maxLoanAmount: 150000,
        minTermDays: 7,
        maxTermDays: 180,
        maxInterestRate: 20,
        defaultInterestRate: 15,
      },
      criteria: {
        minimumCreditScore: 550,
        maximumDTI: 0.5,
        maximumActiveLoans: 3,
      },
    },
    {
      id: 'policy-2',
      name: 'Digital Product Financing Policy',
      version: '1.0',
      effectiveDate: '2024-06-01',
      status: 'ACTIVE',
      limits: {
        minLoanAmount: 1000,
        maxLoanAmount: 100000,
        minTermDays: 30,
        maxTermDays: 90,
        maxInterestRate: 18,
        defaultInterestRate: 12,
      },
      criteria: {
        minimumCreditScore: 600,
        maximumDTI: 0.4,
        maximumActiveLoans: 2,
      },
    },
  ];

  return successResponse(res, { policies, totalPolicies: policies.length });
});

// =============================================================================
// CREDIT SCORING ENGINE
// =============================================================================

function performCreditScoring(
  customer: any,
  requestedAmount: number,
  termDays: number
): Record<string, unknown> {
  let score = 500; // Base score
  const factors: Array<{ category: string; weight: number; score: number; description: string }> = [];

  // Factor 1: Customer age/history (weight: 15%)
  const daysAsCustomer = Math.floor((Date.now() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  if (daysAsCustomer > 365) {
    score += 75;
    factors.push({ category: 'Customer History', weight: 15, score: 75, description: 'Long-term customer (>1 year)' });
  } else if (daysAsCustomer > 180) {
    score += 50;
    factors.push({ category: 'Customer History', weight: 15, score: 50, description: 'Established customer (>6 months)' });
  } else if (daysAsCustomer > 90) {
    score += 25;
    factors.push({ category: 'Customer History', weight: 15, score: 25, description: 'Recent customer (>3 months)' });
  } else {
    score += 0;
    factors.push({ category: 'Customer History', weight: 15, score: 0, description: 'New customer (<3 months)' });
  }

  // Factor 2: Loan repayment history (weight: 35%)
  const totalLoans = customer.loans?.length || 0;
  const paidOffLoans = customer.loans?.filter((l: any) => l.status === 'PAID_OFF')?.length || 0;
  
  if (totalLoans === 0) {
    score += 40; // Neutral for first-time borrowers
    factors.push({ category: 'Repayment History', weight: 35, score: 40, description: 'First-time borrower' });
  } else {
    const repaymentRate = paidOffLoans / totalLoans;
    if (repaymentRate >= 0.9) {
      score += 100;
      factors.push({ category: 'Repayment History', weight: 35, score: 100, description: `Excellent (${paidOffLoans}/${totalLoans} loans repaid)` });
    } else if (repaymentRate >= 0.7) {
      score += 70;
      factors.push({ category: 'Repayment History', weight: 35, score: 70, description: `Good (${paidOffLoans}/${totalLoans} loans repaid)` });
    } else if (repaymentRate >= 0.5) {
      score += 40;
      factors.push({ category: 'Repayment History', weight: 35, score: 40, description: `Fair (${paidOffLoans}/${totalLoans} loans repaid)` });
    } else {
      score += 10;
      factors.push({ category: 'Repayment History', weight: 35, score: 10, description: `Poor (${paidOffLoans}/${totalLoans} loans repaid)` });
    }
  }

  // Factor 3: Income stability (weight: 20%)
  if (customer.incomeAmount && customer.incomeAmount >= 30000) {
    score += 100;
    factors.push({ category: 'Income Stability', weight: 20, score: 100, description: 'High income (>=KSh 30K/month)' });
  } else if (customer.incomeAmount && customer.incomeAmount >= 20000) {
    score += 75;
    factors.push({ category: 'Income Stability', weight: 20, score: 75, description: 'Good income (>=KSh 20K/month)' });
  } else if (customer.incomeAmount && customer.incomeAmount >= 15000) {
    score += 50;
    factors.push({ category: 'Income Stability', weight: 20, score: 50, description: 'Moderate income (>=KSh 15K/month)' });
  } else {
    score += 20;
    factors.push({ category: 'Income Stability', weight: 20, score: 20, description: 'Low or unverified income' });
  }

  // Factor 4: Employment status (weight: 15%)
  if (customer.employmentStatus === 'EMPLOYED') {
    score += 85;
    factors.push({ category: 'Employment Status', weight: 15, score: 85, description: 'Formally employed' });
  } else if (customer.employmentStatus === 'SELF_EMPLOYED') {
    score += 65;
    factors.push({ category: 'Employment Status', weight: 15, score: 65, description: 'Self-employed' });
  } else {
    score += 30;
    factors.push({ category: 'Employment Status', weight: 15, score: 30, description: 'Unemployed or student' });
  }

  // Factor 5: Existing debt burden (weight: 15%)
  const activeLoans = customer.loans?.filter((l: any) => ['ACTIVE', 'IN_ARREARS'].includes(l.status)) || [];
  const totalOutstanding = activeLoans.reduce((sum: number, l: any) => sum + (l.outstandingBalance || 0), 0);
  const dti = customer.incomeAmount ? totalOutstanding / (customer.incomeAmount * (termDays / 30)) : 1;

  if (dti < 0.3) {
    score += 100;
    factors.push({ category: 'Debt Burden', weight: 15, score: 100, description: 'Low DTI ratio' });
  } else if (dti < 0.5) {
    score += 60;
    factors.push({ category: 'Debt Burden', weight: 15, score: 60, description: 'Moderate DTI ratio' });
  } else {
    score += 20;
    factors.push({ category: 'Debt Burden', weight: 15, score: 20, description: 'High DTI ratio' });
  }

  // Cap score between 0-1000
  score = Math.max(0, Math.min(1000, Math.round(score)));

  // Determine grade and risk level
  let grade: string, riskLevel: string, maxRecommendedAmount: number;

  if (score >= 800) {
    grade = 'A+';
    riskLevel = 'LOW';
    maxRecommendedAmount = 150000;
  } else if (score >= 700) {
    grade = 'A';
    riskLevel = 'LOW';
    maxRecommendedAmount = 120000;
  } else if (score >= 600) {
    grade = 'B';
    riskLevel = 'MEDIUM';
    maxRecommendedAmount = 80000;
  } else if (score >= 500) {
    grade = 'C';
    riskLevel = 'HIGH';
    maxRecommendedAmount = 40000;
  } else if (score >= 400) {
    grade = 'D';
    riskLevel = 'VERY_HIGH';
    maxRecommendedAmount = 20000;
  } else {
    grade = 'F';
    riskLevel = 'VERY_HIGH';
    maxRecommendedAmount = 0;
  }

  return {
    score,
    grade,
    riskLevel,
    maxRecommendedAmount,
    recommendedInterestRate: riskLevel === 'LOW' ? 12 : riskLevel === 'MEDIUM' ? 15 : riskLevel === 'HIGH' ? 18 : 22,
    decision: score >= 500 ? 'APPROVE' : 'REJECT',
    factors,
  };
}
