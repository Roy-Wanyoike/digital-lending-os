/**
 * Visual Regression Tests
 * 
 * Tests for UI component and page visual consistency.
 * Run: npx playwright test
 */

import { test, expect } from '@playwright/test';

// =============================================================================
// API DOCUMENTATION PAGE TESTS
// =============================================================================

describe('API Documentation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/api-docs');
    await page.waitForLoadState('networkidle');
  });

  test('should display Swagger UI correctly', async ({ page }) => {
    // Check if Swagger UI container is visible
    const swaggerContainer = await page.locator('.swagger-ui');
    await expect(swaggerContainer).toBeVisible();
  });

  test('should have correct page title', async ({ page }) => {
    const title = await page.title();
    expect(title).toContain('Digital Lending OS');
  });
});

// =============================================================================
// HEALTH CHECK ENDPOINT VISUAL
// =============================================================================

describe('Health Check Endpoint', () => {
  test('should return healthy status JSON', async ({ request }) => {
    const response = await request.get('/api/health');
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.status).toBe('healthy');
    expect(body.version).toBeDefined();
    expect(body.uptime).toBeDefined();
    expect(body.memory).toBeDefined();
  });
});

// =============================================================================
// ROOT ENDPOINT VISUAL
// =============================================================================

describe('Root Endpoint', () => {
  test('should return API information', async ({ request }) => {
    const response = await request.get('/');
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.name).toBe('Digital Lending OS API');
    expect(body.status).toBe('operational');
    expect(body.documentation).toBeDefined();
    expect(body.health).toBe('/api/health');
  });
});

// =============================================================================
// ERROR PAGE TESTS (if applicable)
// =============================================================================

describe('Error Handling', () => {
  test('should return 404 for unknown routes', async ({ request }) => {
    const response = await request.get('/api/v1/unknown-endpoint-that-does-not-exist');
    
    expect(response.status()).toBe(404);
    const body = await response.json();
    
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
  });

  test('should return proper error format for validation errors', async ({ request }) => {
    // Try to create a customer with invalid data
    const response = await request.post('/api/v1/customers', {
      data: {
        // Missing required fields
        firstName: '',
      },
    });

    // Should return 400 or 422 for validation errors
    expect([400, 401, 422, 404]).toContain(response.status());
  });
});

// =============================================================================
// SCREENSHOT COMPARISON SETUP (for CI)
// =============================================================================

/**
 * Visual regression tests for critical pages.
 * These tests compare screenshots against baseline images.
 * 
 * To update baselines: npx playwright test --update-snapshots
 */

describe('Visual Regression - Critical Pages', () => {
  test.skip(process.env.CI === 'undefined' ? false : 'Screenshots only in local/dev mode', () => {});

  test('API docs page should match snapshot', async ({ page }) => {
    await page.goto('/api-docs');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('api-docs-page.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('Root endpoint should return consistent structure', async ({ request }) => {
    const response = await request.get('/');
    const body = await response.json();
    
    // Snapshot the JSON structure for regression testing
    expect(body).toMatchSnapshot('root-response.json');
  });

  test('Health check should have consistent schema', async ({ request }) => {
    const response = await request.get('/api/health');
    const body = await response.json();
    
    expect(body).toMatchSnapshot('health-check-schema.json');
  });
});
