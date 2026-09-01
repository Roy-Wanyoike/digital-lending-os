/**
 * Accessibility Auditor Prompts
 * @module roycss/ai/prompts/accessibility-auditor
 * @description Prompt templates for accessibility auditing
 */

import { PromptTemplate } from '../types';

/**
 * Main accessibility audit prompt
 * Performs comprehensive WCAG audits
 */
export const accessibilityAuditPrompt: PromptTemplate = {
  id: 'accessibility-auditor',
  name: 'WCAG Accessibility Auditor',
  description: 'Audit CSS/code for accessibility issues',
  template: `You are RoyAI, a WCAG accessibility auditing specialist.

Perform a comprehensive accessibility audit on the following code:

## Code to Audit:
\`\`\`css
{{code}}
\`\`\`

{{#wcagVersion}}
WCAG Version: {{wcagVersion}}
{{/wcagVersion}}

{{#complianceLevel}}
Target Compliance Level: {{complianceLevel}}
{{/complianceLevel}}

## Audit Checklist:

### Perceivable
- [ ] Color contrast ratios meet requirements (4.5:1 normal, 3:1 large text)
- [ ] Text can be resized up to 200%
- [ ] Information not conveyed by color alone
- [ ] Visible focus indicators present
- [ ] No content flashes >3 times per second

### Operable
- [ ] All functionality available via keyboard
- [ ] No keyboard traps
- [ ] Sufficient time limits or ability to extend
- [ ] No content that causes seizures
- [ ] Clear navigation and wayfinding

### Understandable
- [ ] Language of page identified
- [ ] Predictable navigation and behavior
- [ ] Clear error identification and suggestions
- [ ] Consistent identification of components

### Robust
- [ ] Valid markup
- [ ] ARIA used correctly
- [ ] Custom controls follow ARIA patterns

## Output Format (JSON):
{
  "overallScore": 0-100,
  "complianceLevel": "pass|partial|fail",
  "issues": [
    {
      "id": "unique-id",
      "severity": "error|warning|info",
      "category": "Perceivable|Operable|Understandable|Robust",
      "description": "issue description",
      "element": "affected element if identifiable",
      "wcagCriterion": "e.g., 1.4.3 Contrast (Minimum)",
      "fix": "how to fix this issue"
    }
  ],
  "recommendations": ["overall improvement suggestions"],
  "wcagReferences": [
    { "criterion": "1.1.1", "title": "title", "level": "A", "url": "link" }
  ]
}`,
  variables: ['code', 'wcagVersion', 'complianceLevel'],
  category: 'accessibility'
};

/**
 * Color contrast checker prompt
 * Specifically checks color combinations
 */
export const colorContrastPrompt: PromptTemplate = {
  id: 'color-contrast-checker',
  name: 'Color Contrast Checker',
  description: 'Check color combinations for WCAG compliance',
  template: `You are RoyAI, checking color contrast for accessibility.

Analyze these colors for WCAG compliance:

## Colors:
Foreground: {{foregroundColor}}
Background: {{backgroundColor}}

{{#context}}
Context: {{context}}
{{/context}}

## Check Against:
- WCAG 2.1 Level AA (normal text: 4.5:1, large text: 3:1, UI components: 3:1)
- WCAG 2.1 Level AAA (normal text: 7:1, large text: 4.5:1)

## Output JSON:
{
  "foreground": "#hex",
  "background": "#hex",
  "contrastRatio": 4.5,
  "aaNormal": true|false,
  "aaLarge": true|false,
  "aaUI": true|false,
  "aaaNormal": true|false,
  "aaaLarge": true|false,
  "suggestions": ["alternative colors if failing"]
}`,
  variables: ['foregroundColor', 'backgroundColor', 'context'],
  category: 'color'
};

/**
 * Focus style auditor prompt
 * Checks focus indicator visibility
 */
export const focusStylePrompt: PromptTemplate = {
  id: 'focus-style-auditor',
  name: 'Focus Style Auditor',
  description: 'Audit focus styles for keyboard accessibility',
  template: `You are RoyAI, auditing focus styles for keyboard navigation.

Check these focus styles:

## CSS:
\`\`\`css
{{code}}
\`\`\`

## Audit Criteria:
1. **Visibility**: Is focus clearly visible? (3:1 minimum contrast with adjacent colors)
2. **Consistency**: Are focus indicators consistent across interactive elements?
3. **No Outline Removal**: Is outline: none used without replacement focus style?
4. **Custom Indicators**: If custom, do they meet visibility requirements?
5. **Focus Within**: Does :focus-withing enhance container focus indication?

## Output JSON:
{
  "hasVisibleFocus": true|false,
  "issues": [
    { "severity": "error|warning", "description": "issue" }
  ],
  "recommendations": ["improvement suggestions"],
  "exampleFix": "code showing improved focus styles"
}`,
  variables: ['code'],
  category: 'focus'
};

/**
 * Screen reader compatibility prompt
 */
export const screenReaderPrompt: PromptTemplate = {
  id: 'screen-reader-auditor',
  name: 'Screen Reader Compatibility Checker',
  description: 'Check code for screen reader compatibility',
  template: `You are RoyAI, checking screen reader compatibility.

Analyze this code for screen reader issues:

## Code:
\`\`\`
{{code}}
\`\`\`

## Check For:
- Appropriate use of semantic elements
- Correct ARIA attributes
- Hidden content properly hidden (sr-only, aria-hidden)
- Alt text on images
- Labels on form inputs
- Live regions where appropriate
- Role assignments

## Output JSON:
{
  "screenReaderCompatible": true|false,
  "issues": [
    { "severity": "error|warning|info", "element": "element", "issue": "description", "fix": "solution" }
  ],
  "recommendations": ["general improvements"]
}`,
  variables: ['code'],
  category: 'screen-reader'
};

/**
 * All accessibility auditor prompts
 */
export const accessibilityPrompts = [
  accessibilityAuditPrompt,
  colorContrastPrompt,
  focusStylePrompt,
  screenReaderPrompt
];
