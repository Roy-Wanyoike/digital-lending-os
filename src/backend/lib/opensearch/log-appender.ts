// ─── OpenSearch Log Appender ──────────────────────────────
// Buffers log entries and bulk-writes them to a date-based
// `ys-logs-YYYY-MM-DD` index.  Falls back to console when
// OpenSearch is unavailable.

import { getOpenSearchClient } from './opensearch-manager'

// ── Types ─────────────────────────────────────────────────────

export interface LogEntry {
  timestamp: string
  level: string
  message: string
  traceId?: string
  tenantId?: string
  service?: string
  metadata?: Record<string, unknown>
}

// ── Buffer ────────────────────────────────────────────────────

const MAX_BUFFER_SIZE = 100
const FLUSH_INTERVAL_MS = 5_000

let buffer: LogEntry[] = []
let flushTimer: ReturnType<typeof setInterval> | null = null

function getDailyIndex(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `ys-logs-${y}-${m}-${d}`
}

async function flush(): Promise<void> {
  if (buffer.length === 0) return

  // Swap buffer so new entries don't get lost while we flush
  const entries = buffer
  buffer = []

  const index = getDailyIndex()

  const body: any[] = []
  for (const entry of entries) {
    body.push({ index: { _index: index } })
    body.push(entry)
  }

  try {
    const client = getOpenSearchClient()
    await client.bulk({ body, refresh: 'false' })
  } catch (err) {
    // Fallback: write buffered entries to console
    for (const entry of entries) {
      console.log(
        `[LOG][${entry.level}] ${entry.timestamp} ${entry.message}`,
        entry.metadata ?? '',
      )
    }
  }
}

/** Ensure the periodic flush timer is running */
function ensureTimer(): void {
  if (flushTimer) return
  flushTimer = setInterval(() => {
    flush().catch(() => {})
  }, FLUSH_INTERVAL_MS)
  // Don't prevent process exit
  if (flushTimer.unref) flushTimer.unref()
}

// ── Public API ────────────────────────────────────────────────

/**
 * Append a log entry.  Buffers locally and bulk-writes.
 */
export function opensearchLogAppender(entry: LogEntry): void {
  ensureTimer()
  buffer.push(entry)

  if (buffer.length >= MAX_BUFFER_SIZE) {
    flush().catch(() => {})
  }
}

/**
 * Force-flush the current buffer (useful for testing / graceful shutdown).
 */
export async function flushLogBuffer(): Promise<void> {
 await flush()
}
