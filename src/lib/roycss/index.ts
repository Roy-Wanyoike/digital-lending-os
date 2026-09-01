/**
 * ROYCSS Component System & Pattern Library
 * @module roycss
 * @description Main entry point for the complete ROYCSS system
 */

// Core Types
export type {
  ComponentCategory,
  ComponentVariant,
  ComponentProp,
  A11yFeatures,
  RoyCSSComponent,
  RoyCSSPattern,
  PatternCategory,
  CollectionPreset,
  CollectionCategory,
  ThemeConfig,
  ExportOptions,
  ExportResult,
  ValidationState,
  TableColumn,
  PaginationState,
  SortState,
  FilterDefinition,
  ToastNotification,
  ToastType,
  StepperStep,
  TabItem,
  NavItem,
  BreadcrumbItem,
  CardVariant,
  CardSize,
  BadgeVariant,
  BadgeSize,
  AvatarSize,
  ProgressVariant,
  ModalSize,
  DrawerPosition,
  AlertSeverity,
  EmptyStateStyle,
  FileUploadStatus,
  UploadedFile,
} from './types';

// UI Components
export * from '../components/roycss';

// Patterns
export * from './patterns';

// Collections
export * from './collections';

// Export
export * from './export';

// Integration
export {
  shadcnCompatibilityMap,
  getShadcnEquivalent,
  generateMigrationGuide,
  roycssTailwindConfig,
  getMergedTailwindConfig,
  predefinedThemes,
  applyTheme,
  generateThemeCSS,
  generateDarkModeCSS,
  initializeDarkMode,
  toggleDarkMode,
} from './integration';
export type { PredefinedThemeName, ThemeMode } from './integration';
