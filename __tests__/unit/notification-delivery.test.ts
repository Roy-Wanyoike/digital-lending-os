import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Notification Delivery Service', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    delete process.env.SENDGRID_API_KEY
    delete process.env.TWILIO_ACCOUNT_SID
    delete process.env.FCM_SERVER_KEY
  })

  // --- delivery.ts tests ---
  describe('deliverNotification', () => {
    it('delivers in-app notification when no provider env vars are set', async () => {
      const createMock = vi.fn().mockResolvedValue({ id: 'n1' })
      const findUniqueMock = vi.fn().mockResolvedValue({ email: 'user@test.com' })

      vi.doMock('@/lib/db', () => ({
        db: {
          notification: { create: createMock },
          account: { findUnique: findUniqueMock },
        },
      }))

      const { deliverNotification } = await import(
        '@/backend/lib/notification/delivery'
      )

      const result = await deliverNotification({
        accountId: 'acc-1',
        title: 'Test',
        body: 'Hello',
        type: 'info',
      })

      expect(result.inApp).toBe(true)
      expect(result.email).toBe(false)
      expect(result.sms).toBe(false)
      expect(result.push).toBe(false)
      expect(createMock).toHaveBeenCalledTimes(1)
      expect(createMock).toHaveBeenCalledWith({
        data: {
          accountId: 'acc-1',
          title: 'Test',
          body: 'Hello',
          type: 'info',
          category: 'general',
          actionUrl: null,
        },
      })
    })

    it('skips in-app when preference is false', async () => {
      const createMock = vi.fn().mockResolvedValue({ id: 'n1' })
      const findUniqueMock = vi.fn().mockResolvedValue({ email: 'u@t.com' })

      vi.doMock('@/lib/db', () => ({
        db: {
          notification: { create: createMock },
          account: { findUnique: findUniqueMock },
        },
      }))

      const { deliverNotification } = await import(
        '@/backend/lib/notification/delivery'
      )

      const result = await deliverNotification({
        accountId: 'acc-1',
        title: 'Test',
        body: 'Hello',
        type: 'info',
        preferences: { inApp: false },
      })

      expect(result.inApp).toBe(false)
      expect(createMock).not.toHaveBeenCalled()
    })

    it('attempts email delivery when SENDGRID_API_KEY is set', async () => {
      process.env.SENDGRID_API_KEY = 'sg-test-key'

      const createMock = vi.fn().mockResolvedValue({ id: 'n1' })
      const findUniqueMock = vi.fn().mockResolvedValue({
        email: 'user@test.com',
      })

      vi.doMock('@/lib/db', () => ({
        db: {
          notification: { create: createMock },
          account: { findUnique: findUniqueMock },
        },
      }))

      // Mock fetch for SendGrid
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 202,
      })
      vi.stubGlobal('fetch', fetchMock)

      const { deliverNotification } = await import(
        '@/backend/lib/notification/delivery'
      )

      const result = await deliverNotification({
        accountId: 'acc-1',
        title: 'Payment Received',
        body: 'You got $100',
        type: 'success',
        category: 'payment_received',
      })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.sendgrid.com/v3/mail/send',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer sg-test-key',
          }),
        }),
      )
    })

    it('logs and skips email when account has no email', async () => {
      process.env.SENDGRID_API_KEY = 'sg-key'

      const createMock = vi.fn().mockResolvedValue({ id: 'n1' })
      const findUniqueMock = vi.fn().mockResolvedValue({ email: null })

      vi.doMock('@/lib/db', () => ({
        db: {
          notification: { create: createMock },
          account: { findUnique: findUniqueMock },
        },
      }))

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const { deliverNotification } = await import(
        '@/backend/lib/notification/delivery'
      )

      const result = await deliverNotification({
        accountId: 'acc-no-email',
        title: 'Test',
        body: 'Body',
        type: 'info',
      })

      expect(result.email).toBe(false)
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('no email found on account'),
      )
      logSpy.mockRestore()
    })

    it('handles email fetch failure gracefully', async () => {
      process.env.SENDGRID_API_KEY = 'sg-key'

      const createMock = vi.fn().mockResolvedValue({ id: 'n1' })
      const findUniqueMock = vi.fn().mockResolvedValue({
        email: 'user@test.com',
      })

      vi.doMock('@/lib/db', () => ({
        db: {
          notification: { create: createMock },
          account: { findUnique: findUniqueMock },
        },
      }))

      const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'))
      vi.stubGlobal('fetch', fetchMock)
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { deliverNotification } = await import(
        '@/backend/lib/notification/delivery'
      )

      const result = await deliverNotification({
        accountId: 'acc-1',
        title: 'Test',
        body: 'Body',
        type: 'info',
      })

      expect(result.email).toBe(false)
      expect(result.inApp).toBe(true) // in-app still works
      errorSpy.mockRestore()
    })

    it('attempts SMS delivery when TWILIO_ACCOUNT_SID is set and phone exists', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'AC-test-sid'

      const createMock = vi.fn().mockResolvedValue({ id: 'n1' })
      const findUniqueMock = vi.fn().mockResolvedValue({
        email: 'u@t.com',
        phone: '+1234567890',
      })

      vi.doMock('@/lib/db', () => ({
        db: {
          notification: { create: createMock },
          account: { findUnique: findUniqueMock },
        },
      }))

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const { deliverNotification } = await import(
        '@/backend/lib/notification/delivery'
      )

      const result = await deliverNotification({
        accountId: 'acc-1',
        title: 'Alert',
        body: 'Something happened',
        type: 'warning',
      })

      expect(result.sms).toBe(true)
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Notification:SMS]'),
      )
      logSpy.mockRestore()
    })

    it('skips SMS when TWILIO_ACCOUNT_SID is not set and logs', async () => {
      const createMock = vi.fn().mockResolvedValue({ id: 'n1' })
      const findUniqueMock = vi.fn().mockResolvedValue({
        email: 'u@t.com',
        phone: '+1234567890',
      })

      vi.doMock('@/lib/db', () => ({
        db: {
          notification: { create: createMock },
          account: { findUnique: findUniqueMock },
        },
      }))

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const { deliverNotification } = await import(
        '@/backend/lib/notification/delivery'
      )

      const result = await deliverNotification({
        accountId: 'acc-1',
        title: 'Test',
        body: 'Body',
        type: 'info',
      })

      expect(result.sms).toBe(false)
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('TWILIO_ACCOUNT_SID not configured'),
      )
      logSpy.mockRestore()
    })

    it('attempts push delivery when FCM_SERVER_KEY is set', async () => {
      process.env.FCM_SERVER_KEY = 'fcm-test-key'

      const createMock = vi.fn().mockResolvedValue({ id: 'n1' })
      const findUniqueMock = vi.fn().mockResolvedValue({ email: 'u@t.com' })

      vi.doMock('@/lib/db', () => ({
        db: {
          notification: { create: createMock },
          account: { findUnique: findUniqueMock },
        },
      }))

      const { deliverNotification } = await import(
        '@/backend/lib/notification/delivery'
      )

      const result = await deliverNotification({
        accountId: 'acc-1',
        title: 'Push Test',
        body: 'Hello push',
        type: 'info',
      })

      expect(result.push).toBe(true)
    })

    it('skips push when FCM_SERVER_KEY is not set and logs', async () => {
      const createMock = vi.fn().mockResolvedValue({ id: 'n1' })
      const findUniqueMock = vi.fn().mockResolvedValue({ email: 'u@t.com' })

      vi.doMock('@/lib/db', () => ({
        db: {
          notification: { create: createMock },
          account: { findUnique: findUniqueMock },
        },
      }))

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const { deliverNotification } = await import(
        '@/backend/lib/notification/delivery'
      )

      const result = await deliverNotification({
        accountId: 'acc-1',
        title: 'Test',
        body: 'Body',
        type: 'info',
      })

      expect(result.push).toBe(false)
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('FCM_SERVER_KEY not configured'),
      )
      logSpy.mockRestore()
    })

    it('delivers to all channels when all env vars and preferences are set', async () => {
      process.env.SENDGRID_API_KEY = 'sg-key'
      process.env.TWILIO_ACCOUNT_SID = 'AC-sid'
      process.env.FCM_SERVER_KEY = 'fcm-key'

      const createMock = vi.fn().mockResolvedValue({ id: 'n1' })
      const findUniqueMock = vi.fn().mockResolvedValue({
        email: 'user@test.com',
        phone: '+1234567890',
      })

      vi.doMock('@/lib/db', () => ({
        db: {
          notification: { create: createMock },
          account: { findUnique: findUniqueMock },
        },
      }))

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 202 }))

      const { deliverNotification } = await import(
        '@/backend/lib/notification/delivery'
      )

      const result = await deliverNotification({
        accountId: 'acc-1',
        title: 'All Channels',
        body: 'Delivered everywhere',
        type: 'success',
        category: 'payment_received',
        actionUrl: '/payments/123',
      })

      expect(result.inApp).toBe(true)
      expect(result.email).toBe(true)
      expect(result.sms).toBe(true)
      expect(result.push).toBe(true)

      // Verify in-app data includes actionUrl
      expect(createMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actionUrl: '/payments/123',
          category: 'payment_received',
        }),
      })
    })

    it('handles in-app creation failure gracefully', async () => {
      const createMock = vi.fn().mockRejectedValue(new Error('DB down'))
      const findUniqueMock = vi.fn().mockResolvedValue({ email: 'u@t.com' })

      vi.doMock('@/lib/db', () => ({
        db: {
          notification: { create: createMock },
          account: { findUnique: findUniqueMock },
        },
      }))

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { deliverNotification } = await import(
        '@/backend/lib/notification/delivery'
      )

      const result = await deliverNotification({
        accountId: 'acc-1',
        title: 'Test',
        body: 'Body',
        type: 'info',
      })

      expect(result.inApp).toBe(false)
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create in-app notification'),
        expect.any(Error),
      )
      errorSpy.mockRestore()
    })

    it('handles account lookup failure gracefully', async () => {
      const createMock = vi.fn().mockResolvedValue({ id: 'n1' })
      const findUniqueMock = vi.fn().mockRejectedValue(new Error('DB error'))

      vi.doMock('@/lib/db', () => ({
        db: {
          notification: { create: createMock },
          account: { findUnique: findUniqueMock },
        },
      }))

      const { deliverNotification } = await import(
        '@/backend/lib/notification/delivery'
      )

      const result = await deliverNotification({
        accountId: 'acc-1',
        title: 'Test',
        body: 'Body',
        type: 'info',
      })

      // In-app still works (doesn't depend on account lookup)
      expect(result.inApp).toBe(true)
      // External channels all fail because account lookup failed
      expect(result.email).toBe(false)
      expect(result.sms).toBe(false)
      expect(result.push).toBe(false)
    })
  })

  // --- templates.ts tests ---
  describe('Notification Templates', () => {
    it('paymentReceived returns correct template', async () => {
      const { paymentReceived } = await import(
        '@/backend/lib/notification/templates'
      )
      const result = paymentReceived({ amount: '150.00', currency: 'USD' })
      expect(result).toEqual({
        title: 'Payment Received',
        body: 'Payment of 150.00 USD received',
        category: 'payment_received',
      })
    })

    it('paymentReceived defaults currency to USD', async () => {
      const { paymentReceived } = await import(
        '@/backend/lib/notification/templates'
      )
      const result = paymentReceived({ amount: 200 })
      expect(result.body).toContain('200 USD')
      expect(result.category).toBe('payment_received')
    })

    it('escrowReleased returns correct template', async () => {
      const { escrowReleased } = await import(
        '@/backend/lib/notification/templates'
      )
      const result = escrowReleased({ amount: '500.00', currency: 'KES' })
      expect(result).toEqual({
        title: 'Escrow Released',
        body: 'Escrow funds of 500.00 KES released',
        category: 'escrow_released',
      })
    })

    it('fraudAlert returns correct template', async () => {
      const { fraudAlert } = await import(
        '@/backend/lib/notification/templates'
      )
      const result = fraudAlert({ description: 'Suspicious login from unknown IP' })
      expect(result).toEqual({
        title: 'Fraud Alert',
        body: 'Fraud alert: Suspicious login from unknown IP',
        category: 'fraud_alert',
      })
    })

    it('invoiceOverdue returns correct template', async () => {
      const { invoiceOverdue } = await import(
        '@/backend/lib/notification/templates'
      )
      const result = invoiceOverdue({ ref: 'INV-2024-001', days: 15 })
      expect(result).toEqual({
        title: 'Invoice Overdue',
        body: 'Invoice INV-2024-001 is 15 days overdue',
        category: 'invoice_overdue',
      })
    })

    it('subscriptionRenewal returns correct template', async () => {
      const { subscriptionRenewal } = await import(
        '@/backend/lib/notification/templates'
      )
      const result = subscriptionRenewal({ plan: 'Enterprise' })
      expect(result).toEqual({
        title: 'Subscription Renewed',
        body: 'Your Enterprise subscription has been renewed',
        category: 'subscription_renewal',
      })
    })
  })

  // --- barrel export tests ---
  describe('barrel exports', () => {
    it('re-exports deliverNotification and all template functions', async () => {
      const mod = await import('@/backend/lib/notification')
      expect(typeof mod.deliverNotification).toBe('function')
      expect(typeof mod.paymentReceived).toBe('function')
      expect(typeof mod.escrowReleased).toBe('function')
      expect(typeof mod.fraudAlert).toBe('function')
      expect(typeof mod.invoiceOverdue).toBe('function')
      expect(typeof mod.subscriptionRenewal).toBe('function')
    })
  })
})
