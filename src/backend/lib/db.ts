// Lazy Prisma client singleton — zero top-level imports from @prisma/client
// This prevents Turbopack from triggering native engine load during compilation.
//
// PostgreSQL connection notes:
//   - Prisma manages its own connection pool (built-in pooler)
//   - Singleton pattern ensures one client per process
//   - log: [] disables query logging in production (reduces I/O)

let _db: any = undefined

function getDb() {
  if (!_db) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient } = require('@prisma/client')
    const g = globalThis as Record<string, any>
    _db = g.__prisma ?? new PrismaClient({
      log: [],
      // Explicit datasource for clarity — reads DATABASE_URL from env
      datasourceUrl: process.env.DATABASE_URL,
    })
    if (process.env.NODE_ENV !== 'production') g.__prisma = _db
  }
  return _db
}

// No-op for backward compatibility (was used for SQLite PRAGMAs).
// Kept as an export so existing callers and tests don't break.
export async function ensurePragmas() {
  // PostgreSQL doesn't need PRAGMA-style initialization
}

// Untyped proxy — all PrismaClient methods available, fully lazy
// Type safety is enforced at call sites via the Prisma generated types
export const db = new Proxy({} as any, {
  get(_, prop) {
    return (getDb() as any)[prop]
  },
  has(_, prop) {
    return prop in (getDb() as any)
  },
})
