// ─── Audit Logger ──────────────────────────────────────────────
// Lightweight server-side audit logging.  Writes structured entries to
// stdout (visible in dev-server / container logs) so they can be picked up
// by log aggregators (CloudWatch, Datadog, etc.) in production.

export interface AuditEntry {
  action: string
  actorId: string
  details: string
  metadata?: Record<string, unknown>
  timestamp: string
}

/**
 * Log an audit event.
 *
 * @param action     A short verb like "login", "register", "wallet.create", "withdrawal.initiate"
 * @param actorId    The account ID performing the action (or "system" / "anonymous")
 * @param details    Human-readable description
 * @param metadata   Optional key-value payload for machine parsing (amounts, IDs, etc.)
 */
export function logAudit(
  action: string,
  actorId: string,
  details: string,
  metadata?: Record<string, unknown>,
): void {
  const entry: AuditEntry = {
    action,
    actorId,
    details,
    metadata,
    timestamp: new Date().toISOString(),
  }

  // Structured JSON line — one entry per line for easy parsing
  console.info(
    `[AUDIT] ${JSON.stringify(entry)}`,
  )
}
