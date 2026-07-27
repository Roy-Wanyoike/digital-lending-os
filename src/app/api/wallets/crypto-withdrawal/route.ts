import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'
import { getApiUser, AuthError } from '@/lib/auth/api-helpers'

const cryptoWithdrawalSchema = z.object({
  walletId: z.string().min(1, 'Wallet ID is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  cryptoCurrency: z.enum(['USDT', 'USDC', 'BTC', 'ETH', 'SOL', 'BNB']),
  network: z.enum(['trc20', 'erc20', 'bsc', 'solana', 'bitcoin', 'bep2']),
  walletAddress: z.string().min(10, 'Wallet address is required'),
  notes: z.string().optional(),
})

// Supported network per crypto
const CRYPTO_NETWORKS: Record<string, string[]> = {
  USDT: ['trc20', 'erc20', 'bsc', 'solana'],
  USDC: ['trc20', 'erc20', 'bsc', 'solana'],
  BTC: ['bitcoin'],
  ETH: ['erc20'],
  SOL: ['solana'],
  BNB: ['bsc', 'bep2'],
}

// Approximate fiat-to-crypto rates for demo
const CRYPTO_PRICES_USD: Record<string, number> = {
  USDT: 1.0,
  USDC: 1.0,
  BTC: 67500,
  ETH: 3450,
  SOL: 172,
  BNB: 580,
}

// Network fees in crypto
const NETWORK_FEES: Record<string, number> = {
  trc20: 1.0,      // USDT TRC20 fee ~1 USDT
  erc20: 2.5,      // USDT/USDC ERC20 fee ~$2.5
  bsc: 0.1,        // BSC fee ~$0.10
  solana: 0.00025, // SOL fee ~0.00025 SOL
  bitcoin: 0.0001, // BTC fee ~$6.75 worth
  bep2: 0.0005,   // BNB BEP2 fee ~0.0005 BNB
}

// Fiat per USD conversion rates
const FIAT_TO_USD: Record<string, number> = {
  USD: 1, EUR: 1.087, GBP: 1.267, NGN: 0.000645, KES: 0.00652,
  GHS: 0.0658, UGX: 0.000267, TZS: 0.000377, ZAR: 0.0549,
  JPY: 0.00669, CNY: 0.138, INR: 0.01198, BRL: 0.20,
  CAD: 0.73, AUD: 0.653, CHF: 1.136, AED: 0.272, SGD: 0.746,
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    const body = await request.json()
    const parsed = cryptoWithdrawalSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Validate network for crypto
    const validNetworks = CRYPTO_NETWORKS[data.cryptoCurrency]
    if (!validNetworks.includes(data.network)) {
      return NextResponse.json(
        { error: `Invalid network ${data.network} for ${data.cryptoCurrency}. Valid: ${validNetworks.join(', ')}` },
        { status: 400 }
      )
    }

    // Basic wallet address validation per network
    const addr = data.walletAddress.trim()
    if (data.network === 'bitcoin' && !addr.startsWith('1') && !addr.startsWith('3') && !addr.startsWith('bc1')) {
      return NextResponse.json({ error: 'Invalid Bitcoin address format' }, { status: 400 })
    }
    if (data.network === 'erc20' && !addr.startsWith('0x')) {
      return NextResponse.json({ error: 'Invalid ERC20 address — must start with 0x' }, { status: 400 })
    }
    if (data.network === 'solana' && (addr.length < 32 || addr.length > 44)) {
      return NextResponse.json({ error: 'Invalid Solana address length' }, { status: 400 })
    }

    const wallet = await db.wallet.findUnique({ where: { id: data.walletId } })
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }
    const biz = await db.business.findUnique({ where: { id: wallet.businessId }, select: { tenantId: true } })
    if (!biz || biz.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }
    if (wallet.status !== 'active') {
      return NextResponse.json({ error: 'Wallet is not active' }, { status: 400 })
    }
    if (wallet.availableBalance < data.amount) {
      return NextResponse.json({ error: 'Insufficient available balance' }, { status: 400 })
    }

    // Calculate crypto amount
    const fiatToUsd = FIAT_TO_USD[wallet.currency] || 1
    const amountInUsd = data.amount * fiatToUsd
    const cryptoPrice = CRYPTO_PRICES_USD[data.cryptoCurrency]
    const cryptoAmount = amountInUsd / cryptoPrice
    const networkFee = NETWORK_FEES[data.network]
    const netCryptoAmount = Math.max(0, cryptoAmount - networkFee)
    const processingFee = Math.max(data.amount * 0.01, 1.0) // 1% min $1
    const withdrawalRef = `CRW-${randomUUID().slice(0, 8).toUpperCase()}`

    // Demo: auto-complete
    const isAutoComplete = true

    const cryptoWdr = await db.$transaction(async (tx) => {
      const cw = await tx.cryptoWithdrawal.create({
        data: {
          withdrawalRef,
          walletId: data.walletId,
          amount: data.amount,
          cryptoAmount: Math.round(netCryptoAmount * 1000000) / 1000000,
          currency: wallet.currency,
          cryptoCurrency: data.cryptoCurrency,
          network: data.network,
          walletAddress: data.walletAddress,
          status: isAutoComplete ? 'completed' : 'pending',
          exchangeRate: cryptoPrice,
          networkFee,
          processingFee,
          txHash: isAutoComplete ? `0x${randomUUID().replace(/-/g, '').slice(0, 64)}` : null,
          notes: data.notes || null,
          completedAt: isAutoComplete ? new Date() : null,
        },
      })

      if (isAutoComplete) {
        const totalDebit = data.amount + processingFee
        const balanceBefore = wallet.balance
        const balanceAfter = Math.round((balanceBefore - totalDebit) * 100) / 100
        const availBefore = wallet.availableBalance
        const availAfter = Math.round((availBefore - totalDebit) * 100) / 100

        // Main withdrawal transaction
        await tx.walletTransaction.create({
          data: {
            walletId: data.walletId,
            txRef: `WTX-${randomUUID().slice(0, 8).toUpperCase()}`,
            type: 'crypto_withdrawal',
            amount: data.amount,
            balanceBefore,
            balanceAfter: Math.round((balanceBefore - data.amount) * 100) / 100,
            currency: wallet.currency,
            description: `Crypto withdrawal: ${netCryptoAmount.toFixed(6)} ${data.cryptoCurrency} (${data.network}) → ${data.walletAddress.slice(0, 10)}...${data.walletAddress.slice(-6)}`,
            referenceType: 'crypto_withdrawal',
            referenceId: cw.id,
            status: 'completed',
          },
        })

        // Processing fee transaction
        if (processingFee > 0) {
          await tx.walletTransaction.create({
            data: {
              walletId: data.walletId,
              txRef: `WTX-${randomUUID().slice(0, 8).toUpperCase()}`,
              type: 'fee',
              amount: processingFee,
              balanceBefore: Math.round((balanceBefore - data.amount) * 100) / 100,
              balanceAfter,
              currency: wallet.currency,
              description: `Crypto withdrawal processing fee (${withdrawalRef})`,
              referenceType: 'crypto_withdrawal',
              referenceId: cw.id,
              status: 'completed',
            },
          })
        }

        await tx.wallet.update({
          where: { id: data.walletId },
          data: { balance: balanceAfter, availableBalance: availAfter },
        })
      }

      return cw
    })

    return NextResponse.json({ data: cryptoWdr }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create crypto withdrawal'
    if (message.includes('Insufficient') || message.includes('not found') || message.includes('not active') || message.includes('Invalid')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Error creating crypto withdrawal:', error)
    return NextResponse.json({ error: 'Failed to create crypto withdrawal' }, { status: 500 })
  }
}

// GET /api/wallets/crypto-withdrawal?walletId=xxx
export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    const { searchParams } = new URL(request.url)
    const walletId = searchParams.get('walletId')
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

    if (!walletId) {
      return NextResponse.json({ error: 'walletId is required' }, { status: 400 })
    }

    const wallet = await db.wallet.findUnique({ where: { id: walletId } })
    if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    const biz = await db.business.findUnique({ where: { id: wallet.businessId }, select: { tenantId: true } })
    if (!biz || biz.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    const records = await db.cryptoWithdrawal.findMany({
      where: { walletId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ data: records })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Error listing crypto withdrawals:', error)
    return NextResponse.json({ error: 'Failed to list crypto withdrawals' }, { status: 500 })
  }
}
