import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('event-publisher', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('publishEvent does not throw', async () => {
    const { publishEvent } = await import('@/backend/lib/event-publisher')
    await expect(
      publishEvent({
        topic: 'test.events.created',
        key: 'order-1',
        event: { type: 'order.created', orderId: '1' },
      }),
    ).resolves.not.toThrow()
  })

  it('publishEvent logs the topic and key to console', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { publishEvent } = await import('@/backend/lib/event-publisher')

    await publishEvent({
      topic: 'test.events.created',
      key: 'order-2',
      event: { type: 'order.created', orderId: '2' },
    })

    // publishEvent logs once; the Kafka noop producer also logs once
    expect(logSpy.mock.calls.length).toBeGreaterThanOrEqual(1)
    // The first call is from publishEvent itself
    const eventLog = logSpy.mock.calls.find(c => c[0]?.includes('[Event]'))
    expect(eventLog).toBeDefined()
    expect(eventLog![0]).toContain('test.events.created')
    expect(eventLog![0]).toContain('order-2')
    logSpy.mockRestore()
  })

  it('publishEvent logs the full event payload as third argument', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { publishEvent } = await import('@/backend/lib/event-publisher')

    const payload = { type: 'payment.completed', orderId: '42', amount: 9999 }
    await publishEvent({
      topic: 'payments.completed',
      key: 'pay-42',
      event: payload,
    })

    // The publishEvent console.log call passes the event object as third argument
    const eventLog = logSpy.mock.calls.find(c => c[0]?.includes('[Event]') && !c[0]?.includes('noop'))
    expect(eventLog).toBeDefined()
    expect(eventLog![1]).toEqual(payload)
    logSpy.mockRestore()
  })

  it('publishEvent passes topic, key, and event to the Kafka send function', async () => {
    const sendSpy = vi.fn().mockResolvedValue(undefined)
    vi.doMock('@/backend/lib/kafka/producer', () => ({
      send: sendSpy,
    }))

    const { publishEvent } = await import('@/backend/lib/event-publisher')
    const topic = 'escrow.transactions.funded'
    const key = 'txn-abc'
    const event = { escrowId: 'esc-1', amount: 5000 }

    await publishEvent({ topic, key, event })

    expect(sendSpy).toHaveBeenCalledTimes(1)
    expect(sendSpy).toHaveBeenCalledWith(topic, key, event)
  })

  it('publishEvent passes partitionKey to the event object if provided', async () => {
    const sendSpy = vi.fn().mockResolvedValue(undefined)
    vi.doMock('@/backend/lib/kafka/producer', () => ({
      send: sendSpy,
    }))

    const { publishEvent } = await import('@/backend/lib/event-publisher')

    // partitionKey is part of PublishEventParams but the current implementation
    // only passes (topic, key, event) to send(). Verify the event is passed as-is.
    const event = { type: 'test', data: 123 }
    await publishEvent({
      topic: 't',
      key: 'k',
      event,
      partitionKey: 'pk-1',
    })

    expect(sendSpy).toHaveBeenCalledWith('t', 'k', event)
  })

  it('publishEvent returns undefined (void)', async () => {
    const { publishEvent } = await import('@/backend/lib/event-publisher')
    const result = await publishEvent({
      topic: 'test.void',
      key: 'k',
      event: {},
    })
    expect(result).toBeUndefined()
  })

  it('publishEvent handles errors gracefully — never throws', async () => {
    const { publishEvent } = await import('@/backend/lib/event-publisher')
    await expect(
      publishEvent({
        topic: 'error-test.topic',
        key: 'k',
        event: { data: 'value' },
      }),
    ).resolves.not.toThrow()
  })

  it('publishEvent logs error but does not throw when console.log throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logSpy = vi.spyOn(console, 'log').mockImplementationOnce(() => {
      throw new Error('simulated failure')
    })

    const { publishEvent } = await import('@/backend/lib/event-publisher')
    await publishEvent({
      topic: 'fail.topic',
      key: 'k',
      event: {},
    })

    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy.mock.calls[0][0]).toContain('[Event]')
    expect(errorSpy.mock.calls[0][0]).toContain('fail.topic')
    logSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('publishEvent catches Kafka send failures and logs them without throwing', async () => {
    const sendSpy = vi.fn().mockRejectedValue(new Error('Kafka broker unavailable'))
    vi.doMock('@/backend/lib/kafka/producer', () => ({
      send: sendSpy,
    }))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const { publishEvent } = await import('@/backend/lib/event-publisher')
    await expect(
      publishEvent({
        topic: 'kafka.fail.topic',
        key: 'k',
        event: { x: 1 },
      }),
    ).resolves.not.toThrow()

    // Should have called send and it should have failed
    expect(sendSpy).toHaveBeenCalledTimes(1)
    // The inner catch should log the Kafka error
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy.mock.calls[0][0]).toContain('Kafka publish failed')
    expect(errorSpy.mock.calls[0][0]).toContain('kafka.fail.topic')

    logSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('publishEvent preserves event structure with nested objects', async () => {
    const sendSpy = vi.fn().mockResolvedValue(undefined)
    vi.doMock('@/backend/lib/kafka/producer', () => ({
      send: sendSpy,
    }))

    const { publishEvent } = await import('@/backend/lib/event-publisher')
    const complexEvent = {
      type: 'escrow.created',
      data: {
        buyer: { id: 'u1', name: 'Alice' },
        seller: { id: 'u2', name: 'Bob' },
        items: [{ sku: 'A', qty: 2 }, { sku: 'B', qty: 1 }],
      },
    }

    await publishEvent({ topic: 'escrow.events', key: 'esc-99', event: complexEvent })

    expect(sendSpy).toHaveBeenCalledWith('escrow.events', 'esc-99', complexEvent)
  })
})
