// Lazy Prisma client singleton — zero top-level imports from @prisma/client
// This prevents Turbopack from triggering native engine load during compilation.

let _db: any = undefined

function getDb() {
  if (!_db) {
    const { PrismaClient } = require('@prisma/client')
    const g = globalThis as Record<string, any>
    _db = g.__prisma ?? new PrismaClient({ log: [] })
    if (process.env.NODE_ENV !== 'production') g.__prisma = _db
  }
  return _db
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
