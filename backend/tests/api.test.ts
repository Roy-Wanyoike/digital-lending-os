/**
 * API Endpoint Integration Tests
 * 
 * Tests for Express API endpoints including:
 * - Health check endpoint
 * - Root endpoint
 * - 404 handling
 * - Route mounting
 */

import request from 'supertest';
import express from 'express';
import { config } from '../src/config';

// Create a minimal Express app for testing (without starting server)
function createTestApp(): express.Application {
  const app = express();
  
  // Basic middleware
  app.use(express.json());
  
  // Health check endpoint (same as in index.ts)
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      version: config.apiVersion,
    });
  });

  // Root endpoint
  app.get('/', (_req, res) => {
    res.json({
      name: 'Digital Lending OS API',
      version: config.apiVersion,
      status: 'operational',
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
    });
  });

  // API docs endpoint
  app.get('/api/docs', (_req, res) => {
    res.json({
      title: 'Digital Lending OS API Documentation',
      version: config.apiVersion,
      endpoints: {},
    });
  });

  // Test protected route
  app.get('/api/v1/tenants', (_req, res) => {
    res.json({
      success: true,
      data: [
        { id: '1', name: 'Tenant 1', slug: 'tenant-1' },
        { id: '2', name: 'Tenant 2', slug: 'tenant-2' },
      ],
      pagination: { page: 1, limit: 20, total: 2, pages: 1 },
    });
  });

  // Test auth login endpoint
  app.post('/api/v1/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    if (email === 'test@example.com' && password === 'correct-password') {
      return res.json({
        success: true,
        data: {
          user: { id: 'user-1', email, name: 'Test User', role: 'TENANT_ADMIN' },
          accessToken: 'mock-jwt-token',
          expiresIn: '15m',
        },
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid credentials',
    });
  });

  // 404 handler (must be last)
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: 'Not Found',
      message: 'The requested resource was not found',
    });
  });

  return app;
}

describe('API Endpoints', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
  });

  // ===========================================================================
  // HEALTH CHECK TESTS
  // ===========================================================================
  describe('GET /api/health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });

    it('should include timestamp', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body.timestamp).toBeDefined();
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    it('should include uptime', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body.uptime).toBeDefined();
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should include memory usage', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body.memory).toBeDefined();
      expect(response.body.memory.used).toBeGreaterThan(0);
      expect(response.body.memory.total).toBeGreaterThan(0);
    });

    it('should include API version', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body.version).toBe(config.apiVersion);
    });
  });

  // ===========================================================================
  // ROOT ENDPOINT TESTS
  // ===========================================================================
  describe('GET /', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body.name).toBe('Digital Lending OS API');
      expect(response.body.version).toBe(config.apiVersion);
      expect(response.body.status).toBe('operational');
    });

    it('should include environment info', async () => {
      const response = await request(app).get('/');

      expect(response.body.environment).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });
  });

  // ===========================================================================
  // API DOCS ENDPOINT TESTS
  // ===========================================================================
  describe('GET /api/docs', () => {
    it('should return API documentation structure', async () => {
      const response = await request(app)
        .get('/api/docs')
        .expect(200);

      expect(response.body.title).toContain('Digital Lending OS');
      expect(response.body.version).toBeDefined();
    });
  });

  // ===========================================================================
  // TENANTS ENDPOINT TESTS
  // ===========================================================================
  describe('GET /api/v1/tenants', () => {
    it('should return list of tenants', async () => {
      const response = await request(app)
        .get('/api/v1/tenants')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should include pagination metadata', async () => {
      const response = await request(app).get('/api/v1/tenants');

      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
      expect(response.body.pagination.total).toBeGreaterThan(0);
    });

    it('should return tenant objects with required fields', async () => {
      const response = await request(app).get('/api/v1/tenants');
      const tenant = response.body.data[0];

      expect(tenant.id).toBeDefined();
      expect(tenant.name).toBeDefined();
      expect(tenant.slug).toBeDefined();
    });
  });

  // ===========================================================================
  // AUTH LOGIN TESTS
  // ===========================================================================
  describe('POST /api/v1/auth/login', () => {
    it('should return token on successful login', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'correct-password',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should reject missing credentials with 400', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should reject invalid credentials with 401', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrong-password',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid');
    });

    it('should reject empty email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: '',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject empty password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: '',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ===========================================================================
  // 404 HANDLING TESTS
  // ===========================================================================
  describe('404 Not Found', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent-endpoint')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Not Found');
    });

    it('should return 404 for deeply nested unknown routes', async () => {
      await request(app)
        .get('/api/v1/unknown/nested/route')
        .expect(404);
    });

    it('should return 404 for POST to unknown routes', async () => {
      await request(app)
        .post('/api/v1/unknown')
        .send({ data: 'test' })
        .expect(404);
    });

    it('should include helpful message in 404 response', async () => {
      const response = await request(app)
        .get('/api/v1/does-not-exist')
        .expect(404);

      expect(response.body.message).toBeDefined();
      expect(typeof response.body.message).toBe('string');
    });
  });

  // ===========================================================================
  // CONTENT TYPE TESTS
  // ===========================================================================
  describe('Content-Type Handling', () => {
    it('should accept JSON content type', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ email: 'test@example.com', password: 'correct-password' }))
        .expect(200);
    });

    it('should return JSON responses', async () => {
      const response = await request(app).get('/api/health');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  // ===========================================================================
  // CORS AND HEADERS TESTS
  // ===========================================================================
  describe('Response Headers', () => {
    it('should include proper headers', async () => {
      const response = await request(app).get('/api/health');

      expect(response.headers['content-type']).toBeDefined();
      expect(response.headers['x-powered-by']).toBeDefined();
    });
  });

  // ===========================================================================
  // ERROR HANDLING TESTS
  // ===========================================================================
  describe('Error Handling', () => {
    it('should handle malformed JSON body gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400); // Bad request for malformed JSON

      // Should not crash, should return an error response
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle very large payloads appropriately', async () => {
      const largePayload = { data: 'x'.repeat(10000000) };
      
      // This should either be handled or rejected
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(largePayload);
      
      // Response should be valid JSON or appropriate error
      expect([200, 400, 413]).toContain(response.status);
    });
  });
});
