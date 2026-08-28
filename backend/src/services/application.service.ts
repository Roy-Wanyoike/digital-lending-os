/**
 * Application Service
 * 
 * Business logic for loan application processing workflow including:
 * - Application submission and validation
 * - Review and approval/rejection
 * - State machine management
 * - Credit assessment integration
 */

import { logger } from '../utils/logger';
import { db } from '../../prisma/client';
import { CreateApplicationInput, ApplicationStatus, ApplicationStep } from '../types';

export interface ApplicationQueryParams {
  page?: number;
  limit?: number;
  tenantId: string;
  status?: ApplicationStatus;
  customerId?: string;
}

export interface ReviewDecision {
  decision: 'APPROVED' | 'REJECTED';
  notes?: string;
  approvedAmount?: number;
  interestRate?: number;
  termDays?: number;
}

export class ApplicationService {
  /**
   * List loan applications with filtering
   */
  async findAll(params: ApplicationQueryParams) {
    const { page = 1, limit = 20, tenantId, status, customerId } = params;

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
        },
      }),
      db.loanApplication.count({ where }),
    ]);

    return {
      items: applications,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get application by ID with full details
   */
  async findById(id: string) {
    const application = await db.loanApplication.findUnique({
      where: { id },
      include: {
        customer: true,
        product: true,
        documents: true,
      },
    });

    if (!application) {
      const error: any = new Error('Application not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    return application;
  }

  /**
   * Create new loan application
   */
  async create(data: CreateApplicationInput, userId?: string) {
    // Verify customer exists
    const customer = await db.customer.findFirst({
      where: { id: data.customerId, tenantId: data.tenantId },
    });

    if (!customer) {
      const error: any = new Error('Customer not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    // Verify product exists
    const product = await db.loanProduct.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      const error: any = new Error('Product not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    // Generate application number
    const appCount = await db.loanApplication.count({ where: { tenantId: data.tenantId } });
    const appNumber = `APP-${new Date().getFullYear()}-${String(appCount + 1).padStart(6, '0')}`;

    const application = await db.loanApplication.create({
      data: {
        tenantId: data.tenantId,
        customerId: data.customerId,
        productId: data.productId,
        requestedAmount: data.requestedAmount,
        purpose: data.purpose || null,
        termDays: data.termDays || null,
        status: 'SUBMITTED',
        submittedAt: new Date(),
        currentStep: 'SUBMISSION',
        stepHistory: JSON.stringify([{
          step: 'SUBMISSION',
          enteredAt: new Date().toISOString(),
          by: userId,
        }]),
      },
    });

    logger.info('Application created', { 
      applicationId: application.id, 
      appNumber,
      customerId: data.customerId 
    });

    return application;
  }

  /**
   * Submit a draft application
   */
  async submit(applicationId: string): Promise<void> {
    const app = await db.loanApplication.findUnique({ where: { id: applicationId } });
    
    if (!app) {
      throw new Error('Application not found');
    }

    if (app.status !== 'DRAFT') {
      throw new Error('Only draft applications can be submitted');
    }

    await db.loanApplication.update({
      where: { id: applicationId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        currentStep: 'KYC_VERIFICATION',
      },
    });
  }

  /**
   * Review and approve/reject application
   */
  async review(applicationId: string, decision: ReviewDecision, reviewerId: string) {
    const existingApp = await db.loanApplication.findUnique({ where: { id: applicationId } });
    if (!existingApp) {
      const error: any = new Error('Application not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    if (!['SUBMITTED', 'UNDER_REVIEW'].includes(existingApp.status)) {
      const error: any = new Error(`Cannot review application in ${existingApp.status} status`);
      error.code = 'INVALID_STATUS';
      throw error;
    }

    const updateData: Record<string, any> = {
      status: decision.decision,
      decisionBy: reviewerId,
      reviewedAt: new Date(),
      decisionNotes: decision.notes || null,
    };

    if (decision.decision === 'APPROVED') {
      updateData.approvedAmount = decision.approvedAmount || existingApp.requestedAmount;
      updateData.currentStep = 'DISBURSEMENT_PREPARATION';
    } else {
      updateData.rejectionReason = decision.notes || 'Application does not meet requirements';
      updateData.currentStep = 'CANCELLED';
    }

    // Update step history
    const stepHistory = this.addToStepHistory(
      existingApp.stepHistory,
      decision.decision === 'APPROVED' ? 'MANUAL_REVIEW' : 'CANCELLED',
      reviewerId
    );
    updateData.stepHistory = JSON.stringify(stepHistory);

    const updatedApp = await db.loanApplication.update({
      where: { id: applicationId },
      data: updateData,
    });

    logger.info(`Application ${decision.decision.toLowerCase()}`, { 
      applicationId, 
      reviewerId,
      decision: decision.decision 
    });

    return updatedApp;
  }

  /**
   * Advance application to next step in workflow
   */
  async advanceStep(applicationId: string, userId: string): Promise<ApplicationStep> {
    const app = await db.loanApplication.findUnique({ where: { id: applicationId } });
    
    if (!app) {
      throw new Error('Application not found');
    }

    const stepOrder: ApplicationStep[] = [
      'SUBMISSION',
      'KYC_VERIFICATION',
      'CREDIT_ASSESSMENT',
      'AFFORDABILITY_CHECK',
      'MANUAL_REVIEW',
      'MANAGER_APPROVAL',
      'DOCUMENT_SIGNING',
      'DISBURSEMENT_PREPARATION',
      'DISBURSED',
      'COMPLETED',
    ];

    const currentIndex = stepOrder.indexOf(app.currentStep);
    if (currentIndex === -1 || currentIndex >= stepOrder.length - 2) {
      throw new Error('Cannot advance further in workflow');
    }

    const nextStep = stepOrder[currentIndex + 1];
    const stepHistory = this.addToStepHistory(app.stepHistory, nextStep, userId);

    await db.loanApplication.update({
      where: { id: applicationId },
      data: {
        currentStep: nextStep,
        stepHistory: JSON.stringify(stepHistory),
        ...(nextStep === 'UNDER_REVIEW' && { status: 'UNDER_REVIEW', reviewedAt: new Date() }),
      },
    });

    logger.info('Application advanced to next step', { applicationId, nextStep });

    return nextStep;
  }

  /**
   * Cancel application
   */
  async cancel(applicationId: string, reason: string, userId: string): Promise<void> {
    const app = await db.loanApplication.findUnique({ where: { id: applicationId } });
    
    if (!app) {
      throw new Error('Application not found');
    }

    if (!['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'].includes(app.status)) {
      throw new Error('Cannot cancel application in current status');
    }

    const stepHistory = this.addToStepHistory(app.stepHistory, 'CANCELLED', userId);

    await db.loanApplication.update({
      where: { id: applicationId },
      data: {
        status: 'CANCELLED',
        currentStep: 'CANCELLED',
        rejectionReason: reason,
        stepHistory: JSON.stringify(stepHistory),
      },
    });

    logger.info('Application cancelled', { applicationId, reason });
  }

  /**
   * Withdraw application (customer action)
   */
  async withdraw(applicationId: string): Promise<void> {
    const app = await db.loanApplication.findUnique({ where: { id: applicationId } });
    
    if (!app) {
      throw new Error('Application not found');
    }

    if (!['SUBMITTED', 'UNDER_REVIEW'].includes(app.status)) {
      throw new Error('Cannot withdraw application in current status');
    }

    await db.loanApplication.update({
      where: { id: applicationId },
      data: {
        status: 'WITHDRAWN',
        currentStep: 'CANCELLED',
      },
    });

    logger.info('Application withdrawn', { applicationId });
  }

  /**
   * Link application to loan after disbursement
   */
  async linkToLoan(applicationId: string, loanId: string): Promise<void> {
    await db.loanApplication.update({
      where: { id: applicationId },
      data: {
        loanId,
        status: 'DISBURSED',
        disbursedAt: new Date(),
        currentStep: 'DISBURSED',
      },
    });
  }

  /**
   * Get application statistics
   */
  async getStats(tenantId: string) {
    const [
      totalApplications,
      pendingReview,
      approved,
      rejected,
      disbursed,
      avgProcessingTime,
    ] = await Promise.all([
      db.loanApplication.count({ where: { tenantId } }),
      db.loanApplication.count({ 
        where: { tenantId, status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } 
      }),
      db.loanApplication.count({ where: { tenantId, status: 'APPROVED' } }),
      db.loanApplication.count({ where: { tenantId, status: 'REJECTED' } }),
      db.loanApplication.count({ where: { tenantId, status: 'DISBURSED' } }),
      // Mock average processing time - would calculate from timestamps
      Promise.resolve(4.5),
    ]);

    return {
      totalApplications,
      pendingReview,
      approved,
      rejected,
      disbursed,
      approvalRate: (approved + disbursed) > 0 ? ((approved + disbursed) / totalApplications) * 100 : 0,
      averageProcessingTimeHours: avgProcessingTime,
    };
  }

  /**
   * Add entry to step history
   */
  private addToStepHistory(historyJson: string, step: ApplicationStep, userId: string): Array<Record<string, unknown>> {
    let history: Array<Record<string, unknown>> = [];
    
    try {
      history = JSON.parse(historyJson);
    } catch {
      history = [];
    }

    history.push({
      step,
      enteredAt: new Date().toISOString(),
      by: userId,
    });

    return history;
  }
}

// Export singleton instance
export const applicationService = new ApplicationService();
