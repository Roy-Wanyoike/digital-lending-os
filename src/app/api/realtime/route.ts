// ─── SSE (Server-Sent Events) Streaming Route ─────────────────
// GET /api/realtime
//
// Establishes an authenticated, persistent SSE connection.
// tenantId is derived from the session — NEVER from query params.
// Forwards events from the in-memory event-bus to connected clients,
// filtered by the authenticated user's tenant.
// Sends a heartbeat comment every 15 seconds to keep the connection alive.

import { eventBus, type RealtimeEvent, MAX_CONNECTIONS } from '@/backend/services/event-bus'
import { getApiUser, errorResponse } from '@/lib/auth/api-helpers'

const HEARTBEAT_INTERVAL = 15_000 // 15 seconds

function formatSSE(event: string, data: unknown): string {
  // Sanitize: newlines inside event names or JSON would break the SSE protocol.
  const safeEvent = event.replace(/[\r\n]/g, '')
  const json = JSON.stringify(data)
  return `event: ${safeEvent}\ndata: ${json}\n\n`
}

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // ─── 1. Authenticate ──────────────────────────────────────────
    // The browser sends session cookies automatically for same-origin requests.
    const user = await getApiUser(request as any)
    if (!user) {
      return errorResponse('Authentication required', 401)
    }

    // ─── 2. Connection limit ─────────────────────────────────────
    // Prevent a single user from opening unbounded connections (DoS).
    const activeConns = eventBus.getConnectionCount()
    if (activeConns >= MAX_CONNECTIONS) {
      return errorResponse('Server is at maximum connection capacity', 503)
    }

    // Per-user connection limit: max 5 concurrent SSE streams per user
    const userConnections = eventBus.getConnectionsByPrefix(user.id)
    if (userConnections >= 5) {
      return errorResponse('Too many concurrent connections', 429)
    }

    // ─── 3. Derive tenantId from session, NOT from query params ───
    const tenantId = user.tenantId || undefined

    // Generate a unique connection ID (prefixed with userId for tracking)
    const connectionId = `sse-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const encoder = new TextEncoder()
    let controllerClosed = false

    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection confirmation
        const connectMsg = formatSSE('connected', {
          connectionId,
          tenantId: tenantId ?? null,
          timestamp: Date.now(),
        })
        controller.enqueue(encoder.encode(connectMsg))

        // Subscribe to specific known events for forwarding.
        const knownEvents = [
          'wallet.deposit',
          'payment.completed',
          'payment.failed',
          'escrow.updated',
          'escrow.created',
        ]

        const handler = (evt: RealtimeEvent) => {
          if (controllerClosed) return
          try {
            const msg = formatSSE(evt.event, evt)
            controller.enqueue(encoder.encode(msg))
          } catch {
            // Controller might be closed already
          }
        }

        for (const eventName of knownEvents) {
          eventBus.on(eventName, handler, { connectionId, tenantId, accountId: user.id })
        }

        // Heartbeat: send a comment line every 15 seconds to keep connection alive.
        const heartbeatTimer = setInterval(() => {
          if (controllerClosed) {
            clearInterval(heartbeatTimer)
            return
          }
          try {
            controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`))
          } catch {
            clearInterval(heartbeatTimer)
          }
        }, HEARTBEAT_INTERVAL)

        // Cleanup when the client disconnects
        request.signal.addEventListener('abort', () => {
          controllerClosed = true
          clearInterval(heartbeatTimer)
          eventBus.disconnect(connectionId)
          try {
            controller.close()
          } catch {
            // Already closed
          }
        })
      },

      cancel() {
        controllerClosed = true
        eventBus.disconnect(connectionId)
      },
    })

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    console.error('[realtime] SSE connection setup failed:', error)
    return errorResponse('Failed to establish SSE connection', 500)
  }
}
