/**
 * ROYCSS Component System - Core Type Definitions
 * @module roycss/types
 * @description Comprehensive type definitions for the ROYCSS component system
 */

/** Component category enumeration */
export enum ComponentCategory {
  FORM = 'form',
  DATA = 'data',
  NAV = 'nav',
  OVERLAY = 'overlay',
  FEEDBACK = 'feedback',
}

/** Component variant type */
export interface ComponentVariant {
  name: string;
  description: string;
  props: Record<string, unknown>;
}

/** Individual prop definition */
export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: unknown;
  description: string;
}

/** Accessibility features for a component */
export interface A11yFeatures {
  keyboardNav: boolean;
  screenReader: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  focusManagement: boolean;
  ariaAttributes: string[];
}

/** Main component interface */
export interface RoyCSSComponent {
  id: string;
  name: string;
  category: ComponentCategory;
  description: string;
  version: string;
  props: ComponentProp[];
  variants: ComponentVariant[];
  usage: string;
  accessibility: A11yFeatures;
  storybook?: string;
  sourcePath: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Pattern definition for reusable layouts */
export interface RoyCSSPattern {
  id: string;
  name: string;
  category: PatternCategory;
  description: string;
  components: string[];
  usage: string;
  sourcePath: string;
}

/** Pattern categories */
export enum PatternCategory {
  LAYOUT = 'layout',
  CONTENT = 'content',
  FORM = 'form',
}

/** Collection preset definition */
export interface CollectionPreset {
  id: string;
  name: string;
  description: string;
  category: CollectionCategory;
  components: string[];
  patterns: string[];
  theme: ThemeConfig;
}

/** Collection categories */
export enum CollectionCategory {
  DASHBOARD = 'dashboard',
  LANDING_PAGE = 'landing-page',
  ADMIN_PANEL = 'admin-panel',
  E_COMMERCE = 'e-commerce',
  FINTECH = 'fintech',
}

/** Theme configuration */
export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: string;
  fontFamily: string;
  spacing: Record<string, string>;
}

/** Export options for CodePen and other platforms */
export interface ExportOptions {
  format: 'codepen' | 'codesandbox' | 'github-gist';
  title: string;
  description: string;
  isPrivate?: boolean;
  tags?: string[];
  externalStyles?: string[];
  externalScripts?: string[];
}

/** Export result */
export interface ExportResult {
  success: boolean;
  url?: string;
  error?: string;
  payload?: Record<string, unknown>;
}

/** Form field validation state */
export interface ValidationState {
  isValid: boolean | null;
  error?: string;
  warning?: string;
  touched: boolean;
}

/** Table column definition */
export interface TableColumn<T = unknown> {
  key: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

/** Pagination state */
export interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/** Sort direction */
export type SortDirection = 'asc' | 'desc';

/** Sort state */
export interface SortState {
  key: string;
  direction: SortDirection;
}

/** Filter operator types */
export type FilterOperator = 
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'between'
  | 'in'
  | 'isEmpty'
  | 'isNotEmpty';

/** Filter definition */
export interface FilterDefinition {
  key: string;
  operator: FilterOperator;
  value: unknown;
}

/** Toast notification types */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/** Toast notification */
export interface ToastNotification {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/** Stepper step definition */
export interface StepperStep {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  completed?: boolean;
  disabled?: boolean;
}

/** Tab definition */
export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
  badge?: number | string;
}

/** Navigation item */
export interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
  children?: NavItem[];
  badge?: number | string;
  disabled?: boolean;
}

/** Breadcrumb item */
export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  current?: boolean;
}

/** Card variants */
export type CardVariant = 'default' | 'outlined' | 'elevated' | 'filled';
export type CardSize = 'sm' | 'md' | 'lg' | 'xl';

/** Badge variants */
export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

/** Avatar sizes */
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Progress indicator types */
export type ProgressVariant = 'linear' | 'circular' | 'segmented';

/** Modal/Dialog size */
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'auto';

/** Drawer position */
export type DrawerPosition = 'left' | 'right' | 'top' | 'bottom';

/** Alert severity levels */
export type AlertSeverity = 'info' | 'success' | 'warning' | 'error';

/** Empty state illustration style */
export type EmptyStateStyle = 'minimal' | 'illustrated' | 'detailed';

/** File upload status */
export type FileUploadStatus = 'pending' | 'uploading' | 'success' | 'error';

/** Uploaded file info */
export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: FileUploadStatus;
  progress: number;
  previewUrl?: string;
  error?: string;
}
