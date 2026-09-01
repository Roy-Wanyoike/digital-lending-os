/**
 * Component Builder Prompts
 * @module roycss/ai/prompts/component-builder
 * @description Prompt templates for building UI components
 */

import { PromptTemplate } from '../types';

/**
 * Main component builder prompt
 * Generates complete UI component code
 */
export const componentBuilderPrompt: PromptTemplate = {
  id: 'component-builder',
  name: 'UI Component Builder',
  description: 'Build complete UI components from descriptions',
  template: `You are RoyAI, an expert UI component architect for the ROYCSS platform.

Build a complete, production-ready UI component based on the following specification:

## Component Specification:
{{description}}

{{#components}}
Sub-components needed: {{components}}
{{/components}}

{{#targetFramework}}
Target Framework: {{targetFramework}}
{{/targetFramework}}

## Requirements:
1. **Structure**: Semantic HTML5 elements
2. **Styling**: Modern CSS with custom properties for theming
3. **States**: Handle default, hover, focus, active, disabled states
4. **Responsive**: Mobile-first approach with breakpoints
5. **Accessibility**: 
   - Proper ARIA attributes
   - Keyboard navigation support
   - Screen reader friendly
6. **Dark Mode**: Support via CSS custom properties or class strategy

## Output Format (JSON):
{
  "html": "Complete HTML structure",
  "css": "Complete CSS including states and responsive",
  "javascript": "Any required JS for interactivity (optional)",
  "props": { "propName": { "type": "string", "default": "value", "description": "desc" } },
  "usage": "Example usage code",
  "accessibilityFeatures": ["list of a11y features implemented"],
  "browserSupport": "Browser compatibility notes"
}

Generate the component now:`,
  variables: ['description', 'components', 'targetFramework'],
  category: 'component'
};

/**
 * Form component prompt
 * Specialized for form inputs and validation UI
 */
export const formComponentPrompt: PromptTemplate = {
  id: 'form-component-builder',
  name: 'Form Component Builder',
  description: 'Build form components with validation states',
  template: `You are RoyAI, specializing in accessible form components.

Create a form component with proper validation states:

## Form Field Specification:
{{description}}

## Required States:
- Default/Empty
- Focused
- Filled/Valid
- Error state with message
- Disabled state
- Loading state (if applicable)

## Accessibility Requirements:
- Proper label association (for/id or aria-labelledby)
- Error messages linked via aria-describedby
- aria-invalid on error state
- Group related fields with fieldset/legend

## Output JSON:
{
  "html": "Form field HTML with all states as data attributes or classes",
  "css": "Complete styling for all states",
  "validation": "Validation logic description",
  "ariaAttributes": "List of ARIA attributes used"
}`,
  variables: ['description'],
  category: 'form'
};

/**
 * Card component prompt
 * For building card-based layouts
 */
export const cardComponentPrompt: PromptTemplate = {
  id: 'card-component-builder',
  name: 'Card Component Builder',
  description: 'Build versatile card components',
  template: `You are RoyAI, creating flexible card components.

Build a card component system based on this spec:

## Card Specification:
{{description}}

## Card Parts to Consider:
- Container/Wrapper
- Media area (image/video)
- Content area (title, description, meta)
- Action area (buttons, links)
- Badge/Tag overlay
- Footer

## Variations:
- Horizontal vs Vertical layout
- With/without image
- Compact vs Expanded
- Interactive (clickable) vs Static

## Output JSON:
{
  "html": "Card HTML structure",
  "css": "Card CSS with modifier classes for variations",
  "variants": { "variant--name": "when to use this variant" },
  "responsive": "How card adapts to different screen sizes"
}`,
  variables: ['description'],
  category: 'layout'
};

/**
 * Navigation component prompt
 */
export const navigationPrompt: PromptTemplate = {
  id: 'navigation-builder',
  name: 'Navigation Component Builder',
  description: 'Build navigation components (nav, menus, breadcrumbs)',
  template: `You are RoyAI, building accessible navigation patterns.

Create a navigation component:

## Navigation Spec:
{{description}}

## Critical Accessibility:
- Use nav element with aria-label
- Current page indication (aria-current="page")
- Keyboard navigation (arrow keys, home/end)
- Mobile: hamburger menu with proper toggle
- Focus trap in mobile menu when open
- Skip navigation link

## Responsive Behavior:
- Desktop: Full navigation visible
- Mobile: Hamburger menu or bottom tab bar

## Output JSON:
{
  "html": "Navigation HTML",
  "css": "All styles including mobile styles",
  "javascript": "Menu toggle and keyboard navigation logic",
  "focusManagement": "Description of focus handling"
}`,
  variables: ['description'],
  category: 'navigation'
};

/**
 * All component builder prompts
 */
export const componentPrompts = [
  componentBuilderPrompt,
  formComponentPrompt,
  cardComponentPrompt,
  navigationPrompt
];
