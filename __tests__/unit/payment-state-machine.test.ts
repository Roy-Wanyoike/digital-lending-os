/**
 * Unit tests for PaymentStateMachine — no server required.
 * Tests state transitions, terminal states, idempotency, and guard logic.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { PaymentStateMachine, type PaymentStateValue } from '@/backend/lib/payment/state-machine'

let sm: PaymentStateMachine

beforeEach(() => {
  sm = new PaymentStateMachine()
})

describe('PaymentStateMachine', () => {
  // ── All 9 states exist ──────────────────────────────────────────
  describe('getAllStates', () => {
    it('returns all 9 states', () => {
      const states = sm.getAllStates()
      expect(states).toHaveLength(9)
      const expected: PaymentStateValue[] = [
        'CREATED', 'PENDING_PROVIDER', 'PROCESSING', 'COMPLETED',
        'FAILED', 'REFUNDING', 'REFUNDED', 'CANCELLED', 'DISPUTED',
      ]
      for (const s of expected) {
        expect(states).toContain(s)
      }
    })
  })

  // ── Valid transitions ───────────────────────────────────────────
  describe('valid transitions', () => {
    it('CREATED → PENDING_PROVIDER → PROCESSING → COMPLETED succeeds', async () => {
      sm.initialize('pay-1')

      const r1 = await sm.transition('pay-1', 'PENDING_PROVIDER')
      expect(r1.success).toBe(true)
      expect(r1.previousState).toBe('CREATED')
      expect(r1.newState).toBe('PENDING_PROVIDER')

      const r2 = await sm.transition('pay-1', 'PROCESSING')
      expect(r2.success).toBe(true)
      expect(r2.previousState).toBe('PENDING_PROVIDER')
      expect(r2.newState).toBe('PROCESSING')

      const r3 = await sm.transition('pay-1', 'COMPLETED')
      expect(r3.success).toBe(true)
      expect(r3.previousState).toBe('PROCESSING')
      expect(r3.newState).toBe('COMPLETED')
    })

    it('transition returns the new state', async () => {
      sm.initialize('pay-2')
      const result = await sm.transition('pay-2', 'PENDING_PROVIDER')
      expect(result.newState).toBe('PENDING_PROVIDER')
    })
  })

  // ── Invalid transitions ─────────────────────────────────────────
  describe('invalid transitions', () => {
    it('CREATED → COMPLETED throws', async () => {
      sm.initialize('pay-3')
      await expect(sm.transition('pay-3', 'COMPLETED')).rejects.toThrow(/Illegal transition/)
    })

    it('CREATED → FAILED throws', async () => {
      sm.initialize('pay-4')
      await expect(sm.transition('pay-4', 'FAILED')).rejects.toThrow(/Illegal transition/)
    })

    it('transition on non-existent payment throws', async () => {
      await expect(sm.transition('no-such-payment', 'PENDING_PROVIDER')).rejects.toThrow(/Payment not found/)
    })
  })

  // ── Idempotent transitions ──────────────────────────────────────
  describe('idempotency', () => {
    it('replaying the same idempotencyKey returns cached result with idempotent=true', async () => {
      sm.initialize('pay-5')
      const first = await sm.transition('pay-5', 'PENDING_PROVIDER', {}, 'idem-key-1')
      expect(first.idempotent).toBe(false)

      const second = await sm.transition('pay-5', 'PENDING_PROVIDER', {}, 'idem-key-1')
      expect(second.idempotent).toBe(true)
      expect(second.transitionId).toBe(first.transitionId)
    })

    it('history records all transitions in order', async () => {
      sm.initialize('pay-6')
      await sm.transition('pay-6', 'PENDING_PROVIDER')
      await sm.transition('pay-6', 'PROCESSING')

      const history = sm.getHistory('pay-6')
      expect(history).toHaveLength(2)
      expect(history[0].from).toBe('CREATED')
      expect(history[0].to).toBe('PENDING_PROVIDER')
      expect(history[1].from).toBe('PENDING_PROVIDER')
      expect(history[1].to).toBe('PROCESSING')
    })
  })

  // ── Terminal states ─────────────────────────────────────────────
  describe('terminal states', () => {
    it('COMPLETED, REFUNDED, CANCELLED are terminal', () => {
      expect(sm.isTerminal('COMPLETED')).toBe(true)
      expect(sm.isTerminal('REFUNDED')).toBe(true)
      expect(sm.isTerminal('CANCELLED')).toBe(true)
    })

    it('CREATED, PENDING_PROVIDER, PROCESSING, FAILED, REFUNDING, DISPUTED are NOT terminal', () => {
      expect(sm.isTerminal('CREATED')).toBe(false)
      expect(sm.isTerminal('PENDING_PROVIDER')).toBe(false)
      expect(sm.isTerminal('PROCESSING')).toBe(false)
      expect(sm.isTerminal('FAILED')).toBe(false)
      expect(sm.isTerminal('REFUNDING')).toBe(false)
      expect(sm.isTerminal('DISPUTED')).toBe(false)
    })
  })

  // ── canTransition ───────────────────────────────────────────────
  describe('canTransition', () => {
    it('returns true for legal transitions', () => {
      expect(sm.canTransition('CREATED', 'PENDING_PROVIDER')).toBe(true)
      expect(sm.canTransition('PENDING_PROVIDER', 'PROCESSING')).toBe(true)
      expect(sm.canTransition('PROCESSING', 'COMPLETED')).toBe(true)
    })

    it('returns false for illegal transitions', () => {
      expect(sm.canTransition('CREATED', 'COMPLETED')).toBe(false)
      expect(sm.canTransition('COMPLETED', 'PROCESSING')).toBe(false)
      expect(sm.canTransition('REFUNDED', 'COMPLETED')).toBe(false)
    })
  })
})
