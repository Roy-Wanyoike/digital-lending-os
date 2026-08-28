/**
 * Prisma Client Singleton
 * 
 * Singleton instance of PrismaClient for database operations.
 * Ensures only one connection pool is created across the application.
 */

import { PrismaClient } from '@prisma';

// Prevent multiple instances during development with hot reloading
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const db: PrismaClient = 
  global.prisma || 
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = db;
}

export default db;
