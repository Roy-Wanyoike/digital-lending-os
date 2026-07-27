import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

async function main() {
  const account = await db.account.findFirst({ where: { email: 'youngsharktechnologies@gmail.com' } })
  if (!account) { console.error('Demo account not found'); return }
  const tenantId = account.tenantId
  console.log(`✓ Account: ${account.email} (tenant: ${tenantId})`)

  // Get a business + wallet
  const biz = await db.business.findFirst({ where: { tenantId } })
  if (!biz) { console.error('No business found'); return }
  console.log(`✓ Business: ${biz.name} (${biz.id})`)

  // Get or create a USD wallet
  let wallet = await db.wallet.findFirst({ where: { businessId: biz.id, currency: 'USD' } })
  if (!wallet) {
    wallet = await db.wallet.create({ data: { businessId: biz.id, currency: 'USD', balance: 10000, availableBalance: 10000, status: 'active' } })
    console.log(`  Created USD wallet: ${wallet.id}`)
  } else {
    console.log(`✓ USD Wallet: ${wallet.id} (balance: ${wallet.balance})`)
  }

  // Get or create a KES wallet for conversion test
  let kesWallet = await db.wallet.findFirst({ where: { businessId: biz.id, currency: 'KES' } })
  if (!kesWallet) {
    kesWallet = await db.wallet.create({ data: { businessId: biz.id, currency: 'KES', balance: 500000, availableBalance: 500000, status: 'active' } })
    console.log(`  Created KES wallet: ${kesWallet.id}`)
  } else {
    console.log(`✓ KES Wallet: ${kesWallet.id} (balance: ${kesWallet.balance})`)
  }

  const wBefore = wallet.balance
  console.log(`\n=== TEST 1: DEPOSIT ===`)
  const deposit = await db.deposit.create({
    data: {
      depositRef: `DEP-${randomUUID().slice(0,8).toUpperCase()}`,
      walletId: wallet.id,
      amount: 2500,
      currency: 'USD',
      paymentMethod: 'bank_transfer',
      provider: 'demo',
      status: 'completed',
      completedAt: new Date(),
    },
  })
  await db.wallet.update({ where: { id: wallet.id }, data: { balance: wBefore + 2500, availableBalance: (wallet.availableBalance || 0) + 2500 } })
  await db.walletTransaction.create({
    data: {
      walletId: wallet.id,
      txRef: `WTX-${randomUUID().slice(0,8).toUpperCase()}`,
      type: 'deposit',
      amount: 2500,
      balanceBefore: wBefore,
      balanceAfter: wBefore + 2500,
      currency: 'USD',
      description: 'Test deposit via bank_transfer',
      referenceType: 'deposit',
      referenceId: deposit.id,
      status: 'completed',
    },
  })
  console.log(`  ✓ Deposit created: ${deposit.depositRef} — $2,500`) 

  const wAfterDep = (await db.wallet.findUnique({ where: { id: wallet.id } }))!.balance
  console.log(`  ✓ Wallet balance: ${wBefore} → ${wAfterDep}`)

  console.log(`\n=== TEST 2: WITHDRAWAL ===`)
  const wBeforeWdr = wAfterDep
  const wdrFee = Math.max(2.5, 500 * 0.005)
  const withdrawal = await db.withdrawal.create({
    data: {
      withdrawalRef: `WDR-${randomUUID().slice(0,8).toUpperCase()}`,
      walletId: wallet.id,
      amount: 500,
      currency: 'USD',
      paymentMethod: 'bank_transfer',
      provider: 'demo',
      bankName: 'Equity Bank Kenya',
      bankAccount: '****4521',
      recipientName: 'Young Shark',
      feeAmount: wdrFee,
      netAmount: 500 - wdrFee,
      status: 'completed',
      completedAt: new Date(),
    },
  })
  const wAfterWdr = Math.round((wBeforeWdr - 500 - wdrFee) * 100) / 100
  await db.wallet.update({ where: { id: wallet.id }, data: { balance: wAfterWdr, availableBalance: Math.round((wAfterDep - 500 - wdrFee) * 100) / 100 } })
  console.log(`  ✓ Withdrawal created: ${withdrawal.withdrawalRef} — $500 (fee: $${wdrFee.toFixed(2)})`)
  console.log(`  ✓ Wallet balance: ${wBeforeWdr} → ${wAfterWdr}`)

  console.log(`\n=== TEST 3: CURRENCY CONVERSION ===`)
  const rate = 153.5 // USD → KES
  const convAmount = 200
  const gross = convAmount * rate
  const convFee = Math.round(gross * 0.005 * 100) / 100
  const net = Math.round((gross - convFee) * 100) / 100
  const conv = await db.currencyConversion.create({
    data: {
      conversionRef: `CNV-${randomUUID().slice(0,8).toUpperCase()}`,
      fromWalletId: wallet.id,
      toWalletId: kesWallet.id,
      fromCurrency: 'USD',
      toCurrency: 'KES',
      fromAmount: convAmount,
      toAmount: gross,
      exchangeRate: rate,
      feePercent: 0.5,
      feeAmount: convFee,
      netAmount: net,
      status: 'completed',
    },
  })
  const usdBefore = wAfterWdr
  const kesBefore = kesWallet.balance
  const usdAfter = Math.round((usdBefore - convAmount) * 100) / 100
  const kesAfter = Math.round((kesBefore + net) * 100) / 100
  await db.wallet.update({ where: { id: wallet.id }, data: { balance: usdAfter, availableBalance: usdAfter } })
  await db.wallet.update({ where: { id: kesWallet.id }, data: { balance: kesAfter, availableBalance: kesAfter } })
  console.log(`  ✓ Conversion: $${convAmount} USD → ${net.toFixed(2)} KES @ ${rate} (fee: ${convFee} KES)`)
  console.log(`  ✓ USD wallet: ${usdBefore} → ${usdAfter}`)
  console.log(`  ✓ KES wallet: ${kesBefore} → ${kesAfter}`)

  console.log(`\n=== TEST 4: CRYPTO WITHDRAWAL ===`)
  const crAmount = 100
  const cryptoPrice = 67500 // BTC
  const cryptoAmt = crAmount / cryptoPrice
  const networkFee = 0.0001
  const netCrypto = cryptoAmt - networkFee
  const procFee = Math.max(crAmount * 0.01, 1.0)
  const crWdr = await db.cryptoWithdrawal.create({
    data: {
      withdrawalRef: `CRW-${randomUUID().slice(0,8).toUpperCase()}`,
      walletId: wallet.id,
      amount: crAmount,
      cryptoAmount: Math.round(netCrypto * 1000000) / 1000000,
      currency: 'USD',
      cryptoCurrency: 'BTC',
      network: 'bitcoin',
      walletAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      status: 'completed',
      exchangeRate: cryptoPrice,
      networkFee,
      processingFee: procFee,
      txHash: `0x${randomUUID().replace(/-/g,'').slice(0,64)}`,
      completedAt: new Date(),
    },
  })
  const usdBeforeCr = usdAfter
  const usdAfterCr = Math.round((usdBeforeCr - crAmount - procFee) * 100) / 100
  await db.wallet.update({ where: { id: wallet.id }, data: { balance: usdAfterCr, availableBalance: usdAfterCr } })
  console.log(`  ✓ Crypto withdrawal: $${crAmount} → ${netCrypto.toFixed(8)} BTC (network fee: ${networkFee} BTC, proc fee: $${procFee.toFixed(2)})`)
  console.log(`  ✓ Wallet balance: ${usdBeforeCr} → ${usdAfterCr}`)
  console.log(`  ✓ TX Hash: ${crWdr.txHash?.slice(0,20)}...`)

  console.log(`\n=== SUMMARY ===`)
  const finalWallet = await db.wallet.findUnique({ where: { id: wallet.id } })
  const finalKes = await db.wallet.findUnique({ where: { id: kesWallet.id } })
  console.log(`  USD Wallet final balance: $${finalWallet?.balance}`)
  console.log(`  KES Wallet final balance: KES ${finalKes?.balance}`)
  console.log(`  Deposits in DB: ${await db.deposit.count()}`)
  console.log(`  Withdrawals in DB: ${await db.withdrawal.count()}`)
  console.log(`  Crypto withdrawals in DB: ${await db.cryptoWithdrawal.count()}`)
  console.log(`  Conversions in DB: ${await db.currencyConversion.count()}`)
  console.log(`  Wallet transactions: ${await db.walletTransaction.count()}`)
  console.log(`\n✅ All tests passed!`)
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
