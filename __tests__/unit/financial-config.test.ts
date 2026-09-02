import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('financial-config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    // Remove financial config env vars so we test defaults
    delete process.env.REFERRAL_BONUS_AMOUNT
    delete process.env.REFERRAL_BONUS_CURRENCY
    delete process.env.WITHDRAWAL_FLAT_FEE
    delete process.env.WITHDRAWAL_PERCENT_FEE
    delete process.env.CONVERSION_FEE_PERCENT
    delete process.env.CRYPTO_WITHDRAWAL_FEE_PERCENT
    delete process.env.CRYPTO_WITHDRAWAL_MIN_FEE
    delete process.env.DEFAULT_FIAT_RATES
    delete process.env.DEFAULT_FIAT_TO_USD
    delete process.env.DEFAULT_CRYPTO_PRICES_USD
    delete process.env.DEFAULT_NETWORK_FEES
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('default values', () => {
    it('REFERRAL_BONUS_AMOUNT defaults to 100', async () => {
      const config = await import('@/backend/config/financial-config')
      expect(config.REFERRAL_BONUS_AMOUNT).toBe(100)
    })

    it('REFERRAL_BONUS_CURRENCY defaults to USD', async () => {
      const config = await import('@/backend/config/financial-config')
      expect(config.REFERRAL_BONUS_CURRENCY).toBe('USD')
    })

    it('WITHDRAWAL_FLAT_FEE defaults to 2.5', async () => {
      const config = await import('@/backend/config/financial-config')
      expect(config.WITHDRAWAL_FLAT_FEE).toBe(2.5)
    })

    it('WITHDRAWAL_PERCENT_FEE defaults to 0.5', async () => {
      const config = await import('@/backend/config/financial-config')
      expect(config.WITHDRAWAL_PERCENT_FEE).toBe(0.5)
    })

    it('CONVERSION_FEE_PERCENT defaults to 0.5', async () => {
      const config = await import('@/backend/config/financial-config')
      expect(config.CONVERSION_FEE_PERCENT).toBe(0.5)
    })

    it('CRYPTO_WITHDRAWAL_FEE_PERCENT defaults to 1.0', async () => {
      const config = await import('@/backend/config/financial-config')
      expect(config.CRYPTO_WITHDRAWAL_FEE_PERCENT).toBe(1.0)
    })

    it('CRYPTO_WITHDRAWAL_MIN_FEE defaults to 1.0', async () => {
      const config = await import('@/backend/config/financial-config')
      expect(config.CRYPTO_WITHDRAWAL_MIN_FEE).toBe(1.0)
    })
  })

  describe('env var overrides', () => {
    it('REFERRAL_BONUS_AMOUNT can be overridden via env', async () => {
      process.env.REFERRAL_BONUS_AMOUNT = '250'
      const config = await import('@/backend/config/financial-config')
      expect(config.REFERRAL_BONUS_AMOUNT).toBe(250)
    })

    it('REFERRAL_BONUS_CURRENCY can be overridden via env', async () => {
      process.env.REFERRAL_BONUS_CURRENCY = 'NGN'
      const config = await import('@/backend/config/financial-config')
      expect(config.REFERRAL_BONUS_CURRENCY).toBe('NGN')
    })

    it('WITHDRAWAL_FLAT_FEE can be overridden via env', async () => {
      process.env.WITHDRAWAL_FLAT_FEE = '5.0'
      const config = await import('@/backend/config/financial-config')
      expect(config.WITHDRAWAL_FLAT_FEE).toBe(5.0)
    })

    it('WITHDRAWAL_PERCENT_FEE can be overridden via env', async () => {
      process.env.WITHDRAWAL_PERCENT_FEE = '1.5'
      const config = await import('@/backend/config/financial-config')
      expect(config.WITHDRAWAL_PERCENT_FEE).toBe(1.5)
    })

    it('CONVERSION_FEE_PERCENT can be overridden via env', async () => {
      process.env.CONVERSION_FEE_PERCENT = '0.75'
      const config = await import('@/backend/config/financial-config')
      expect(config.CONVERSION_FEE_PERCENT).toBe(0.75)
    })

    it('CRYPTO_WITHDRAWAL_FEE_PERCENT can be overridden via env', async () => {
      process.env.CRYPTO_WITHDRAWAL_FEE_PERCENT = '2.0'
      const config = await import('@/backend/config/financial-config')
      expect(config.CRYPTO_WITHDRAWAL_FEE_PERCENT).toBe(2.0)
    })

    it('CRYPTO_WITHDRAWAL_MIN_FEE can be overridden via env', async () => {
      process.env.CRYPTO_WITHDRAWAL_MIN_FEE = '5.0'
      const config = await import('@/backend/config/financial-config')
      expect(config.CRYPTO_WITHDRAWAL_MIN_FEE).toBe(5.0)
    })
  })

  describe('rate tables', () => {
    it('DEFAULT_FIAT_RATES contains expected base currencies', async () => {
      const config = await import('@/backend/config/financial-config')
      expect(config.DEFAULT_FIAT_RATES).toHaveProperty('USD')
      expect(config.DEFAULT_FIAT_RATES).toHaveProperty('EUR')
      expect(config.DEFAULT_FIAT_RATES).toHaveProperty('GBP')
      expect(config.DEFAULT_FIAT_RATES).toHaveProperty('NGN')
      expect(config.DEFAULT_FIAT_RATES).toHaveProperty('KES')
    })

    it('DEFAULT_FIAT_RATES rates are positive numbers', async () => {
      const config = await import('@/backend/config/financial-config')
      for (const [base, quotes] of Object.entries(config.DEFAULT_FIAT_RATES)) {
        for (const [quote, rate] of Object.entries(quotes)) {
          expect(rate, `${base}->${quote} rate should be positive`).toBeGreaterThan(0)
          expect(typeof rate).toBe('number')
        }
      }
    })

    it('DEFAULT_FIAT_TO_USD contains USD with rate 1', async () => {
      const config = await import('@/backend/config/financial-config')
      expect(config.DEFAULT_FIAT_TO_USD.USD).toBe(1)
    })

    it('DEFAULT_FIAT_TO_USD rates are positive numbers', async () => {
      const config = await import('@/backend/config/financial-config')
      for (const [currency, rate] of Object.entries(config.DEFAULT_FIAT_TO_USD)) {
        expect(rate, `${currency} rate should be positive`).toBeGreaterThan(0)
        expect(typeof rate).toBe('number')
      }
    })

    it('DEFAULT_CRYPTO_PRICES_USD contains expected cryptos', async () => {
      const config = await import('@/backend/config/financial-config')
      expect(config.DEFAULT_CRYPTO_PRICES_USD).toHaveProperty('USDT')
      expect(config.DEFAULT_CRYPTO_PRICES_USD).toHaveProperty('USDC')
      expect(config.DEFAULT_CRYPTO_PRICES_USD).toHaveProperty('BTC')
      expect(config.DEFAULT_CRYPTO_PRICES_USD).toHaveProperty('ETH')
      expect(config.DEFAULT_CRYPTO_PRICES_USD).toHaveProperty('SOL')
      expect(config.DEFAULT_CRYPTO_PRICES_USD).toHaveProperty('BNB')
    })

    it('DEFAULT_CRYPTO_PRICES_USD stablecoins are 1.0', async () => {
      const config = await import('@/backend/config/financial-config')
      expect(config.DEFAULT_CRYPTO_PRICES_USD.USDT).toBe(1.0)
      expect(config.DEFAULT_CRYPTO_PRICES_USD.USDC).toBe(1.0)
    })

    it('DEFAULT_NETWORK_FEES contains expected networks', async () => {
      const config = await import('@/backend/config/financial-config')
      expect(config.DEFAULT_NETWORK_FEES).toHaveProperty('trc20')
      expect(config.DEFAULT_NETWORK_FEES).toHaveProperty('erc20')
      expect(config.DEFAULT_NETWORK_FEES).toHaveProperty('bsc')
      expect(config.DEFAULT_NETWORK_FEES).toHaveProperty('solana')
      expect(config.DEFAULT_NETWORK_FEES).toHaveProperty('bitcoin')
      expect(config.DEFAULT_NETWORK_FEES).toHaveProperty('bep2')
    })

    it('DEFAULT_NETWORK_FEES are positive numbers', async () => {
      const config = await import('@/backend/config/financial-config')
      for (const [network, fee] of Object.entries(config.DEFAULT_NETWORK_FEES)) {
        expect(fee, `${network} fee should be positive`).toBeGreaterThan(0)
        expect(typeof fee).toBe('number')
      }
    })
  })

  describe('CRYPTO_NETWORKS', () => {
    it('contains all expected crypto currencies', async () => {
      const config = await import('@/backend/config/financial-config')
      expect(config.CRYPTO_NETWORKS).toHaveProperty('USDT')
      expect(config.CRYPTO_NETWORKS).toHaveProperty('USDC')
      expect(config.CRYPTO_NETWORKS).toHaveProperty('BTC')
      expect(config.CRYPTO_NETWORKS).toHaveProperty('ETH')
      expect(config.CRYPTO_NETWORKS).toHaveProperty('SOL')
      expect(config.CRYPTO_NETWORKS).toHaveProperty('BNB')
    })

    it('BTC only supports bitcoin network', async () => {
      const config = await import('@/backend/config/financial-config')
      expect(config.CRYPTO_NETWORKS.BTC).toEqual(['bitcoin'])
    })

    it('ETH only supports erc20 network', async () => {
      const config = await import('@/backend/config/financial-config')
      expect(config.CRYPTO_NETWORKS.ETH).toEqual(['erc20'])
    })

    it('SOL only supports solana network', async () => {
      const config = await import('@/backend/config/financial-config')
      expect(config.CRYPTO_NETWORKS.SOL).toEqual(['solana'])
    })

    it('USDT and USDC support the same networks', async () => {
      const config = await import('@/backend/config/financial-config')
      expect(config.CRYPTO_NETWORKS.USDT).toEqual(config.CRYPTO_NETWORKS.USDC)
      expect(config.CRYPTO_NETWORKS.USDT).toEqual(['trc20', 'erc20', 'bsc', 'solana'])
    })

    it('BNB supports bsc and bep2', async () => {
      const config = await import('@/backend/config/financial-config')
      expect(config.CRYPTO_NETWORKS.BNB).toEqual(['bsc', 'bep2'])
    })

    it('each crypto has at least one network', async () => {
      const config = await import('@/backend/config/financial-config')
      for (const [crypto, networks] of Object.entries(config.CRYPTO_NETWORKS)) {
        expect(Array.isArray(networks), `${crypto} should have an array of networks`).toBe(true)
        expect(networks.length, `${crypto} should have at least one network`).toBeGreaterThan(0)
      }
    })
  })

  describe('JSON env var overrides for rate tables', () => {
    it('DEFAULT_FIAT_RATES can be overridden via JSON env', async () => {
      process.env.DEFAULT_FIAT_RATES = JSON.stringify({ TEST: { USD: 2.0 } })
      const config = await import('@/backend/config/financial-config')
      expect(config.DEFAULT_FIAT_RATES).toEqual({ TEST: { USD: 2.0 } })
    })

    it('DEFAULT_CRYPTO_PRICES_USD can be overridden via JSON env', async () => {
      process.env.DEFAULT_CRYPTO_PRICES_USD = JSON.stringify({ BTC: 99999 })
      const config = await import('@/backend/config/financial-config')
      expect(config.DEFAULT_CRYPTO_PRICES_USD).toEqual({ BTC: 99999 })
    })

    it('DEFAULT_NETWORK_FEES can be overridden via JSON env', async () => {
      process.env.DEFAULT_NETWORK_FEES = JSON.stringify({ trc20: 5.0 })
      const config = await import('@/backend/config/financial-config')
      expect(config.DEFAULT_NETWORK_FEES).toEqual({ trc20: 5.0 })
    })

    it('DEFAULT_FIAT_TO_USD can be overridden via JSON env', async () => {
      process.env.DEFAULT_FIAT_TO_USD = JSON.stringify({ USD: 1, EUR: 2.0 })
      const config = await import('@/backend/config/financial-config')
      expect(config.DEFAULT_FIAT_TO_USD).toEqual({ USD: 1, EUR: 2.0 })
    })
  })
})
