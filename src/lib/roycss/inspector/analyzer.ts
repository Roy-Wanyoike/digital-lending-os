/**
 * Analyzer - CSS Analysis Utilities
 * @module roycss/inspector/analyzer
 * @description Analyze CSS properties and values
 */

import { InspectedElement, CSSRuleInfo, BoxModelData, AccessibilityInfo, A11yIssue } from './index';

/**
 * Analyze a DOM element's CSS
 */
export function analyzeCSS(element: HTMLElement): InspectedElement {
  const computedStyle = window.getComputedStyle(element);
  
  return {
    element,
    tagName: element.tagName.toLowerCase(),
    id: element.id || undefined,
    classes: typeof element.className === 'string' 
      ? element.className.split(' ').filter(Boolean)
      : [],
    inlineStyles: getInlineStyles(element),
    computedStyles: getComputedStylesMap(computedStyle),
    cssRules: getAppliedRules(element),
    boxModel: getBoxModel(element, computedStyle),
    accessibility: analyzeAccessibility(element)
  };
}

/**
 * Quick analyze - returns summary only
 */
export function analyzeElement(element: HTMLElement): {
  selector: string;
  size: { width: number; height: number };
  colors: { background: string; color: string };
  font: { family: string; size: string; weight: string };
} {
  const style = window.getComputedStyle(element);
  
  return {
    selector: getElementSelector(element),
    size: {
      width: element.offsetWidth,
      height: element.offsetHeight
    },
    colors: {
      background: style.backgroundColor,
      color: style.color
    },
    font: {
      family: style.fontFamily,
      size: style.fontSize,
      weight: style.fontWeight
    }
  };
}

/**
 * Get computed styles as object
 */
export function getComputedStyles(element: HTMLElement): CSSStyleDeclaration {
  return window.getComputedStyle(element);
}

/**
 * Get inline styles from element
 */
function getInlineStyles(element: HTMLElement): Record<string, string> {
  const styles: Record<string, string> = {};
  
  if (!element.style) return styles;
  
  for (let i = 0; i < element.style.length; i++) {
    const prop = element.style[i];
    styles[prop] = element.style.getPropertyValue(prop);
  }
  
  return styles;
}

/**
 * Get computed styles as map
 */
function getComputedStylesMap(style: CSSStyleDeclaration): Record<string, string> {
  const map: Record<string, string> = {};
  
  for (let i = 0; i < style.length; i++) {
    const prop = style[i];
    map[prop] = style.getPropertyValue(prop);
  }
  
  return map;
}

/**
 * Get applied CSS rules for element
 */
function getAppliedRules(element: HTMLElement): CSSRuleInfo[] {
  const rules: CSSRuleInfo[] = [];
  
  try {
    // Check all stylesheets
    for (const sheet of document.styleSheets) {
      try {
        const cssRules = sheet.cssRules || sheet.rules;
        
        for (let i = 0; i < cssRules.length; i++) {
          const rule = cssRules[i];
          
          if (rule instanceof CSSStyleRule) {
            try {
              if (element.matches(rule.selectorText)) {
                const properties: Array<{ property: string; value: string }> = [];
                
                for (let j = 0; j < rule.style.length; j++) {
                  const prop = rule.style[j];
                  properties.push({
                    property: prop,
                    value: rule.style.getPropertyValue(prop)
                  });
                }
                
                rules.push({
                  selectorText: rule.selectorText,
                  stylesheetHref: sheet.href || undefined,
                  specificity: calculateSpecificity(rule.selectorText),
                  properties
                });
              }
            } catch {
              // Invalid selector, skip
            }
          }
        }
      } catch {
        // Can't access stylesheet (CORS), skip
      }
    }
  } catch {
    // Error accessing stylesheets
  }
  
  // Sort by specificity (highest first)
  rules.sort((a, b) => b.specificity - a.specificity);
  
  return rules;
}

/**
 * Calculate CSS selector specificity
 */
function calculateSpecificity(selector: string): number {
  let specificity = 0;
  
  // Remove pseudo-elements and normalize
  const cleanSelector = selector.replace(/::?[\w-]+/g, '');
  
  // Count IDs
  const idMatches = cleanSelector.match(/#[\w-]/g);
  specificity += (idMatches?.length || 0) * 10000;
  
  // Count classes, attributes, pseudo-classes
  const classMatches = cleanSelector.match(/\.[\w-]|\[[^\]]+\]|:[\w-]+(?![\(])/g);
  specificity += (classMatches?.length || 0) * 100;
  
  // Count elements, pseudo-elements
  const elementMatches = cleanSelector.match(/(?:^|[^#.\[:])[\w-]+/g);
  specificity += (elementMatches?.length || 0) * 1;
  
  return specificity;
}

/**
 * Get box model data
 */
function getBoxModel(element: HTMLElement, style: CSSStyleDeclaration): BoxModelData {
  const rect = element.getBoundingClientRect();
  
  return {
    content: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: rect.width - parseFloat(style.paddingLeft || '0') - parseFloat(style.paddingRight || '0')
        - parseFloat(style.borderLeftWidth || '0') - parseFloat(style.borderRightWidth || '0'),
      height: rect.height - parseFloat(style.paddingTop || '0') - parseFloat(style.paddingBottom || '0')
        - parseFloat(style.borderTopWidth || '0') - parseFloat(style.borderBottomWidth || '0')
    },
    padding: {
      top: parseFloat(style.paddingTop || '0'),
      right: parseFloat(style.paddingRight || '0'),
      bottom: parseFloat(style.paddingBottom || '0'),
      left: parseFloat(style.paddingLeft || '0'),
      width: 0,
      height: 0
    },
    border: {
      top: parseFloat(style.borderTopWidth || '0'),
      right: parseFloat(style.borderRightWidth || '0'),
      bottom: parseFloat(style.borderBottomWidth || '0'),
      left: parseFloat(style.borderLeftWidth || '0'),
      width: 0,
      height: 0
    },
    margin: {
      top: parseFloat(style.marginTop || '0'),
      right: parseFloat(style.marginRight || '0'),
      bottom: parseFloat(style.marginBottom || '0'),
      left: parseFloat(style.marginLeft || '0'),
      width: 0,
      height: 0
    }
  };
}

/**
 * Analyze accessibility attributes
 */
function analyzeAccessibility(element: HTMLElement): AccessibilityInfo {
  const issues: A11yIssue[] = [];
  
  const info: AccessibilityInfo = {
    role: element.getAttribute('role') || undefined,
    label: element.getAttribute('aria-label') 
      || element.getAttribute('aria-labelledby')
      || (element as HTMLInputElement).placeholder 
      || undefined,
    describedBy: element.getAttribute('aria-describedby') || undefined,
    tabIndex: element.tabIndex,
    issues: []
  };
  
  // Check for images without alt text
  if (element.tagName === 'IMG' && !(element as HTMLImageElement).alt) {
    issues.push({
      severity: 'error',
      code: 'img-alt',
      message: 'Image missing alt attribute'
    });
  }
  
  // Check for form inputs without labels
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) {
    const hasLabel = !!element.id && !!document.querySelector(`label[for="${element.id}"]`);
    const hasAriaLabel = !!element.getAttribute('aria-label');
    
    if (!hasLabel && !hasAriaLabel) {
      issues.push({
        severity: 'warning',
        code: 'label',
        message: 'Form element missing label'
      });
    }
  }
  
  // Check for buttons without accessible name
  if (element.tagName === 'BUTTON') {
    const hasText = element.textContent?.trim().length ?? 0 > 0;
    const hasAriaLabel = !!element.getAttribute('aria-label');
    
    if (!hasText && !hasAriaLabel) {
      issues.push({
        severity: 'error',
        code: 'button-name',
        message: 'Button has no accessible name'
      });
    }
  }
  
  // Check for insufficient color contrast (basic check)
  const style = window.getComputedStyle(element);
  const bgColor = style.backgroundColor;
  const textColor = style.color;
  
  if (bgColor !== 'rgba(0, 0, 0, 0)' && textColor !== 'rgba(0, 0, 0, 0)' && element.textContent?.trim()) {
    // This is a simplified check - real implementation would use WCAG algorithm
    const bgLuminance = getLuminance(bgColor);
    const textLuminance = getLuminance(textColor);
    const ratio = Math.max(bgLuminance, textLuminance) / Math.min(bgLuminance, textLuminance) + 0.05;
    
    if (ratio < 4.5) {
      issues.push({
        severity: 'warning',
        code: 'color-contrast',
        message: 'Color contrast may be insufficient (ratio: ' + ratio.toFixed(2) + ')'
      });
    }
  }
  
  // Check for focusable elements without focus styles
  if (isFocusable(element)) {
    const hasFocusStyle = style.outline !== 'none' || style.boxShadow !== 'none';
    if (!hasFocusStyle) {
      issues.push({
        severity: 'info',
        code: 'focus-style',
        message: 'Focusable element may lack visible focus indicator'
      });
    }
  }
  
  info.issues = issues;
  return info;
}

/**
 * Check if element is focusable
 */
function isFocusable(element: HTMLElement): boolean {
  const focusableTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
  
  if (focusableTags.includes(element.tagName)) {
    return true;
  }
  
  if (element.tabIndex >= 0) {
    return true;
  }
  
  if (element.getAttribute('contenteditable') === 'true') {
    return true;
  }
  
  return false;
}

/**
 * Calculate relative luminance
 */
function getLuminance(color: string): number {
  const rgb = parseRGB(color);
  if (!rgb) return 1;
  
  const [r, g, b] = rgb.map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Parse RGB color string
 */
function parseRGB(color: string): [number, number, number] | null {
  const match = color.match(/\d+/g);
  if (match && match.length >= 3) {
    return [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])];
  }
  return null;
}

/**
 * Generate unique CSS selector for element
 */
export function getElementSelector(element: HTMLElement): string {
  if (element.id) {
    return `#${element.id}`;
  }
  
  const path: string[] = [];
  let current: HTMLElement | null = element;
  
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.tagName.toLowerCase();
    
    if (current.id) {
      selector = `#${current.id}`;
      path.unshift(selector);
      break;
    }
    
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).slice(0, 2).join('.');
      selector += `.${classes}`;
    }
    
    // Add nth-child for uniqueness
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        child => child.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }
    
    path.unshift(selector);
    current = current.parentElement;
    
    if (path.length >= 4) break; // Limit depth
  }
  
  return path.join(' > ');
}
