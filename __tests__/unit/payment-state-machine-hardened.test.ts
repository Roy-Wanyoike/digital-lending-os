/**
 * Hardened Payment State Machine tests — complements the existing payment-state-machine.test.ts.
 * Covers: all legal transitions, invalid transitions, idempotency, guards, history, concurrency.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  PaymentStateMachine,
  type PaymentStateValue,
  type TransitionGuard,
} from '@/backend/lib/payment/state-machine'

let sm: PaymentStateMachine

beforeEach(() => {
  sm = new PaymentStateMachine()
})

describe('PaymentStateMachine — Hardened', () => {
  // ── 1. All valid transitions defined in the state machine ─────────
  describe('all valid transitions', () => {
    const ALL_LEGAL: [PaymentStateValue, PaymentStateValue, string][] = [
      ['CREATED', 'PENDING_PROVIDER', 'Provider initialized'],
      ['PENDING_PROVIDER', 'PROCESSING', 'Webhook received from provider'],
      ['PROCESSING', 'COMPLETED', 'Provider confirmed payment success'],
      ['PROCESSING', 'FAILED', 'Provider reported payment failure'],
      ['COMPLETED', 'REFUNDING', 'Refund requested'],
      ['REFUNDING', 'REFUNDED', 'Refund confirmed by provider'],
      ['COMPLETED', 'DISPUTED', 'Dispute opened'],
      ['DISPUTED', 'COMPLETED', 'Dispute resolved in favor of merchant'],
      ['DISPUTED', 'REFUNDED', 'Dispute resolved with refund to customer'],
      ['PENDING_PROVIDER', 'CANCELLED', 'Payment cancelled (timeout or user action)'],
      ['FAILED', 'PENDING_PROVIDER', 'Retry with new provider'],
    ]

    it('getAllTransitions returns exactly 11 transitions', () => {
      const transitions = sm.getAllTransitions()
      expect(transitions).toHaveLength(11)
    })

    for (const [from, to, desc] of ALL_LEGAL) {
      it(`${from} → ${to} is a legal transition`, () => {
        expect(sm.canTransition(from, to)).toBe(true)
      })

      it(`${from} → ${to} has description "${desc}"`, async () => {
        const payId = `pay-desc-${from}-${to}`
        sm.initialize(payId)
        // Walk to the `from` state first
        await walkToState(sm, payId, from)
        const result = await sm.transition(payId, to)
        expect(result.guardDescription).toBe(desc)
      })

      it(`${from} → ${to} executes successfully`, async () => {
        const payId = `pay-legal-${from}-${to}`
        sm.initialize(payId)
        await walkToState(sm, payId, from)

        const result = await sm.transition(payId, to)
        expect(result.success).toBe(true)
        expect(result.previousState).toBe(from)
        expect(result.newState).toBe(to)
        expect(result.idempotent).toBe(false)
        expect(result.transitionId).toMatch(/^txn_/)
        expect(result.timestamp).toBeDefined()
      })
    }
  })

  // ── 2. Invalid transitions are rejected ───────────────────────────
  describe('invalid transitions', () => {
    const INVALID: [PaymentStateValue, PaymentStateValue][] = [
      ['CREATED', 'COMPLETED'],
      ['CREATED', 'FAILED'],
      ['CREATED', 'REFUNDED'],
      ['CREATED', 'CANCELLED'],
      ['CREATED', 'DISPUTED'],
      ['CREATED', 'REFUNDING'],
      ['PENDING_PROVIDER', 'COMPLETED'],
      ['PENDING_PROVIDER', 'FAILED'],
      ['PENDING_PROVIDER', 'REFUNDED'],
      ['PENDING_PROVIDER', 'DISPUTED'],
      ['PROCESSING', 'CANCELLED'],
      ['PROCESSING', 'REFUNDING'],
      ['PROCESSING', 'DISPUTED'],
      ['COMPLETED', 'PROCESSING'],
      ['COMPLETED', 'CANCELLED'],
      ['COMPLETED', 'FAILED'],
      ['FAILED', 'COMPLETED'],
      ['FAILED', 'CANCELLED'],
      ['FAILED', 'REFUNDED'],
      ['REFUNDED', 'COMPLETED'],
      ['REFUNDED', 'FAILED'],
      ['CANCELLED', 'PENDING_PROVIDER'],
      ['CANCELLED', 'PROCESSING'],
      ['CANCELLED', 'COMPLETED'],
    ]

    for (const [from, to] of INVALID) {
      it(`${from} → ${to} throws Illegal transition`, async () => {
        const payId = `pay-inv-${from}-${to}`
        sm.initialize(payId)
        await walkToState(sm, payId, from)

        // Use a unique idempotency key to avoid cache hits from walkToState
        await expect(
          sm.transition(payId, to, {}, `unique-inv-${from}-${to}`),
        ).rejects.toThrow(/Illegal transition/)
      })
    }
  })

  // ── 3. Idempotency of transitions (same transition twice) ─────────
  describe('transition idempotency', () => {
    it('same idempotencyKey twice returns cached result with idempotent=true', async () => {
      sm.initialize('pay-idem-1')
      const r1 = await sm.transition('pay-idem-1', 'PENDING_PROVIDER', {}, 'idem-key-A')
      expect(r1.idempotent).toBe(false)

      const r2 = await sm.transition('pay-idem-1', 'PENDING_PROVIDER', {}, 'idem-key-A')
      expect(r2.idempotent).toBe(true)
      expect(r2.transitionId).toBe(r1.transitionId)
      expect(r2.newState).toBe(r1.newState)
      expect(r2.previousState).toBe(r1.previousState)
    })

    it('different idempotencyKeys allow same transition twice (second time fails because state changed)', async () => {
      sm.initialize('pay-idem-2')
      const r1 = await sm.transition('pay-idem-2', 'PENDING_PROVIDER', {}, 'idem-key-B1')
      expect(r1.idempotent).toBe(false)

      await expect(
        sm.transition('pay-idem-2', 'PENDING_PROVIDER', {}, 'idem-key-B2'),
      ).rejects.toThrow(/Illegal transition/)
    })

    it('default idempotency key is paymentId:targetState', async () => {
      sm.initialize('pay-idem-3')
      const r1 = await sm.transition('pay-idem-3', 'PENDING_PROVIDER')
      expect(r1.idempotent).toBe(false)

      // Replay with default key
      const r2 = await sm.transition('pay-idem-3', 'PENDING_PROVIDER')
      expect(r2.idempotent).toBe(true)
    })
  })

  // ── 4. Guard validation ───────────────────────────────────────────
  describe('guard validation', () => {
    it('transitions without guards always succeed (when legal)', async () => {
      const transitions = sm.getAllTransitions()
      for (const t of transitions) {
        expect(t.validate).toBeUndefined()
      }
    })

    it('legal transition succeeds', async () => {
      sm.initialize('pay-guard-1')
      const r = await sm.transition('pay-guard-1', 'PENDING_PROVIDER')
      expect(r.success).toBe(true)
    })
  })

  // ── 5. State history tracking ─────────────────────────────────────
  describe('state history tracking', () => {
    it('empty history for new payment', () => {
      sm.initialize('pay-hist-1')
      expect(sm.getHistory('pay-hist-1')).toEqual([])
    })

    it('history records each transition in order', async () => {
      sm.initialize('pay-hist-2')
      await sm.transition('pay-hist-2', 'PENDING_PROVIDER', { actorId: 'user-1', provider: 'paystack' })
      await sm.transition('pay-hist-2', 'PROCESSING', { provider: 'paystack' })
      await sm.transition('pay-hist-2', 'COMPLETED', { provider: 'paystack', reason: 'Webhook confirmed' })

      const history = sm.getHistory('pay-hist-2')
      expect(history).toHaveLength(3)

      expect(history[0].from).toBe('CREATED')
      expect(history[0].to).toBe('PENDING_PROVIDER')
      expect(history[0].actorId).toBe('user-1')
      expect(history[0].provider).toBe('paystack')

      expect(history[1].from).toBe('PENDING_PROVIDER')
      expect(history[1].to).toBe('PROCESSING')

      expect(history[2].from).toBe('PROCESSING')
      expect(history[2].to).toBe('COMPLETED')
      expect(history[2].reason).toBe('Webhook confirmed')
    })

    it('history entries have unique transition IDs', async () => {
      sm.initialize('pay-hist-3')
      await sm.transition('pay-hist-3', 'PENDING_PROVIDER')
      await sm.transition('pay-hist-3', 'PROCESSING')

      const history = sm.getHistory('pay-hist-3')
      const ids = history.map((h) => h.transitionId)
      expect(new Set(ids).size).toBe(2)
    })

    it('history entries include idempotencyKey', async () => {
      sm.initialize('pay-hist-4')
      await sm.transition('pay-hist-4', 'PENDING_PROVIDER', {}, 'custom-idem-key')

      const history = sm.getHistory('pay-hist-4')
      expect(history[0].idempotencyKey).toBe('custom-idem-key')
    })

    it('history for non-existent payment returns empty', () => {
      expect(sm.getHistory('nonexistent')).toEqual([])
    })

    it('idempotent replay does NOT add to history', async () => {
      sm.initialize('pay-hist-5')
      await sm.transition('pay-hist-5', 'PENDING_PROVIDER', {}, 'idem-no-dup')
      await sm.transition('pay-hist-5', 'PENDING_PROVIDER', {}, 'idem-no-dup')

      const history = sm.getHistory('pay-hist-5')
      expect(history).toHaveLength(1)
    })
  })

  // ── 6. Concurrent transition attempts ─────────────────────────────
  describe('concurrent transitions', () => {
    it('sequential transitions to same target from different keys — second fails', async () => {
      sm.initialize('pay-conc-1')
      const r1 = await sm.transition('pay-conc-1', 'PENDING_PROVIDER')
      expect(r1.success).toBe(true)

      await expect(
        sm.transition('pay-conc-1', 'PENDING_PROVIDER', {}, 'different-key'),
      ).rejects.toThrow(/Illegal transition/)
    })

    it('rapid sequential transitions walk through states correctly', async () => {
      sm.initialize('pay-rapid-1')
      const r1 = await sm.transition('pay-rapid-1', 'PENDING_PROVIDER')
      const r2 = await sm.transition('pay-rapid-1', 'PROCESSING')
      const r3 = await sm.transition('pay-rapid-1', 'COMPLETED')

      expect(sm.getState('pay-rapid-1')).toBe('COMPLETED')
      expect(sm.getHistory('pay-rapid-1')).toHaveLength(3)
      expect(r3.transitionId).not.toBe(r2.transitionId)
      expect(r2.transitionId).not.toBe(r1.transitionId)
    })

    it('multiple payments can be transitioned independently', async () => {
      sm.initialize('pay-multi-A')
      sm.initialize('pay-multi-B')
      sm.initialize('pay-multi-C')

      await sm.transition('pay-multi-A', 'PENDING_PROVIDER')
      await sm.transition('pay-multi-B', 'PENDING_PROVIDER')
      await sm.transition('pay-multi-C', 'PENDING_PROVIDER')

      await sm.transition('pay-multi-A', 'PROCESSING')
      await sm.transition('pay-multi-C', 'CANCELLED')

      expect(sm.getState('pay-multi-A')).toBe('PROCESSING')
      expect(sm.getState('pay-multi-B')).toBe('PENDING_PROVIDER')
      expect(sm.getState('pay-multi-C')).toBe('CANCELLED')
    })
  })

  // ── Additional: Complex flow tests ────────────────────────────────
  describe('complex flows', () => {
    it('full happy path: CREATED → PENDING_PROVIDER → PROCESSING → COMPLETED', async () => {
      sm.initialize('pay-flow-happy')
      const steps = ['PENDING_PROVIDER', 'PROCESSING', 'COMPLETED'] as PaymentStateValue[]
      let prev = 'CREATED' as PaymentStateValue

      for (const target of steps) {
        const r = await sm.transition('pay-flow-happy', target)
        expect(r.success).toBe(true)
        expect(r.previousState).toBe(prev)
        expect(r.newState).toBe(target)
        prev = target
      }
    })

    it('failure path: CREATED → PENDING_PROVIDER → PROCESSING → FAILED', async () => {
      sm.initialize('pay-flow-fail')
      await sm.transition('pay-flow-fail', 'PENDING_PROVIDER')
      await sm.transition('pay-flow-fail', 'PROCESSING')
      const r = await sm.transition('pay-flow-fail', 'FAILED')
      expect(r.newState).toBe('FAILED')
    })

    it('retry path: FAILED → PENDING_PROVIDER → PROCESSING → COMPLETED', async () => {
      sm.initialize('pay-flow-retry')
      await sm.transition('pay-flow-retry', 'PENDING_PROVIDER')
      await sm.transition('pay-flow-retry', 'PROCESSING')
      await sm.transition('pay-flow-retry', 'FAILED')
      await sm.transition('pay-flow-retry', 'PENDING_PROVIDER')
      await sm.transition('pay-flow-retry', 'PROCESSING')
      const r = await sm.transition('pay-flow-retry', 'COMPLETED')
      expect(r.newState).toBe('COMPLETED')
      expect(sm.getHistory('pay-flow-retry')).toHaveLength(6)
    })

    it('refund path: COMPLETED → REFUNDING → REFUNDED', async () => {
      sm.initialize('pay-flow-refund')
      await walkToState(sm, 'pay-flow-refund', 'COMPLETED')

      const r1 = await sm.transition('pay-flow-refund', 'REFUNDING')
      expect(r1.newState).toBe('REFUNDING')

      const r2 = await sm.transition('pay-flow-refund', 'REFUNDED')
      expect(r2.newState).toBe('REFUNDED')
      expect(sm.isTerminal('REFUNDED')).toBe(true)
    })

    it('dispute path: COMPLETED → DISPUTED → COMPLETED (merchant wins)', async () => {
      sm.initialize('pay-flow-disp1')
      await walkToState(sm, 'pay-flow-disp1', 'COMPLETED')

      await sm.transition('pay-flow-disp1', 'DISPUTED')
      const r = await sm.transition('pay-flow-disp1', 'COMPLETED')
      expect(r.newState).toBe('COMPLETED')
    })

    it('dispute path: COMPLETED → DISPUTED → REFUNDED (customer wins)', async () => {
      sm.initialize('pay-flow-disp2')
      await walkToState(sm, 'pay-flow-disp2', 'COMPLETED')

      await sm.transition('pay-flow-disp2', 'DISPUTED')
      const r = await sm.transition('pay-flow-disp2', 'REFUNDED')
      expect(r.newState).toBe('REFUNDED')
    })
  })

  // ── Edge cases ───────────────────────────────────────────────────
  describe('edge cases', () => {
    it('initialize returns false for duplicate payment', () => {
      expect(sm.initialize('pay-dup')).toBe(true)
      expect(sm.initialize('pay-dup')).toBe(false)
    })

    it('getState returns null for non-existent payment', () => {
      expect(sm.getState('no-such-pay')).toBeNull()
    })

    it('getStats returns correct distribution', async () => {
      sm.initialize('pay-stat-1')
      sm.initialize('pay-stat-2')
      sm.initialize('pay-stat-3')
      await sm.transition('pay-stat-1', 'PENDING_PROVIDER')
      await sm.transition('pay-stat-2', 'PENDING_PROVIDER')
      await sm.transition('pay-stat-2', 'PROCESSING')

      const stats = sm.getStats()
      expect(stats.totalPayments).toBe(3)
      expect(stats.stateDistribution.CREATED).toBe(1)
      expect(stats.stateDistribution.PENDING_PROVIDER).toBe(1)
      expect(stats.stateDistribution.PROCESSING).toBe(1)
      expect(stats.totalTransitions).toBe(3)
    })

    it('toDotGraph produces valid DOT syntax', () => {
      const dot = sm.toDotGraph()
      expect(dot).toContain('digraph PaymentStateMachine')
      expect(dot).toContain('CREATED')
      expect(dot).toContain('->')
      expect(dot).toContain('}')
    })

    it('clear resets all state', async () => {
      sm.initialize('pay-clear-1')
      await sm.transition('pay-clear-1', 'PENDING_PROVIDER')
      expect(sm.getState('pay-clear-1')).toBe('PENDING_PROVIDER')

      sm.clear()
      expect(sm.getState('pay-clear-1')).toBeNull()
      expect(sm.getStats().totalPayments).toBe(0)
    })

    it('getLegalTransitions returns correct transitions from each state', () => {
      const fromCreated = sm.getLegalTransitions('CREATED')
      expect(fromCreated).toHaveLength(1)
      expect(fromCreated[0].to).toBe('PENDING_PROVIDER')

      const fromProcessing = sm.getLegalTransitions('PROCESSING')
      expect(fromProcessing).toHaveLength(2)
      const targets = fromProcessing.map((t) => t.to).sort()
      expect(targets).toEqual(['COMPLETED', 'FAILED'])
    })

    it('getTransitionDescription returns null for illegal transition', () => {
      expect(sm.getTransitionDescription('CREATED', 'COMPLETED')).toBeNull()
    })

    it('getTransitionDescription returns description for legal transition', () => {
      expect(sm.getTransitionDescription('CREATED', 'PENDING_PROVIDER')).toBe('Provider initialized')
    })
  })
})

// ── Helper: walk the state machine to a specific state ──────────────

const STATE_PATHS: Record<PaymentStateValue, PaymentStateValue[]> = {
  CREATED: [],
  PENDING_PROVIDER: ['PENDING_PROVIDER'],
  PROCESSING: ['PENDING_PROVIDER', 'PROCESSING'],
  COMPLETED: ['PENDING_PROVIDER', 'PROCESSING', 'COMPLETED'],
  FAILED: ['PENDING_PROVIDER', 'PROCESSING', 'FAILED'],
  REFUNDING: ['PENDING_PROVIDER', 'PROCESSING', 'COMPLETED', 'REFUNDING'],
  REFUNDED: ['PENDING_PROVIDER', 'PROCESSING', 'COMPLETED', 'REFUNDING', 'REFUNDED'],
  CANCELLED: ['PENDING_PROVIDER', 'CANCELLED'],
  DISPUTED: ['PENDING_PROVIDER', 'PROCESSING', 'COMPLETED', 'DISPUTED'],
}

async function walkToState(sm: PaymentStateMachine, paymentId: string, target: PaymentStateValue) {
  const path = STATE_PATHS[target]
  for (const state of path) {
    const current = sm.getState(paymentId)
    if (current === state) continue
    await sm.transition(paymentId, state)
  }
}
