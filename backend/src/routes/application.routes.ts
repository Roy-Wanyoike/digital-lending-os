/**
 * Loan Application Routes
 * 
 * Application lifecycle: submission, review, approval, rejection.
 */

import { Router } from 'express';
import { db } from '../../prisma/client';
import { authenticate, requireRoles, requireTenantAccess } from '../middleware/auth';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  paginatedResponse,
  forbiddenResponse,
} from '../utils/response';
import { AuthRequest, ApplicationStatus } from '../types';

export const applicationRoutes = Router();

applicationRoutes.use(authenticate);
applicationRoutes.use(requireTenantAccess);

/**
 * GET /api/v1/applications
 * List loan applications
 */
applicationRoutes.get('/', async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const tenantId = (req.query.tenantId as string) || req.user?.tenantId;
    const status = req.query.status as ApplicationStatus | undefined;
    const customerId = req.query.customerId as string | undefined;

    if (!tenantId) {
      return require('../utils/response').badRequestResponse(res, 'tenantId is required');
    }

    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const [applications, total] = await Promise.all([
      db.loanApplication.findMany({
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
          reviewer: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      db.loanApplication.count({ where }),
    ]);

    return paginatedResponse(res, applications, page, limit, total);
  } catch (error) {
    console.error('Error fetching applications:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to fetch applications');
  }
});

/**
 * GET /api/v1/applications/:id
 * Get application by ID with full details
 */
applicationRoutes.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const application = await db.loanApplication.findUnique({
      where: { id },
      include: {
        customer: true,
        product: true,
        reviewer: {
          select: { id: true, name: true, email: true, role: true },
        },
        documents: true,
      },
    });

    if (!application) {
      return notFoundResponse(res, 'Application');
    }

    if (req.user?.role !== 'SUPER_ADMIN' && application.tenantId !== req.user?.tenantId) {
      return forbiddenResponse(res, 'Access denied');
    }

    // Parse JSON fields
    let parsedDetails = null;
    if (typeof application.details === 'string') {
      try { parsedDetails = JSON.parse(application.details); } catch { /* ignore */ }
    }

    return successResponse(res, { ...application, parsedDetails });
  } catch (error) {
    console.error('Error fetching application:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to fetch application');
  }
});

/**
 * POST /api/v1/applications
 * Create new loan application
 */
applicationRoutes.post('/', async (req: AuthRequest, res) => {
  try {
    const body = req.body;
    const tenantId = body.tenantId || req.user?.tenantId;

    if (!tenantId) {
      return require('../utils/response').badRequestResponse(res, 'tenantId is required');
    }

    // Verify customer exists
    const customer = await db.customer.findFirst({
      where: { id: body.customerId, tenantId },
    });

    if (!customer) {
      return notFoundResponse(res, 'Customer');
    }

    // Generate application number
    const appCount = await db.loanApplication.count({ where: { tenantId } });
    const appNumber = `APP-${new Date().getFullYear()}-${String(appCount + 1).padStart(6, '0')}`;

    const application = await db.loanApplication.create({
      data: {
        tenantId,
        customerId: body.customerId,
        productId: body.productId,
        appNumber,
        requestedAmount: body.requestedAmount,
        purpose: body.purpose || null,
        termDays: body.termDays || null,
        status: 'SUBMITTED',
        details: JSON.stringify(body.details || {}),
        submittedAt: new Date(),
      },
    });

    return createdResponse(res, application, 'Application submitted successfully');
  } catch (error) {
    console.error('Error creating application:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to create application');
  }
});

/**
 * PATCH /api/v1/applications/:id/review
 * Review and approve/reject application
 */
applicationRoutes.patch('/:id/review', requireRoles(['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'LOAN_OFFICER']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { decision, notes, approvedAmount, interestRate, termDays } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return require('../utils/response').badRequestResponse(res, 'Decision must be APPROVED or REJECTED');
    }

    const existingApp = await db.loanApplication.findUnique({ where: { id } });
    if (!existingApp) {
      return notFoundResponse(res, 'Application');
    }

    if (!['SUBMITTED', 'UNDER_REVIEW'].includes(existingApp.status)) {
      return require('../utils/response').badRequestResponse(
        res,
        `Cannot review application in ${existingApp.status} status`
      );
    }

    const updateData: Record<string, unknown> = {
      status: decision,
      reviewedBy: req.user!.id,
      reviewedAt: new Date(),
      reviewNotes: notes || null,
    };

    if (decision === 'APPROVED') {
      updateData.approvedAmount = approvedAmount || existingApp.requestedAmount;
      updateData.approvedInterestRate = interestRate || null;
      updateData.approvedTermDays = termDays || null;
    }

    const updatedApp = await db.loanApplication.update({
      where: { id },
      data: updateData,
    });

    return successResponse(
      res,
      updatedApp,
      `Application ${decision.toLowerCase()} successfully`
    );
  } catch (error) {
    console.error('Error reviewing application:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to review application');
  }
});
