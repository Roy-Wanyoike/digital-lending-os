/**
 * Fraud module — auto-block enforcement engine.
 */

export {
  evaluateTransaction,
  evaluateCondition,
  fetchActiveRules,
} from './evaluator'

export type {
  FraudTransactionContext,
  FraudCondition,
  FraudRuleRow,
  FraudEvaluationResult,
} from './evaluator'
