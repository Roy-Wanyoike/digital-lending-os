import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  checkLockout,
  recordFailedAttempt,
  resetAttempts,
  _clearStore,
  _getStore,
  MAX_ATTEMPTS,
  LOCKOUT_DURATION_MS,
} from '@/backend/lib/auth/account-lockout'

describe('account-lockout', () => {
  beforeEach(() => {
    _clearStore()
  })

  afterEach(() => {
    _clearStore()
  })

  describe('checkLockout', () => {
    it('returns unlocked with full attempts for unknown identifier', async () => {
      const result = await checkLockout('unknown@example.com')
      expect(result.locked).toBe(false)
      expect(result.remainingAttempts).toBe(MAX_ATTEMPTS)
      expect(result.lockedUntil).toBeNull()
    })

    it('returns correct remaining attempts after partial failures', async () => {
      for (let i = 0; i < 3; i++) {
        await recordFailedAttempt('user@example.com')
      }
      const result = await checkLockout('user@example.com')
      expect(result.locked).toBe(false)
      expect(result.remainingAttempts).toBe(2)
    })
  })

  describe('recordFailedAttempt', () => {
    it('increments attempts and returns remaining', async () => {
      const r1 = await recordFailedAttempt('user@example.com')
      expect(r1.locked).toBe(false)
      expect(r1.remainingAttempts).toBe(MAX_ATTEMPTS - 1)

      const r2 = await recordFailedAttempt('user@example.com')
      expect(r2.locked).toBe(false)
      expect(r2.remainingAttempts).toBe(MAX_ATTEMPTS - 2)
    })

    it('locks after MAX_ATTEMPTS failed attempts', async () => {
      let result
      for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
        result = await recordFailedAttempt('user@example.com')
        expect(result!.locked).toBe(false)
      }
      // The 5th attempt should lock
      result = await recordFailedAttempt('user@example.com')
      expect(result!.locked).toBe(true)
      expect(result!.remainingAttempts).toBe(0)
    })

    it('returns locked if already locked', async () => {
      // Lock the account
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        await recordFailedAttempt('user@example.com')
      }
      // Subsequent attempt still returns locked
      const result = await recordFailedAttempt('user@example.com')
      expect(result.locked).toBe(true)
      expect(result.remainingAttempts).toBe(0)
    })

    it('tracks different identifiers independently', async () => {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        await recordFailedAttempt('locked@example.com')
      }
      const locked = await checkLockout('locked@example.com')
      expect(locked.locked).toBe(true)

      const other = await checkLockout('other@example.com')
      expect(other.locked).toBe(false)
      expect(other.remainingAttempts).toBe(MAX_ATTEMPTS)
    })
  })

  describe('resetAttempts', () => {
    it('clears all attempts after successful login', async () => {
      for (let i = 0; i < 3; i++) {
        await recordFailedAttempt('user@example.com')
      }
      await resetAttempts('user@example.com')

      const result = await checkLockout('user@example.com')
      expect(result.locked).toBe(false)
      expect(result.remainingAttempts).toBe(MAX_ATTEMPTS)
    })

    it('unlocks a locked account on reset', async () => {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        await recordFailedAttempt('user@example.com')
      }
      expect((await checkLockout('user@example.com')).locked).toBe(true)

      await resetAttempts('user@example.com')
      const result = await checkLockout('user@example.com')
      expect(result.locked).toBe(false)
      expect(result.remainingAttempts).toBe(MAX_ATTEMPTS)
    })
  })

  describe('lockout expiry', () => {
    it('unlocks after lockout duration expires', async () => {
      // Lock the account
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        await recordFailedAttempt('user@example.com')
      }
      expect((await checkLockout('user@example.com')).locked).toBe(true)

      // Mock Date.now to simulate time passing
      const originalNow = Date.now
      vi.spyOn(Date, 'now').mockImplementation(
        () => originalNow() + LOCKOUT_DURATION_MS + 1000
      )

      const result = await checkLockout('user@example.com')
      expect(result.locked).toBe(false)
      expect(result.remainingAttempts).toBe(MAX_ATTEMPTS)
      expect(result.lockedUntil).toBeNull()

      vi.restoreAllMocks()
    })

    it('returns lockout expiration time when locked', async () => {
      const beforeLock = Date.now()
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        await recordFailedAttempt('user@example.com')
      }
      const afterLock = Date.now()

      const result = await checkLockout('user@example.com')
      expect(result.locked).toBe(true)
      expect(result.lockedUntil).not.toBeNull()
      expect(result.lockedUntil!.getTime()).toBeGreaterThanOrEqual(
        beforeLock + LOCKOUT_DURATION_MS
      )
      expect(result.lockedUntil!.getTime()).toBeLessThanOrEqual(
        afterLock + LOCKOUT_DURATION_MS
      )
    })
  })

  describe('edge cases', () => {
    it('handles email case-insensitively (caller normalizes)', async () => {
      await recordFailedAttempt('user@example.com')
      await recordFailedAttempt('User@example.com')

      // These are treated as different keys — the caller (auth.ts) lowercases
      const r1 = await checkLockout('user@example.com')
      expect(r1.remainingAttempts).toBe(MAX_ATTEMPTS - 1)

      const r2 = await checkLockout('User@example.com')
      expect(r2.remainingAttempts).toBe(MAX_ATTEMPTS - 1)
    })

    it('_clearStore removes all entries', async () => {
      await recordFailedAttempt('a@example.com')
      await recordFailedAttempt('b@example.com')

      const store = _getStore()
      expect(store.size).toBe(2)

      _clearStore()
      const storeAfter = _getStore()
      expect(storeAfter.size).toBe(0)
    })
  })
})
