/**
 * RoyAI Prompts - System Prompts and Templates
 * @module roycss/ai/prompts
 * @description System prompts, prompt templates, and few-shot examples for CSS generation
 */

/** Prompt context types */
export type PromptContext = 'effect' | 'component' | 'pattern' | 'general';

/** Prompt template interface */
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  context: PromptContext;
  template: string;
  variables: string[];
  examples?: FewShotExample[];
}

/** Few-shot example for prompt engineering */
export interface FewShotExample {
  input: string;
  output: string;
  explanation?: string;
}

/**
 * System Prompt for RoyAI CSS Assistant
 */
export const SYSTEM_PROMPT = `You are RoyAI, an expert CSS assistant specializing in:

## Core Capabilities
1. **CSS Generation**: Create production-ready CSS from natural language descriptions
2. **Code Explanation**: Explain complex CSS in clear, educational terms
3. **Optimization**: Suggest performance and maintainability improvements
4. **Accessibility**: Ensure code meets WCAG guidelines
5. **Framework Conversion**: Convert between CSS, Tailwind, styled-components, etc.

## Guidelines
- Always output valid, well-formatted CSS
- Include vendor prefixes when necessary (with comments noting browser support)
- Use modern CSS features (custom properties, flexbox, grid, container queries)
- Prefer semantic class names following BEM or utility-first conventions
- Include brief explanations of how the code works
- Consider responsive design by default
- Respect prefers-reduced-motion for animations
- Ensure sufficient color contrast for accessibility

## Output Format
For CSS generation requests, output:
\`\`\`css
/* Your CSS here */
\`\`\`

Followed by a brief explanation of key properties and usage tips.

## Tone
Be helpful, concise, and educational. When suggesting improvements, explain the "why" behind each recommendation.`;

/**
 * Effect Generation Prompt Template
 */
export const EFFECT_GENERATION_TEMPLATE: PromptTemplate = {
  id: 'effect-generation',
  name: 'CSS Effect Generator',
  description: 'Generate CSS animation/transition effects from descriptions',
  context: 'effect',
  template: `Generate a CSS effect based on this description: {{description}}

Requirements:
{{#if targetElement}}Target element: {{targetElement}}{{/if}}
{{#if framework}}Output format: {{framework}}{{/if}}
{{#if includeAnimation}}Include @keyframes animation{{/if}}
{{#if responsive}}Make it responsive{{/if}}

The effect should be:
- Smooth and performant (use transform/opacity when possible)
- Well-documented with comments
- Compatible with modern browsers`,
  variables: ['description', 'targetElement', 'framework', 'includeAnimation', 'responsive'],
  examples: [
    {
      input: 'Create a bouncing button effect',
      output: `.bounce-button {
  animation: bounce 0.6s ease-in-out;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

/* Usage: Add .bounce-button class to any element */
/* Browser Support: All modern browsers */`,
      explanation: 'Uses translateY for GPU-accelerated animation'
    },
    {
      input: 'Glowing hover effect for cards',
      output: `.glow-card {
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}

.glow-card:hover {
  box-shadow: 
    0 0 20px rgba(99, 102, 241, 0.4),
    0 0 40px rgba(99, 102, 241, 0.2);
  transform: translateY(-4px);
}

/* Uses layered box-shadows for depth */
/* Indigo glow color - customize as needed */`
    }
  ]
};

/**
 * Component Generation Prompt Template
 */
export const COMPONENT_GENERATION_TEMPLATE: PromptTemplate = {
  id: 'component-generation',
  name: 'CSS Component Builder',
  description: 'Generate complete CSS components with variants',
  context: 'component',
  template: `Build a complete CSS component: {{description}}

Component requirements:
{{#if variant}}Variants needed: {{variant}}{{/if}}
{{#if states}}States to support: {{states}}{{/if}}
{{#if framework}}Framework: {{framework}}{{/if}}

Include:
- Base component styles
- Variant classes (if applicable)
- State styles (hover, focus, active, disabled)
- Responsive considerations
- Accessibility attributes reminder`,
  variables: ['description', 'variant', 'states', 'framework'],
  examples: [
    {
      input: 'Modern button component with primary/secondary/ghost variants',
      output: `/* Button Component - ROYCSS */
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  border-radius: 0.5rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1;
}

/* Variants */
.button--primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.button--secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.button--ghost {
  background: transparent;
  color: #667eea;
}

/* States */
.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.button:focus-visible {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Accessibility: Ensure sufficient contrast */`
    }
  ]
};

/**
 * Pattern Generation Prompt Template
 */
export const PATTERN_GENERATION_TEMPLATE: PromptTemplate = {
  id: 'pattern-generation',
  name: 'CSS Pattern Creator',
  description: 'Generate reusable CSS layout patterns',
  context: 'pattern',
  template: `Create a CSS layout pattern: {{description}}

Pattern specifications:
{{#if responsiveBreakpoints}}Breakpoints: {{responsiveBreakpoints}}{{/if}}
{{#if useGrid}}Use CSS Grid{{/if}}
{{#if useFlexbox}}Use Flexbox{{/if}}

Provide a flexible, reusable pattern that can adapt to different content sizes.`,
  variables: ['description', 'responsiveBreakpoints', 'useGrid', 'useFlexbox'],
  examples: [
    {
      input: 'Holy grail layout with header, footer, sidebar, and main content',
      output: `/* Holy Grail Layout Pattern */
.holy-grail {
  display: grid;
  grid-template-areas:
    "header header header"
    "sidebar main aside"
    "footer footer footer";
  grid-template-columns: 250px 1fr 200px;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
}

.holy-grail__header { grid-area: header; }
.holy-grail__sidebar { grid-area: sidebar; }
.holy-grail__main { grid-area: main; }
.holy-grail__aside { grid-area: aside; }
.holy-grail__footer { grid-area: footer; }

/* Responsive: Collapse to single column on mobile */
@media (max-width: 768px) {
  .holy-grail {
    grid-template-areas:
      "header"
      "main"
      "sidebar"
      "aside"
      "footer";
    grid-template-columns: 1fr;
  }
}`
    }
  ]
};

/**
 * Code Explanation Prompt Template
 */
export const EXPLANATION_TEMPLATE: PromptTemplate = {
  id: 'code-explanation',
  name: 'CSS Code Explainer',
  description: 'Explain CSS code in detail',
  context: 'general',
  template: `Explain this CSS code: {{code}}

{{#if detailLevel}}Detail level: {{detailLevel}}{{/if}}

Provide:
1. Summary of what the code does
2. Line-by-line or property-by-property breakdown
3. How properties interact
4. Browser compatibility notes
5. Potential improvements or gotchas`,
  variables: ['code', 'detailLevel']
};

/**
 * Improvement Suggestions Template
 */
export const IMPROVEMENT_TEMPLATE: PromptTemplate = {
  id: 'improvement-suggestions',
  name: 'CSS Improver',
  description: 'Suggest improvements for existing CSS',
  context: 'general',
  template: `Analyze and improve this CSS: {{code}}

Focus areas: {{focusAreas}}

Provide:
1. Improved version of the code
2. List of changes with rationale
3. Score comparison (before/after) for:
   - Performance
   - Maintainability
   - Accessibility
   - Browser compatibility`,
  variables: ['code', 'focusAreas']
};

/**
 * All available prompt templates
 */
export const PROMPT_TEMPLATES: Record<string, PromptTemplate> = {
  'effect-generation': EFFECT_GENERATION_TEMPLATE,
  'component-generation': COMPONENT_GENERATION_TEMPLATE,
  'pattern-generation': PATTERN_GENERATION_TEMPLATE,
  'code-explanation': EXPLANATION_TEMPLATE,
  'improvement-suggestions': IMPROVEMENT_TEMPLATE
};

/**
 * Get template by ID
 */
export function getPromptTemplate(id: string): PromptTemplate | undefined {
  return PROMPT_TEMPLATES[id];
}

/**
 * Get templates by context
 */
export function getTemplatesByContext(context: PromptContext): PromptTemplate[] {
  return Object.values(PROMPT_TEMPLATES).filter(t => t.context === context);
}

/**
 * Render template with variables
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string | boolean | undefined>
): string {
  let rendered = template;

  // Simple variable replacement {{variable}}
  Object.entries(variables).forEach(([key, value]) => {
    if (value !== undefined && value !== false) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      rendered = rendered.replace(regex, String(value));
    }
  });

  // Handle conditional blocks {{#if var}}...{{/if}}
  rendered = rendered.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, condition, content) => {
    return variables[condition] ? content : '';
  });

  return rendered;
}

/**
 * Build complete prompt from template
 */
export function buildPrompt(
  templateId: string,
  variables: Record<string, string | boolean | undefined>
): { system: string; user: string } {
  const template = getPromptTemplate(templateId);
  
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  return {
    system: SYSTEM_PROMPT,
    user: renderTemplate(template.template, variables)
  };
}

export default {
  SYSTEM_PROMPT,
  EFFECT_GENERATION_TEMPLATE,
  COMPONENT_GENERATION_TEMPLATE,
  PATTERN_GENERATION_TEMPLATE,
  EXPLANATION_TEMPLATE,
  IMPROVEMENT_TEMPLATE,
  PROMPT_TEMPLATES,
  getPromptTemplate,
  getTemplatesByContext,
  renderTemplate,
  buildPrompt
};
