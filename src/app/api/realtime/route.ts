// ─── SSE (Server-Sent Events) Streaming Route ─────────────────
// GET /api/realtime?tenantId=xxx
//
// Establishes a persistent SSE connection. Forwards events from the
// in-memory event-bus to connected clients, filtered by tenantId.
// Sends a heartbeat comment every 15 seconds to keep the connection alive.

import { eventBus, type RealtimeEvent } from '@/backend/services/event-bus'

const HEARTBEAT_INTERVAL = 15_000 // 15 seconds

function formatSSE(event: string, data: unknown): string {
  const json = JSON.stringify(data)
  return `event: ${event}\ndata: ${json}\n\n`
}

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenantId') || undefined

  // Generate a unique connection ID
  const connectionId = `sse-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

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

      // Subscribe to all events from the event bus
      const handler = (evt: RealtimeEvent) => {
        if (controllerClosed) return
        try {
          const msg = formatSSE(evt.event, evt)
          controller.enqueue(encoder.encode(msg))
        } catch {
          // Controller might be closed already
        }
      }

      // Subscribe with connectionId so we can clean up on disconnect
      eventBus.on('*', handler, { connectionId, tenantId })

      // Also subscribe to specific known events for forwarding
      const knownEvents = [
        'wallet.deposit',
        'payment.completed',
        'payment.failed',
        'escrow.updated',
        'escrow.created',
      ]

      for (const eventName of knownEvents) {
        eventBus.on(eventName, handler, { connectionId, tenantId })
      }

      // Heartbeat: send a comment line every 15 seconds to keep connection alive
      const heartbeatTimer = setInterval(() => {
        if (controllerClosed) {
          clearInterval(heartbeatTimer)
          return
        }
        try {
          // SSE comment lines start with `:`
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`))
        } catch {
          clearInterval(heartbeatTimer)
        }
      }, HEARTBEAT_INTERVAL)

      // Cleanup when the client disconnects
      // We detect this via the cancel signal on AbortController
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
      'X-Accel-Buffering': 'no', // Disable nginx buffering (if behind proxy)
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  })
}
