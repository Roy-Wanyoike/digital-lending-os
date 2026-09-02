import { describe, it, expect, vi, beforeEach } from 'vitest'

// We need to reset module-level state between tests, so we re-import fresh each time

describe('telemetry/logger', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('exports getLogger, initLogger, shutdownLogger, parseLogLevel, YoungsendLogger (DLO Logger), and LogLevel', async () => {
    const mod = await import('@/backend/lib/telemetry/logger')
    expect(typeof mod.getLogger).toBe('function')
    expect(typeof mod.initLogger).toBe('function')
    expect(typeof mod.shutdownLogger).toBe('function')
    expect(typeof mod.parseLogLevel).toBe('function')
    expect(typeof mod.YoungsendLogger).toBe('function')
    expect(mod.LogLevel).toBeDefined()
  })

  it('parseLogLevel maps string names to correct LogLevel values', async () => {
    const { parseLogLevel, LogLevel } = await import('@/backend/lib/telemetry/logger')
    expect(parseLogLevel('trace')).toBe(LogLevel.TRACE)
    expect(parseLogLevel('debug')).toBe(LogLevel.DEBUG)
    expect(parseLogLevel('info')).toBe(LogLevel.INFO)
    expect(parseLogLevel('warn')).toBe(LogLevel.WARN)
    expect(parseLogLevel('warning')).toBe(LogLevel.WARN)
    expect(parseLogLevel('error')).toBe(LogLevel.ERROR)
    expect(parseLogLevel('fatal')).toBe(LogLevel.FATAL)
    expect(parseLogLevel('unknown')).toBe(LogLevel.INFO) // default fallback
  })

  it('parseLogLevel is case-insensitive', async () => {
    const { parseLogLevel, LogLevel } = await import('@/backend/lib/telemetry/logger')
    expect(parseLogLevel('INFO')).toBe(LogLevel.INFO)
    expect(parseLogLevel('Error')).toBe(LogLevel.ERROR)
    expect(parseLogLevel('DEBUG')).toBe(LogLevel.DEBUG)
  })

  it('getLogger returns a DLO Logger instance with all log methods', async () => {
    const { getLogger } = await import('@/backend/lib/telemetry/logger')
    const logger = getLogger()
    expect(typeof logger.trace).toBe('function')
    expect(typeof logger.debug).toBe('function')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.fatal).toBe('function')
    expect(typeof logger.child).toBe('function')
    expect(typeof logger.withContext).toBe('function')
    expect(typeof logger.shutdown).toBe('function')
  })

  it('initLogger returns a new logger and replaces the default', async () => {
    const { initLogger, getLogger } = await import('@/backend/lib/telemetry/logger')
    const logger1 = getLogger()
    const logger2 = initLogger({ serviceName: 'test-service' })
    // initLogger should return a new logger
    expect(logger2).toBeDefined()
    expect(typeof logger2.info).toBe('function')
    // After initLogger, getLogger should return the same instance
    expect(getLogger()).toBe(logger2)
  })

  it('child() returns a logger with bound context', async () => {
    const { initLogger } = await import('@/backend/lib/telemetry/logger')
    const parent = initLogger({ serviceName: 'parent', enableConsole: false })
    const child = parent.child({ tenant_id: 't1', user_id: 'u1' })
    expect(child).toBeDefined()
    expect(typeof child.info).toBe('function')
  })

  it('withContext() returns a logger with bound context', async () => {
    const { initLogger } = await import('@/backend/lib/telemetry/logger')
    const parent = initLogger({ serviceName: 'parent', enableConsole: false })
    const child = parent.withContext({ tenant_id: 't2' })
    expect(child).toBeDefined()
    expect(typeof child.info).toBe('function')
  })

  it('shutdownLogger clears the default logger', async () => {
    const { initLogger, getLogger, shutdownLogger } = await import('@/backend/lib/telemetry/logger')
    initLogger({ serviceName: 'to-shutdown' })
    expect(getLogger()).toBeDefined()
    await shutdownLogger()
    // After shutdown, getLogger should create a fresh logger (not null)
    const fresh = getLogger()
    expect(fresh).toBeDefined()
  })

  it('log methods do not throw even with no exporters', async () => {
    const { initLogger } = await import('@/backend/lib/telemetry/logger')
    const logger = initLogger({ serviceName: 'no-export', enableConsole: false })
    expect(() => logger.trace('trace msg')).not.toThrow()
    expect(() => logger.debug('debug msg')).not.toThrow()
    expect(() => logger.info('info msg')).not.toThrow()
    expect(() => logger.warn('warn msg')).not.toThrow()
    expect(() => logger.error('error msg')).not.toThrow()
    expect(() => logger.fatal('fatal msg')).not.toThrow()
  })

  it('LogLevel enum has correct numeric ordering', async () => {
    const { LogLevel } = await import('@/backend/lib/telemetry/logger')
    expect(LogLevel.TRACE).toBeLessThan(LogLevel.DEBUG)
    expect(LogLevel.DEBUG).toBeLessThan(LogLevel.INFO)
    expect(LogLevel.INFO).toBeLessThan(LogLevel.WARN)
    expect(LogLevel.WARN).toBeLessThan(LogLevel.ERROR)
    expect(LogLevel.ERROR).toBeLessThan(LogLevel.FATAL)
  })
})

describe('telemetry/tracer', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('exports getTracer, createTracerProvider, startFintechSpan, withFintechSpan, shutdownTracer, DLO_ATTRS', async () => {
    const mod = await import('@/backend/lib/telemetry/tracer')
    expect(typeof mod.getTracer).toBe('function')
    expect(typeof mod.createTracerProvider).toBe('function')
    expect(typeof mod.startFintechSpan).toBe('function')
    expect(typeof mod.withFintechSpan).toBe('function')
    expect(typeof mod.shutdownTracer).toBe('function')
    expect(mod.YS_ATTRS).toBeDefined()
  })

  it('DLO_ATTRS contains all expected fintech attribute keys', async () => {
    const { YS_ATTRS } = await import('@/backend/lib/telemetry/tracer')
    expect(YS_ATTRS.TENANT_ID).toBe('youngsend.tenant.id')
    expect(YS_ATTRS.USER_ID).toBe('youngsend.user.id')
    expect(YS_ATTRS.PAYMENT_ID).toBe('youngsend.payment.id')
    expect(YS_ATTRS.WALLET_ID).toBe('youngsend.wallet.id')
    expect(YS_ATTRS.ESCROW_ID).toBe('youngsend.escrow.id')
    expect(YS_ATTRS.PROVIDER).toBe('youngsend.payment.provider')
    expect(YS_ATTRS.CURRENCY).toBe('youngsend.payment.currency')
    expect(YS_ATTRS.COUNTRY).toBe('youngsend.user.country')
  })

  it('getTracer returns a tracer with startSpan method', async () => {
    const { getTracer } = await import('@/backend/lib/telemetry/tracer')
    const tracer = getTracer()
    expect(typeof tracer.startSpan).toBe('function')
  })

  it('startFintechSpan returns a span with expected methods', async () => {
    const { startFintechSpan } = await import('@/backend/lib/telemetry/tracer')
    const span = startFintechSpan('test.op', { tenantId: 't1', userId: 'u1' })
    expect(typeof span.end).toBe('function')
    expect(typeof span.setAttribute).toBe('function')
    expect(typeof span.setStatus).toBe('function')
    expect(typeof span.recordException).toBe('function')
    expect(typeof span.spanContext).toBe('function')
    span.end()
  })

  it('startFintechSpan sets fintech attributes on the span', async () => {
    const { startFintechSpan, getCompletedSpans, resetSpans } = await import('@/backend/lib/telemetry/tracer')
    resetSpans()
    const span = startFintechSpan('payment.process', {
      tenantId: 'tenant-abc',
      userId: 'user-123',
      paymentId: 'pay-456',
      provider: 'stripe',
      currency: 'USD',
    })
    span.end()

    const completed = getCompletedSpans()
    expect(completed).toHaveLength(1)
    expect(completed[0].name).toBe('payment.process')
    expect(completed[0].attributes['youngsend.tenant.id']).toBe('tenant-abc')
    expect(completed[0].attributes['youngsend.user.id']).toBe('user-123')
    expect(completed[0].attributes['youngsend.payment.id']).toBe('pay-456')
    expect(completed[0].attributes['youngsend.payment.provider']).toBe('stripe')
    expect(completed[0].attributes['youngsend.payment.currency']).toBe('USD')
  })

  it('withFintechSpan executes the callback and returns its value', async () => {
    const { withFintechSpan, getCompletedSpans, resetSpans } = await import('@/backend/lib/telemetry/tracer')
    resetSpans()

    const result = await withFintechSpan('test.op', async (span) => {
      span.setAttribute('custom.key', 'custom.value')
      return 42
    })

    expect(result).toBe(42)
    const completed = getCompletedSpans()
    expect(completed).toHaveLength(1)
    expect(completed[0].attributes['custom.key']).toBe('custom.value')
  })

  it('withFintechSpan records exception on error and re-throws', async () => {
    const { withFintechSpan, getCompletedSpans, resetSpans } = await import('@/backend/lib/telemetry/tracer')
    resetSpans()

    await expect(
      withFintechSpan('fail.op', async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')

    const completed = getCompletedSpans()
    expect(completed).toHaveLength(1)
    expect(completed[0].status.code).toBe(2) // ERROR
    expect(completed[0].events).toHaveLength(1)
    expect(completed[0].events[0].name).toBe('exception')
  })

  it('resetSpans clears all completed spans', async () => {
    const { startFintechSpan, getCompletedSpans, resetSpans } = await import('@/backend/lib/telemetry/tracer')
    resetSpans()
    startFintechSpan('a').end()
    startFintechSpan('b').end()
    expect(getCompletedSpans()).toHaveLength(2)
    resetSpans()
    expect(getCompletedSpans()).toHaveLength(0)
  })

  it('shutdownTracer clears provider and tracer state', async () => {
    const { getTracer, shutdownTracer } = await import('@/backend/lib/telemetry/tracer')
    expect(getTracer()).toBeDefined()
    await shutdownTracer()
    // After shutdown, getTracer should create a fresh tracer
    expect(getTracer()).toBeDefined()
  })
})

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

  it('recordPayment increments paymentTotal counter', async () => {
    const { recordPayment, getMetricsSnapshot, resetMetrics } = await import('@/backend/lib/telemetry/metrics')
    resetMetrics()

    recordPayment({ provider: 'stripe', status: 'completed', currency: 'USD', amount: 100 })
    recordPayment({ provider: 'stripe', status: 'completed', currency: 'USD', amount: 200 })
    recordPayment({ provider: 'paystack', status: 'failed', currency: 'NGN', amount: 5000 })

    const snapshot = getMetricsSnapshot()
    const paymentTotal = snapshot.find(s => s.name === 'youngsend_payment_total' && s.type === 'counter')!
    expect(paymentTotal).toBeDefined()

    // Find the stripe/completed/USD entry
    const stripeEntry = paymentTotal.values.find(
      v => v.attrs.provider === 'stripe' && v.attrs.status === 'completed' && v.attrs.currency === 'USD'
    )
    expect(stripeEntry).toBeDefined()
    expect(stripeEntry!.value).toBe(2)

    const paystackEntry = paymentTotal.values.find(
      v => v.attrs.provider === 'paystack' && v.attrs.status === 'failed' && v.attrs.currency === 'NGN'
    )
    expect(paystackEntry).toBeDefined()
    expect(paystackEntry!.value).toBe(1)
  })

  it('recordPayment records amounts in histogram', async () => {
    const { recordPayment, getMetricsSnapshot, resetMetrics } = await import('@/backend/lib/telemetry/metrics')
    resetMetrics()

    recordPayment({ provider: 'flutterwave', status: 'completed', currency: 'KES', amount: 5000 })
    recordPayment({ provider: 'flutterwave', status: 'completed', currency: 'KES', amount: 7500 })

    const snapshot = getMetricsSnapshot()
    const amountHist = snapshot.find(s => s.name === 'youngsend_payment_amount' && s.type === 'histogram')!
    expect(amountHist).toBeDefined()

    const fwEntry = amountHist.values.find(
      v => v.attrs.provider === 'flutterwave' && v.attrs.currency === 'KES'
    )
    expect(fwEntry).toBeDefined()
    expect(fwEntry!.values).toEqual([5000, 7500])
  })

  it('recordRequestDuration records duration in histogram', async () => {
    const { recordRequestDuration, getMetricsSnapshot, resetMetrics } = await import('@/backend/lib/telemetry/metrics')
    resetMetrics()

    recordRequestDuration({ route: '/api/test', method: 'GET', status: 200, durationSeconds: 0.05 })
    recordRequestDuration({ route: '/api/test', method: 'GET', status: 200, durationSeconds: 0.12 })

    const snapshot = getMetricsSnapshot()
    const durHist = snapshot.find(s => s.name === 'youngsend_request_duration')!
    expect(durHist).toBeDefined()
    expect(durHist.type).toBe('histogram')

    const entry = durHist.values.find(
      v => v.attrs.route === '/api/test' && v.attrs.method === 'GET' && v.attrs.status === '200'
    )
    expect(entry).toBeDefined()
    expect(entry!.values).toEqual([0.05, 0.12])
  })

  it('recordSessionDelta increments and decrements active sessions', async () => {
    const { recordSessionDelta, getMetricsSnapshot, resetMetrics } = await import('@/backend/lib/telemetry/metrics')
    resetMetrics()

    recordSessionDelta(1)
    recordSessionDelta(1)
    recordSessionDelta(1)
    recordSessionDelta(-1)

    const snapshot = getMetricsSnapshot()
    const sessions = snapshot.find(s => s.name === 'youngsend_active_sessions' && s.type === 'up_down_counter')!
    expect(sessions).toBeDefined()
    expect(sessions.values[0].value).toBe(2)
  })

  it('recordFraudAlert increments fraud counter with severity and type attrs', async () => {
    const { recordFraudAlert, getMetricsSnapshot, resetMetrics } = await import('@/backend/lib/telemetry/metrics')
    resetMetrics()

    recordFraudAlert({ severity: 'high', type: 'velocity' })
    recordFraudAlert({ severity: 'high', type: 'velocity' })
    recordFraudAlert({ severity: 'low', type: 'velocity' })

    const snapshot = getMetricsSnapshot()
    const fraudCounter = snapshot.find(s => s.name === 'youngsend_fraud_alerts')!
    expect(fraudCounter).toBeDefined()

    const highVelocity = fraudCounter.values.find(
      v => v.attrs.severity === 'high' && v.attrs.type === 'velocity'
    )
    expect(highVelocity).toBeDefined()
    expect(highVelocity!.value).toBe(2)

    const lowVelocity = fraudCounter.values.find(
      v => v.attrs.severity === 'low' && v.attrs.type === 'velocity'
    )
    expect(lowVelocity).toBeDefined()
    expect(lowVelocity!.value).toBe(1)
  })

  it('resetMetrics clears all recorded data', async () => {
    const { recordPayment, getMetricsSnapshot, resetMetrics } = await import('@/backend/lib/telemetry/metrics')
    resetMetrics()
    recordPayment({ provider: 'x', status: 'y', currency: 'z', amount: 1 })
    expect(getMetricsSnapshot().length).toBeGreaterThan(0)
    resetMetrics()
    expect(getMetricsSnapshot()).toHaveLength(0)
  })

  it('shutdownMetrics clears provider and metrics', async () => {
    const { recordPayment, shutdownMetrics, getMetrics } = await import('@/backend/lib/telemetry/metrics')
    recordPayment({ provider: 'x', status: 'y', currency: 'z', amount: 1 })
    await shutdownMetrics()
    // After shutdown, getMetrics should re-initialize
    const m = getMetrics()
    expect(m).toHaveProperty('paymentTotal')
  })

  it('registerCacheHitRatioCallback and registerKafkaConsumerLagCallback accept callbacks', async () => {
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

  it('counter accumulates across multiple add calls', async () => {
    const { getMeter, getMetricsSnapshot, resetMetrics } = await import('@/backend/lib/telemetry/metrics')
    resetMetrics()
    const meter = getMeter()
    const counter = meter.createCounter('test.accum')
    counter.add(5, { label: 'a' })
    counter.add(3, { label: 'a' })
    counter.add(10, { label: 'b' })

    const snapshot = getMetricsSnapshot()
    const c = snapshot.find(s => s.name === 'test.accum')!
    expect(c.values.find(v => v.attrs.label === 'a')!.value).toBe(8)
    expect(c.values.find(v => v.attrs.label === 'b')!.value).toBe(10)
  })

  it('histogram records values per attribute key', async () => {
    const { getMeter, getMetricsSnapshot, resetMetrics } = await import('@/backend/lib/telemetry/metrics')
    resetMetrics()
    const meter = getMeter()
    const hist = meter.createHistogram('test.dur')
    hist.record(0.1, { route: '/' })
    hist.record(0.2, { route: '/' })
    hist.record(0.5, { route: '/api' })

    const snapshot = getMetricsSnapshot()
    const h = snapshot.find(s => s.name === 'test.dur')!
    expect(h.values.find(v => v.attrs.route === '/')!.values).toEqual([0.1, 0.2])
    expect(h.values.find(v => v.attrs.route === '/api')!.values).toEqual([0.5])
  })
})

describe('telemetry/index re-exports', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('re-exports all tracer functions and types', async () => {
    const mod = await import('@/backend/lib/telemetry')
    expect(typeof mod.getTracer).toBe('function')
    expect(typeof mod.createTracerProvider).toBe('function')
    expect(typeof mod.startFintechSpan).toBe('function')
    expect(typeof mod.withFintechSpan).toBe('function')
    expect(typeof mod.createHttpSpan).toBe('function')
    expect(typeof mod.shutdownTracer).toBe('function')
    expect(mod.YS_ATTRS).toBeDefined() // DLO_ATTRS
  })

  it('re-exports all metrics functions and types', async () => {
    const mod = await import('@/backend/lib/telemetry')
    expect(typeof mod.getMeterProvider).toBe('function')
    expect(typeof mod.getMeter).toBe('function')
    expect(typeof mod.getMetrics).toBe('function')
    expect(typeof mod.recordPayment).toBe('function')
    expect(typeof mod.recordRequestDuration).toBe('function')
    expect(typeof mod.recordSessionDelta).toBe('function')
    expect(typeof mod.recordFraudAlert).toBe('function')
    expect(typeof mod.shutdownMetrics).toBe('function')
    expect(typeof mod.registerCacheHitRatioCallback).toBe('function')
    expect(typeof mod.registerKafkaConsumerLagCallback).toBe('function')
  })

  it('re-exports all logger functions and types', async () => {
    const mod = await import('@/backend/lib/telemetry')
    expect(typeof mod.getLogger).toBe('function')
    expect(typeof mod.initLogger).toBe('function')
    expect(typeof mod.shutdownLogger).toBe('function')
    expect(mod.YoungsendLogger).toBeDefined() // DLO Logger
    expect(mod.LogLevel).toBeDefined()
  })

  it('re-exports middleware and health functions', async () => {
    const mod = await import('@/backend/lib/telemetry')
    expect(typeof mod.telemetryMiddleware).toBe('function')
    expect(typeof mod.withTelemetry).toBe('function')
    expect(typeof mod.extractTraceContext).toBe('function')
    expect(typeof mod.performHealthChecks).toBe('function')
    expect(typeof mod.healthCheckHandler).toBe('function')
    expect(typeof mod.markStartupComplete).toBe('function')
  })

  it('exports initTelemetry that returns a shutdown function', async () => {
    const mod = await import('@/backend/lib/telemetry')
    expect(typeof mod.initTelemetry).toBe('function')
    const shutdown = mod.initTelemetry({ disabled: true })
    expect(typeof shutdown).toBe('function')
  })
})
