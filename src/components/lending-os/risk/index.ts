// Credit & Risk Management Module Components
// Digital Lending OS - Kenyan DCP Platform

// Main Dashboard
export { RiskDashboard } from './RiskDashboard'
export type { RiskKPI, RiskGradeData, RiskAlert } from './RiskDashboard'

// Credit Scoring
export { CreditScoringEngine } from './CreditScoringEngine'
export type { ScoreFactor, CreditApplicant, CreditAssessment } from './CreditScoringEngine'

// Eligibility Rules
export { EligibilityRulesEditor } from './EligibilityRulesEditor'
export type { EligibilityRule } from './EligibilityRulesEditor'

// Affordability Calculator
export { AffordabilityCalculator } from './AffordabilityCalculator'
export type { AffordabilityInput, AffordabilityResult } from './AffordabilityCalculator'

// Blacklist Manager
export { BlacklistManager } from './BlacklistManager'
export type { BlacklistedEntity } from './BlacklistManager'

// Fraud Detection
export { FraudDetectionPanel } from './FraudDetectionPanel'
export type { FraudAlert } from './FraudDetectionPanel'

// Credit Policy Viewer
export { CreditPolicyViewer } from './CreditPolicyViewer'
export type { CreditPolicy, PolicySection } from './CreditPolicyViewer'
