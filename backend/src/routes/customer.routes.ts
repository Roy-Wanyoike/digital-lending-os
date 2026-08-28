/**
 * Customer Management Routes
 * 
 * CRUD operations for customer profiles, KYC data, and documents.
 */

import { Router } from 'express';
import { db } from '../../prisma/client';
import { authenticate, requireRoles, requireTenantAccess } from '../middleware/auth';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  paginatedResponse,
  conflictResponse,
  forbiddenResponse,
} from '../utils/response';
import { validate, createCustomerSchema, paginationSchema } from '../middleware/validation';
import { AuthRequest, UpdateCustomerInput } from '../types';

export const customerRoutes = Router();

// All customer routes require authentication
customerRoutes.use(authenticate);
customerRoutes.use(requireTenantAccess);

/**
 * GET /api/v1/customers
 * List customers with filtering and pagination
 */
customerRoutes.get('/', async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const tenantId = (req.query.tenantId as string) || req.user?.tenantId;
    const status = req.query.status as string | undefined;
    const riskLevel = req.query.riskLevel as string | undefined;
    const search = req.query.search as string | undefined;

    if (!tenantId) {
      return require('../utils/response').badRequestResponse(res, 'tenantId is required');
    }

    // Customers cannot access this endpoint
    if (req.user?.role === 'CUSTOMER') {
      return forbiddenResponse(res, 'Access denied', 'FORBIDDEN');
    }

    const where: Record<string, unknown> = { tenantId };
    
    if (status) where.status = status;
    if (riskLevel) where.riskLevel = riskLevel;
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { nationalId: { contains: search } },
      ];
    }

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              loans: true,
              loanApplications: true,
              repayments: true,
            },
          },
        },
      }),
      db.customer.count({ where }),
    ]);

    return paginatedResponse(res, customers, page, limit, total);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to fetch customers');
  }
});

/**
 * GET /api/v1/customers/:id
 * Get customer by ID with full profile
 */
customerRoutes.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        loans: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            loanNumber: true,
            principal: true,
            outstandingBalance: true,
            status: true,
            createdAt: true,
          },
        },
        loanApplications: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            requestedAmount: true,
            status: true,
            createdAt: true,
          },
        },
        documents: {
          orderBy: { uploadedAt: 'desc' },
        },
      },
    });

    if (!customer) {
      return notFoundResponse(res, 'Customer');
    }

    // Check tenant access
    if (req.user?.role !== 'SUPER_ADMIN' && customer.tenantId !== req.user?.tenantId) {
      return forbiddenResponse(res, 'Cannot access other tenant data');
    }

    return successResponse(res, customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to fetch customer');
  }
});

/**
 * POST /api/v1/customers
 * Create new customer
 */
customerRoutes.post('/', validate(createCustomerSchema), async (req: AuthRequest, res) => {
  try {
    const body = req.body;

    // Check for duplicate phone within tenant
    const existingPhone = await db.customer.findFirst({
      where: {
        tenantId: body.tenantId,
        phone: body.phone,
      },
    });

    if (existingPhone) {
      return conflictResponse(
        res,
        'A customer with this phone number already exists in this tenant',
        'DUPLICATE_PHONE'
      );
    }

    const customer = await db.customer.create({
      data: {
        tenantId: body.tenantId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email || null,
        phone: body.phone,
        alternativePhone: body.alternativePhone || null,
        dateOfBirth: body.dateOfBirth || null,
        gender: body.gender || null,
        nationalId: body.nationalId || null,
        kraPin: body.kraPin || null,
        employmentStatus: body.employmentStatus || null,
        employerName: body.employerName || null,
        incomeAmount: body.incomeAmount || null,
        incomeFrequency: body.incomeFrequency || null,
        businessName: body.businessName || null,
        county: body.county || null,
        city: body.city || null,
        bankName: body.bankName || null,
        bankAccount: body.bankAccount || null,
        mpesaPhone: body.mpesaPhone || body.phone,
      },
    });

    return createdResponse(res, customer, 'Customer created successfully');
  } catch (error) {
    console.error('Error creating customer:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to create customer');
  }
});

/**
 * PUT /api/v1/customers/:id
 * Update customer information
 */
customerRoutes.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const body: UpdateCustomerInput = req.body;

    const existingCustomer = await db.customer.findUnique({ where: { id } });
    if (!existingCustomer) {
      return notFoundResponse(res, 'Customer');
    }

    // Check tenant access
    if (req.user?.role !== 'SUPER_ADMIN' && existingCustomer.tenantId !== req.user?.tenantId) {
      return forbiddenResponse(res, 'Cannot update customer from another tenant');
    }

    const updatedCustomer = await db.customer.update({
      where: { id },
      data: body,
    });

    return successResponse(res, updatedCustomer, 'Customer updated successfully');
  } catch (error) {
    console.error('Error updating customer:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to update customer');
  }
});

/**
 * GET /api/v1/customers/:id/loans
 * Get all loans for a specific customer
 */
customerRoutes.get('/:id/loans', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Verify customer exists and belongs to tenant
    const customer = await db.customer.findUnique({ where: { id } });
    if (!customer) {
      return notFoundResponse(res, 'Customer');
    }

    if (req.user?.role !== 'SUPER_ADMIN' && customer.tenantId !== req.user?.tenantId) {
      return forbiddenResponse(res, 'Access denied');
    }

    const loans = await db.loan.findMany({
      where: { customerId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: { id: true, name: true, category: true },
        },
        _count: {
          select: { repayments: true },
        },
      },
    });

    return successResponse(res, loans);
  } catch (error) {
    console.error('Error fetching customer loans:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to fetch customer loans');
  }
});

/**
 * GET /api/v1/customers/:id/documents
 * Get customer's KYC documents
 */
customerRoutes.get('/:id/documents', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const customer = await db.customer.findUnique({
      where: { id },
      select: { id: true, tenantId: true },
    });

    if (!customer) {
      return notFoundResponse(res, 'Customer');
    }

    if (req.user?.role !== 'SUPER_ADMIN' && customer.tenantId !== req.user?.tenantId) {
      return forbiddenResponse(res, 'Access denied');
    }

    const documents = await db.document.findMany({
      where: { customerId: id },
      orderBy: { uploadedAt: 'desc' },
    });

    return successResponse(res, documents);
  } catch (error) {
    console.error('Error fetching customer documents:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to fetch documents');
  }
});
