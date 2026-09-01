/**
 * RoyAI - AI-Powered Assistant Types
 * @module roycss/ai/types
 * @description Type definitions for the RoyAI assistant system
 */

/** AI Chat message role */
export type AIRole = 'system' | 'user' | 'assistant';

/** AI Chat message interface */
export interface AIMessage {
  id: string;
  role: AIRole;
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/** AI Request types */
export type AIRequestType = 
  | 'generate-css'
  | 'explain-css'
  | 'suggest-improvements'
  | 'accessibility-audit'
  | 'design-to-code'
  | 'css-to-tailwind'
  | 'general-chat';

/** AI Generation options */
export interface AIGenerationOptions {
  /** Target framework (css, tailwind, styled-components, etc.) */
  targetFramework?: 'css' | 'tailwind' | 'styled-components' | 'css-modules' | 'inline';
  /** Include vendor prefixes */
  includePrefixes?: boolean;
  /** Output format */
  outputFormat?: 'code' | 'json' | 'markdown';
  /** Complexity level */
  complexity?: 'simple' | 'intermediate' | 'advanced';
  /** Accessibility level */
  accessibilityLevel?: 'aa' | 'aaa' | 'none';
  /** Animation support */
  animations?: boolean;
  /** Responsive design */
  responsive?: boolean;
}

/** CSS Effect generation request */
export interface CSSEffectRequest {
  description: string;
  element?: string;
  options?: AIGenerationOptions;
}

/** CSS Code explanation request */
export interface CSSExplanationRequest {
  code: string;
  detailLevel?: 'brief' | 'detailed' | 'comprehensive';
}

/** CSS Improvement suggestions request */
export interface ImprovementRequest {
  code: string;
  focusAreas?: ('performance' | 'accessibility' | 'maintainability' | 'browser-compatibility')[];
}

/** Accessibility audit request */
export interface AccessibilityAuditRequest {
  code: string;
  wcagVersion?: '2.1' | '2.2';
  complianceLevel?: 'a' | 'aa' | 'aaa';
}

/** Design to code conversion request */
export interface DesignToCodeRequest {
  designDescription: string;
  components?: string[];
  options?: AIGenerationOptions;
}

/** CSS to Tailwind conversion request */
export interface CSSToTailwindRequest {
  css: string;
  preserveComments?: boolean;
  classPrefix?: string;
}

/** AI Response interface */
export interface AIResponse {
  success: boolean;
  data?: AIResponseData;
  error?: AIError;
  usage?: AIUsage;
  requestId: string;
  timestamp: Date;
}

/** AI Response data variants */
export type AIResponseData = 
  | GeneratedCSS
  | CSSExplanation
  | ImprovementSuggestions
  | AccessibilityReport
  | GeneratedCode
  | TailwindClasses;

/** Generated CSS response */
export interface GeneratedCSS {
  css: string;
  html?: string;
  previewUrl?: string;
  classes?: Record<string, string>;
  dependencies?: string[];
}

/** CSS Explanation response */
export interface CSSExplanation {
  summary: string;
  properties: PropertyExplanation[];
  tips?: string[];
  relatedConcepts?: string[];
}

/** Individual property explanation */
export interface PropertyExplanation {
  property: string;
  value: string;
  explanation: string;
  browserSupport?: string;
  alternatives?: string[];
}

/** Improvement suggestions response */
export interface ImprovementSuggestions {
  originalCode: string;
  improvedCode: string;
  changes: ImprovementChange[];
  overallScore: number;
  scores: {
    performance: number;
    accessibility: number;
    maintainability: number;
    browserCompatibility: number;
  };
}

/** Individual improvement change */
export interface ImprovementChange {
  type: 'addition' | 'modification' | 'removal' | 'refactor';
  description: string;
  impact: 'low' | 'medium' | 'high';
  category: string;
}

/** Accessibility audit report */
export interface AccessibilityReport {
  overallScore: number;
  complianceLevel: 'pass' | 'partial' | 'fail';
  issues: AccessibilityIssue[];
  recommendations: string[];
  wcagReferences: WCAGReference[];
}

/** Accessibility issue */
export interface AccessibilityIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  category: string;
  description: string;
  element?: string;
  wcagCriterion?: string;
  fix?: string;
}

/** WCAG reference */
export interface WCAGReference {
  criterion: string;
  title: string;
  level: 'A' | 'AA' | 'AAA';
  url: string;
}

/** Generated code (design-to-code) */
export interface GeneratedCode {
  html: string;
  css: string;
  javascript?: string;
  framework?: string;
  components?: ComponentCode[];
}

/** Component code snippet */
export interface ComponentCode {
  name: string;
  html: string;
  css: string;
  props?: Record<string, string>;
}

/** Tailwind classes conversion result */
export interface TailwindClasses {
  classes: string;
  customCss?: string;
  htmlExample?: string;
  notes?: string[];
}

/** AI Error interface */
export interface AIError {
  code: string;
  message: string;
  details?: unknown;
  retryable: boolean;
}

/** AI Usage statistics */
export interface AIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd?: number;
}

/** Chat session interface */
export interface ChatSession {
  id: string;
  messages: AIMessage[];
  createdAt: Date;
  updatedAt: Date;
  context?: SessionContext;
}

/** Session context for maintaining conversation state */
export interface SessionContext {
  currentProject?: string;
  activeFile?: string;
  selectedFramework?: string;
  preferences?: UserPreferences;
}

/** User preferences for AI */
export interface UserPreferences {
  defaultFramework: 'css' | 'tailwind' | 'styled-components';
  codeStyle: 'concise' | 'verbose' | 'balanced';
  includeComments: boolean;
  accessibilityFocus: boolean;
}

/** Prompt template interface */
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
  category: string;
}

/** Streaming callback type */
export type StreamCallback = (chunk: string, done: boolean) => void;

/** AI Service configuration */
export interface AIServiceConfig {
  provider: 'openai' | 'anthropic' | 'local' | 'mock';
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  baseUrl?: string;
}
