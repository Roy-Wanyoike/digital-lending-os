/**
 * Inspector Module - Browser Extension-like DevTool
 * @module roycss/inspector
 * @description CSS inspection and analysis tool
 */

// Re-export all inspector components
export { Inspector } from './panel';
export { createOverlay, destroyOverlay, highlightElement, clearHighlight } from './overlay';
export { analyzeCSS, analyzeElement, getComputedStyles } from './analyzer';
export { exportElement, exportAsHTML, exportAsCSS, exportAsJSON } from './exporter';

/** Inspector configuration */
export interface InspectorConfig {
  /** Enable click-to-inspect mode */
  inspectOnClick?: boolean;
  /** Show computed styles */
  showComputedStyles?: boolean;
  /** Show inherited properties */
  showInherited?: boolean;
  /** Color format for output */
  colorFormat?: 'hex' | 'rgb' | 'hsl';
  /** Enable accessibility checks */
  checkAccessibility?: boolean;
}

/** Inspected element data */
export interface InspectedElement {
  /** Element reference */
  element: HTMLElement;
  /** Tag name */
  tagName: string;
  /** Element ID */
  id?: string;
  /** Class list */
  classes: string[];
  /** Inline styles */
  inlineStyles: Record<string, string>;
  /** Computed styles */
  computedStyles: Record<string, string>;
  /** Applied CSS rules */
  cssRules: CSSRuleInfo[];
  /** Box model dimensions */
  boxModel: BoxModelData;
  /** Accessibility info */
  accessibility?: AccessibilityInfo;
}

/** CSS rule information */
export interface CSSRuleInfo {
  selectorText: string;
  stylesheetHref?: string;
  specificity: number;
  properties: Array<{ property: string; value: string }>;
}

/** Box model data */
export interface BoxModelData {
  content: Dimensions;
  padding: Dimensions;
  border: Dimensions;
  margin: Dimensions;
}

/** Dimensions */
export interface Dimensions {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

/** Accessibility information */
export interface AccessibilityInfo {
  role?: string;
  label?: string;
  describedBy?: string;
  tabIndex?: number;
  issues: A11yIssue[];
}

/** Accessibility issue */
export interface A11yIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
}

/** Default configuration */
const DEFAULT_CONFIG: InspectorConfig = {
  inspectOnClick: true,
  showComputedStyles: true,
  showInherited: false,
  colorFormat: 'hex',
  checkAccessibility: true
};

export { DEFAULT_CONFIG };
