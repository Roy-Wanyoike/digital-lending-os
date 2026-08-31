/**
 * Test Setup Configuration
 * 
 * Sets up Jest mocks for database, logger, and other dependencies.
 * This file runs before each test file.
 */

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-for-testing';
process.env.DATABASE_URL = ':memory:';
process.env.PORT = '4001';
process.env.BCRYPT_ROUNDS = '4'; // Faster hashing in tests

// Import jest types - these are available at runtime when running with ts-jest
import { jest, beforeEach, expect } from '@jest/globals';

// Mock Prisma client
jest.mock('../src/lib/db', () => {
  const mockDb = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      updateMany: jest.fn(),
    },
    tenant: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    loan: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    loanProduct: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    loanApplication: {
      findMany: jest.fn(),
    },
    kycDocument: {
      findMany: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    repayment: {
      findMany: jest.fn(),
      orderBy: jest.fn(),
    },
    // Session table for auth
    session: {
      create: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  return {
    db: mockDb,
    default: mockDb,
  };
});

// Mock Winston logger to suppress output in tests
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
    verbose: jest.fn(),
    silly: jest.fn(),
  },
}));

// Global test utilities
beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
});

// Extend Jest matchers
expect.extend({
  toBeValidDate(received: unknown) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    return {
      pass,
      message: () =>
        `expected ${received} to be a valid Date`,
    };
  },

  toBeValidJwt(received: unknown) {
    const jwtRegex = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
    const pass = typeof received === 'string' && jwtRegex.test(received);
    return {
      pass,
      message: () =>
        `expected ${received} to be a valid JWT token`,
    };
  },
});

// Custom matcher type declarations
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidDate(): R;
      toBeValidJwt(): R;
    }
  }
}
