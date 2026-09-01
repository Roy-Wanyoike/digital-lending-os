// Consolidated: this module re-exports the canonical Prisma client from ./db.
// Both `import { prisma } from '@/lib/prisma'` and `import { db } from '@/lib/db'`
// now resolve to the exact same singleton instance (with query logging enabled).
export { db as prisma } from './db'

