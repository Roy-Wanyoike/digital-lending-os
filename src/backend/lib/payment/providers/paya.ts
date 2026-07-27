// ─── Paya Ventures Payment Provider ──────────────────────
// API: https://getpaya.com/api/v1
// Auth: Bearer JWT (obtained via POST /auth/login)
//
// Credentials (any of):
//   - PAYA_API_KEY    Pre-issued bearer token (preferred for prod)
//   - PAYA_EMAIL + PAYA_PASSWORD  Email/password login → JWT (refreshed automatically)
//
// Optional:
//   - PAYA_BASE_URL       Override the API base URL (defaults to https://getpaya.com/api/v1)
//   - PAYA_WEBHOOK_SECRET Shared secret for HMAC-SHA256 webhook signatures
//   - PAYA_TEST_MODE      'true' / '1' / 'yes'  → relaxes webhook validation

import crypto from 'crypto'
import type {
  PaymentProvider,
  InitializePaymentInput,
  InitializePaymentResult,
  VerifyPaymentResult,
  VerifyPaymentInput,
  PaymentProviderCode,
} from '../types'
import { getProviderConfig } from '../config'

const DEFAULT_BASE_URL = 'https://getpaya.com/api/v1'

interface PayaTokenResponse {
  token?: string
  refresh_token?: string
  access_token?: string
  expires_in?: number // seconds (optional, from API)
  [key: string]: unknown
}

interface PayaDepositResponse {
  id?: string | number
  reference?: string
  deposit_id?: string | number
  status?: string
  payment_url?: string
  checkout_url?: string
  authorization_url?: string
  amount?: number
  currency?: string
  [key: string]: unknown
}

interface PayaWalletResponse {
  id?: string | number
  wallet_id?: string
  balance?: number
  currency?: string
  status?: string
  [key: string]: unknown
}

interface PayaTransaction {
  id?: string | number
  reference?: string
  deposit_id?: string | number
  amount?: number
  currency?: string
  status?: string
  paid_at?: string
  created_at?: string
  [key: string]: unknown
}

export class PayaProvider implements PaymentProvider {
  code: PaymentProviderCode = 'paya'
  name = 'Paya'
  isActive: boolean
  private apiKey = ''
  private email = ''
  private password = ''
  private webhookSecret = ''
  private baseUrl: string
  private testMode = false

  // JWT token management (in-memory; re-authed on expiry or 401)
  private accessToken = ''
  private refreshToken = ''
  private tokenExpiresAt = 0
  // Guards against concurrent login storms
  private authPromise: Promise<string> | null = null

  constructor() {
    const config = getProviderConfig('paya')
    this.isActive = config?.isActive || false
    this.testMode = config?.testMode || false
    if (config) {
      this.apiKey = config.secretKey // PAYA_API_KEY maps to secretKey
      this.webhookSecret = config.webhookSecret
    }
    // Email/password auth as fallback (read directly from env, not in ProviderConfig)
    this.email = process.env.PAYA_EMAIL || ''
    this.password = process.env.PAYA_PASSWORD || ''
    // Allow override of API base URL (env wins over default; never falls back to testMode URL)
    this.baseUrl = (process.env.PAYA_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '')
  }

  /**
   * Returns true if the provider is properly configured (has credentials).
   * When false, methods return demo/mock responses, matching the behaviour of
   * the other providers when their keys are absent.
   */
  private isConfigured(): boolean {
    return !!(this.apiKey || (this.email && this.password))
  }

  /**
   * Ensures we have a valid JWT token. Uses the pre-issued API key if present,
   * otherwise authenticates (or re-authenticates) via /auth/login. Concurrent
   * callers share a single in-flight auth request.
   */
  private async ensureToken(): Promise<string> {
    // Valid cached token
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken
    }

    // Pre-issued API key — treat as non-expiring
    if (this.apiKey) {
      this.accessToken = this.apiKey
      this.tokenExpiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000
      return this.accessToken
    }

    // Authenticate with email/password (dedupe concurrent logins)
    if (this.email && this.password) {
      if (!this.authPromise) {
        this.authPromise = this.authenticate().finally(() => {
          this.authPromise = null
        })
      }
      return this.authPromise
    }

    throw new Error('Paya is not configured: set PAYA_API_KEY or PAYA_EMAIL + PAYA_PASSWORD')
  }

  /**
   * Authenticate with email/password to obtain a JWT token from /auth/login.
   */
  private async authenticate(): Promise<string> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.email, password: this.password }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.error(`[Paya] Auth failed (${res.status}): ${text}`)
        throw new Error(`Paya authentication failed: ${res.status}`)
      }

      const data: PayaTokenResponse = await res.json().catch(() => ({}))
      const token = data.token || data.access_token || ''

      if (!token) {
        throw new Error('Paya auth response did not contain a token')
      }

      this.accessToken = token
      this.refreshToken = data.refresh_token || ''
      // Default JWT TTL is ~1h; honour expires_in if present, otherwise refresh 5 min early
      const ttlMs = typeof data.expires_in === 'number' && data.expires_in > 0
        ? data.expires_in * 1000 - 5 * 60 * 1000
        : 55 * 60 * 1000
      this.tokenExpiresAt = Date.now() + Math.max(60_000, ttlMs)

      return this.accessToken
    } catch (error) {
      if (error instanceof Error && error.message.includes('not configured')) throw error
      console.error('[Paya] Authentication error:', error)
      throw new Error('Paya authentication failed')
    }
  }

  /**
   * Make an authenticated API request to Paya. Handles JSON parsing safely and
   * transparently re-authenticates once on 401 for email/password flows.
   */
  private async request<T = Record<string, unknown>>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    // Demo mode short-circuit
    if (!this.isConfigured()) {
      return this.demoResponse(method, path, body) as T
    }

    const url = `${this.baseUrl}${path}`
    const res = await this.doFetch(url, method, await this.ensureToken(), body)

    // If 401 and we use email/password (rotating JWT), re-auth once and retry
    if (res.status === 401 && this.email && this.password) {
      // Force re-auth by clearing the cached token
      this.accessToken = ''
      this.tokenExpiresAt = 0
      const newToken = await this.ensureToken()
      const retry = await this.doFetch(url, method, newToken, body)
      return this.parseJson<T>(retry)
    }

    return this.parseJson<T>(res)
  }

  private async doFetch(
    url: string,
    method: string,
    token: string,
    body?: Record<string, unknown>,
  ): Promise<Response> {
    const opts: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
    if (body !== undefined) opts.body = JSON.stringify(body)
    return fetch(url, opts)
  }

  private async parseJson<T>(res: Response): Promise<T> {
    const text = await res.text()
    if (!text) return {} as T
    try {
      return JSON.parse(text) as T
    } catch {
      // Non-JSON response (e.g. HTML error page) — surface the status
      throw new Error(`Paya request failed (${res.status}): ${text.slice(0, 200)}`)
    }
  }

  /**
   * Demo/mock responses when no API keys are configured. Mirrors the shape of
   * real Paya responses so the rest of the pipeline can run end-to-end.
   */
  private demoResponse(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Record<string, unknown> {
    if (process.env.PAYA_VERBOSE_DEMO !== 'false') {
      console.log(`[Paya Demo] ${method} ${path}`)
    }

    // Create deposit (initialize payment)
    if (path.includes('create_deposit')) {
      const reference = `paya_demo_${crypto.randomUUID().slice(0, 8)}`
      return {
        success: true,
        id: reference,
        reference,
        deposit_id: reference,
        status: 'pending',
        payment_url: 'https://getpaya.com/demo/checkout',
        checkout_url: 'https://getpaya.com/demo/checkout',
        amount: body?.amount,
        currency: body?.currency || 'NGN',
      }
    }

    // Open savings wallet
    if (path.includes('open-savings-wallet')) {
      return {
        id: 'demo_wallet_1',
        wallet_id: 'demo_wallet_1',
        balance: 0,
        currency: 'NGN',
        status: 'active',
      }
    }

    // Initiate withdrawal
    if (path.includes('initiate_withdrawal')) {
      return {
        status: 'otp_required',
        reference: `paya_wd_demo_${crypto.randomUUID().slice(0, 8)}`,
      }
    }

    // List wallets / wallet transactions
    if (path.match(/\/wallets\/[^/]+\/transactions/)) {
      return { data: [], transactions: [], status: 'success' }
    }
    if (path.includes('wallets')) {
      return {
        data: [
          { id: 'demo_wallet_1', wallet_id: 'demo_wallet_1', balance: 0, currency: 'NGN', status: 'active' },
        ],
        status: 'success',
      }
    }

    // User details
    if (path.includes('users')) {
      return { data: {}, status: 'success' }
    }

    return { status: 'success', message: 'Demo mode' }
  }

  /**
   * Initialize a payment via Paya.
   * Maps to POST /create_deposit (bank deposit into a Paya wallet).
   */
  async initialize(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    // Demo mode
    if (!this.isConfigured()) {
      return {
        success: true,
        providerPaymentId: `paya_demo_${input.reference}`,
        checkoutUrl: 'https://getpaya.com/demo/checkout',
      }
    }

    try {
      const amountDecimal = input.amount / 100 // Convert from smallest unit to decimal

      const payload: Record<string, unknown> = {
        amount: amountDecimal,
        currency: input.currency,
        reference: input.reference,
        email: input.email,
        callback_url: input.callbackUrl,
        redirect_url: input.redirectUrl,
        metadata: {
          reference: input.reference,
          provider: 'paya',
          referenceType: input.metadata?.referenceType || '',
          referenceId: input.metadata?.referenceId || '',
          payerName: [input.firstName, input.lastName].filter(Boolean).join(' ') || '',
          payerCountry: input.metadata?.payerCountry || '',
        },
      }

      const response = await this.request<PayaDepositResponse>('POST', '/create_deposit', payload)

      const depositId = String(response.id || response.deposit_id || response.reference || input.reference)
      const checkoutUrl = response.payment_url || response.checkout_url || response.authorization_url

      if (!checkoutUrl && !depositId) {
        return { success: false, providerPaymentId: input.reference }
      }

      return {
        success: true,
        providerPaymentId: depositId,
        ...(checkoutUrl ? { checkoutUrl } : {}),
      }
    } catch (error) {
      console.error('[Paya] Initialize error:', error)
      return { success: false, providerPaymentId: input.reference }
    }
  }

  /**
   * Verify a payment by scanning wallet transactions for the matching reference.
   * Paya does not expose a single GET /deposits/{id} endpoint in the public
   * docs, so we list wallets then look up the transaction in each wallet's
   * history. The first match wins.
   */
  async verify(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    // Demo mode — pretend the payment succeeded so end-to-end flows work
    if (!this.isConfigured()) {
      return {
        success: true,
        status: 'completed',
        amount: 0,
        currency: 'NGN',
        paidAt: new Date().toISOString(),
        providerPaymentId: input.providerPaymentId,
      }
    }

    try {
      const walletsResponse = await this.request<{ data?: PayaWalletResponse[] }>('GET', '/wallets')
      const wallets = walletsResponse.data || []

      for (const wallet of wallets) {
        const walletId = String(wallet.id || wallet.wallet_id || '')
        if (!walletId) continue

        try {
          const historyResponse = await this.request<{ transactions?: PayaTransaction[]; data?: PayaTransaction[] }>(
            'GET',
            `/wallets/${walletId}/transactions`,
          )
          const transactions = historyResponse.transactions || historyResponse.data || []

          const tx = transactions.find(
            (t) =>
              String(t.reference || t.id || '') === input.providerPaymentId ||
              String(t.deposit_id || '') === input.providerPaymentId,
          )

          if (tx) {
            const txStatus = String(tx.status || '').toLowerCase()
            const isCompleted = txStatus === 'completed' || txStatus === 'successful' || txStatus === 'paid'
            const isFailed = txStatus === 'failed' || txStatus === 'rejected' || txStatus === 'cancelled'

            return {
              success: isCompleted,
              status: isCompleted ? 'completed' : isFailed ? 'failed' : 'pending',
              amount: typeof tx.amount === 'number' ? Math.round(tx.amount * 100) : undefined,
              currency: String(tx.currency || wallet.currency || 'NGN').toUpperCase(),
              paidAt: isCompleted ? (tx.paid_at ? String(tx.paid_at) : tx.created_at ? String(tx.created_at) : new Date().toISOString()) : undefined,
              providerPaymentId: input.providerPaymentId,
            }
          }
        } catch {
          // Continue to next wallet on transient errors
          continue
        }
      }

      // Transaction not found in any wallet — treat as pending
      return {
        success: false,
        status: 'pending',
        providerPaymentId: input.providerPaymentId,
      }
    } catch (error) {
      console.error('[Paya] Verify error:', error)
      return { success: false, status: 'failed', providerPaymentId: input.providerPaymentId }
    }
  }

  /**
   * Validate the webhook signature from Paya.
   * Paya sends an HMAC-SHA256 signature in the `x-paya-signature` header.
   * In test mode with no secret configured we accept the payload (matches the
   * behaviour of the other providers).
   */
  validateWebhookSignature(payload: string, signature: string): boolean {
    const config = getProviderConfig('paya')
    if (!config?.webhookSecret) {
      return !!config?.testMode
    }
    if (!signature) return false
    try {
      const hash = crypto.createHmac('sha256', this.webhookSecret).update(payload).digest('hex')
      // Constant-time compare to prevent timing attacks
      if (hash.length !== signature.length) return false
      return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature))
    } catch {
      return false
    }
  }

  // ── Additional Paya-specific helpers ──────────────────────

  /**
   * Open a savings wallet for a user.
   */
  async openSavingsWallet(userId: string): Promise<PayaWalletResponse | null> {
    if (!this.isConfigured()) {
      console.log(`[Paya Demo] Opening savings wallet for user ${userId}`)
      return { id: 'demo_wallet_1', wallet_id: 'demo_wallet_1', balance: 0, currency: 'NGN', status: 'active' }
    }
    try {
      return await this.request<PayaWalletResponse>('POST', `/users/${userId}/open-savings-wallet`)
    } catch (error) {
      console.error('[Paya] Open savings wallet error:', error)
      return null
    }
  }

  /**
   * Initiate a withdrawal (requires OTP verification externally).
   */
  async initiateWithdrawal(params: {
    walletId: string
    amount: number
    currency?: string
    destination?: string
  }): Promise<Record<string, unknown> | null> {
    if (!this.isConfigured()) {
      console.log(`[Paya Demo] Initiating withdrawal from wallet ${params.walletId}`)
      return { status: 'otp_required', reference: `paya_wd_demo_${crypto.randomUUID().slice(0, 8)}` }
    }
    try {
      return await this.request('POST', `/wallets/${params.walletId}/initiate_withdrawal`, {
        amount: params.amount,
        currency: params.currency || 'NGN',
        destination: params.destination,
      })
    } catch (error) {
      console.error('[Paya] Initiate withdrawal error:', error)
      return null
    }
  }

  /**
   * List all wallets for the authenticated user.
   */
  async listWallets(): Promise<PayaWalletResponse[]> {
    if (!this.isConfigured()) return []
    try {
      const response = await this.request<{ data?: PayaWalletResponse[] }>('GET', '/wallets')
      return response.data || []
    } catch {
      return []
    }
  }

  /**
   * Get user details.
   */
  async getUserDetails(userId: string): Promise<Record<string, unknown> | null> {
    if (!this.isConfigured()) return null
    try {
      return await this.request('GET', `/users/${userId}`)
    } catch {
      return null
    }
  }

  /**
   * Upload a KYC document for a user.
   */
  async uploadDocument(
    userId: string,
    documentType: string,
    file: File | Blob,
  ): Promise<Record<string, unknown> | null> {
    if (!this.isConfigured()) return null
    try {
      const token = await this.ensureToken()
      const formData = new FormData()
      formData.append('document_type', documentType)
      formData.append('file', file)

      const res = await fetch(`${this.baseUrl}/users/${userId}/upload-document`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      return res.json()
    } catch (error) {
      console.error('[Paya] Upload document error:', error)
      return null
    }
  }

  // ── PaymentProvider interface methods ──────────────────────

  getSupportedMethods() {
    return getProviderConfig('paya')?.supportedMethods || []
  }

  getSupportedCurrencies() {
    return getProviderConfig('paya')?.supportedCurrencies || []
  }

  getSupportedCountries() {
    return getProviderConfig('paya')?.supportedCountries || []
  }
}
