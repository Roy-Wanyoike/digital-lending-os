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
    // WAL mode: enables concurrent reads while writing. Critical for API servers
    // where many reads happen during a write operation.
    await prisma.$executeRawUnsafe('PRAGMA journal_mode = WAL')
    // NORMAL synchronous is safe with WAL: the WAL file itself provides crash recovery.
    // Much faster than FULL (which fsyncs on every commit).
    await prisma.$executeRawUnsafe('PRAGMA synchronous = NORMAL')
    // 64MB page cache — keeps hot indexes and frequently-accessed rows in memory.
    // Negative value = kilobytes; -64000 = ~64MB
    await prisma.$executeRawUnsafe('PRAGMA cache_size = -64000')
    // Temporary tables (used by GROUP BY, ORDER BY, etc.) live in RAM instead of disk.
    await prisma.$executeRawUnsafe('PRAGMA temp_store = MEMORY')
    // Memory-map up to 256MB of the database file for faster reads without going
    // through the buffer cache syscall overhead.
    await prisma.$executeRawUnsafe('PRAGMA mmap_size = 268435456')
    // Use the WAL auto-checkpoint threshold of 1000 pages (default) to avoid
    // excessive checkpoint I/O during bursty writes.
    // Lower busy_timeout prevents "database is locked" errors in concurrent access.
    await prisma.$executeRawUnsafe('PRAGMA busy_timeout = 5000')
    _pragmaApplied = true
  } catch (err) {
    // Pragmas are best-effort — if they fail, the DB still works, just slower.
    // This can happen if the DB file is read-only or in certain embedded scenarios.
    console.warn('[db] Failed to apply SQLite PRAGMAs (non-critical):', err)
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
    applyPragmas(_db).catch(() => {})
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
