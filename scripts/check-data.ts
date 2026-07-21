import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

const TABLES = [
  'Business', 'BusinessMatch', 'BusinessRelationship', 'CollectionCase',
  'CollectionReminder', 'CommercePassport', 'ComplianceDocument', 'ComplianceRule',
  'ComplianceScreening', 'CurrencyRate', 'Disbursement', 'Dispute',
  'EscrowAuditLog', 'EscrowMilestone', 'EscrowTransaction', 'FinancialDigitalTwin',
  'FinancialMetric', 'FinancialPrediction', 'FinancialSnapshot', 'FraudAlert',
  'FraudRule', 'GlobalPaymentMethod', 'Invoice', 'PaymentIntent',
  'PaymentLink', 'PaymentLinkPayment', 'PaymentMethod', 'PaymentTransaction',
  'ReputationEvent', 'Review', 'TrustScore', 'User', 'Verification',
  'Wallet', 'WalletTransaction',
]

async function main() {
  for (const t of TABLES) {
    const model = db[t.charAt(0).toLowerCase() + t.slice(1) as keyof typeof db] as any
    if (model && model.count) {
      const count = await model.count()
      console.log(`${t}: ${count}`)
    } else {
      console.log(`${t}: (model not found)`)
    }
  }
  await db.$disconnect()
}
main().catch(() => process.exit(1))