/**
 * Loan Management Routes
 * 
 * Complete loan lifecycle: creation, disbursement, status updates, and queries.
 * 
 * @openapi
 * tags: [Loans]
 */

import { Router } from 'express';
import { db } from '../lib/db';
import { authenticate, requireRoles, requireTenantAccess } from '../middleware/auth';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  paginatedResponse,
  forbiddenResponse,
  badRequestResponse,
} from '../utils/response';
import { getQueryString, getQueryNumber } from '../utils/queryHelpers';
import { validate, createLoanSchema, paginationSchema } from '../middleware/validation';
import { AuthRequest, LoanStatus, ArrearsStatus } from '../types';

export const loanRoutes = Router();

// All loan routes require authentication
loanRoutes.use(authenticate);
loanRoutes.use(requireTenantAccess);

/**
 * @openapi
 * /loans:
 *   get:
 *     summary: List loans
 *     description: |
 *       Retrieve a paginated list of loans with filtering options.
 *       Supports filtering by status, customer ID, and arrears status.
 *       Customer role should use /customers/{id}/loans instead.
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *         description: Filter by tenant ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [APPROVED, PENDING_DISBURSEMENT, ACTIVE, IN_ARREARS, PAID_OFF, DEFAULTED, RESTRUCTURED, WRITTEN_OFF, CANCELLED]
 *         description: Filter by loan status
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by customer ID
 *       - in: query
 *         name: arrearsStatus
 *         schema:
 *           type: string
 *           enum: [CURRENT, 1_30_DAYS, 31_60_DAYS, 61_90_DAYS, OVER_90_DAYS]
 *         description: Filter by arrears status
 *     responses:
 *       200:
 *         description: List of loans retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       403:
 *         description: Forbidden - CUSTOMER role cannot access this endpoint directly
 */
loanRoutes.get('/', async (req: AuthRequest, res) => {
  try {
    const page = getQueryNumber(req.query, "page", 1) || 1;
    const limit = getQueryNumber(req.query, "limit", 20) || 20;
    const tenantId = getQueryString(req.query, "tenantId") || req.user?.tenantId;
    const status = req.query.status as LoanStatus | undefined;
    const customerId = getQueryString(req.query, "customerId") as string | undefined;
    const arrearsStatus = req.query.arrearsStatus as ArrearsStatus | undefined;

    if (!tenantId) {
      return badRequestResponse(res, 'tenantId is required');
    }

    // Customers cannot access this endpoint directly
    if (req.user?.role === 'CUSTOMER') {
      return forbiddenResponse(res, 'Use /api/v1/customers/:id/loans instead');
    }

    const where: Record<string, unknown> = { tenantId };
    
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (arrearsStatus) where.arrearsStatus = arrearsStatus;

    const [loans, total] = await Promise.all([
      db.loan.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
          product: {
            select: { id: true, name: true, category: true },
          },
          _count: {
            select: { repayments: true },
          },
        },
      }),
      db.loan.count({ where }),
    ]);

    return paginatedResponse(res, loans, page, limit, total);
  } catch (error) {
    console.error('Error fetching loans:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to fetch loans');
  }
});

/**
 * @openapi
 * /loans/{id}:
 *   get:
 *     summary: Get loan by ID
 *     description: Retrieve detailed loan information including repayment schedule and history.
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Loan unique identifier
 *     responses:
 *       200:
 *         description: Loan details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Loan'
 *                     - type: object
 *                       properties:
 *                         parsedRepaymentSchedule:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               installmentNo:
 *                                 type: integer
 *                               dueDate:
 *                                 type: string
 *                               principal:
 *                                 type: number
 *                               interest:
 *                                 type: number
 *                               total:
 *                                 type: number
 *                               status:
 *                                 type: string
 *       403:
 *         description: Cannot access other tenant's loan
 *       404:
 *         description: Loan not found
 */
loanRoutes.get('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);

    const loan = await db.loan.findUnique({
      where: { id },
      include: {
        customer: true,
        product: true,
        application: true,
        repayments: {
          orderBy: { dueDate: 'desc' },
          take: 12,
        },
      },
    });

    if (!loan) {
      return notFoundResponse(res, 'Loan');
    }

    // Check tenant access
    if (req.user?.role !== 'SUPER_ADMIN' && loan.tenantId !== req.user?.tenantId) {
      return forbiddenResponse(res, 'Cannot access other tenant data');
    }

    // Parse repayment schedule if stored as JSON
    let repaymentSchedule = null;
    if (typeof loan.repaymentSchedule === 'string') {
      try {
        repaymentSchedule = JSON.parse(loan.repaymentSchedule);
      } catch {
        repaymentSchedule = null;
      }
    }

    return successResponse(res, {
      ...loan,
      parsedRepaymentSchedule: repaymentSchedule,
    });
  } catch (error) {
    console.error('Error fetching loan:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to fetch loan');
  }
});

/**
 * @openapi
 * /loans:
 *   post:
 *     summary: Create new loan
 *     description: |
 *       Create a new loan from an approved application.
 *       Requires MANAGER or higher role.
 *       Automatically generates loan number, calculates financials, and creates repayment schedule.
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateLoanRequest'
 *     responses:
 *       201:
 *         description: Loan created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Loan'
 *                 message:
 *                   type: string
 *                   example: "Loan created successfully"
 *       400:
 *         description: Invalid input or validation error
 *       403:
 *         description: Requires MANAGER or higher role
 *       404:
 *         description: Customer or product not found
 */
loanRoutes.post('/', requireRoles(['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER']), validate(createLoanSchema), async (req: AuthRequest, res) => {
  try {
    const body = req.body;

    // Verify customer exists and belongs to tenant
    const customer = await db.customer.findFirst({
      where: { id: body.customerId, tenantId: body.tenantId },
    });

    if (!customer) {
      return notFoundResponse(res, 'Customer not found or does not belong to this tenant');
    }

    // Verify product exists
    const product = await db.product.findUnique({
      where: { id: body.productId },
    });

    if (!product) {
      return notFoundResponse(res, 'Product');
    }

    // Generate loan number
    const loanCount = await db.loan.count({
      where: { tenantId: body.tenantId },
    });
    const loanNumber = `LN-${new Date().getFullYear()}-${String(loanCount + 1).padStart(6, '0')}`;

    // Calculate financials
    const actualAmount = body.approvedAmount || body.principal;
    const months = Math.ceil(body.termDays / 30);
    const monthlyRate = body.interestRate / 100;
    const totalInterest = body.principal * monthlyRate * months;
    const totalFees = (body.processingFee || 0) + (body.insuranceFee || 0);
    const totalRepayable = body.principal + totalInterest + totalFees;

    // Generate repayment schedule
    const schedule = generateRepaymentSchedule(
      body.principal,
      body.interestRate,
      body.termDays,
      months
    );

    // Calculate dates
    const disbursementDate = new Date();
    const maturityDate = new Date(disbursementDate);
    maturityDate.setDate(maturityDate.getDate() + body.termDays);

    const loan = await db.loan.create({
      data: {
        tenantId: body.tenantId,
        customerId: body.customerId,
        applicationId: body.applicationId || null,
        productId: body.productId,
        loanNumber,
        principal: body.principal,
        approvedAmount: actualAmount,
        interestRate: body.interestRate,
        interestType: body.interestType,
        processingFee: body.processingFee || 0,
        insuranceFee: body.insuranceFee || 0,
        totalInterest,
        totalFees,
        totalRepayable,
        termDays: body.termDays,
        disbursementDate,
        maturityDate,
        outstandingBalance: totalRepayable,
        nextPaymentDue: getNextPaymentDate(disbursementDate, 30),
        status: 'APPROVED',
        arrearsStatus: 'CURRENT',
        disbursementMethod: body.disbursementMethod,
        disbursementAccount: body.disbursementAccount || null,
        repaymentSchedule: JSON.stringify(schedule),
      },
    });

    return createdResponse(res, loan, 'Loan created successfully');
  } catch (error) {
    console.error('Error creating loan:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to create loan');
  }
});

/**
 * @openapi
 * /loans/{id}/status:
 *   patch:
 *     summary: Update loan status
 *     description: |
 *       Transition a loan to a new status.
 *       Only valid state transitions are allowed:
 *       - APPROVED → PENDING_DISBURSEMENT, CANCELLED
 *       - PENDING_DISBURSEMENT → ACTIVE, CANCELLED
 *       - ACTIVE → IN_ARREARS, PAID_OFF, RESTRUCTURED, DEFAULTED
 *       - IN_ARREARS → ACTIVE, DEFAULTED, RESTRUCTURED, WRITTEN_OFF
 *       - DEFAULTED → WRITTEN_OFF, RESTRUCTURED
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateLoanStatusRequest'
 *     responses:
 *       200:
 *         description: Loan status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Loan'
 *                 message:
 *                   type: string
 *                   example: "Loan status updated to ACTIVE"
 *       400:
 *         description: Invalid status transition
 *       403:
 *         description: Requires MANAGER or higher role
 *       404:
 *         description: Loan not found
 */
loanRoutes.patch('/:id/status', requireRoles(['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER']), async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const { status, notes } = req.body;

    const validTransitions: Record<string, LoanStatus[]> = {
      APPROVED: ['PENDING_DISBURSEMENT', 'CANCELLED'],
      PENDING_DISBURSEMENT: ['ACTIVE', 'CANCELLED'],
      ACTIVE: ['IN_ARREARS', 'PAID_OFF', 'RESTRUCTURED', 'DEFAULTED'],
      IN_ARREARS: ['ACTIVE', 'DEFAULTED', 'RESTRUCTURED', 'WRITTEN_OFF'],
      DEFAULTED: ['WRITTEN_OFF', 'RESTRUCTURED'],
    };

    const existingLoan = await db.loan.findUnique({ where: { id } });
    if (!existingLoan) {
      return notFoundResponse(res, 'Loan');
    }

    // Validate transition
    const allowedTargets = validTransitions[existingLoan.status] || [];
    if (!allowedTargets.includes(status)) {
      return badRequestResponse(
        res,
        `Invalid status transition from ${existingLoan.status} to ${status}`
      );
    }

    const updateData: Record<string, unknown> = { status };

    // Handle specific transitions
    switch (status) {
      case 'PENDING_DISBURSEMENT':
        updateData.disbursementDate = null; // Will be set on actual disbursement
        break;
      case 'ACTIVE':
        updateData.disbursementDate = new Date();
        break;
      case 'PAID_OFF':
        updateData.outstandingBalance = 0;
        updateData.paidOffAt = new Date();
        break;
      case 'WRITTEN_OFF':
        updateData.outstandingBalance = 0;
        updateData.writtenOffAt = new Date();
        break;
    }

    const updatedLoan = await db.loan.update({
      where: { id },
      data: updateData,
    });

    return successResponse(res, updatedLoan, `Loan status updated to ${status}`);
  } catch (error) {
    console.error('Error updating loan status:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to update loan status');
  }
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRepaymentSchedule(
  principal: number,
  annualRate: number,
  termDays: number,
  installments: number
): Array<{
  installmentNo: number;
  dueDate: string;
  principal: number;
  interest: number;
  fees: number;
  total: number;
  status: string;
}> {
  const schedule = [];
  const monthlyInterest = (annualRate / 100) * principal / 12;
  const principalPerInstallment = principal / installments;

  for (let i = 1; i <= installments; i++) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (termDays / installments) * i);

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

function getNextPaymentDate(startDate: Date, daysToAdd: number): Date {
  const nextDate = new Date(startDate);
  nextDate.setDate(nextDate.getDate() + daysToAdd);
  return nextDate;
}
