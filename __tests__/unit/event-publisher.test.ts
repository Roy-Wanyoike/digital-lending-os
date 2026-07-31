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

  it('publishEvent logs to console', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { publishEvent } = await import('@/backend/lib/event-publisher')

    await publishEvent({
      topic: 'test.events.created',
      key: 'order-2',
      event: { type: 'order.created', orderId: '2' },
    })

    expect(logSpy).toHaveBeenCalledTimes(1)
    expect(logSpy.mock.calls[0][0]).toContain('[Event]')
    expect(logSpy.mock.calls[0][0]).toContain('test.events.created')
    logSpy.mockRestore()
  })

  it('publishEvent handles errors gracefully — never throws', async () => {
    // Even if console.log somehow throws (edge case), the function should not propagate
    const { publishEvent } = await import('@/backend/lib/event-publisher')
    // publishEvent wraps everything in try/catch, so it never throws
    await expect(
      publishEvent({
        topic: 'error-test.topic',
        key: 'k',
        event: { data: 'value' },
      }),
    ).resolves.not.toThrow()
  })

  it('publishEvent logs error but does not throw when internal error occurs', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    // Force an error inside the try block by making console.log throw
    const logSpy = vi.spyOn(console, 'log').mockImplementationOnce(() => {
      throw new Error('simulated failure')
    })

    const { publishEvent } = await import('@/backend/lib/event-publisher')
    await publishEvent({
      topic: 'fail.topic',
      key: 'k',
      event: {},
    })

    // The catch block logs the error
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy.mock.calls[0][0]).toContain('[Event]')
    expect(errorSpy.mock.calls[0][0]).toContain('fail.topic')
    logSpy.mockRestore()
    errorSpy.mockRestore()
  })
})
