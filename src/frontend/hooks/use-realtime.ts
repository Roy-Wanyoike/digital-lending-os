'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

// ─── SSE Realtime Hook ────────────────────────────────────────
// Connects to /api/realtime via Server-Sent Events.
// The server derives tenantId from the session cookie — no query param needed.
// Implements exponential-backoff reconnect with a max attempt ceiling.
// Full cleanup on unmount (EventSource close + subscriber map flush).

export interface RealtimeEvent<T = unknown> {
  event: string
  data: T
  tenantId?: string
  timestamp: number
}

export type RealtimeEventHandler<T = unknown> = (event: RealtimeEvent<T>) => void

interface UseRealtimeOptions {
  /** Disable the connection (e.g. when user is not logged in) */
  enabled?: boolean
  /** Max reconnect attempts before giving up. Default 10. */
  maxReconnectAttempts?: number
  /** Base delay in ms for exponential backoff. Default 1000. */
  reconnectBaseDelay?: number
}

interface UseRealtimeReturn {
  isConnected: boolean
  lastEvent: RealtimeEvent | null
  subscribe: (event: string, handler: RealtimeEventHandler) => void
  unsubscribe: (event: string, handler: RealtimeEventHandler) => void
  connectionId: string | null
  /** Number of consecutive reconnect attempts (0 = stable). */
  reconnectCount: number
}

const DEFAULT_MAX_RECONNECT = 10
const DEFAULT_BASE_DELAY = 1_000
const MAX_BACKOFF_MS = 30_000

export function useRealtime(options: UseRealtimeOptions = {}): UseRealtimeReturn {
  const { enabled = true, maxReconnectAttempts = DEFAULT_MAX_RECONNECT, reconnectBaseDelay = DEFAULT_BASE_DELAY } = options

  const [isConnected, setIsConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null)
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [reconnectCount, setReconnectCount] = useState(0)

  // Refs to keep latest values inside event handlers without re-subscribing
  const subscribersRef = useRef<Map<string, Set<RealtimeEventHandler>>>(new Map())
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptRef = useRef(0)
  const mountedRef = useRef(true)

  // Subscribe to a named event
  const subscribe = useCallback((event: string, handler: RealtimeEventHandler) => {
    if (!subscribersRef.current.has(event)) {
      subscribersRef.current.set(event, new Set())
    }
    subscribersRef.current.get(event)!.add(handler)
  }, [])

  // Unsubscribe from a named event
  const unsubscribe = useCallback((event: string, handler: RealtimeEventHandler) => {
    const subs = subscribersRef.current.get(event)
    if (subs) {
      subs.delete(handler)
      if (subs.size === 0) {
        subscribersRef.current.delete(event)
      }
    }
  }, [])

  // Establish the SSE connection with exponential-backoff reconnect
  useEffect(() => {
    // Guard for SSR — EventSource is only available in the browser
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return

    mountedRef.current = true

    const cleanup = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      // Flush subscriber map to prevent memory leaks on unmount
      subscribersRef.current.clear()
      if (mountedRef.current) {
        setIsConnected(false)
        setConnectionId(null)
        setReconnectCount(0)
        reconnectAttemptRef.current = 0
      }
    }

    if (!enabled) {
      cleanup()
      return cleanup
    }

    const connect = () => {
      // Guard: don't open a new connection if one is already live
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      // Same-origin: cookies (session) are sent automatically by the browser.
      // No tenantId query param — the server extracts it from the session.
      const es = new EventSource('/api/realtime')
      eventSourceRef.current = es

      // On open — connection established, reset reconnect counter
      es.onopen = () => {
        if (!mountedRef.current) return
        reconnectAttemptRef.current = 0
        setReconnectCount(0)
        setIsConnected(true)
      }

      // Error handler — EventSource auto-reconnects natively, but we
      // implement our own reconnect with exponential backoff so we can
      // track attempt count and give up after maxReconnectAttempts.
      es.onerror = () => {
        if (!mountedRef.current) return
        setIsConnected(false)

        // Close the broken EventSource to stop native infinite reconnect
        es.close()
        eventSourceRef.current = null

        const attempt = ++reconnectAttemptRef.current
        setReconnectCount(attempt)

        if (attempt > maxReconnectAttempts) {
          console.warn(
            `[useRealtime] Max reconnect attempts (${maxReconnectAttempts}) reached. Giving up.`,
          )
          return
        }

        // Exponential backoff with jitter
        const jitter = Math.random() * 0.3 * reconnectBaseDelay
        const delay = Math.min(
          reconnectBaseDelay * Math.pow(2, attempt - 1) + jitter,
          MAX_BACKOFF_MS,
        )

        console.info(
          `[useRealtime] Reconnect attempt ${attempt}/${maxReconnectAttempts} in ${Math.round(delay)}ms`,
        )

        reconnectTimerRef.current = setTimeout(() => {
          if (mountedRef.current) {
            connect()
          }
        }, delay)
      }

      // Listen for the 'connected' meta event to capture the connectionId
      es.addEventListener('connected', (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data)
          if (parsed?.connectionId) {
            setConnectionId(parsed.connectionId)
          }
        } catch {
          // Ignore parse errors on the meta event
        }
      })

      // Listen for known event types and dispatch to subscribers
      const knownEvents = [
        'wallet.deposit',
        'payment.completed',
        'payment.failed',
        'escrow.updated',
        'escrow.created',
      ]

      const handleNamed = (eventName: string) => (e: MessageEvent) => {
        try {
          const parsed: RealtimeEvent = JSON.parse(e.data)
          if (!mountedRef.current) return
          setLastEvent(parsed)

          // Dispatch to subscribers of this event name
          const subs = subscribersRef.current.get(eventName)
          if (subs) {
            for (const handler of subs) {
              try {
                handler(parsed)
              } catch (err) {
                console.error(`[useRealtime] Handler error for "${eventName}":`, err)
              }
            }
          }

          // Dispatch to wildcard subscribers
          const wildcardSubs = subscribersRef.current.get('*')
          if (wildcardSubs) {
            for (const handler of wildcardSubs) {
              try {
                handler(parsed)
              } catch (err) {
                console.error(`[useRealtime] Wildcard handler error:`, err)
              }
            }
          }
        } catch (err) {
          console.error(`[useRealtime] Failed to parse event "${eventName}":`, err)
        }
      }

      for (const eventName of knownEvents) {
        es.addEventListener(eventName, handleNamed(eventName))
      }
    }

    connect()

    // Cleanup on unmount or when deps change
    return cleanup
  }, [enabled, maxReconnectAttempts, reconnectBaseDelay])

  return {
    isConnected: enabled && isConnected,
    lastEvent,
    subscribe,
    unsubscribe,
    connectionId,
    reconnectCount,
  }
}