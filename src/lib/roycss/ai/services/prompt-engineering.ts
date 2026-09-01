/**
 * Prompt Engineering Service
 * @module roycss/ai/services/prompt-engineering
 * @description Advanced prompt engineering utilities for better AI responses
 */

import { PromptTemplate, AIGenerationOptions } from '../types';

/** Simple template engine result */
interface TemplateResult {
  processed: string;
  missingVariables: string[];
}

/**
 * Prompt Engineering Utilities
 */
export class PromptEngineering {
  /** Cache for compiled templates */
  private static templateCache = new Map<string, PromptTemplate>();

  /**
   * Process a prompt template with given variables
   */
  static processTemplate(
    template: PromptTemplate,
    variables: Record<string, string | boolean | undefined>
  ): TemplateResult {
    let processed = template.template;
    const missingVariables: string[] = [];

    // Process conditional blocks {{#var}}...{{/var}}
    processed = processed.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, varName, content) => {
      const value = variables[varName];
      if (value === undefined || value === false || value === '') {
        return '';
      }
      // Replace {{varName}} inside the block
      return content.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), String(value));
    });

    // Process simple variables {{var}}
    processed = processed.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
      const value = variables[varName];
      if (value === undefined) {
        if (template.variables.includes(varName)) {
          missingVariables.push(varName);
        }
        return `{{${varName}}}`;
      }
      return String(value);
    });

    return { processed, missingVariables };
  }

  /**
   * Build system prompt with context
   */
  static buildSystemPrompt(context?: {
    framework?: string;
    accessibilityLevel?: string;
    codeStyle?: string;
  }): string {
    const parts = [
      'You are RoyAI, an expert CSS assistant integrated into the ROYCSS platform.',
      'Your specialties include:',
      '- Generating clean, modern CSS from natural language',
      '- Explaining complex CSS concepts clearly',
      '- Suggesting performance and accessibility improvements',
      '- Converting between CSS formats (CSS, Tailwind, styled-components)',
      '- Auditing code for WCAG compliance'
    ];

    if (context?.framework) {
      parts.push(`\nPrimary Framework: ${context.framework}`);
    }

    if (context?.accessibilityLevel) {
      parts.push(`\nAccessibility Target: WCAG ${context.accessibilityLevel}`);
    }

    if (context?.codeStyle) {
      parts.push(`\nCode Style: ${context.codeStyle}`);
    }

    parts.push('\n\nAlways respond with valid, well-formatted output.');
    parts.push('When generating code, include helpful comments.');
    parts.push('When explaining, use clear analogies and examples.');

    return parts.join('\n');
  }

  /**
   * Enhance prompt with examples (few-shot learning)
   */
  static addFewShotExamples(
    basePrompt: string,
    examples: Array<{ input: string; output: string }>
  ): string {
    const exampleSection = examples.length > 0
      ? `\n\n## Examples:\n${examples.map((ex, i) =>
          `### Example ${i + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}`
        ).join('\n\n')}`
      : '';

    return basePrompt + exampleSection;
  }

  /**
   * Add constraints to prompt
   */
  static addConstraints(
    basePrompt: string,
    constraints: string[]
  ): string {
    if (constraints.length === 0) return basePrompt;

    const constraintSection = `\n\n## Constraints:\n${constraints.map(c => `- ${c}`).join('\n')}`;
    return basePrompt + constraintSection;
  }

  /**
   * Build generation prompt from options
   */
  static buildGenerationPrompt(
    description: string,
    options?: AIGenerationOptions
  ): string {
    let prompt = `Generate CSS for: ${description}`;

    const constraints: string[] = [];

    if (options?.targetFramework) {
      constraints.push(`Output format: ${options.targetFramework}`);
    }

    if (options?.includePrefixes) {
      constraints.push('Include vendor prefixes (-webkit-, -moz-)');
    }

    if (options?.animations) {
      constraints.push('Include animations/transitions where appropriate');
    }

    if (options?.responsive) {
      constraints.push('Make responsive (mobile-first approach)');
    }

    if (options?.accessibilityLevel && options.accessibilityLevel !== 'none') {
      constraints.push(`Meet WCAG ${options.accessibilityLevel.toUpperCase()} standards`);
    }

    if (constraints.length > 0) {
      prompt += '\n\nRequirements:\n' + constraints.map(c => `- ${c}`).join('\n');
    }

    prompt += '\n\nReturn valid JSON with "css" property.';

    return prompt;
  }

  /**
   * Create chain-of-thought prompt
   */
  static createChainOfThoughtPrompt(question: string): string {
    return `${question}

Let's think step by step:

1. First, I'll analyze what is being asked...
2. Then, I'll consider the best approach...
3. Finally, I'll provide the solution...

Step-by-step reasoning:`;
  }

  /**
   * Cache a template for reuse
   */
  static cacheTemplate(template: PromptTemplate): void {
    this.templateCache.set(template.id, template);
  }

  /**
   * Get cached template
   */
  static getCachedTemplate(id: string): PromptTemplate | undefined {
    return this.templateCache.get(id);
  }

  /**
   * Clear template cache
   */
  static clearCache(): void {
    this.templateCache.clear();
  }

  /**
   * Extract JSON from AI response (handles markdown code blocks)
   */
  static extractJSON(response: string): unknown {
    // Try direct parse first
    try {
      return JSON.parse(response);
    } catch {
      // Try extracting from code block
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1].trim());
        } catch {
          // Continue to next attempt
        }
      }

      // Try finding JSON object in text
      const objectMatch = response.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        try {
          return JSON.parse(objectMatch[0]);
        } catch {
          // Return raw response
        }
      }

      return { raw: response };
    }
  }

  /**
   * Truncate prompt to fit within token limit
   */
  static truncatePrompt(prompt: string, maxTokens: number = 4000): string {
    // Rough estimation: ~4 characters per token
    const maxChars = maxTokens * 4;
    
    if (prompt.length <= maxChars) {
      return prompt;
    }

    // Truncate with ellipsis
    return prompt.substring(0, maxChars - 3) + '...';
  }

  /**
   * Sanitize user input for prompt injection prevention
   */
  static sanitizeInput(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '[removed]')
      .replace(/data:/gi, '[removed]')
      .replace(/javascript:/gi, '[removed]')
      .trim();
  }

  /**
   * Format code block for prompt
   */
  static formatCodeBlock(code: string, language: string = 'css'): string {
    return `\`\`\`${language}\n${code}\n\`\`\``;
  }
}

export default PromptEngineering;
