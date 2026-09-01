/**
 * RoyAI - AI-Powered Assistant Module
 * @module roycss/ai
 * @description Main entry point for RoyAI functionality
 */

// Types
export type {
  AIRole,
  AIMessage,
  AIRequestType,
  AIGenerationOptions,
  CSSEffectRequest,
  CSSExplanationRequest,
  ImprovementRequest,
  AccessibilityAuditRequest,
  DesignToCodeRequest,
  CSSToTailwindRequest,
  AIResponse,
  AIResponseData,
  GeneratedCSS,
  CSSExplanation,
  PropertyExplanation,
  ImprovementSuggestions,
  ImprovementChange,
  AccessibilityReport,
  AccessibilityIssue,
  WCAGReference,
  GeneratedCode,
  ComponentCode,
  TailwindClasses,
  AIError,
  AIUsage,
  ChatSession,
  SessionContext,
  UserPreferences,
  PromptTemplate,
  StreamCallback,
  AIServiceConfig
} from './types';

// Services (new unified service)
export { 
  RoyAIService, 
  getRoyAIService, 
  resetRoyAIService,
  MockAIService,
  ResponseFormatter as ServiceResponseFormatter,
  AIServiceConfig 
} from './service';

// Legacy Services (for backward compatibility)
export { RoyAIService as LegacyRoyAIService, getRoyAIService as getLegacyService } from './services/openai-service';
export { PromptEngineering } from './services/prompt-engineering';
export { ResponseFormatter } from './services/response-formatter';

// Components
export { ChatInterface } from './components/ChatInterface';

// Prompts & Templates (new unified prompts)
export {
  SYSTEM_PROMPT,
  EFFECT_GENERATION_TEMPLATE,
  COMPONENT_GENERATION_TEMPLATE,
  PATTERN_GENERATION_TEMPLATE,
  EXPLANATION_TEMPLATE,
  IMPROVEMENT_TEMPLATE,
  PROMPT_TEMPLATES,
  PromptTemplate,
  FewShotExample,
  PromptContext,
  getPromptTemplate,
  getTemplatesByContext,
  renderTemplate,
  buildPrompt
} from './prompts';

// Prompts (for advanced usage)
export { effectPrompts, effectGenerationPrompt, animationPrompt, hoverEffectPrompt, loadingEffectPrompt } from './prompts/effect-generator';
export { componentPrompts, componentBuilderPrompt, formComponentPrompt, cardComponentPrompt, navigationPrompt } from './prompts/component-builder';
export { explainerPrompts, codeExplainerPrompt, selectorExplainerPrompt, layoutExplainerPrompt } from './prompts/code-explainer';
export { accessibilityPrompts, accessibilityAuditPrompt, colorContrastPrompt, focusStylePrompt, screenReaderPrompt } from './prompts/accessibility-auditor';

/** RoyAI version */
export const ROYAI_VERSION = '1.0.0';

/**
 * Quick generate CSS function
 * @param description Natural language description of desired CSS
 * @param options Generation options
 * @returns Promise resolving to AI response
 */
export async function generateCSS(
  description: string,
  options?: AIGenerationOptions
) {
  const { getRoyAIService } = await import('./services/openai-service');
  const service = getRoyAIService();
  return service.generateCSS({ description, options });
}

/**
 * Quick explain CSS function
 * @param code CSS code to explain
 * @returns Promise resolving to explanation
 */
export async function explainCSS(code: string) {
  const { getRoyAIService } = await import('./services/openai-service');
  const service = getRoyAIService();
  return service.explainCSS(code);
}

/**
 * Quick suggest improvements function
 * @param code CSS code to improve
 * @returns Promise resolving to suggestions
 */
export async function suggestImprovements(code: string) {
  const { getRoyAIService } = await import('./services/openai-service');
  const service = getRoyAIService();
  return service.suggestImprovements(code);
}

/**
 * Quick accessibility audit function
 * @param code CSS/code to audit
 * @returns Promise resolving to audit report
 */
export async function auditAccessibility(code: string) {
  const { getRoyAIService } = await import('./services/openai-service');
  const service = getRoyAIService();
  return service.accessibilityAudit(code);
}

/**
 * Quick CSS to Tailwind conversion
 * @param css CSS to convert
 * @returns Promise resolving to Tailwind classes
 */
export async function cssToTailwind(css: string) {
  const { getRoyAIService } = await import('./services/openai-service');
  const service = getRoyAIService();
  return service.cssToTailwind(css);
}

// Default export
export default {
  version: ROYAI_VERSION,
  generateCSS,
  explainCSS,
  suggestImprovements,
  auditAccessibility,
  cssToTailwind,
  ChatInterface,
  RoyAIService
};
