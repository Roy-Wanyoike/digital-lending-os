/**
 * Streaming response utilities using the Web Streams API.
 * Works in Next.js 14+ route handlers and middleware.
 *
 * Exports:
 *   - streamJson(data)           -> single JSON response via ReadableStream
 *   - streamSSE(events)         -> Server-Sent Events response
 *   - createChunkedStream(gen)   -> raw ReadableStream from an async generator
 */

// -- streamJson --------------------------------------------------------------------------------------

/**
 * Stream a single JSON value through a ReadableStream.
 * Equivalent to Response.json() but forces streaming transport
 * (useful when you want consistent middleware / transform pipelines).
 */
export function streamJson<T>(data: T, init?: ResponseInit): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(JSON.stringify(data)))
      controller.close()
    },
  })
  return new Response(body, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...init?.headers,
    },
  })
}

// -- streamSSE --------------------------------------------------------------------------------------

export type SSEEvent = {
  event?: string
  data: string
  id?: string
  retry?: number
}

/**
 * Stream Server-Sent Events from an async iterable of SSEEvent objects (or plain strings).
 * Plain strings are sent as: data: <string>\n\n
 */
export function streamSSE(
  source: AsyncIterable<SSEEvent | string>,
  init?: ResponseInit,
): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of source) {
          if (typeof chunk === 'string') {
            controller.enqueue(encoder.encode('data: ' + chunk + '\n\n'))
          } else {
            let msg = ''
            if (chunk.id) msg += 'id: ' + chunk.id + '\n'
            if (chunk.event) msg += 'event: ' + chunk.event + '\n'
            if (chunk.retry != null) msg += 'retry: ' + String(chunk.retry) + '\n'
            msg += 'data: ' + chunk.data + '\n\n'
            controller.enqueue(encoder.encode(msg))
          }
        }
        controller.close()
      } catch (err) {
        controller.enqueue(
          encoder.encode('event: error\ndata: ' + String(err) + '\n\n'),
        )
        controller.close()
      }
    },
  })
  return new Response(body, {
    ...init,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      ...init?.headers,
    },
  })
}

// -- createChunkedStream ------------------------------------------------------------------------------------

/**
 * Create a raw ReadableStream<Uint8Array> from an async generator.
 * Each yielded string or Uint8Array becomes one chunk enqueued into the stream.
 *
 * @example
 * const stream = createChunkedStream(async function* () {
 *   yield JSON.stringify({ page: 1, items: [...] })
 *    yield JSON.stringify({ page: 2, items: [...] })
 * })
 * return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson' } })
 */
export function createChunkedStream(
  generator: () => AsyncGenerator<string | Uint8Array>,
  options?: {
    /** Encoder used when chunks are strings. Defaults to TextEncoder. */
    encoder?: TextEncoder
  },
): ReadableStream<Uint8Array> {
  const enc = options?.encoder ?? new TextEncoder()
  const gen = generator()
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const next = await gen.next()
      if (next.done) {
        controller.close()
        return
      }
      const chunk =
        typeof next.value === 'string' ? enc.encode(next.value) : next.value
      controller.enqueue(chunk)
    },
    async cancel() {
      await gen.return(undefined)
    },
  })
}

// -- Convenience helpers ------------------------------------------------------------------------------

/**
 * Stream an array or async iterable as newline-delimited JSON.
 */
export function ndjsonStream<T>(
  source: AsyncIterable<T> | T[],
  init?: ResponseInit,
): Response {
  const iterable: AsyncIterable<T> = Symbol.asyncIterator in source
    ? (source as AsyncIterable<T>)
    : (async function* () {
        for (const item of source as T[]) yield item
      })()

  const body = createChunkedStream(async function* () {
    for await (const item of iterable) {
      yield JSON.stringify(item) + '\n'
    }
  })

  return new Response(body, {
    ...init,
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-store',
      ...init?.headers,
    },
  })
}

/**
 * Wrap an async iterable into an SSE event generator.
 */
export function createSSEGenerator<T>(
  source: AsyncIterable<T>,
  options?: { eventName?: string; serializer?: (item: T) => string },
): AsyncGenerator<{ event: string; data: string }> {
  const {
    eventName = 'message',
    serializer = JSON.stringify,
  } = options || {}
  return (async function* () {
    for await (const item of source) {
      yield { event: eventName, data: serializer(item) }
    }
  })()
}
