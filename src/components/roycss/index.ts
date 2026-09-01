/**
 * ROYCSS Component System - Main Export
 * @module roycss
 * @description Main entry point for all ROYCSS components
 */

// UI Components
export * from './form';
export * from './data';
export { Breadcrumb, Tabs, Pagination, Sidebar, CommandPalette, MegaMenu } from './nav';
export type {
  BreadcrumbProps,
  TabsProps,
  TabVariant,
  TabSize,
  PaginationProps,
  SidebarProps,
  CommandPaletteProps,
  MegaMenuProps,
} from './nav';

export {
  Modal,
  Drawer,
  ToastContainer,
  Popover,
  Tooltip,
} from './overlay';
export type {
  ModalProps,
  DrawerProps,
  ToastContainerProps,
  PopoverProps,
  TooltipProps,
} from './overlay';

export {
  Alert,
  EmptyState,
  ConfirmDialog,
  ErrorBoundary,
  SuccessAnimation,
} from './feedback';
export type {
  AlertProps,
  EmptyStateProps,
  ConfirmDialogProps,
  ErrorBoundaryProps,
  SuccessAnimationProps,
} from './feedback';

// Shared utilities & providers
export { cn, generateId } from './shared/utils';
export * from './shared/utils';
export {
  RoyCSSProviders,
  ToastProvider,
  RoyCSSThemeProvider,
  RegistryProvider,
  useToastContext,
  useRoyCSSTheme,
  useComponentRegistry,
  useToast,
} from './shared/providers';
export type {
  ToastContextValue,
  ThemeContextValue,
  RegistryContextValue,
  RoyCSSThemeConfig,
  RoyCSSProvidersProps,
} from './shared/providers';

// Types
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
} from '@/lib/roycss/types';
