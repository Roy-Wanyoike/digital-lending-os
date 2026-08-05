// ─── Idempotent Payment State Machine ──────────────────────────────
//
// Formal state machine for payment processing with idempotent transitions.
// Production would use Redis/PostgreSQL; this implementation uses an in-memory Map.
//

// ── States ──────────────────────────────────────────────────────────

export type PaymentStateValue =
  | 'CREATED'
  | 'PENDING_PROVIDER'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDING'
  | 'REFUNDED'
  | 'CANCELLED'
  | 'DISPUTED'

/** @deprecated Use PaymentStateValue type instead */
export const PaymentState = {
  CREATED: 'CREATED' as const,
  PENDING_PROVIDER: 'PENDING_PROVIDER' as const,
  PROCESSING: 'PROCESSING' as const,
  COMPLETED: 'COMPLETED' as const,
  FAILED: 'FAILED' as const,
  REFUNDING: 'REFUNDING' as const,
  REFUNDED: 'REFUNDED' as const,
  CANCELLED: 'CANCELLED' as const,
  DISPUTED: 'DISPUTED' as const,
}

// ── Transition Types ───────────────────────────────────────────────

export interface TransitionGuard {
  from: PaymentStateValue
  to: PaymentStateValue
  description: string
  validate?(context: TransitionContext): boolean | Promise<boolean>
}

export interface TransitionContext {
  actorId?: string
  provider?: string
  reason?: string
  metadata?: Record<string, unknown>
}

export interface TransitionResult {
  success: boolean
  paymentId: string
  previousState: PaymentStateValue
  newState: PaymentStateValue
  transitionId: string
  idempotent: boolean // true if this was a replay of a prior transition
  timestamp: string
  guardDescription: string
}

export interface HistoryEntry {
  transitionId: string
  paymentId: string
  from: PaymentStateValue
  to: PaymentStateValue
  idempotencyKey: string
  timestamp: string
  actorId?: string
  provider?: string
  reason?: string
  metadata?: Record<string, unknown>
}

// ── Legal Transitions ──────────────────────────────────────────────

const LEGAL_TRANSITIONS: TransitionGuard[] = [
  {
    from: 'CREATED',
    to: 'PENDING_PROVIDER',
    description: 'Provider initialized',
  },
  {
    from: 'PENDING_PROVIDER',
    to: 'PROCESSING',
    description: 'Webhook received from provider',
  },
  {
    from: 'PROCESSING',
    to: 'COMPLETED',
    description: 'Provider confirmed payment success',
  },
  {
    from: 'PROCESSING',
    to: 'FAILED',
    description: 'Provider reported payment failure',
  },
  {
    from: 'COMPLETED',
    to: 'REFUNDING',
    description: 'Refund requested',
  },
  {
    from: 'REFUNDING',
    to: 'REFUNDED',
    description: 'Refund confirmed by provider',
  },
  {
    from: 'COMPLETED',
    to: 'DISPUTED',
    description: 'Dispute opened',
  },
  {
    from: 'DISPUTED',
    to: 'COMPLETED',
    description: 'Dispute resolved in favor of merchant',
  },
  {
    from: 'DISPUTED',
    to: 'REFUNDED',
    description: 'Dispute resolved with refund to customer',
  },
  {
    from: 'PENDING_PROVIDER',
    to: 'CANCELLED',
    description: 'Payment cancelled (timeout or user action)',
  },
  {
    from: 'FAILED',
    to: 'PENDING_PROVIDER',
    description: 'Retry with new provider',
  },
]

// ── Terminal States ─────────────────────────────────────────────────

const TERMINAL_STATES: Set<PaymentStateValue> = new Set([
  'COMPLETED',
  'REFUNDED',
  'CANCELLED',
])

// ── PaymentStateMachine ────────────────────────────────────────────

export class PaymentStateMachine {
  // paymentId -> current state
  private stateStore: Map<string, PaymentStateValue> = new Map()

  // idempotencyKey -> TransitionResult (to deduplicate transitions)
  private idempotencyCache: Map<string, TransitionResult> = new Map()

  // paymentId -> ordered history
  private historyStore: Map<string, HistoryEntry[]> = new Map()

  // Transition guard lookup: "from->to" -> TransitionGuard
  private guardIndex: Map<string, TransitionGuard> = new Map()

  // Max entries to prevent unbounded memory growth
  private static readonly MAX_STATE_ENTRIES = 10_000
  private static readonly MAX_IDEMPOTENCY_ENTRIES = 50_000
  private static readonly MAX_HISTORY_ENTRIES = 10_000
  private static readonly MAX_HISTORY_PER_PAYMENT = 100

  private evictOldest(map: Map<string, unknown>, max: number): void {
    while (map.size > max) {
      const oldest = map.keys().next().value
      if (oldest !== undefined) map.delete(oldest)
      else break
    }
  }

  constructor() {
    for (const guard of LEGAL_TRANSITIONS) {
      const key = `${guard.from}->${guard.to}`
      this.guardIndex.set(key, guard)
    }
  }

  /**
   * Check if a transition from `current` to `target` is legally allowed.
   */
  canTransition(current: PaymentStateValue, target: PaymentStateValue): boolean {
    const key = `${current}->${target}`
    return this.guardIndex.has(key)
  }

  /**
   * Get the guard description for a legal transition.
   */
  getTransitionDescription(from: PaymentStateValue, to: PaymentStateValue): string | null {
    const key = `${from}->${to}`
    const guard = this.guardIndex.get(key)
    return guard?.description ?? null
  }

  /**
   * Get all legal transitions from a given state.
   */
  getLegalTransitions(from: PaymentStateValue): TransitionGuard[] {
    return LEGAL_TRANSITIONS.filter((t) => t.from === from)
  }

  /**
   * Check if a state is terminal (no further transitions allowed).
   */
  isTerminal(state: PaymentStateValue): boolean {
    return TERMINAL_STATES.has(state)
  }

  /**
   * Get the current state of a payment.
   */
  getState(paymentId: string): PaymentStateValue | null {
    return this.stateStore.get(paymentId) ?? null
  }

  /**
   * Get the full transition history for a payment.
   */
  getHistory(paymentId: string): HistoryEntry[] {
    return this.historyStore.get(paymentId) ?? []
  }

  /**
   * Initialize a new payment in CREATED state.
   * Returns false if payment already exists.
   */
  initialize(paymentId: string): boolean {
    if (this.stateStore.has(paymentId)) {
      return false
    }
    this.stateStore.set(paymentId, 'CREATED')
    this.historyStore.set(paymentId, [])
    return true
  }

  /**
   * Execute a state transition with idempotency guarantee.
   *
   * The idempotencyKey is typically `paymentId:targetState` but can be
   * any unique key (e.g. from client Idempotency-Key header combined with target).
   *
   * If the same idempotencyKey is seen again, the original TransitionResult
   * is returned without any state mutation.
   */
  async transition(
    paymentId: string,
    target: PaymentStateValue,
    context: TransitionContext = {},
    idempotencyKey?: string,
  ): Promise<TransitionResult> {
    // Default idempotency key: paymentId + targetState
    const effectiveKey = idempotencyKey ?? `${paymentId}:${target}`

    // ── Idempotency check ──────────────────────────────────────
    const cached = this.idempotencyCache.get(effectiveKey)
    if (cached) {
      // Verify the cached result still matches current state (defensive)
      const currentState = this.stateStore.get(paymentId)
      if (currentState === cached.newState) {
        return { ...cached, idempotent: true }
      }
    }

    // ── Pre-conditions ──────────────────────────────────────────
    const currentState = this.stateStore.get(paymentId)
    if (!currentState) {
      throw new Error(`Payment not found: ${paymentId}. Call initialize() first.`)
    }

    const guardKey = `${currentState}->${target}`
    const guard = this.guardIndex.get(guardKey)
    if (!guard) {
      throw new Error(
        `Illegal transition: ${currentState} -> ${target} for payment ${paymentId}. ` +
        `Legal transitions from ${currentState}: ${this.getLegalTransitions(currentState).map((g) => g.to).join(', ')}`,
      )
    }

    // ── Guard validation ────────────────────────────────────────
    if (guard.validate) {
      const valid = await guard.validate(context)
      if (!valid) {
        throw new Error(
          `Transition guard failed: ${currentState} -> ${target} for payment ${paymentId}`,
        )
      }
    }

    // ── Execute transition ───────────────────────────────────────
    const previousState = currentState
    this.stateStore.set(paymentId, target)
    this.evictOldest(this.stateStore, PaymentStateMachine.MAX_STATE_ENTRIES)

    const transitionId = this.generateTransitionId()
    const timestamp = new Date().toISOString()

    const result: TransitionResult = {
      success: true,
      paymentId,
      previousState,
      newState: target,
      transitionId,
      idempotent: false,
      timestamp,
      guardDescription: guard.description,
    }

    // ── Store idempotency result ────────────────────────────────
    this.idempotencyCache.set(effectiveKey, result)
    this.evictOldest(this.idempotencyCache, PaymentStateMachine.MAX_IDEMPOTENCY_ENTRIES)

    // ── Append to history ───────────────────────────────────────
    const history = this.historyStore.get(paymentId) ?? []
    const entry: HistoryEntry = {
      transitionId,
      paymentId,
      from: previousState,
      to: target,
      idempotencyKey: effectiveKey,
      timestamp,
      actorId: context.actorId,
      provider: context.provider,
      reason: context.reason,
      metadata: context.metadata,
    }
    history.push(entry)
    // Cap per-payment history length
    if (history.length > PaymentStateMachine.MAX_HISTORY_PER_PAYMENT) {
      history.splice(0, history.length - PaymentStateMachine.MAX_HISTORY_PER_PAYMENT)
    }
    this.historyStore.set(paymentId, history)
    this.evictOldest(this.historyStore, PaymentStateMachine.MAX_HISTORY_ENTRIES)

    return result
  }

  /**
   * Get all states in the machine.
   */
  getAllStates(): PaymentStateValue[] {
    return [
      'CREATED',
      'PENDING_PROVIDER',
      'PROCESSING',
      'COMPLETED',
      'FAILED',
      'REFUNDING',
      'REFUNDED',
      'CANCELLED',
      'DISPUTED',
    ]
  }

  /**
   * Get all defined legal transitions.
   */
  getAllTransitions(): TransitionGuard[] {
    return [...LEGAL_TRANSITIONS]
  }

  /**
   * Generate a DOT-format graph description (useful for documentation/debugging).
   */
  toDotGraph(): string {
    const lines = ['digraph PaymentStateMachine {', '  rankdir=LR;', '  node [shape=circle];', '']
    for (const t of LEGAL_TRANSITIONS) {
      lines.push(`  "${t.from}" -> "${t.to}" [label="${t.description}"];`)
    }
    lines.push('}')
    return lines.join('\n')
  }

  /**
   * Clear all in-memory state (useful for testing).
   */
  clear(): void {
    this.stateStore.clear()
    this.idempotencyCache.clear()
    this.historyStore.clear()
  }

  /**
   * Get statistics about the machine's current state.
   */
  getStats(): {
    totalPayments: number
    stateDistribution: Record<PaymentStateValue, number>
    totalTransitions: number
    idempotencyCacheSize: number
  } {
    const distribution: Record<string, number> = {}
    for (const state of this.getAllStates()) {
      distribution[state] = 0
    }
    for (const state of this.stateStore.values()) {
      distribution[state] = (distribution[state] ?? 0) + 1
    }

    let totalTransitions = 0
    for (const history of this.historyStore.values()) {
      totalTransitions += history.length
    }

    return {
      totalPayments: this.stateStore.size,
      stateDistribution: distribution as Record<PaymentStateValue, number>,
      totalTransitions,
      idempotencyCacheSize: this.idempotencyCache.size,
    }
  }

  // ── Private helpers ───────────────────────────────────────────

  private generateTransitionId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 10)
    return `txn_${timestamp}_${random}`
  }
}

// ── Singleton ──────────────────────────────────────────────────────

let _instance: PaymentStateMachine | null = null

export function getPaymentStateMachine(): PaymentStateMachine {
  if (!_instance) {
    _instance = new PaymentStateMachine()
  }
  return _instance
}
