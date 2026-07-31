// ─── Audit Helper ──────────────────────────────────────────────
//
// Single entry point for all audit logging across the application.
// Wraps the tamper-proof hash-chain audit trail (audit-trail.ts) with
// a lightweight, fire-and-forget interface.
//
// Key design decisions:
// - Lazy (dynamic) import so the audit module is only loaded when needed
// - Errors are caught and logged — audit failure NEVER breaks business ops
// - action is a plain string (caller-friendly); cast internally
//

export interface AuditLogParams {
  /** Dot-notation action, e.g. 'deposit.create', 'escrow.release' */
  action: string
  /** Resource type, e.g. 'deposit', 'escrow', 'invoice', 'user' */
  resource: string
  /** ID of the affected resource */
  resourceId: string
  /** ID of the user performing the action */
  userId: string
  /** Tenant context */
  tenantId: string
  /** Optional structured details included in metadata */
  details?: Record<string, unknown>
  /** Previous state (for update operations) */
  oldValues?: Record<string, unknown>
  /** New state (for update/create operations) */
  newValues?: Record<string, unknown>
}

/**
 * Record an audit entry in the tamper-proof hash-chain audit trail.
 *
 * This is the ONLY function routes should call for audit logging.
 * It is async, non-blocking, and fault-tolerant.
 */
export async function auditLog(params: AuditLogParams): Promise<void> {
  try {
    const mod = await import('@/backend/lib/payment/audit-trail')
    const audit = mod.getAuditTrail()

    const metadata: Record<string, unknown> = {
      ...(params.details ?? {}),
      tenantId: params.tenantId,
    }
    if (params.oldValues) metadata.oldValues = params.oldValues
    if (params.newValues) metadata.newValues = params.newValues

    // Build a human-readable description
    const description = `${params.action}: ${params.resource} ${params.resourceId}`

    await audit.record({
      action: params.action as any, // AuditAction union — caller passes dot-notation
      actor: params.userId,
      resourceId: params.resourceId,
      resourceType: params.resource,
      description,
      metadata,
    })
  } catch (err) {
    // Non-fatal — audit failures must never crash a business operation
    console.error('[auditLog] Audit trail error:', err)
  }
}
