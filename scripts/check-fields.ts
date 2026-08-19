import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const fr = await db.fraudRule.findFirst()
  console.log('=== FraudRule ===')
  console.log(JSON.stringify(fr, null, 2))

  const gm = await db.globalPaymentMethod.findFirst()
  console.log('=== GlobalPaymentMethod ===')
  console.log(JSON.stringify(gm, null, 2))

  const w = await db.wallet.findFirst()
  console.log('=== Wallet ===')
  console.log(JSON.stringify(w, null, 2))

  const w2 = await db.wallet.findMany({ take: 3, select: { id: true, businessId: true, currency: true } })
  console.log('=== First 3 Wallets ===')
  console.log(JSON.stringify(w2, null, 2))

  await db.$disconnect()
}
main()