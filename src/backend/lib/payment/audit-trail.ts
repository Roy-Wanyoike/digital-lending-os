// ─── Tamper-Proof Audit Trail with Hash Chain ─────────────────────────
//
// Every state transition or security-relevant event is recorded as an
// immutable entry. Each entry contains a cryptographic hash of the previous
// entry (hash chain), making it computationally infeasible to alter or
// delete entries without detection.
//
// Production deployments should persist to a write-once ledger (PostgreSQL
// with append-only table, or a dedicated audit database). This in-memory
// implementation demonstrates the hash-chain mechanics and is suitable for
// development and testing.
//

import { createHash, randomBytes, createHmac } from 'crypto'

// ── Types ──────────────────────────────────────────────────────────

export type AuditAction =
  | 'PAYMENT_CREATED'
  | 'PAYMENT_INITIALIZED'
  | 'STATE_TRANSITION'
  | 'WEBHOOK_RECEIVED'
  | 'WEBHOOK_VERIFIED'
  | 'WEBHOOK_REJECTED'
  | 'REFUND_INITIATED'
  | 'REFUND_COMPLETED'
  | 'DISPUTE_OPENED'
  | 'DISPUTE_RESOLVED'
  | 'PAYMENT_CANCELLED'
  | 'ENCRYPTION_KEY_ROTATED'
  | 'IDEMPOTENCY_DEDUP'
  | 'AUTH_FAILURE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'IP_BLOCKED'
  | 'VALIDATION_FAILED'
  | 'SENSITIVE_DATA_ACCESSED'
  | 'CONFIG_CHANGED'

export interface AuditEntry {
  /** Sequential entry ID (auto-incremented) */
  id: number
  /** ISO 8601 timestamp */
  timestamp: string
  /** Category of action */
  action: AuditAction
  /** Actor who performed the action (userId, 'system', 'webhook:<provider>') */
  actor: string
  /** Resource affected (paymentId, orderId, etc.) */
  resourceId: string
  /** Resource type (payment, refund, dispute, key, config) */
  resourceType: string
  /** Summary of what happened */
  description: string
  /** Structured metadata (old state, new state, amount, provider, etc.) */
  metadata: Record<string, unknown>
  /** Hash of this entry (computed from all fields) */
  hash: string
  /** Hash of the previous entry (null for genesis) */
  previousHash: string | null
  /** HMAC signature for additional integrity verification */
  signature: string
  /** Client IP address */
  ipAddress: string
  /** User-Agent of the request */
  userAgent: string
}

export interface AuditQuery {
  action?: AuditAction | AuditAction[]
  actor?: string
  resourceId?: string
  resourceType?: string
  from?: string
  to?: string
  limit?: number
}

export interface AuditVerificationResult {
  valid: boolean
  totalEntries: number
  verifiedCount: number
  firstInvalidIndex: number | null
  reason: string | null
}

// ── AuditTrail ────────────────────────────────────────────────────

export class AuditTrail {
  // In-memory chain storage. Production: PostgreSQL append-only table.
  private chain: AuditEntry[] = []
  private entryCounter = 0
  private genesisHash: string

  // HMAC key for entry signing (derived from env or random)
  private signingKey: Buffer

  // Optional callback for persistence (write-ahead)
  private persistCallback?: (entry: AuditEntry) => Promise<void>

  constructor(options?: {
    signingKey?: string
    persistCallback?: (entry: AuditEntry) => Promise<void>
  }) {
    // Derive signing key from env or provided value
    const rawKey = options?.signingKey ?? process.env.AUDIT_SIGNING_KEY
    if (rawKey) {
      this.signingKey = Buffer.from(rawKey, 'utf8')
    } else {
      // Auto-generate a random key (deterministic per instance lifetime)
      this.signingKey = randomBytes(32)
    }

    // Create genesis hash (hash of an empty/seed string)
    this.genesisHash = createHash('sha256')
      .update('youngsend-audit-genesis')
      .digest('hex')

    this.persistCallback = options?.persistCallback
  }

  /**
   * Record a new audit entry. Computes the hash chain link and signs it.
   */
  async record(params: {
    action: AuditAction
    actor: string
    resourceId: string
    resourceType: string
    description: string
    metadata?: Record<string, unknown>
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditEntry> {
    this.entryCounter++

    const previousEntry = this.chain.length > 0
      ? this.chain[this.chain.length - 1]
      : null

    const previousHash = previousEntry
      ? previousEntry.hash
      : this.genesisHash

    const entryWithoutHash: Omit<AuditEntry, 'hash' | 'signature'> = {
      id: this.entryCounter,
      timestamp: new Date().toISOString(),
      action: params.action,
      actor: params.actor,
      resourceId: params.resourceId,
      resourceType: params.resourceType,
      description: params.description,
      metadata: params.metadata ?? {},
      previousHash,
      ipAddress: params.ipAddress ?? 'unknown',
      userAgent: params.userAgent ?? 'system',
    }

    // Compute hash of the entry content (deterministic serialization)
    const entryHash = this.computeEntryHash(entryWithoutHash)

    // Create the full entry with hash
    const entry: AuditEntry = {
      ...entryWithoutHash,
      hash: entryHash,
      // Signature will be set below
      signature: '',
    }

    // Sign the entry with HMAC
    entry.signature = this.signEntry(entry)

    // Append to chain
    this.chain.push(entry)

    // Persist if callback provided (write-ahead, don't block)
    if (this.persistCallback) {
      try {
        await this.persistCallback(entry)
      } catch (err) {
        // Log but don't fail the operation
        console.error('[AuditTrail] Persist failed:', err)
      }
    }

    return entry
  }

  /**
   * Convenience: record a state transition audit entry.
   */
  async recordStateTransition(params: {
    paymentId: string
    fromState: string
    toState: string
    actor: string
    provider?: string
    transitionId?: string
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditEntry> {
    return this.record({
      action: 'STATE_TRANSITION',
      actor: params.actor,
      resourceId: params.paymentId,
      resourceType: 'payment',
      description: `Payment ${params.paymentId}: ${params.fromState} → ${params.toState}`,
      metadata: {
        fromState: params.fromState,
        toState: params.toState,
        provider: params.provider ?? null,
        transitionId: params.transitionId ?? null,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
  }

  /**
   * Convenience: record a webhook event.
   */
  async recordWebhookEvent(params: {
    paymentId: string
    provider: string
    verified: boolean
    reason?: string
    rawEvent?: string
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditEntry> {
    return this.record({
      action: params.verified ? 'WEBHOOK_VERIFIED' : 'WEBHOOK_REJECTED',
      actor: `webhook:${params.provider}`,
      resourceId: params.paymentId,
      resourceType: 'payment',
      description: params.verified
        ? `Webhook from ${params.provider} verified for payment ${params.paymentId}`
        : `Webhook from ${params.provider} rejected for payment ${params.paymentId}: ${params.reason ?? 'unknown'}`,
      metadata: {
        provider: params.provider,
        verified: params.verified,
        rejectionReason: params.reason ?? null,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
  }

  /**
   * Verify the integrity of the entire audit chain.
   * Checks that each entry's hash is correct and that the chain links are intact.
   */
  verifyChain(): AuditVerificationResult {
    const totalEntries = this.chain.length
    if (totalEntries === 0) {
      return { valid: true, totalEntries: 0, verifiedCount: 0, firstInvalidIndex: null, reason: null }
    }

    // Verify genesis link
    if (this.chain[0].previousHash !== this.genesisHash) {
      return {
        valid: false,
        totalEntries,
        verifiedCount: 0,
        firstInvalidIndex: 0,
        reason: 'First entry does not link to genesis hash',
      }
    }

    let verifiedCount = 0

    for (let i = 0; i < totalEntries; i++) {
      const entry = this.chain[i]

      // Recompute hash (excluding hash and signature fields)
      const entryWithoutHash = {
        id: entry.id,
        timestamp: entry.timestamp,
        action: entry.action,
        actor: entry.actor,
        resourceId: entry.resourceId,
        resourceType: entry.resourceType,
        description: entry.description,
        metadata: entry.metadata,
        previousHash: entry.previousHash,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      }

      const expectedHash = this.computeEntryHash(entryWithoutHash)
      if (entry.hash !== expectedHash) {
        return {
          valid: false,
          totalEntries,
          verifiedCount: i,
          firstInvalidIndex: i,
          reason: `Hash mismatch at entry ${i}: computed ${expectedHash} !== stored ${entry.hash}`,
        }
      }

      // Verify signature
      const expectedSignature = this.signEntry({ ...entry, signature: '' })
      if (entry.signature !== expectedSignature) {
        return {
          valid: false,
          totalEntries,
          verifiedCount: i,
          firstInvalidIndex: i,
          reason: `Signature mismatch at entry ${i}`,
        }
      }

      // Verify chain link (previousHash of current == hash of previous)
      if (i > 0) {
        if (entry.previousHash !== this.chain[i - 1].hash) {
          return {
            valid: false,
            totalEntries,
            verifiedCount: i,
            firstInvalidIndex: i,
            reason: `Chain link broken at entry ${i}: previousHash does not match hash of entry ${i - 1}`,
          }
        }
      }

      verifiedCount++
    }

    return { valid: true, totalEntries, verifiedCount, firstInvalidIndex: null, reason: null }
  }

  /**
   * Query the audit trail with optional filters.
   */
  query(query: AuditQuery): AuditEntry[] {
    let results = [...this.chain]

    if (query.action) {
      const actions = Array.isArray(query.action) ? query.action : [query.action]
      results = results.filter((e) => actions.includes(e.action))
    }
    if (query.actor) {
      results = results.filter((e) => e.actor === query.actor)
    }
    if (query.resourceId) {
      results = results.filter((e) => e.resourceId === query.resourceId)
    }
    if (query.resourceType) {
      results = results.filter((e) => e.resourceType === query.resourceType)
    }
    if (query.from) {
      results = results.filter((e) => e.timestamp >= query.from!)
    }
    if (query.to) {
      results = results.filter((e) => e.timestamp <= query.to!)
    }

    if (query.limit && query.limit > 0) {
      results = results.slice(-query.limit)
    }

    return results
  }

  /**
   * Get a specific entry by ID.
   */
  getById(id: number): AuditEntry | null {
    return this.chain.find((e) => e.id === id) ?? null
  }

  /**
   * Get the latest N entries.
   */
  getLatest(count: number = 10): AuditEntry[] {
    return this.chain.slice(-count)
  }

  /**
   * Get all entries for a specific resource (e.g., a payment ID).
   */
  getForResource(resourceId: string): AuditEntry[] {
    return this.chain.filter((e) => e.resourceId === resourceId)
  }

  /**
   * Get the total number of entries in the trail.
   */
  get size(): number {
    return this.chain.length
  }

  /**
   * Export the audit trail as a JSON-serializable array (without signatures,
   * suitable for reporting).
   */
  export(): Omit<AuditEntry, 'signature'>[] {
    return this.chain.map(({ signature: _sig, ...rest }) => rest)
  }

  /**
   * Get a cryptographic proof for a specific entry (hash + previous hash).
   * Useful for third-party verification.
   */
  getProof(entryId: number): {
    entryHash: string
    previousHash: string | null
    proof: string // hash of (entryHash + previousHash)
  } | null {
    const entry = this.getById(entryId)
    if (!entry) return null

    const proof = createHash('sha256')
      .update(`${entry.hash}:${entry.previousHash}`)
      .digest('hex')

    return {
      entryHash: entry.hash,
      previousHash: entry.previousHash,
      proof,
    }
  }

  /**
   * Clear all entries (useful for testing).
   */
  clear(): void {
    this.chain = []
    this.entryCounter = 0
  }

  // ── Private helpers ───────────────────────────────────────────

  /**
   * Compute SHA-256 hash of an entry's content (deterministic JSON sort).
   */
  private computeEntryHash(entry: Omit<AuditEntry, 'hash' | 'signature'>): string {
    // Deterministic serialization: sort keys, no whitespace
    const canonical = JSON.stringify(this.sortKeys(entry))
    return createHash('sha256').update(canonical, 'utf8').digest('hex')
  }

  /**
   * HMAC-SHA256 sign the entry hash for integrity verification.
   */
  private signEntry(entry: Omit<AuditEntry, 'signature'>): string {
    return createHmac('sha256', this.signingKey)
      .update(entry.hash, 'utf8')
      .digest('hex')
  }

  /**
   * Recursively sort object keys for deterministic serialization.
   */
  private sortKeys(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') return obj
    if (Array.isArray(obj)) return obj.map(this.sortKeys.bind(this))
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
      sorted[key] = this.sortKeys((obj as Record<string, unknown>)[key])
    }
    return sorted
  }
}

// ── Singleton ──────────────────────────────────────────────────────

let _instance: AuditTrail | null = null

export function getAuditTrail(): AuditTrail {
  if (!_instance) {
    _instance = new AuditTrail()
  }
  return _instance
}
