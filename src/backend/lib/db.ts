// Lazy Prisma client singleton — zero top-level imports from @prisma/client
// This prevents Turbopack from triggering native engine load during compilation.
//
// SQLite connection notes:
//   - No connection pooling or keep-alive needed (file-based storage)
//   - Singleton pattern ensures exactly one connection per process
//   - log: [] disables query logging in production (reduces I/O)

let _db: any = undefined
let _pragmaApplied = false

async function applyPragmas(prisma: any) {
  if (_pragmaApplied) return
  try {
    // Use $queryRaw instead of $executeRawUnsafe — PRAGMAs return results in SQLite,
    // which causes P2010 errors with $executeRawUnsafe.
    await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL')
    await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL')
    await prisma.$queryRawUnsafe('PRAGMA cache_size = -64000')
    await prisma.$queryRawUnsafe('PRAGMA temp_store = MEMORY')
    await prisma.$queryRawUnsafe('PRAGMA mmap_size = 268435456')
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 5000')
    _pragmaApplied = true
  } catch (_err) {
    // Pragmas are best-effort — if they fail, the DB still works, just slower.
    // Silently ignore — no console noise in production.
  }
}

function getDb() {
  if (!_db) {
    const { PrismaClient } = require('@prisma/client')
    const g = globalThis as Record<string, any>
    _db = g.__prisma ?? new PrismaClient({
      log: [],
      // Explicit datasource for clarity — reads DATABASE_URL from env
      datasourceUrl: process.env.DATABASE_URL,
    })
    if (process.env.NODE_ENV !== 'production') g.__prisma = _db
    // Apply PRAGMAs asynchronously — non-blocking for first request
    applyPragmas(_db).catch(() => { /* best-effort */ })
  }
  return _db
}

// Ensure pragmas are applied before first real query in serverless/warm starts.
// This is idempotent — subsequent calls return immediately.
export async function ensurePragmas() {
  if (_db) await applyPragmas(_db)
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
