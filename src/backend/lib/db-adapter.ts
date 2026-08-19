// Database adapter that abstracts SQLite vs PostgreSQL
import { PrismaClient } from '@prisma/client';

const dbProvider = process.env.DB_PROVIDER || 'sqlite'; // 'sqlite' | 'postgresql'

function createPrismaClient() {
  // Log which provider is being used
  console.log(`[db] Initializing Prisma with provider: ${dbProvider}`);
  return new PrismaClient();
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
export default db;
