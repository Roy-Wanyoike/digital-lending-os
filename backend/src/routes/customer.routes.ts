/**
 * Customer Management Routes
 * 
 * CRUD operations for customer profiles, KYC data, and documents.
 * 
 * @openapi
 * tags: [Customers]
 */

import { Router } from 'express';
import { db } from '../lib/db';
import { authenticate, requireRoles, requireTenantAccess } from '../middleware/auth';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  paginatedResponse,
  conflictResponse,
  forbiddenResponse,
} from '../utils/response';
import { getQueryString, getQueryNumber } from '../utils/queryHelpers';
import { validate, createCustomerSchema, paginationSchema } from '../middleware/validation';
import { AuthRequest, UpdateCustomerInput } from '../types';

export const customerRoutes = Router();

// All customer routes require authentication
customerRoutes.use(authenticate);
customerRoutes.use(requireTenantAccess);

/**
 * @openapi
 * /customers:
 *   get:
 *     summary: List customers
 *     description: |
 *       Retrieve a paginated list of customers with filtering options.
 *       Supports search by name, phone, email, or national ID.
 *       Customers cannot access this endpoint (use their specific endpoints instead).
 *     tags: [Customers]
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
 *           enum: [ACTIVE, INACTIVE, BLACKLISTED]
 *       - in: query
 *         name: riskLevel
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by first name, last name, phone, email, or national ID
 *     responses:
 *       200:
 *         description: List of customers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       403:
 *         description: Forbidden - CUSTOMER role cannot access this endpoint
 */
customerRoutes.get('/', async (req: AuthRequest, res) => {
  try {
    const page = getQueryNumber(req.query, "page", 1) || 1;
    const limit = getQueryNumber(req.query, "limit", 20) || 20;
    const tenantId = getQueryString(req.query, "tenantId") || req.user?.tenantId;
    const status = getQueryString(req.query, "status") as string | undefined;
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
 * @openapi
 * /customers/{id}:
 *   get:
 *     summary: Get customer by ID
 *     description: Retrieve detailed customer profile including recent loans, applications, and documents.
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Customer unique identifier
 *     responses:
 *       200:
 *         description: Customer details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Customer'
 *       403:
 *         description: Cannot access other tenant's customer
 *       404:
 *         description: Customer not found
 */
customerRoutes.get('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);

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
 * @openapi
 * /customers:
 *   post:
 *     summary: Create new customer
 *     description: Register a new customer in the system. Phone number must be unique within the tenant.
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCustomerRequest'
 *     responses:
 *       201:
 *         description: Customer created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Customer'
 *                 message:
 *                   type: string
 *                   example: "Customer created successfully"
 *       400:
 *         description: Invalid input data
 *       409:
 *         description: Phone number already exists for this tenant
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
 * @openapi
 * /customers/{id}:
 *   put:
 *     summary: Update customer information
 *     description: Update an existing customer's profile information. Only fields provided will be updated.
 *     tags: [Customers]
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
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               alternativePhone:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *               employmentStatus:
 *                 type: string
 *               employerName:
 *                 type: string
 *               incomeAmount:
 *                 type: number
 *               county:
 *                 type: string
 *               city:
 *                 type: string
 *               mpesaPhone:
 *                 type: string
 *               riskLevel:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE, BLACKLISTED]
 *     responses:
 *       200:
 *         description: Customer updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Customer'
 *                 message:
 *                   type: string
 *                   example: "Customer updated successfully"
 *       403:
 *         description: Cannot update customer from another tenant
 *       404:
 *         description: Customer not found
 */
customerRoutes.put('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
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
 * @openapi
 * /customers/{id}/loans:
 *   get:
 *     summary: Get customer's loans
 *     description: Retrieve all loans associated with a specific customer including product info and repayment counts.
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer loans retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Loan'
 *       404:
 *         description: Customer not found
 */
customerRoutes.get('/:id/loans', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);

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
 * @openapi
 * /customers/{id}/documents:
 *   get:
 *     summary: Get customer's KYC documents
 *     description: Retrieve all uploaded KYC documents for a specific customer.
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer documents retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       documentType:
 *                         type: string
 *                       status:
 *                         type: string
 *                       uploadedAt:
 *                         type: string
 *                         format: date-time
 *       404:
 *         description: Customer not found
 */
customerRoutes.get('/:id/documents', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);

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
