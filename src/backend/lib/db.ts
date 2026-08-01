// Lazy Prisma client singleton
// Defers @prisma/client import to first use, avoiding native engine
// crash during Turbopack module resolution on Node 24.

import type { PrismaClient } from '@prisma/client'

let _db: any = undefined

function getDb() {
  if (!_db) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient: PC } = require('@prisma/client')
    const g = globalThis as Record<string, any>
    _db = g.__prisma ?? new PC({ log: [] })
    if (process.env.NODE_ENV !== 'production') g.__prisma = _db
  }
  return _db
}

// Type-safe proxy — resolves PrismaClient methods on first access
export const db = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return (getDb() as any)[prop]
  },
  has(_, prop) {
    return prop in (getDb() as any)
  },
  apply(_, thisArg, args) {
    return (getDb() as any)(...args)
  },
})
