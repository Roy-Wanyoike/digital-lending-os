/**
 * ROYCSS Feedback Components
 * @module roycss/ui/feedback
 * @description Export all feedback components
 */

// New feedback components
export { AlertBanner, InlineAlert } from './AlertBanner';
export type {
  AlertBannerProps,
  AlertBannerVariant,
  InlineAlertProps,
} from './AlertBanner';

export {
  ToastProvider,
  useToast,
  useToastActions,
} from './Toast';
export type {
  ToastOptions,
  ToastType,
  ToastPosition,
  ToastItem,
  ToastProviderProps,
  UseToastReturn,
} from './Toast';

export {
  LoadingSpinner,
  DotsSpinner,
  PulseSpinner,
  SkeletonLoader,
  PageLoader,
} from './LoadingSpinner';
export type {
  LoadingSpinnerProps,
  DotsSpinnerProps,
  PulseSpinnerProps,
  SkeletonLoaderProps,
  PageLoaderProps,
  SpinnerSize,
  SpinnerVariant,
} from './LoadingSpinner';

// Existing feedback components (re-export from original file)
export {
  Alert,
  EmptyState,
  ConfirmDialog,
  ErrorBoundary,
  SuccessAnimation,
} from './feedback-legacy';
export type {
  AlertProps,
  EmptyStateProps,
  ConfirmDialogProps,
  ErrorBoundaryProps,
  SuccessAnimationProps,
} from './feedback-legacy';
