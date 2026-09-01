/**
 * API Route Integration Tests
 * Tests actual route handler functions directly (not HTTP calls).
 * Uses mocked dependencies (db, auth, telemetry) to isolate handler logic.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks (must come before imports that use them) ───────────────────────

const mockGetApiUser = vi.fn()
const mockRequireAuth = vi.fn()
const mockRequireRole = vi.fn()

class MockAuthError extends Error {
  statusCode: number
  get status(): number { return this.statusCode }
  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
    this.name = 'AuthError'
  }
}

vi.mock('@/lib/db', () => ({
  db: {},
  ensurePragmas: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('next-auth/providers/credentials', () => ({
  default: vi.fn(() => ({})),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
  getServerSession: vi.fn(),
  auth: vi.fn(),
}))

vi.mock('@/backend/lib/auth/api-helpers', () => ({
  getApiUser: (...args: any[]) => mockGetApiUser(...args),
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
  requireRole: (...args: any[]) => mockRequireRole(...args),
  AuthError: MockAuthError,
  tenantScope: vi.fn((tenantId: string, extra?: any) => ({ tenantId, ...extra })),
  errorResponse: vi.fn(),
  successResponse: vi.fn(),
}))

vi.mock('@/lib/audit-logger', () => ({
  logAudit: vi.fn(),
}))

vi.mock('@/backend/middleware/rate-limiter', () => ({
  rateLimit: vi.fn(() => ({ allowed: true })),
}))

vi.mock('bcryptjs', () => ({
  default: { compare: vi.fn(), hash: vi.fn() },
}))

vi.mock('@/backend/middleware/csrf', () => ({
  csrfGuard: vi.fn(() => ({ valid: true })),
  verifyCsrf: vi.fn(() => null),
}))

// Mock the telemetry logger to prevent side effects
vi.mock('@/backend/lib/telemetry/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    withContext: vi.fn().mockReturnThis(),
    child: vi.fn().mockReturnThis(),
  }),
}))

// Mock global fetch for currency route
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock cache manager to be undefined (test uncached path)
vi.mock('@/backend/lib/cache/cache-manager', () => {
  throw new Error('Cache manager not available')
})

// ── Imports (after mocks) ────────────────────────────────────────────────

import { db } from '@/lib/db'

// ── Helpers ──────────────────────────────────────────────────────────────

function createNextRequest(url: string, opts: Partial<RequestInit> = {}): any {
  const headers = new Headers(opts.headers || {})
  return {
    url,
    method: opts.method || 'GET',
    headers,
    nextUrl: { pathname: new URL(url).pathname },
    json: () => Promise.resolve(opts.body ? JSON.parse(opts.body as string) : {}),
    cookies: {
      get: (name: string) => {
        const match = (opts.headers as Record<string, string>)?.['cookie']?.match(new RegExp(`${name}=([^;]+)`))
        return match ? { name, value: match[1] } : undefined
      },
      has: (name: string) => {
        return !!((opts.headers as Record<string, string>)?.['cookie']?.includes(`${name}=`))
      },
    },
  }
}

const mockUser = {
  id: 'user-1',
  email: 'admin@test.com',
  role: 'admin',
  tenantId: 'tenant-1',
  businessId: 'biz-1',
}

// ════════════════════════════════════════════════════════════════════════
// 9A.1: GET /api/health
// ════════════════════════════════════════════════════════════════════════

describe('GET /api/health', () => {
  let GET: any

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('@/app/api/health/route')
    GET = mod.GET
  })

  it('returns 200 with ok status and database check', async () => {
    ;(db as any).$queryRaw = vi.fn().mockResolvedValue([{ v: 1 }])

    const res = await GET()
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data.status).toBe('ok')
    expect(body.data.checks.database).toBe('ok')
    expect(body.data.checks.dbLatencyMs).toBeGreaterThanOrEqual(0)
    expect(body.data.timestamp).toBeTruthy()
  })

  it('returns 503 SERVICE_DEGRADED when database query fails', async () => {
    ;(db as any).$queryRaw = vi.fn().mockRejectedValue(new Error('DB connection lost'))

    const res = await GET()
    expect(res.status).toBe(503)

    const body = await res.json()
    expect(body.error.message).toBe('Service degraded')
    expect(body.error.code).toBe('SERVICE_DEGRADED')
  })

  it('includes Cache-Control and ETag headers', async () => {
    ;(db as any).$queryRaw = vi.fn().mockResolvedValue([{ v: 1 }])

    const res = await GET()
    expect(res.headers.get('cache-control')).toContain('private')
    expect(res.headers.get('etag')).toMatch(/^W\/"/)
  })
})

// ════════════════════════════════════════════════════════════════════════
// 9A.2: GET /api/ready
// ════════════════════════════════════════════════════════════════════════

describe('GET /api/ready', () => {
  let GET: any

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('@/app/api/ready/route')
    GET = mod.GET
  })

  it('returns 200 with ready: true and db: connected', async () => {
    ;(db as any).$queryRaw = vi.fn()
      .mockResolvedValueOnce(undefined) // SELECT 1
      .mockResolvedValueOnce([]) // information_schema check
    process.env.NEXTAUTH_SECRET = 'test-secret-for-ci'

    const res = await GET()
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data.ready).toBe(true)
    expect(body.data.checks.database).toBe('ok')
    expect(body.data.checks.schema).toBe('ok')
    expect(body.data.checks.auth).toBe('ok')
    expect(body.data.dbLatencyMs).toBeGreaterThanOrEqual(0)
    expect(body.data.timestamp).toBeTruthy()

    delete process.env.NEXTAUTH_SECRET
  })

  it('returns 503 when database fails', async () => {
    ;(db as any).$queryRaw = vi.fn().mockRejectedValue(new Error('DB down'))

    const res = await GET()
    expect(res.status).toBe(503)

    const body = await res.json()
    expect(body.error.message).toBe('Service unavailable')
    expect(body.error.code).toBe('SERVICE_UNAVAILABLE')
  })
})

// ════════════════════════════════════════════════════════════════════════
// 9A.3: GET /api/currency
// ════════════════════════════════════════════════════════════════════════

describe('GET /api/currency', () => {
  let GET: any

  beforeEach(async () => {
    vi.clearAllMocks()
    mockGetApiUser.mockResolvedValue(mockUser)
    const mod = await import('@/app/api/currency/route')
    GET = mod.GET
  })

  it('returns 200 with currency metadata (code, name, symbol)', async () => {
    const req = createNextRequest('http://localhost:3000/api/currency')
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThan(0)

    // Each entry should have code, name, symbol
    const first = body.data[0]
    expect(first).toHaveProperty('code')
    expect(first).toHaveProperty('name')
    expect(first).toHaveProperty('symbol')

    // Spot-check a known currency
    const usd = body.data.find((c: any) => c.code === 'USD')
    expect(usd).toBeDefined()
    expect(usd.name).toBe('US Dollar')
    expect(usd.symbol).toBe('$')

    // Meta should include total count
    expect(body.meta).toBeDefined()
    expect(body.meta.total).toBe(body.data.length)
  })

  it('returns 401 when not authenticated', async () => {
    mockGetApiUser.mockResolvedValue(null)

    const req = createNextRequest('http://localhost:3000/api/currency')
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)

    const body = await res.json()
    expect(body.error.code).toBe('UNAUTHORIZED')
  })
})

// ════════════════════════════════════════════════════════════════════════
// 9A.4: GET /api/payment-methods/global
// ════════════════════════════════════════════════════════════════════════

describe('GET /api/payment-methods/global', () => {
  let GET: any

  beforeEach(async () => {
    vi.clearAllMocks()
    mockGetApiUser.mockResolvedValue(mockUser)
    ;(db as any).globalPaymentMethod = {
      findMany: vi.fn().mockResolvedValue([
        { id: 'pm-1', methodName: 'M-Pesa', type: 'Mobile Money', countries: '["KE","TZ"]', isActive: true },
        { id: 'pm-2', methodName: 'Paystack', type: 'Digital Wallet', countries: '["NG","GH"]', isActive: true },
      ]),
    }
    const mod = await import('@/app/api/payment-methods/global/route')
    GET = mod.GET
  })

  it('returns 200 with payment methods', async () => {
    const req = createNextRequest('http://localhost:3000/api/payment-methods/global')
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBe(2)
  })

  it('returns 401 when not authenticated', async () => {
    mockGetApiUser.mockResolvedValue(null)

    const req = createNextRequest('http://localhost:3000/api/payment-methods/global')
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('filters by country when provided', async () => {
    const req = createNextRequest('http://localhost:3000/api/payment-methods/global?country=KE')
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)

    const body = await res.json()
    // Only M-Pesa has KE in its countries list
    expect(body.data.length).toBe(1)
    expect(body.data[0].methodName).toBe('M-Pesa')
  })

  it('filters by type when provided', async () => {
    ;(db as any).globalPaymentMethod.findMany = vi.fn().mockResolvedValue([
      { id: 'pm-1', methodName: 'M-Pesa', type: 'Mobile Money', countries: '["KE"]', isActive: true },
    ])

    const req = createNextRequest('http://localhost:3000/api/payment-methods/global?type=Mobile%20Money')
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
  })
})

// ════════════════════════════════════════════════════════════════════════
// 9A.5: GET /api/roles
// ════════════════════════════════════════════════════════════════════════

describe('GET /api/roles', () => {
  let GET: any

  beforeEach(async () => {
    vi.clearAllMocks()
    mockGetApiUser.mockResolvedValue(mockUser)
    ;(db as any).account = {
      groupBy: vi.fn().mockResolvedValue([
        { role: 'admin', _count: { id: 2 } },
        { role: 'buyer', _count: { id: 5 } },
      ]),
    }
    const mod = await import('@/app/api/roles/route')
    GET = mod.GET
  })

  it('returns 200 with role definitions including user counts', async () => {
    const req = createNextRequest('http://localhost:3000/api/roles')
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBe(5) // admin, buyer, seller, auditor, viewer

    const admin = body.data.find((r: any) => r.role === 'admin')
    expect(admin).toBeDefined()
    expect(admin.label).toBe('Administrator')
    expect(admin.userCount).toBe(2)

    const seller = body.data.find((r: any) => r.role === 'seller')
    expect(seller.userCount).toBe(0) // No sellers in mock data
  })

  it('returns 401 when not authenticated', async () => {
    mockGetApiUser.mockResolvedValue(null)

    const req = createNextRequest('http://localhost:3000/api/roles')
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('includes description for each role', async () => {
    const req = createNextRequest('http://localhost:3000/api/roles')
    const res = await GET(req, { params: Promise.resolve({}) })
    const body = await res.json()

    for (const role of body.data) {
      expect(role.description).toBeTruthy()
      expect(typeof role.description).toBe('string')
      expect(role.description.length).toBeGreaterThan(10)
    }
  })
})

// ════════════════════════════════════════════════════════════════════════
// 9A.6: GET /api/compliance/rules
// ════════════════════════════════════════════════════════════════════════

describe('GET /api/compliance/rules', () => {
  let GET: any

  beforeEach(async () => {
    vi.clearAllMocks()
    ;(db as any).complianceRule = {
      findMany: vi.fn().mockResolvedValue([
        { id: 'rule-1', name: 'AML Check', ruleType: 'aml', severity: 'high', isActive: true, tenantId: 'tenant-1' },
        { id: 'rule-2', name: 'KYC Required', ruleType: 'kyc', severity: 'medium', isActive: false, tenantId: 'tenant-1' },
      ]),
      count: vi.fn().mockResolvedValue(2),
    }
  })

  it('returns 200 with paginated rules for admin', async () => {
    mockRequireAuth.mockResolvedValue(mockUser)
    const mod = await import('@/app/api/compliance/rules/route')
    GET = mod.GET

    const req = createNextRequest('http://localhost:3000/api/compliance/rules')
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data.data).toHaveLength(2)
    expect(body.data.pagination).toBeDefined()
    expect(body.data.pagination.page).toBe(1)
    expect(body.data.pagination.limit).toBe(50)
    expect(body.data.pagination.total).toBe(2)
    expect(body.data.pagination.totalPages).toBe(1)
  })

  it('returns 200 with paginated rules for auditor', async () => {
    mockRequireAuth.mockResolvedValue({ ...mockUser, role: 'auditor' })
    const mod = await import('@/app/api/compliance/rules/route')
    GET = mod.GET

    const req = createNextRequest('http://localhost:3000/api/compliance/rules')
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
  })

  it('returns 403 for viewer role (non-admin/non-auditor)', async () => {
    mockRequireAuth.mockResolvedValue({ ...mockUser, role: 'viewer' })
    const mod = await import('@/app/api/compliance/rules/route')
    GET = mod.GET

    const req = createNextRequest('http://localhost:3000/api/compliance/rules')
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(403)
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockRejectedValue(new MockAuthError(401, 'Authentication required'))
    const mod = await import('@/app/api/compliance/rules/route')
    GET = mod.GET

    const req = createNextRequest('http://localhost:3000/api/compliance/rules')
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('supports pagination parameters', async () => {
    mockRequireAuth.mockResolvedValue(mockUser)
    const mod = await import('@/app/api/compliance/rules/route')
    GET = mod.GET

    const req = createNextRequest('http://localhost:3000/api/compliance/rules?page=2&limit=10')
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data.pagination.page).toBe(2)
    expect(body.data.pagination.limit).toBe(10)
  })

  it('supports filtering by severity', async () => {
    mockRequireAuth.mockResolvedValue(mockUser)
    ;(db as any).complianceRule.findMany = vi.fn().mockResolvedValue([
      { id: 'rule-1', name: 'AML Check', ruleType: 'aml', severity: 'high', isActive: true, tenantId: 'tenant-1' },
    ])
    ;(db as any).complianceRule.count = vi.fn().mockResolvedValue(1)
    const mod = await import('@/app/api/compliance/rules/route')
    GET = mod.GET

    const req = createNextRequest('http://localhost:3000/api/compliance/rules?severity=high')
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)

    // Verify the where clause included severity
    expect((db as any).complianceRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ severity: 'high' }),
      }),
    )
  })

  it('clamps page to minimum 1 and limit to maximum 100', async () => {
    mockRequireAuth.mockResolvedValue(mockUser)
    const mod = await import('@/app/api/compliance/rules/route')
    GET = mod.GET

    const req = createNextRequest('http://localhost:3000/api/compliance/rules?page=0&limit=999')
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data.pagination.page).toBe(1)
    expect(body.data.pagination.limit).toBe(100)
  })
})

// ════════════════════════════════════════════════════════════════════════
// 9A.7: POST /api/compliance/rules
// ════════════════════════════════════════════════════════════════════════

describe('POST /api/compliance/rules', () => {
  let POST: any

  beforeEach(async () => {
    vi.clearAllMocks()
    mockRequireRole.mockResolvedValue(mockUser)
    ;(db as any).complianceRule = {
      create: vi.fn().mockResolvedValue({
        id: 'rule-new', name: 'Test Rule', ruleType: 'test', severity: 'low',
        isActive: true, tenantId: 'tenant-1',
      }),
    }
    const mod = await import('@/app/api/compliance/rules/route')
    POST = mod.POST
  })

  it('creates a compliance rule and returns 201', async () => {
    const req = createNextRequest('http://localhost:3000/api/compliance/rules', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Rule',
        ruleType: 'test',
        condition: '{"field":"amount","op":"gt","value":10000}',
        action: 'flag',
        severity: 'low',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(201)

    const body = await res.json()
    expect(body.data.name).toBe('Test Rule')
  })

  it('returns 400 when required fields are missing', async () => {
    const req = createNextRequest('http://localhost:3000/api/compliance/rules', {
      method: 'POST',
      body: JSON.stringify({ name: '' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('returns 400 when condition is not valid JSON', async () => {
    const req = createNextRequest('http://localhost:3000/api/compliance/rules', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Bad Condition',
        ruleType: 'test',
        condition: 'not-json',
        action: 'flag',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)

    const body = await res.json()
    expect(body.error.message).toContain('valid JSON')
  })

  it('returns 400 when condition is not a JSON object', async () => {
    const req = createNextRequest('http://localhost:3000/api/compliance/rules', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Array Condition',
        ruleType: 'test',
        condition: '[1,2,3]',
        action: 'flag',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)

    const body = await res.json()
    expect(body.error.message).toContain('JSON object')
  })

  it('defaults severity to medium when not provided', async () => {
    ;(db as any).complianceRule.create = vi.fn().mockImplementation((opts: any) => {
      expect(opts.data.severity).toBe('medium')
      return Promise.resolve({ id: 'rule-x', ...opts.data })
    })

    const req = createNextRequest('http://localhost:3000/api/compliance/rules', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Default Severity',
        ruleType: 'test',
        condition: '{"field":"x"}',
        action: 'flag',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(201)
  })
})

// ════════════════════════════════════════════════════════════════════════
// 9A.8: API Response Envelope consistency
// ════════════════════════════════════════════════════════════════════════

describe('API Response Envelope Consistency', () => {
  it('success responses use { data } envelope', async () => {
    vi.clearAllMocks()
    ;(db as any).$queryRaw = vi.fn().mockResolvedValue([{ v: 1 }])

    const { GET } = await import('@/app/api/health/route')
    const res = await GET()
    const body = await res.json()
    expect(body.data).toBeDefined()
    expect(body.error).toBeUndefined()
  })

  it('error responses use { error: { message, code } } envelope', async () => {
    vi.clearAllMocks()
    ;(db as any).$queryRaw = vi.fn().mockRejectedValue(new Error('fail'))

    const { GET } = await import('@/app/api/health/route')
    const res = await GET()
    const body = await res.json()
    expect(body.error).toBeDefined()
    expect(body.error.message).toBeTruthy()
    expect(body.error.code).toBeTruthy()
    expect(body.data).toBeUndefined()
  })
})
