import { describe, it, expect, vi, beforeEach } from 'vitest'

// We need to reset module-level state between tests, so we re-import fresh each time
describe('telemetry/metrics', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('getMetrics returns a metrics object with all expected instrument types', async () => {
    const { getMetrics } = await import('@/backend/lib/telemetry/metrics')
    const m = getMetrics()
    expect(m).toHaveProperty('paymentTotal')
    expect(m).toHaveProperty('paymentAmount')
    expect(m).toHaveProperty('requestDuration')
    expect(m).toHaveProperty('activeSessions')
    expect(m).toHaveProperty('cacheHitRatio')
    expect(m).toHaveProperty('kafkaConsumerLag')
    expect(m).toHaveProperty('fraudAlerts')
  })

  it('recordPayment does not throw when OTel is not initialized', async () => {
    const { recordPayment } = await import('@/backend/lib/telemetry/metrics')
    expect(() =>
      recordPayment({ provider: 'stripe', status: 'completed', currency: 'USD', amount: 100 }),
    ).not.toThrow()
  })

  it('recordRequestDuration does not throw', async () => {
    const { recordRequestDuration } = await import('@/backend/lib/telemetry/metrics')
    expect(() =>
      recordRequestDuration({ route: '/api/test', method: 'GET', status: 200, durationSeconds: 0.05 }),
    ).not.toThrow()
  })

  it('recordSessionDelta does not throw', async () => {
    const { recordSessionDelta } = await import('@/backend/lib/telemetry/metrics')
    expect(() => recordSessionDelta(1)).not.toThrow()
    expect(() => recordSessionDelta(-1)).not.toThrow()
  })

  it('recordFraudAlert does not throw', async () => {
    const { recordFraudAlert } = await import('@/backend/lib/telemetry/metrics')
    expect(() =>
      recordFraudAlert({ severity: 'high', type: 'velocity' }),
    ).not.toThrow()
  })

  it('shutdownMetrics does not throw', async () => {
    const { shutdownMetrics } = await import('@/backend/lib/telemetry/metrics')
    await expect(shutdownMetrics()).resolves.not.toThrow()
  })

  it('registerCacheHitRatioCallback and registerKafkaConsumerLagCallback do not throw', async () => {
    const { registerCacheHitRatioCallback, registerKafkaConsumerLagCallback } =
      await import('@/backend/lib/telemetry/metrics')
    expect(() => registerCacheHitRatioCallback(() => ({ redis: 0.95 }))).not.toThrow()
    expect(() => registerKafkaConsumerLagCallback(() => ({ 'topic:group': 10 }))).not.toThrow()
  })

  it('getMeterProvider returns a meter provider with shutdown method', async () => {
    const { getMeterProvider } = await import('@/backend/lib/telemetry/metrics')
    const mp = getMeterProvider()
    expect(typeof mp.shutdown).toBe('function')
  })

  it('getMeter returns a meter with factory methods', async () => {
    const { getMeter } = await import('@/backend/lib/telemetry/metrics')
    const meter = getMeter()
    expect(typeof meter.createCounter).toBe('function')
    expect(typeof meter.createHistogram).toBe('function')
    expect(typeof meter.createUpDownCounter).toBe('function')
    expect(typeof meter.createObservableGauge).toBe('function')
  })
})
