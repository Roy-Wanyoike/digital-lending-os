/**
 * ROYCSS Component System Types
 * @module roycss/components/types
 * @description Type definitions for the component system
 */

/**
 * Individual component prop definition
 */
export interface ComponentProp {
  /** Prop name */
  name: string;
  /** Prop type (string, number, boolean, ReactNode, etc.) */
  type: string;
  /** Whether this prop is required */
  required: boolean;
  /** Default value if optional */
  defaultValue?: string;
  /** Prop description for documentation */
  description: string;
}

/**
 * Component variant definition
 */
export interface ComponentVariant {
  /** Variant name */
  name: string;
  /** Variant display name */
  label: string;
  /** Variant description */
  description?: string;
}

/**
 * Complete component metadata
 */
export interface RoyCSSComponent {
  /** Unique component identifier (kebab-case) */
  name: string;
  /** Display name for UI */
  displayName: string;
  /** Component category */
  category: ComponentCategory;
  /** Component description */
  description: string;
  /** Available props with types and descriptions */
  props: ComponentProp[];
  /** Available variants */
  variants: string[];
  /** File path to component source */
  filePath: string;
  /** Import path for consumers */
  importPath: string;
  /** When component was added */
  versionAdded: string;
  /** Accessibility features supported */
  a11yFeatures: A11yFeature[];
  /** Whether component is deprecated */
  deprecated?: boolean;
  /** Deprecation message if applicable */
  deprecationMessage?: string;
}

/**
 * Component categories in the system
 */
export type ComponentCategory = 
  | 'form'
  | 'data-display'
  | 'feedback'
  | 'overlay'
  | 'navigation'
  | 'layout';

/** Category display information */
export interface CategoryInfo {
  /** Category key */
  key: ComponentCategory;
  /** Display name */
  label: string;
  /** Category icon name (lucide) */
  icon: string;
  /** Category description */
  description: string;
  /** Number of components in category */
  count: number;
}

/**
 * Accessibility feature flags
 */
export type A11yFeature = 
  | 'keyboard-navigation'
  | 'screen-reader-support'
  | 'focus-management'
  | 'aria-labels'
  | 'reduced-motion'
  | 'high-contrast'
  | 'semantic-html';

/**
 * Component registry state
 */
export interface ComponentRegistryState {
  /** All registered components */
  components: Map<string, RoyCSSComponent>;
  /** Components grouped by category */
  byCategory: Map<ComponentCategory, RoyCSSComponent[]>;
  /** Search index for quick lookup */
  searchIndex: string[];
}

/**
 * Preview configuration for component showcase
 */
export interface ComponentPreviewConfig {
  /** Component to preview */
  component: RoyCSSComponent;
  /** Preview title override */
  title?: string;
  /** Show code snippet */
  showCode?: boolean;
  /** Custom props for preview */
  previewProps?: Record<string, unknown>;
  /** Enable interactive mode */
  interactive?: boolean;
}

/**
 * Code snippet format options
 */
export interface CodeSnippetOptions {
  /** Include imports */
  includeImports?: boolean;
  /** Show TypeScript types */
  showTypes?: boolean;
  /** Format style */
  format: 'jsx' | 'tsx' | 'plain';
  /** Theme for syntax highlighting */
  theme?: 'light' | 'dark';
  /** Line numbers */
  lineNumbers?: boolean;
}

// Predefined category info
export const CATEGORIES: CategoryInfo[] = [
  {
    key: 'form',
    label: 'Form',
    icon: 'FileText',
    description: 'Input fields, form controls, and validation',
    count: 0,
  },
  {
    key: 'data-display',
    label: 'Data Display',
    icon: 'Table',
    description: 'Tables, cards, lists, and data visualization',
    count: 0,
  },
  {
    key: 'feedback',
    label: 'Feedback',
    icon: 'MessageSquare',
    description: 'Alerts, toasts, progress indicators',
    count: 0,
  },
  {
    key: 'overlay',
    label: 'Overlay',
    icon: 'Layers',
    description: 'Modals, drawers, popovers, tooltips',
    count: 0,
  },
  {
    key: 'navigation',
    label: 'Navigation',
    icon: 'Compass',
    description: 'Menus, breadcrumbs, tabs, pagination',
    count: 0,
  },
  {
    key: 'layout',
    label: 'Layout',
    icon: 'LayoutGrid',
    description: 'Containers, grids, spacing utilities',
    count: 0,
  },
];
