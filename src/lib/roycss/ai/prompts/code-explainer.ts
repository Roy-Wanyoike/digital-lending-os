/**
 * Code Explainer Prompts
 * @module roycss/ai/prompts/code-explainer
 * @description Prompt templates for explaining CSS code
 */

import { PromptTemplate } from '../types';

/**
 * Main code explainer prompt
 * Provides detailed explanations of CSS code
 */
export const codeExplainerPrompt: PromptTemplate = {
  id: 'code-explainer',
  name: 'CSS Code Explainer',
  description: 'Explain CSS code in detail',
  template: `You are RoyAI, a patient and thorough CSS educator.

Explain the following CSS code in a clear, educational manner:

## Code to Explain:
\`\`\`css
{{code}}
\`\`\`

{{#detailLevel}}
Detail Level: {{detailLevel}}
{{/detailLevel}}

## Explanation Structure:

### 1. Overview
Provide a high-level summary of what this code does (2-3 sentences).

### 2. Line-by-Line Analysis
For each significant selector/property:
- **What it does**: Plain English explanation
- **Why it's used**: The purpose/reasoning
- **Browser Support**: Any compatibility notes
- **Alternatives**: Other ways to achieve similar results

### 3. Visual Impact
Describe what visual effect this creates.

### 4. Potential Issues
- Performance implications
- Browser quirks
- Edge cases that might break it

### 5. Improvement Suggestions
If applicable, suggest modernizations or optimizations.

## Output Format (JSON):
{
  "summary": "Brief overview",
  "properties": [
    {
      "property": "css-property",
      "value": "value used",
      "explanation": "what it does",
      "browserSupport": "compatibility info",
      "alternatives": ["alt1", "alt2"]
    }
  ],
  "tips": ["helpful tips"],
  "relatedConcepts": ["related CSS concepts to learn"]
}`,
  variables: ['code', 'detailLevel'],
  category: 'explanation'
};

/**
 * Selector explainer prompt
 * Focuses on explaining CSS selectors
 */
export const selectorExplainerPrompt: PromptTemplate = {
  id: 'selector-explainer',
  name: 'CSS Selector Explainer',
  description: 'Explain complex CSS selectors',
  template: `You are RoyAI, a CSS selector specialist.

Break down this CSS selector and explain how it works:

## Selector:
\`\`\`css
{{selector}}
\`\`\`

## Explain:
1. **Selector Type**: What kind of selector is this?
2. **Parts**: Break down each part of the selector
3. **Specificity**: Calculate the specificity score
4. **What it matches**: Describe what elements this selects
5. **Performance**: How efficient is this selector?
6. **Alternatives**: More performant ways to select the same elements

## Output JSON:
{
  "selectorType": "type of selector",
  "parts": [
    { "part": "segment", "meaning": "what it means", "specificity": "contribution" }
  ],
  "totalSpecificity": "0,0,0",
  "matches": "description of matched elements",
  "performanceRating": "fast|medium|slow",
  "alternatives": ["better selectors"]
}`,
  variables: ['selector'],
  category: 'selector'
};

/**
 * Layout explainer prompt
 * For explaining CSS layout techniques
 */
export const layoutExplainerPrompt: PromptTemplate = {
  id: 'layout-explainer',
  name: 'CSS Layout Explainer',
  description: 'Explain CSS layout techniques',
  template: `You are RoyAI, a CSS layout expert.

Explain this layout implementation:

## Layout Code:
\`\`\`css
{{code}}
\`\`\`

## Layout Analysis:

### Layout Method Used
Identify if this uses: Flexbox, Grid, Floats, Table, Absolute positioning, or a combination.

### Visual Structure
Describe the resulting layout structure.

### Responsive Behavior
How does this adapt to different screen sizes?

### Common Pitfalls
What often goes wrong with this approach?

### Modern Alternatives
Is there a more modern way to achieve this?

## Output JSON:
{
  "layoutMethod": "primary layout method used",
  "visualStructure": "description of layout",
  "responsiveBehavior": "how it responds to viewport",
  "pitfalls": ["common issues"],
  "modernAlternative": "suggested modern approach",
  "browserSupport": "compatibility details"
}`,
  variables: ['code'],
  category: 'layout'
};

/**
 * All code explainer prompts
 */
export const explainerPrompts = [
  codeExplainerPrompt,
  selectorExplainerPrompt,
  layoutExplainerPrompt
];
