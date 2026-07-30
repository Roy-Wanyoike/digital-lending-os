// ─── In-Memory Event Bus ──────────────────────────────────────────
// A lightweight pub/sub system for real-time SSE events.
// No external dependencies. Works across the Next.js server process.
// If the process restarts, all subscriptions are naturally reset.
//
// Usage:
//   import { eventBus } from '@/backend/services/event-bus'
//   eventBus.emit('wallet.deposit', { amount: 100 }, 'tenant-123')
//   eventBus.on('wallet.deposit', (data, tenantId) => { ... })
//   eventBus.off('wallet.deposit', handler)

export interface RealtimeEvent<T = unknown> {
  event: string
  data: T
  tenantId?: string
  timestamp: number
}

type EventHandler<T = unknown> = (event: RealtimeEvent<T>) => void

interface Subscription {
  connectionId: string
  callback: EventHandler
  tenantId?: string // if set, only receives events matching this tenantId
  accountId?: string // if set, only receives events for this user account
}

let connectionCounter = 0

/**
 * Maximum concurrent SSE connections across the entire server process.
 * Tune based on available memory and expected load.
 */
export const MAX_CONNECTIONS = 1000

class EventBus {
  // Map of event name → Set of subscriptions
  private listeners = new Map<string, Set<Subscription>>()

  /**
   * Subscribe to an event. Returns a connectionId for cleanup.
   * If tenantId is provided, only events matching that tenantId will be delivered.
   */
  on<T = unknown>(
    event: string,
    callback: EventHandler<T>,
    options?: { connectionId?: string; tenantId?: string; accountId?: string },
  ): string {
    const connectionId = options?.connectionId ?? `conn-${++connectionCounter}`
    const sub: Subscription = {
      connectionId,
      callback: callback as EventHandler,
      tenantId: options?.tenantId,
      accountId: options?.accountId,
    }

    let subs = this.listeners.get(event)
    if (!subs) {
      subs = new Set()
      this.listeners.set(event, subs)
    }
    subs.add(sub)

    return connectionId
  }

  /**
   * Unsubscribe a specific callback from an event.
   */
  off(event: string, callback: EventHandler): void {
    const subs = this.listeners.get(event)
    if (!subs) return

    for (const sub of subs) {
      if (sub.callback === callback) {
        subs.delete(sub)
      }
    }

    if (subs.size === 0) {
      this.listeners.delete(event)
    }
  }

  /**
   * Remove all subscriptions for a given connectionId.
   * Used when an SSE client disconnects.
   * Also cleans up empty event-key entries from the Map.
   */
  disconnect(connectionId: string): void {
    const keysToDelete: string[] = []

    for (const [eventKey, subs] of this.listeners) {
      for (const sub of subs) {
        if (sub.connectionId === connectionId) {
          subs.delete(sub)
        }
      }
      // Schedule cleanup of empty entries
      if (subs.size === 0) {
        keysToDelete.push(eventKey)
      }
    }

    for (const key of keysToDelete) {
      this.listeners.delete(key)
    }
  }

  /**
   * Emit an event to all matching subscribers.
   * If tenantId is provided, only subscribers with no tenant filter
   * or with a matching tenantId will receive the event.
   */
  emit<T = unknown>(event: string, data: T, tenantId?: string): void {
    const subs = this.listeners.get(event)
    if (!subs || subs.size === 0) return

    const payload: RealtimeEvent<T> = {
      event,
      data,
      tenantId,
      timestamp: Date.now(),
    }

    // Iterate over a snapshot since callbacks may unsubscribe mid-iteration
    const snapshot = Array.from(subs)
    for (const sub of snapshot) {
      // If the subscription has a tenantId filter, only deliver if it matches
      if (sub.tenantId && sub.tenantId !== tenantId) continue
      try {
        sub.callback(payload)
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${event}":`, err)
      }
    }
  }

  /**
   * Get the number of active subscriptions (useful for debugging/monitoring).
   */
  getSubscriptionCount(): number {
    let count = 0
    for (const [, subs] of this.listeners) {
      count += subs.size
    }
    return count
  }

  /**
   * Get the number of active connections (useful for monitoring).
   */
  getConnectionCount(): number {
    const connectionIds = new Set<string>()
    for (const [, subs] of this.listeners) {
      for (const sub of subs) {
        connectionIds.add(sub.connectionId)
      }
    }
    return connectionIds.size
  }

  /**
   * Count connections whose connectionId starts with the given prefix.
   * Used to enforce per-user connection limits.
   */
  getConnectionsByPrefix(prefix: string): number {
    const connectionIds = new Set<string>()
    for (const [, subs] of this.listeners) {
      for (const sub of subs) {
        if (sub.connectionId.startsWith(prefix)) {
          connectionIds.add(sub.connectionId)
        }
      }
    }
    return connectionIds.size
  }
}

// Singleton instance
export const eventBus = new EventBus()
