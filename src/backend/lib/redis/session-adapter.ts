/**
 * Redis Session Store Adapter
 *
 * Compatible with next-auth session format.
 * Uses key prefix 'ys:session:' and defaults to 24h TTL.
 * Falls back to in-memory when Redis is unavailable.
 */

import { getRedisClient, inMemoryFallback } from './redis-manager';

// ── Configuration ────────────────────────────────────────────────────────────

const KEY_PREFIX = (process.env.REDIS_KEY_PREFIX || 'ys') + ':session:';
const DEFAULT_TTL_SECONDS = 24 * 60 * 60; // 24 hours

function prefixKey(sessionId: string): string {
  return KEY_PREFIX + sessionId;
}

// ── Types ────────────────────────────────────────────────────────────────────

/** Minimal session data shape compatible with next-auth */
export interface SessionData {
  user?: {
    id?: string;
    email?: string;
    name?: string;
    image?: string;
    role?: string;
    tenantId?: string;
  };
  expires?: string;
  accessToken?: string;
  [key: string]: unknown;
}

// ── Adapter Functions ────────────────────────────────────────────────────────

/**
 * Get session data by session ID.
 * Returns null if the session doesn't exist or has expired.
 */
export async function getSession<T extends SessionData = SessionData>(
  sessionId: string
): Promise<T | null> {
  const fullKey = prefixKey(sessionId);

  const client = await getRedisClient();
  if (client) {
    try {
      const raw = await client.get(fullKey);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      // Fall through to in-memory
    }
  }

  const fallbackRaw = inMemoryFallback.get(fullKey);
  if (fallbackRaw === null) return null;
  try {
    return JSON.parse(fallbackRaw) as T;
  } catch {
    return null;
  }
}

/**
 * Store session data with an optional TTL (defaults to 24 hours).
 */
export async function setSession<T extends SessionData = SessionData>(
  sessionId: string,
  data: T,
  ttlSeconds?: number
): Promise<void> {
  const fullKey = prefixKey(sessionId);
  const ttl = ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const raw = JSON.stringify(data);

  const client = await getRedisClient();
  if (client) {
    try {
      await client.set(fullKey, raw, 'EX', ttl);
    } catch {
      // Fall through to in-memory
    }
  }

  inMemoryFallback.set(fullKey, raw, ttl);
}

/**
 * Destroy a session by ID.
 */
export async function destroySession(sessionId: string): Promise<boolean> {
  const fullKey = prefixKey(sessionId);

  const client = await getRedisClient();
  if (client) {
    try {
      await client.del(fullKey);
    } catch {
      // Fall through to in-memory
    }
  }

  return inMemoryFallback.del(fullKey);
}
