// ─── OpenSearch Sync Service (DB → OpenSearch) ──────────────
// Reads from Prisma DB and writes to OpenSearch.
// Entity types are mapped to Prisma model names and OpenSearch indices.

import { searchService } from './search-service'

// ── Entity type enum / index mapping ──────────────────────────

export enum EntityType {
  Transaction = 'transaction',
  EscrowTransaction = 'escrow_transaction',
  Invoice = 'invoice',
  FraudAlert = 'fraud_alert',
  AuditLog = 'audit_log',
  Business = 'business',
}

/** Maps an entity type to its OpenSearch index name */
export const ENTITY_INDEX_MAP: Record<EntityType, string> = {
  [EntityType.Transaction]: 'ys-transactions',
  [EntityType.EscrowTransaction]: 'ys-escrow-transactions',
  [EntityType.Invoice]: 'ys-invoices',
  [EntityType.FraudAlert]: 'ys-fraud-alerts',
  [EntityType.AuditLog]: 'ys-audit-logs',
  [EntityType.Business]: 'ys-businesses',
}

/** Maps an entity type to its Prisma model key */
const ENTITY_PRISMA_MODEL: Record<EntityType, string> = {
  [EntityType.Transaction]: 'paymentTransaction',
  [EntityType.EscrowTransaction]: 'escrowTransaction',
  [EntityType.Invoice]: 'invoice',
  [EntityType.FraudAlert]: 'fraudAlert',
  [EntityType.AuditLog]: 'escrowAuditLog',
  [EntityType.Business]: 'business',
}

// ── Transform helpers ─────────────────────────────────────────

/** Convert a Date to ISO string, leave undefined/null as-is */
function toDateStr(v: Date | string | null | undefined): string | undefined {
  if (!v) return undefined
  return typeof v === 'string' ? v : v.toISOString()
}

/** Generic: strip relations, ensure dates are ISO strings */
function toPlain(obj: any): Record<string, any> {
  const out: Record<string, any> = { id: obj.id }
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'id') continue
    // Skip Prisma relation objects (arrays or objects with their own id)
    if (v && typeof v === 'object' && !Array.isArray(v) && 'id' in (v as any)) continue
    if (Array.isArray(v)) continue
    if (v instanceof Date) {
      out[k] = v.toISOString()
    } else if (v === null || v === undefined) {
      // skip nulls — OpenSearch omits missing fields automatically
    } else {
      out[k] = v
    }
  }
  return out
}

// ── Per-entity transformers ───────────────────────────────────

function transformTransaction(row: any): Record<string, any> {
  return {
    id: row.id,
    txRef: row.txRef,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    type: row.type ?? 'payment',
    description: row.description,
    tenantId: row.intent?.fromBusinessId, // best-effort
    createdAt: toDateStr(row.createdAt),
    updatedAt: toDateStr(row.updatedAt),
  }
}

function transformEscrowTransaction(row: any): Record<string, any> {
  return {
    id: row.id,
    txRef: row.txRef,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    buyerId: row.buyerId,
    sellerId: row.sellerId,
    description: row.description,
    tenantId: row.buyer?.tenantId,
    createdAt: toDateStr(row.createdAt),
    updatedAt: toDateStr(row.updatedAt),
  }
}

function transformInvoice(row: any): Record<string, any> {
  return {
    id: row.id,
    invoiceRef: row.invoiceRef,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    dueDate: toDateStr(row.dueDate),
    senderId: row.senderId,
    receiverId: row.receiverId,
    tenantId: row.sender?.tenantId,
    createdAt: toDateStr(row.createdAt),
    updatedAt: toDateStr(row.updatedAt),
    notes: row.notes,
  }
}

function transformFraudAlert(row: any): Record<string, any> {
  return {
    id: row.id,
    alertRef: row.alertRef,
    severity: row.severity,
    status: row.status,
    fraudType: row.fraudType,
    ruleId: undefined, // no FK in schema
    score: row.score,
    description: row.description,
    businessId: row.businessId,
    tenantId: row.business?.tenantId,
    createdAt: toDateStr(row.createdAt),
    updatedAt: toDateStr(row.updatedAt),
  }
}

function transformAuditLog(row: any): Record<string, any> {
  return {
    id: row.id,
    action: row.action,
    entityType: row.escrowId ? 'escrow' : 'unknown',
    entityId: row.escrowId,
    userId: row.actor,
    actorId: row.actor,
    tenantId: undefined, // audit logs don't have direct tenantId
    details: row.details,
    metadata: row.metadata ? JSON.parse(typeof row.metadata === 'string' ? row.metadata : JSON.stringify(row.metadata)) : undefined,
    createdAt: toDateStr(row.createdAt),
  }
}

function transformBusiness(row: any): Record<string, any> {
  return {
    id: row.id,
    name: row.name,
    legalName: row.legalName,
    email: undefined, // Business model has no email field
    status: row.status,
    country: row.country,
    industry: row.industry,
    tenantId: row.tenantId,
    createdAt: toDateStr(row.createdAt),
    updatedAt: toDateStr(row.updatedAt),
  }
}

const TRANSFORMERS: Record<EntityType, (row: any) => Record<string, any>> = {
  [EntityType.Transaction]: transformTransaction,
  [EntityType.EscrowTransaction]: transformEscrowTransaction,
  [EntityType.Invoice]: transformInvoice,
  [EntityType.FraudAlert]: transformFraudAlert,
  [EntityType.AuditLog]: transformAuditLog,
  [EntityType.Business]: transformBusiness,
}

// ── Include helpers for Prisma includes ───────────────────────

const PRISMA_INCLUDE: Record<EntityType, any> = {
  [EntityType.Transaction]: { intent: { select: { fromBusinessId: true } } },
  [EntityType.EscrowTransaction]: { buyer: { select: { tenantId: true } } },
  [EntityType.Invoice]: { sender: { select: { tenantId: true } } },
  [EntityType.FraudAlert]: { business: { select: { tenantId: true } } },
  [EntityType.AuditLog]: {},
  [EntityType.Business]: {},
}

// ── Sync Service ───────────────────────────────────────────────

export const syncService = {
  /**
   * Sync a single entity from DB to OpenSearch.
   */
  async syncEntity(entityType: EntityType, id: string): Promise<void> {
    const { db } = await import('../db')
    const prismaModel = ENTITY_PRISMA_MODEL[entityType]
    const index = ENTITY_INDEX_MAP[entityType]
    const transformer = TRANSFORMERS[entityType]
    const include = PRISMA_INCLUDE[entityType]

    try {
      const row: any = await (db as any)[prismaModel].findUnique({ where: { id }, include })
      if (!row) {
        // Entity was deleted — remove from OpenSearch
        await searchService.delete(index, id)
        return
      }
      const doc = transformer(row)
      await searchService.index(index, id, doc)
    } catch (err) {
      console.error(`[SyncService] syncEntity failed for ${entityType}/${id}:`, err)
    }
  },

  /**
   * Full reindex of an entity type.  Fetches all rows from DB in
   * batches and bulk-indexes them into OpenSearch.
   */
  async syncAll(entityType: EntityType, batchSize: number = 500): Promise<number> {
    const { db } = await import('../db')
    const prismaModel = ENTITY_PRISMA_MODEL[entityType]
    const index = ENTITY_INDEX_MAP[entityType]
    const transformer = TRANSFORMERS[entityType]
    const include = PRISMA_INCLUDE[entityType]

    let synced = 0
    let cursor: any = undefined
    let hasMore = true

    try {
      while (hasMore) {
        const rows: any[] = await (db as any)[prismaModel].findMany({
          take: batchSize,
          skip: cursor ? 1 : 0,
          cursor: cursor ? { id: cursor } : undefined,
          orderBy: { id: 'asc' },
          include,
        })

        if (rows.length === 0) {
          hasMore = false
          break
        }

        const docs = rows.map(r => transformer(r))
        await searchService.bulkIndex(index, docs)
        synced += rows.length
        cursor = rows[rows.length - 1].id
      }
    } catch (err) {
      console.error(`[SyncService] syncAll failed for ${entityType}:`, err)
    }

    return synced
  },

  /**
   * Remove an entity from OpenSearch.
   */
  async deleteEntity(entityType: EntityType, id: string, tenantId?: string): Promise<void> {
    const index = ENTITY_INDEX_MAP[entityType]
    await searchService.delete(index, id, tenantId)
  },
}
