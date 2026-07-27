'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

// ─── SSE Realtime Hook ────────────────────────────────────────
// Connects to /api/realtime?tenantId=xxx via EventSource.
// Auto-reconnects on disconnect (EventSource handles this natively).
// Cleanup on unmount.

export interface RealtimeEvent<T = unknown> {
  event: string
  data: T
  tenantId?: string
  timestamp: number
}

export type RealtimeEventHandler<T = unknown> = (event: RealtimeEvent<T>) => void

interface UseRealtimeOptions {
  /** Optional tenantId for event filtering on the server side */
  tenantId?: string
  /** Disable the connection (e.g. when user is not logged in) */
  enabled?: boolean
}

interface UseRealtimeReturn {
  isConnected: boolean
  lastEvent: RealtimeEvent | null
  subscribe: <T = unknown>(event: string, handler: RealtimeEventHandler<T>) => void
  unsubscribe: (event: string, handler: RealtimeEventHandler) => void
  connectionId: string | null
}

export function useRealtime(options: UseRealtimeOptions = {}): UseRealtimeReturn {
  const { tenantId, enabled = true } = options

  const [isConnected, setIsConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null)
  const [connectionId, setConnectionId] = useState<string | null>(null)

  // Refs to keep latest values inside event handlers without re-subscribing
  const subscribersRef = useRef<Map<string, Set<RealtimeEventHandler>>>(new Map())
  const eventSourceRef = useRef<EventSource | null>(null)

  // Build the SSE URL
  const buildUrl = useCallback(() => {
    const params = new URLSearchParams()
    if (tenantId) params.set('tenantId', tenantId)
    const query = params.toString()
    return query ? `/api/realtime?${query}` : '/api/realtime'
  }, [tenantId])

  // Subscribe to a named event
  const subscribe = useCallback(<T = unknown>(event: string, handler: RealtimeEventHandler<T>) => {
    const wrapped = handler as RealtimeEventHandler
    if (!subscribersRef.current.has(event)) {
      subscribersRef.current.set(event, new Set())
    }
    subscribersRef.current.get(event)!.add(wrapped)
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

  // Establish the SSE connection
  useEffect(() => {
    // Guard for SSR — EventSource is only available in the browser
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return
    if (!enabled) {
      // Cleanup any existing connection and let the cleanup function set state
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      return
    }

    const url = buildUrl()
    const es = new EventSource(url, { withCredentials: false })
    eventSourceRef.current = es

    // On open — connection established
    es.onopen = () => {
      setIsConnected(true)
    }

    // Generic error handler — EventSource will auto-reconnect natively,
    // we just update the connection state.
    es.onerror = () => {
      setIsConnected(false)
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

    // Cleanup on unmount or when deps change
    return () => {
      es.close()
      eventSourceRef.current = null
      setIsConnected(false)
      setConnectionId(null)
    }
  }, [enabled, buildUrl])

  return {
    isConnected: enabled && isConnected,
    lastEvent,
    subscribe,
    unsubscribe,
    connectionId,
  }
}
