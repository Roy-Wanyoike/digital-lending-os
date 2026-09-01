/**
 * Tenant Service Unit Tests
 * 
 * Tests for tenant CRUD operations, plan management,
 * and tenant configuration.
 */

import { TenantService } from '../src/services/tenant.service';
import { db } from '../src/lib/db';
import { TenantPlan, TenantStatus } from '../src/types';

// Create a fresh instance for testing
const tenantService = new TenantService();

// Mock data factory
const createMockTenant = (overrides: Record<string, unknown> = {}) => ({
  id: 'tenant-123',
  name: 'Test Tenant',
  slug: 'test-tenant',
  companyName: 'Test Company Ltd',
  licenseNumber: 'LC-001',
  phone: '+254712345678',
  email: 'admin@testcompany.com',
  physicalAddress: '123 Test St',
  website: 'https://testcompany.com',
  plan: TenantPlan.PROFESSIONAL as string,
  status: TenantStatus.ACTIVE as string,
  monthlyFee: 15000,
  transactionRate: 1.0,
  branding: '{}',
  config: '{}',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('TenantService', () => {
  // ===========================================================================
  // FIND ALL TESTS
  // ===========================================================================
  describe('findAll()', () => {
    it('should return array of tenants for SUPER_ADMIN', async () => {
      const mockTenants = [createMockTenant(), createMockTenant({ id: 'tenant-456' })];
      (db.tenant.findMany as jest.Mock).mockResolvedValue(mockTenants);
      (db.tenant.count as jest.Mock).mockResolvedValue(2);

      const result = await tenantService.findAll(
        {},
        'SUPER_ADMIN',
        null
      );

      expect(result.items).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
    });

    it('should return only own tenant for non-admin users', async () => {
      const ownTenant = createMockTenant();
      (db.tenant.findUnique as jest.Mock).mockResolvedValue(ownTenant);

      const result = await tenantService.findAll(
        {},
        'TENANT_ADMIN',
        'tenant-123'
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('tenant-123');
      expect(result.pagination.total).toBe(1);
    });

    it('should apply status filter', async () => {
      (db.tenant.findMany as jest.Mock).mockResolvedValue([]);
      (db.tenant.count as jest.Mock).mockResolvedValue(0);

      await tenantService.findAll(
        { status: TenantStatus.ACTIVE },
        'SUPER_ADMIN',
        null
      );

      expect(db.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: TenantStatus.ACTIVE,
          }),
        })
      );
    });

    it('should apply plan filter', async () => {
      (db.tenant.findMany as jest.Mock).mockResolvedValue([]);
      (db.tenant.count as jest.Mock).mockResolvedValue(0);

      await tenantService.findAll(
        { plan: TenantPlan.ENTERPRISE },
        'SUPER_ADMIN',
        null
      );

      expect(db.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            plan: TenantPlan.ENTERPRISE,
          }),
        })
      );
    });

    it('should apply search filter with OR conditions', async () => {
      (db.tenant.findMany as jest.Mock).mockResolvedValue([]);
      (db.tenant.count as jest.Mock).mockResolvedValue(0);

      await tenantService.findAll(
        { search: 'Test' },
        'SUPER_ADMIN',
        null
      );

      expect(db.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.any(Object) }),
              expect.objectContaining({ slug: expect.any(Object) }),
              expect.objectContaining({ companyName: expect.any(Object) }),
            ]),
          }),
        })
      );
    });

    it('should handle pagination correctly', async () => {
      (db.tenant.findMany as jest.Mock).mockResolvedValue([]);
      (db.tenant.count as jest.Mock).mockResolvedValue(50);

      const result = await tenantService.findAll(
        { page: 2, limit: 10 },
        'SUPER_ADMIN',
        null
      );

      expect(db.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (page-1) * limit
          take: 10,
        })
      );
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.pages).toBe(5); // Math.ceil(50/10)
    });
  });

  // ===========================================================================
  // FIND BY ID TESTS
  // ===========================================================================
  describe('findById()', () => {
    it('should return tenant by ID', async () => {
      const mockTenant = createMockTenant();
      (db.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);

      const result = await tenantService.findById('tenant-123');

      expect(result).toBeDefined();
      expect(result!.id).toBe('tenant-123');
      expect(result!.name).toBe('Test Tenant');
    });

    it('should throw NOT_FOUND error when tenant does not exist', async () => {
      (db.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(tenantService.findById('nonexistent')).rejects.toThrow('Tenant not found');
    });

    it('should include count relations', async () => {
      (db.tenant.findUnique as jest.Mock).mockResolvedValue(createMockTenant());

      await tenantService.findById('tenant-123');

      expect(db.tenant.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            _count: expect.objectContaining({
              select: expect.objectContaining({
                users: true,
                customers: true,
                loans: true,
                loanApplications: true,
                products: true,
              }),
            }),
          }),
        })
      );
    });
  });

  // ===========================================================================
  // FIND BY SLUG TESTS
  // ===========================================================================
  describe('findBySlug()', () => {
    it('should return tenant by slug', async () => {
      const mockTenant = createMockTenant();
      (db.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);

      const result = await tenantService.findBySlug('test-tenant');

      expect(result).toBeDefined();
      expect(result!.slug).toBe('test-tenant');
    });

    it('should return null when slug not found', async () => {
      (db.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await tenantService.findBySlug('nonexistent-slug');

      expect(result).toBeNull();
    });

    it('should query by slug field correctly', async () => {
      (db.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await tenantService.findBySlug('my-slug');

      expect(db.tenant.findUnique).toHaveBeenCalledWith({
        where: { slug: 'my-slug' },
      });
    });
  });

  // ===========================================================================
  // CREATE TENANT TESTS
  // ===========================================================================
  describe('create()', () => {
    const validInput = {
      name: 'New Tenant',
      slug: 'new-tenant',
      companyName: 'New Company Ltd',
      phone: '+254798765432',
      email: 'admin@newcompany.com',
    };

    it('should create a new tenant successfully', async () => {
      (db.tenant.findUnique as jest.Mock).mockResolvedValue(null); // No existing slug
      (db.tenant.create as jest.Mock).mockResolvedValue(createMockTenant(validInput));

      const result = await tenantService.create(validInput);

      expect(result).toBeDefined();
      expect(db.tenant.create).toHaveBeenCalled();
    });

    it('should set default plan to STARTER if not specified', async () => {
      (db.tenant.findUnique as jest.Mock).mockResolvedValue(null);
      (db.tenant.create as jest.Mock).mockResolvedValue({});

      await tenantService.create(validInput);

      expect(db.tenant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            plan: 'STARTER',
            status: 'PENDING_ONBOARDING',
          }),
        })
      );
    });

    it('should calculate pricing based on plan', async () => {
      (db.tenant.findUnique as jest.Mock).mockResolvedValue(null);
      (db.tenant.create as jest.Mock).mockResolvedValue({});

      await tenantService.create({
        ...validInput,
        plan: TenantPlan.ENTERPRISE,
      });

      expect(db.tenant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            monthlyFee: 50000, // Enterprise monthly fee
            transactionRate: 0.5, // Enterprise rate
          }),
        })
      );
    });

    it('should throw error when slug already exists', async () => {
      (db.tenant.findUnique as jest.Mock).mockResolvedValue(createMockTenant()); // Slug exists

      await expect(tenantService.create(validInput)).rejects.toThrow('slug already exists');
    });

    it('should store branding and config as JSON strings', async () => {
      (db.tenant.findUnique as jest.Mock).mockResolvedValue(null);
      (db.tenant.create as jest.Mock).mockResolvedValue({});

      const customBranding = { primaryColor: '#ff0000', logoUrl: '/logo.png' };
      const customConfig = { featureFlags: { newFeature: true } };

      await tenantService.create({
        ...validInput,
        branding: customBranding,
        config: customConfig,
      });

      expect(db.tenant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            branding: JSON.stringify(customBranding),
            config: JSON.stringify(customConfig),
          }),
        })
      );
    });

    it('should handle optional fields correctly', async () => {
      (db.tenant.findUnique as jest.Mock).mockResolvedValue(null);
      (db.tenant.create as jest.Mock).mockResolvedValue({});

      const minimalInput = {
        name: 'Minimal Tenant',
        slug: 'minimal-tenant',
        companyName: 'Minimal Co',
        phone: '+254700000000',
        email: 'minimal@test.com',
        licenseNumber: 'LC-999',
        physicalAddress: '456 Minimal Ave',
        website: 'https://minimal.com',
      };

      await tenantService.create(minimalInput);

      expect(db.tenant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            licenseNumber: 'LC-999',
            physicalAddress: '456 Minimal Ave',
            website: 'https://minimal.com',
          }),
        })
      );
    });
  });

  // ===========================================================================
  // UPDATE TENANT TESTS
  // ===========================================================================
  describe('update()', () => {
    const existingTenant = createMockTenant();

    it('should update allowed fields', async () => {
      (db.tenant.findUnique as jest.Mock).mockResolvedValue(existingTenant);
      (db.tenant.update as jest.Mock).mockResolvedValue({});

      await tenantService.update('tenant-123', {
        name: 'Updated Name',
        phone: '+254711111111',
      }, 'TENANT_ADMIN', 'tenant-123');

      expect(db.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tenant-123' },
          data: expect.objectContaining({
            name: 'Updated Name',
            phone: '+254711111111',
          }),
        })
      );
    });

    it('should allow SUPER_ADMIN to change plan and status', async () => {
      (db.tenant.findUnique as jest.Mock).mockResolvedValue(existingTenant);
      (db.tenant.update as jest.Mock).mockResolvedValue({});

      await tenantService.update('tenant-123', {
        plan: TenantPlan.ENTERPRISE,
        status: TenantStatus.SUSPENDED,
      }, 'SUPER_ADMIN', null);

      expect(db.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            plan: TenantPlan.ENTERPRISE,
            status: TenantStatus.SUSPENDED,
          }),
        })
      );
    });

    it('should not allow non-SUPER_ADMIN to change plan or status', async () => {
      (db.tenant.findUnique as jest.Mock).mockResolvedValue(existingTenant);
      (db.tenant.update as jest.Mock).mockResolvedValue({});

      await tenantService.update('tenant-123', {
        name: 'Updated Name',
        plan: TenantPlan.ENTERPRISE, // This should be ignored
        status: TenantStatus.SUSPENDED, // This should be ignored
      }, 'TENANT_ADMIN', 'tenant-123');

      const callArgs = (db.tenant.update as jest.Mock).mock.calls[0][0];
      expect(callArgs.data.plan).toBeUndefined();
      expect(callArgs.data.status).toBeUndefined();
      expect(callArgs.data.name).toBe('Updated Name'); // This should be updated
    });

    it('should throw NOT_FOUND when updating nonexistent tenant', async () => {
      (db.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        tenantService.update('nonexistent', {}, 'SUPER_ADMIN', null)
      ).rejects.toThrow('Tenant not found');
    });

    it('should stringify branding and config objects', async () => {
      (db.tenant.findUnique as jest.Mock).mockResolvedValue(existingTenant);
      (db.tenant.update as jest.Mock).mockResolvedValue({});

      const newBranding = { logo: 'new-logo.png' };

      await tenantService.update('tenant-123', {
        branding: newBranding,
      }, 'TENANT_ADMIN', 'tenant-123');

      expect(db.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            branding: JSON.stringify(newBranding),
          }),
        })
      );
    });
  });

  // ===========================================================================
  // DEACTIVATE TENANT TESTS
  // ===========================================================================
  describe('deactivate()', () => {
    it('should soft-delete tenant by setting status to DEACTIVATED', async () => {
      (db.tenant.findUnique as jest.Mock).mockResolvedValue(createMockTenant());
      (db.tenant.update as jest.Mock).mockResolvedValue({});

      await tenantService.deactivate('tenant-123');

      expect(db.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-123' },
        data: { status: 'DEACTIVATED' },
      });
    });

    it('should throw NOT_FOUND when deactivating nonexistent tenant', async () => {
      (db.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(tenantService.deactivate('nonexistent')).rejects.toThrow('Tenant not found');
    });
  });

  // ===========================================================================
  // ACTIVATE TENANT TESTS
  // ===========================================================================
  describe('activate()', () => {
    it('should activate tenant by setting status to ACTIVE', async () => {
      (db.tenant.update as jest.Mock).mockResolvedValue({});

      await tenantService.activate('tenant-123');

      expect(db.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-123' },
        data: { status: 'ACTIVE' },
      });
    });
  });

  // ===========================================================================
  // CONFIG UPDATE TESTS
  // ===========================================================================
  describe('updateConfig()', () => {
    it('should merge config data with existing config', async () => {
      (db.tenant.findUnique as jest.Mock).mockResolvedValue({
        ...createMockTenant(),
        config: '{"existingKey": "existingValue"}',
      });
      (db.tenant.update as jest.Mock).mockResolvedValue({});

      await tenantService.updateConfig('tenant-123', { newKey: 'newValue' });

      expect(db.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            config: JSON.stringify({
              existingKey: 'existingValue',
              newKey: 'newValue',
            }),
          }),
        })
      );
    });

    it('should throw error for nonexistent tenant', async () => {
      (db.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        tenantService.updateConfig('nonexistent', {})
      ).rejects.toThrow('Tenant not found');
    });
  });

  // ===========================================================================
  // USAGE STATS TESTS
  // ===========================================================================
  describe('getUsageStats()', () => {
    it('should return usage statistics for a tenant', async () => {
      (db.user.count as jest.Mock)
        .mockResolvedValueOnce(10) // active users
        .mockResolvedValueOnce(100); // customers
      (db.loan.count as jest.Mock)
        .mockResolvedValueOnce(25) // active loans
        .mockResolvedValueOnce(0); // overdue (extra call)
      (db.loan.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { principal: 2500000 } }) // total disbursed
        .mockResolvedValueOnce({ _sum: { outstandingBalance: 0 } }); // total outstanding
      (db.transaction.count as jest.Mock)
        .mockResolvedValueOnce(500); // monthly transactions

      const stats = await tenantService.getUsageStats('tenant-123');

      expect(stats.users).toBe(10);
      expect(stats.customers).toBe(100);
      expect(stats.activeLoans).toBe(25);
      expect(stats.totalDisbursed).toBe(2500000);
      expect(stats.monthlyTransactions).toBe(500);
    });

    it('should handle zero values gracefully', async () => {
      (db.user.count as jest.Mock).mockResolvedValue(0);
      (db.customer.count as jest.Mock).mockResolvedValue(0);
      (db.loan.count as jest.Mock).mockResolvedValue(0).mockResolvedValue(0);
      (db.loan.aggregate as jest.Mock).mockResolvedValue({ _sum: { principal: null } }).mockResolvedValue({ _sum: { outstandingBalance: 0 } });
      (db.transaction.count as jest.Mock).mockResolvedValue(0);

      const stats = await tenantService.getUsageStats('tenant-123');

      expect(stats.users).toBe(0);
      expect(stats.customers).toBe(0);
      expect(stats.activeLoans).toBe(0);
      expect(stats.totalDisbursed).toBe(0);
      expect(stats.monthlyTransactions).toBe(0);
    });
  });
});
