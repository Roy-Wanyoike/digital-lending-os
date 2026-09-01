/**
 * Test Utilities
 * 
 * Common utilities for testing:
 * - Test database setup/teardown
 * - Factory functions for test data
 * - Auth token helpers
 * - Request helpers
 */

import { PrismaClient } from '@prisma/client';
import { sign } from 'jsonwebtoken';
import { config } from '../../src/config';
import { JWTPayload, UserRole } from '../../src/types';

// =============================================================================
// TEST DATABASE
// =============================================================================

let testDb: PrismaClient | null = null;

export function getTestDb(): PrismaClient {
  if (!testDb) {
    testDb = new PrismaClient({
      datasources: {
        url: process.env.DATABASE_URL || 'file:./test.db',
      },
    });
  }
  return testDb;
}

export async function setupTestDatabase(): Promise<void> {
  const db = getTestDb();
  
  // Clean all tables in order of dependencies
  await db.transaction.deleteMany();
  await db.repayment.deleteMany();
  await db.kycDocument.deleteMany();
  await db.loan.deleteMany();
  await db.loanApplication.deleteMany();
  await db.loanProduct.deleteMany();
  await db.customer.deleteMany();
  await db.session.deleteMany();
  await db.auditLog.deleteMany();
  await db.notification.deleteMany();
  await db.user.deleteMany();
  await db.tenant.deleteMany();
}

export async function teardownTestDatabase(): Promise<void> {
  if (testDb) {
    await testDb.$disconnect();
    testDb = null;
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

interface TenantData {
  id?: string;
  name?: string;
  slug?: string;
  companyName?: string;
  status?: string;
  plan?: string;
}

export function createTenantData(overrides: TenantData = {}): Record<string, unknown> {
  const id = overrides.id || `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id,
    name: overrides.name || 'Test Tenant',
    slug: overrides.slug || `test-${Date.now()}`,
    companyName: overrides.companyName || 'Test Company Ltd',
    licenseNumber: `TEST-${Date.now()}`,
    phone: '+254700000000',
    email: `test-${Date.now()}@example.com`,
    status: overrides.status || 'ACTIVE',
    plan: overrides.plan || 'STARTER',
    branding: '{}',
    config: '{}',
    monthlyFee: 0,
    transactionRate: 0,
    ...overrides,
  };
}

interface UserData {
  id?: string;
  email?: string;
  name?: string;
  role?: UserRole;
  tenantId?: string;
  isActive?: boolean;
}

export function createUserData(overrides: UserData = {}): Record<string, unknown> {
  return {
    id: overrides.id || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email: overrides.email || `user_${Date.now()}@test.com`,
    passwordHash: '$2b$12$hashedpassword', // Pre-hashed
    name: overrides.name || 'Test User',
    role: overrides.role || UserRole.STAFF,
    tenantId: overrides.tenantId,
    isActive: overrides.isActive !== false,
    emailVerified: true,
    ...overrides,
  };
}

interface CustomerData {
  id?: string;
  tenantId?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  status?: string;
  riskLevel?: string;
}

export function createCustomerData(overrides: CustomerData = {}): Record<string, unknown> {
  return {
    id: overrides.id || `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tenantId: overrides.tenantId || 'default_tenant_id',
    firstName: overrides.firstName || 'John',
    lastName: overrides.lastName || 'Doe',
    phone: overrides.phone || `2547${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
    email: overrides.email || `customer_${Date.now()}@test.com`,
    nationality: 'Kenyan',
    status: overrides.status || 'ACTIVE',
    riskLevel: overrides.riskLevel || 'MEDIUM',
    creditScore: Math.floor(Math.random() * 400) + 400,
    crbStatus: 'CLEAN',
    totalBorrowed: 0,
    totalRepaid: 0,
    outstandingBalance: 0,
    source: 'WALK_IN',
    ...overrides,
  };
}

interface LoanProductData {
  id?: string;
  tenantId?: string;
  name?: string;
  productCode?: string;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
  interestRate?: number;
}

export function createLoanProductData(overrides: LoanProductData = {}): Record<string, unknown> {
  return {
    id: overrides.id || `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tenantId: overrides.tenantId || 'default_tenant_id',
    name: overrides.name || 'Test Product',
    productCode: overrides.productCode || `TP-${Date.now()}`,
    category: overrides.category || 'PERSONAL_LOAN',
    minAmount: overrides.minAmount || 1000,
    maxAmount: overrides.maxAmount || 100000,
    defaultAmount: 50000,
    interestType: 'FLAT_RATE',
    interestRate: overrides.interestRate || 15,
    processingFee: 500,
    processingFeeType: 'FIXED',
    insuranceFee: 1.5,
    insuranceFeeType: 'PERCENTAGE',
    minTermDays: 30,
    maxTermDays: 365,
    defaultTermDays: 90,
    repaymentFrequency: 'MONTHLY',
    eligibilityRules: '{}',
    isActive: true,
    ...overrides,
  };
}

interface LoanData {
  id?: string;
  tenantId?: string;
  customerId?: string;
  productId?: string;
  principal?: number;
  status?: string;
}

export function createLoanData(overrides: LoanData = {}): Record<string, unknown> {
  const principal = overrides.principal || 50000;
  
  return {
    id: overrides.id || `loan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tenantId: overrides.tenantId || 'default_tenant_id',
    customerId: overrides.customerId || 'default_customer_id',
    productId: overrides.productId || 'default_product_id',
    loanNumber: `LN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
    principal,
    approvedAmount: principal,
    interestRate: 15,
    interestType: 'FLAT_RATE',
    processingFee: 500,
    totalInterest: principal * 0.15 * 3, // ~3 months
    totalFees: 500,
    totalRepayable: principal + (principal * 0.15 * 3) + 500,
    termDays: 90,
    outstandingBalance: principal + (principal * 0.15 * 3) + 500,
    status: overrides.status || 'APPROVED',
    arrearsStatus: 'CURRENT',
    repaymentSchedule: '[]',
    ...overrides,
  };
}

// =============================================================================
// AUTH HELPERS
// =============================================================================

export function generateTestToken(payload: Partial<JWTPayload> = {}, expiresIn: string | number = '1h'): string {
  const defaultPayload: JWTPayload = {
    userId: payload.userId || 'test_user_id',
    email: payload.email || 'test@test.com',
    role: payload.role || UserRole.STAFF,
    tenantId: payload.tenantId || 'test_tenant_id',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (typeof expiresIn === 'number' ? expiresIn : 3600),
  };

  return sign({ ...defaultPayload, ...payload }, config.jwt.secret as string, {
    algorithm: 'HS256' as const,
  });
}

export function generateAdminToken(): string {
  return generateTestToken({
    userId: 'admin_user_id',
    email: 'admin@test.com',
    role: UserRole.TENANT_ADMIN,
    tenantId: 'admin_tenant_id',
  });
}

export function generateSuperAdminToken(): string {
  return generateTestToken({
    userId: 'super_admin_id',
    email: 'super@test.com',
    role: UserRole.SUPER_ADMIN,
    tenantId: null,
  });
}

export function getAuthHeaders(token?: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token || generateTestToken()}`,
    'Content-Type': 'application/json',
    'X-Tenant-ID': 'test_tenant_id',
    'X-Request-ID': `test-req-${Date.now()}`,
  };
}

// =============================================================================
// REQUEST HELPERS
// =============================================================================

import express, { Application } from 'express';

let testApp: Application | null = null;

export async function getTestApp(): Promise<Application> {
  if (!testApp) {
    // Dynamic import to avoid loading app during test file discovery
    const { default: createApp } = await import('../../src/index');
    testApp = createApp;
  }
  return testApp;
}

/**
 * Make a test request to the Express app
 */
export async function makeRequest(
  app: Application,
  options: {
    method: string;
    path: string;
    body?: unknown;
    headers?: Record<string, string>;
    query?: Record<string, string>;
  }
): Promise<{ status: number; body: any; headers: Headers }> {
  const { method, path, body, headers = {}, query } = options;

  // Build URL with query params
  let url = path;
  if (query && Object.keys(query).length > 0) {
    url += '?' + new URLSearchParams(query).toString();
  }

  // For actual HTTP testing, use supertest or similar
  // This is a simplified version for structure
  return {
    status: 200,
    body: {},
    headers: new Headers(),
  };
}

// =============================================================================
// ASSERTION HELPERS
// =============================================================================

export interface ApiResponse {
  success: boolean;
  data?: any;
  errors?: Array<{ code: string; message: string }>;
  meta?: any;
}

export function expectSuccess(response: { status: number; body: ApiResponse }, expectedStatus = 200): void {
  expect(response.status).toBe(expectedStatus);
  expect(response.body.success).toBe(true);
  expect(response.body.data).toBeDefined();
}

export function expectError(
  response: { status: number; body: ApiResponse },
  expectedStatus: number,
  expectedErrorCode?: string
): void {
  expect(response.status).toBe(expectedStatus);
  expect(response.body.success).toBe(false);
  expect(response.body.errors).toBeDefined();
  expect(Array.isArray(response.body.errors)).toBe(true);

  if (expectedErrorCode) {
    expect(response.body.errors[0].code).toBe(expectedErrorCode);
  }
}

export function expectPaginatedResponse(response: { status: number; body: ApiResponse }): void {
  expectSuccess(response);
  expect(response.body.meta.pagination).toBeDefined();
  expect(response.body.meta.pagination.page).toBeDefined();
  expect(response.body.meta.pagination.limit).toBeDefined();
  expect(response.body.meta.pagination.total).toBeDefined();
  expect(Array.isArray(response.body.data)).toBe(true);
}

// =============================================================================
// MOCK DATA GENERATORS
// =============================================================================

export function randomPhone(): string {
  const prefixes = ['712', '722', '733', '744', '755', '766', '777', '788', '700', '720', '790'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `254${prefix}${suffix}`;
}

export function randomEmail(): string {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'test.com'];
  return `test_${Date.now()}_${Math.random().toString(36).substr(2, 5)}@${domains[Math.floor(Math.random() * domains.length)]}`;
}

export function randomIdNumber(): string {
  return Math.floor(Math.random() * 30000000).toString();
}

export function randomAmount(min = 1000, max = 100000): number {
  return Math.round((Math.random() * (max - min) + min) / 100) * 100;
}

export function randomDate(daysBack = 30, daysForward = 0): Date {
  const now = new Date();
  const from = now.getTime() - daysBack * 24 * 60 * 60 * 1000;
  const to = now.getTime() + daysForward * 24 * 60 * 60 * 1000;
  return new Date(from + Math.random() * (to - from));
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  getTestDb,
  setupTestDatabase,
  teardownTestDatabase,
};

export default {
  getTestDb,
  setupTestDatabase,
  teardownTestDatabase,
  createTenantData,
  createUserData,
  createCustomerData,
  createLoanProductData,
  createLoanData,
  generateTestToken,
  generateAdminToken,
  generateSuperAdminToken,
  getAuthHeaders,
  makeRequest,
  expectSuccess,
  expectError,
  expectPaginatedResponse,
  randomPhone,
  randomEmail,
  randomIdNumber,
  randomAmount,
  randomDate,
};
