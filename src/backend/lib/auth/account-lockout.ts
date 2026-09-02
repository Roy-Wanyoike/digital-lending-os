/**
 * Account Lockout — In-memory store with TTL for MVP.
 * Locks accounts after 5 failed login attempts with a 10-minute cooldown.
 */

export const MAX_ATTEMPTS = 5
export const LOCKOUT_DURATION_MS = 10 * 60 * 1000 // 10 minutes

interface LockoutEntry {
  attempts: number
  lockedUntil: Date | null
  firstAttemptAt: Date
}

// In-memory store keyed by email (or accountId)
const lockoutStore = new Map<string, LockoutEntry>()

// Periodic cleanup — runs every 60 seconds to purge expired entries
let cleanupTimer: ReturnType<typeof setInterval> | null = null

function ensureCleanup(): void {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
 for (const [key, entry] of lockoutStore.entries()) {
      if (entry.lockedUntil && entry.lockedUntil.getTime() < now) {
        lockoutStore.delete(key)
      }
    }
  }, 60_000)

  // Allow the process to exit without waiting for the timer
  if (cleanupTimer.unref) {
    cleanupTimer.unref()
  }
}

/**
 * Check whether an identifier (email) is currently locked out.
 */
export async function checkLockout(identifier: string): Promise<{
  locked: boolean
  remainingAttempts: number
  lockedUntil: Date | null
}> {
  ensureCleanup()

  const entry = lockoutStore.get(identifier)

  if (!entry) {
    return { locked: false, remainingAttempts: MAX_ATTEMPTS, lockedUntil: null }
  }

  // If locked, check if the lockout has expired
  if (entry.lockedUntil) {
    if (entry.lockedUntil.getTime() > Date.now()) {
      // Still locked
      return {
        locked: true,
        remainingAttempts: 0,
        lockedUntil: entry.lockedUntil,
      }
    } else {
      // Lockout expired — reset
      lockoutStore.delete(identifier)
      return { locked: false, remainingAttempts: MAX_ATTEMPTS, lockedUntil: null }
    }
  }

  // Not locked yet, return remaining attempts
  const remainingAttempts = MAX_ATTEMPTS - entry.attempts
  return { locked: false, remainingAttempts: Math.max(0, remainingAttempts), lockedUntil: null }
}

/**
 * Record a failed login attempt. Returns lockout status.
 */
export async function recordFailedAttempt(identifier: string): Promise<{
  locked: boolean
  remainingAttempts: number
}> {
  ensureCleanup()

  let entry = lockoutStore.get(identifier)

  if (!entry) {
    entry = {
      attempts: 0,
      lockedUntil: null,
      firstAttemptAt: new Date(),
    }
    lockoutStore.set(identifier, entry)
  }

  // If already locked, just return locked status
  if (entry.lockedUntil && entry.lockedUntil.getTime() > Date.now()) {
    return { locked: true, remainingAttempts: 0 }
  }

  entry.attempts += 1

  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS)
    return { locked: true, remainingAttempts: 0 }
  }

  return { locked: false, remainingAttempts: MAX_ATTEMPTS - entry.attempts }
}

/**
 * Reset failed attempts (e.g. on successful login).
 */
export async function resetAttempts(identifier: string): Promise<void> {
  lockoutStore.delete(identifier)
}

// Exported for testing — clear the store
export function _clearStore(): void {
  lockoutStore.clear()
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }
}

// Exported for testing — get the store (read-only snapshot)
export function _getStore(): Map<string, LockoutEntry> {
  return new Map(lockoutStore)
}
