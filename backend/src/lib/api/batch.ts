/**
 * Batch Operations Handler
 * 
 * Provides bulk operations for:
 * - Bulk customer creation
 * - Bulk loan status updates
 * - Bulk data import/export
 */

import { Request, Response } from 'express';
import { db } from '../lib/db';
import { createResponse } from './response';
import { DatabaseUtils } from '../lib/db-utils';
import { logger } from '../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

interface BatchOperation<T> {
  id: string;
  operation: 'create' | 'update' | 'delete';
  data: T;
}

interface BatchResultItem {
  index: number;
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
    field?: string;
  };
}

interface BatchResponse {
  success: boolean;
  results: BatchResultItem[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
  meta: {
    requestId: string;
    timestamp: string;
    version: string;
  };
}

// =============================================================================
// BATCH CUSTOMERS
// =============================================================================

export async function batchCreateCustomers(
  req: Request,
  res: Response
): Promise<void> {
  const response = createResponse(req);
  
  try {
    const { customers } = req.body as { customers: Array<{
      firstName: string;
      lastName: string;
      phone: string;
      email?: string;
      [key: string]: unknown;
    }> };

    if (!customers || !Array.isArray(customers) || customers.length === 0) {
      return response.badRequest(res, 'customers array is required');
    }

    if (customers.length > 100) {
      return response.badRequest(res, 'Maximum 100 customers per batch');
    }

    const tenantId = req.body.tenantId || (req as any).user?.tenantId;
    
    if (!tenantId) {
      return response.badRequest(res, 'tenantId is required');
    }

    const results: BatchResultItem[] = [];

    // Process each customer
    for (let i = 0; i < customers.length; i++) {
      const customerData = customers[i];
      
      try {
        // Validate required fields
        if (!customerData.firstName || !customerData.lastName || !customerData.phone) {
          results.push({
            index: i,
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'firstName, lastName, and phone are required',
            },
          });
          continue;
        }

        // Check for duplicate phone
        const existing = await db.customer.findFirst({
          where: {
            tenantId,
            phone: customerData.phone,
          },
        });

        if (existing) {
          results.push({
            index: i,
            success: false,
            error: {
              code: 'DUPLICATE',
              message: `Customer with phone ${customerData.phone} already exists`,
              field: 'phone',
            },
          });
          continue;
        }

        // Create customer
        const customer = await db.customer.create({
          data: {
            tenantId,
            firstName: customerData.firstName,
            lastName: customerData.lastName,
            phone: customerData.phone,
            email: customerData.email || null,
            nationalId: customerData.nationalId as string | undefined,
            county: customerData.county as string | undefined,
            employmentStatus: customerData.employmentStatus as any,
            incomeAmount: customerData.incomeAmount as number | undefined,
          },
        });

        results.push({
          index: i,
          success: true,
          data: { id: customer.id, ...customer },
        });

      } catch (error) {
        logger.error(`Batch customer ${i} error:`, error);
        results.push({
          index: i,
          success: false,
          error: {
            code: 'CREATE_ERROR',
            message: error instanceof Error ? error.message : 'Failed to create customer',
          },
        });
      }
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.status(failed === 0 ? 201 : 207).json({
      success: failed === 0,
      results,
      summary: { total: results.length, succeeded, failed },
      meta: {} as any, // Will be set by response builder if needed
    });

  } catch (error) {
    logger.error('Batch create customers error:', error);
    response.serverError(res);
  }
}

// =============================================================================
// BATCH LOAN STATUS UPDATES
// =============================================================================

export async function batchUpdateLoanStatus(
  req: Request,
  res: Response
): Promise<void> {
  const response = createResponse(req);

  try {
    const { updates } = req.body as { updates: Array<{
      loanId: string;
      status: string;
      notes?: string;
    }> };

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return response.badRequest(res, 'updates array is required');
    }

    if (updates.length > 50) {
      return response.badRequest(res, 'Maximum 50 updates per batch');
    }

    const validTransitions: Record<string, string[]> = {
      APPROVED: ['PENDING_DISBURSEMENT', 'CANCELLED'],
      PENDING_DISBURSEMENT: ['ACTIVE', 'CANCELLED'],
      ACTIVE: ['IN_ARREARS', 'FULLY_PAID', 'RESTRUCTURED', 'DEFAULTED'],
      IN_ARREARS: ['ACTIVE', 'DEFAULTED', 'RESTRUCTURED', 'WRITTEN_OFF'],
      DEFAULTED: ['WRITTEN_OFF', 'RESTRUCTURED'],
    };

    const results: BatchResultItem[] = [];

    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];

      try {
        // Find loan
        const loan = await db.loan.findUnique({
          where: { id: update.loanId },
        });

        if (!loan) {
          results.push({
            index: i,
            success: false,
            error: { code: 'NOT_FOUND', message: `Loan ${update.loanId} not found` },
          });
          continue;
        }

        // Validate transition
        const allowedTargets = validTransitions[loan.status] || [];
        if (!allowedTargets.includes(update.status)) {
          results.push({
            index: i,
            success: false,
            error: {
              code: 'INVALID_TRANSITION',
              message: `Cannot transition from ${loan.status} to ${update.status}`,
            },
          });
          continue;
        }

        // Update loan status
        const updatedLoan = await db.loan.update({
          where: { id: update.loanId },
          data: {
            status: update.status,
            ...(update.notes && { collectionNotes: update.notes }),
          },
        });

        results.push({
          index: i,
          success: true,
          data: { id: updatedLoan.id, status: updatedLoan.status },
        });

      } catch (error) {
        logger.error(`Batch loan update ${i} error:`, error);
        results.push({
          index: i,
          success: false,
          error: {
            code: 'UPDATE_ERROR',
            message: error instanceof Error ? error.message : 'Failed to update loan',
          },
        });
      }
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.status(failed === 0 ? 200 : 207).json({
      success: failed === 0,
      results,
      summary: { total: results.length, succeeded, failed },
    });

  } catch (error) {
    logger.error('Batch update loans error:', error);
    response.serverError(res);
  }
}

// =============================================================================
// DATA EXPORT
// =============================================================================

export interface ExportOptions {
  format?: 'json' | 'csv';
  entity: 'customers' | 'loans' | 'applications' | 'repayments';
  filters?: Record<string, unknown>;
  fields?: string[];
  tenantId: string;
}

export async function exportData(
  req: Request,
  res: Response
): Promise<void> {
  const response = createResponse(req);

  try {
    const options = req.query as unknown as ExportOptions;

    if (!options.entity) {
      return response.badRequest(res, 'entity parameter is required');
    }

    if (!options.tenantId && !(req as any).user?.tenantId) {
      return response.badRequest(res, 'tenantId is required');
    }

    const tenantId = options.tenantId || (req as any).user?.tenantId;
    const format = options.format || 'json';

    let data: unknown[];

    switch (options.entity) {
      case 'customers':
        data = await db.customer.findMany({
          where: { tenantId, ...(options.filters as any) },
          take: 10000, // Limit export size
        });
        break;

      case 'loans':
        data = await db.loan.findMany({
          where: { tenantId, ...(options.filters as any) },
          include: { customer: { select: { firstName: true, lastName: true, phone: true } } },
          take: 10000,
        });
        break;

      case 'applications':
        data = await db.loanApplication.findMany({
          where: { tenantId, ...(options.filters as any) },
          include: { customer: { select: { firstName: true, lastName: true } } },
          take: 10000,
        });
        break;

      case 'repayments':
        data = await db.repayment.findMany({
          where: { tenantId, ...(options.filters as any) },
          take: 50000,
        });
        break;

      default:
        return response.badRequest(res, `Invalid entity: ${options.entity}`);
    }

    // Set headers based on format
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${options.entity}_export_${timestamp}`;

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      
      // Convert to CSV (simple implementation)
      const csv = convertToCSV(data as Record<string, unknown>[]);
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.json({
        exportedAt: new Date().toISOString(),
        entity: options.entity,
        count: data.length,
        data,
      });
    }

    logger.info(`Exported ${data.length} ${options.entity} records for tenant ${tenantId}`);

  } catch (error) {
    logger.error('Export error:', error);
    response.serverError(res, 'Failed to export data');
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';

  // Get headers from first object
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      let value = row[header];
      
      if (value === null || value === undefined) {
        return '';
      }
      
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      
      // Escape quotes and wrap in quotes if contains comma or quote
      const strValue = String(value);
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      
      return strValue;
    });
    
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  batchCreateCustomers,
  batchUpdateLoanStatus,
  exportData,
};
