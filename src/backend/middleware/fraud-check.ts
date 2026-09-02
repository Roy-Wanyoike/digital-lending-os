/**
 * Fraud Check Middleware — Can be called from payment/escrow routes.
 *
 * Evaluates the transaction against active fraud rules.
 * If blocked, callers should return a 403 with details.
 */

import { evaluateTransaction, type FraudEvaluationResult } from '@/backend/lib/fraud/evaluator'

export interface FraudCheckParams {
  tenantId: string
  businessId: string
  amount: number
  currency: string
  country?: string
  transactionType: string
}

/**
 * Evaluate a transaction for fraud.
 *
 * Usage in route handlers:
 * ```ts
 * const fraudResult = await evaluateTransactionForFraud({
 *   tenantId: user.tenantId,
 *   businessId: data.fromBusinessId,
 *   amount: data.sourceAmount,
 *   currency: data.sourceCurrency,
 *   transactionType: 'payment_intent',
 * })
 * if (!fraudResult.allowed) {
 *   return forbidden(`Transaction blocked: ${fraudResult.blockedBy}`)
 * }
 * ```
 */
export async function evaluateTransactionForFraud(
  params: FraudCheckParams,
): Promise<FraudEvaluationResult> {
  return evaluateTransaction({
    tenantId: params.tenantId,
    businessId: params.businessId,
    amount: params.amount,
    currency: params.currency,
    country: params.country,
    transactionType: params.transactionType,
  })
}
