/**
 * ROYCSS Feedback Components
 * @module roycss/ui/feedback
 * @description Alert banners, empty states, confirmation dialogs, error boundaries
 */

'use client';

import React from 'react';
import { cn } from '@/components/roycss/shared/utils';
import type { AlertSeverity, EmptyStateStyle } from '@/lib/roycss/types';

// ============================================================================
// Alert Component
// ============================================================================

export interface AlertProps {
  /** Severity level */
  severity: AlertSeverity;
  /** Alert title */
  title?: string;
  /** Alert message */
  children: React.ReactNode;
  /** Icon (auto if not provided) */
  icon?: React.ReactNode;
  /** Dismissible */
  dismissible?: boolean;
  /** On dismiss callback */
  onDismiss?: () => void;
  /** Action button */
  action?: React.ReactNode;
  /** Class names */
  className?: string;
}

const alertIcons: Record<AlertSeverity, React.ReactNode> = {
  info: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  ),
  success: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
};

const alertColors: Record<AlertSeverity, string> = {
  info: 'bg-info/10 text-info border-info/30',
  success: 'bg-success/10 text-success border-success/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  error: 'bg-destructive/10 text-destructive border-destructive/30',
};

export function Alert({
  severity,
  title,
  children,
  icon,
  dismissible = false,
  onDismiss,
  action,
  className,
}: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4 animate-in fade-in-0 duration-200',
        alertColors[severity],
        className
      )}
    >
      {/* Icon */}
      <span className="flex-shrink-0 mt-0.5">{icon ?? alertIcons[severity]}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="font-semibold text-sm mb-1">{title}</h4>
        )}
        <div className="text-sm opacity-90">{children}</div>
        
        {action && <div className="mt-3">{action}</div>}
      </div>

      {/* Dismiss Button */}
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          className="flex-shrink-0 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
          aria-label="Dismiss alert"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

export interface EmptyStateProps {
  /** Illustration style */
  style?: EmptyStateStyle;
  /** Custom illustration */
  illustration?: React.ReactNode;
  /** Title */
  title: string;
  /** Description */
  description?: string;
  /** Primary action */
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Secondary action */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Class names */
  className?: string;
}

function DefaultIllustration() {
  return (
    <svg
      className="w-24 h-24 text-muted-foreground/30"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  );
}

export function EmptyState({
  style = 'minimal',
  illustration,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: EmptyStateProps) {
  const isDetailed = style === 'detailed';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-4',
        isDetailed ? 'max-w-md mx-auto' : '',
        className
      )}
    >
      {/* Illustration */}
      <div className="mb-4">
        {illustration ?? (isDetailed ? <DetailedIllustration /> : <DefaultIllustration />)}
      </div>

      {/* Content */}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      )}

      {/* Actions */}
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap gap-3 justify-center">
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
          
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              {primaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function DetailedIllustration() {
  return (
    <div className="relative w-48 h-40">
      {/* Background shape */}
      <div className="absolute inset-0 bg-muted/50 rounded-full transform scale-x-150" />
      
      {/* Document icon */}
      <svg
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 text-muted-foreground/40"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      
      {/* Decorative elements */}
      <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-primary/20" />
      <div className="absolute bottom-6 left-6 w-2 h-2 rounded-full bg-warning/30" />
    </div>
  );
}

// ============================================================================
// Confirmation Dialog Component
// ============================================================================

export interface ConfirmDialogProps {
  /** Open state */
  open: boolean;
  /** On close callback */
  onClose: () => void;
  /** On confirm callback */
  onConfirm: () => void | Promise<void>;
  /** Dialog title */
  title: string;
  /** Description/message */
  message?: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Variant */
  variant?: 'default' | 'destructive' | 'warning';
  /** Loading state */
  loading?: boolean;
  /** Confirm button is dangerous */
  danger?: boolean;
  /** Icon */
  icon?: React.ReactNode;
}

const confirmIcons = {
  default: null,
  destructive: (
    <span className="p-2 rounded-full bg-destructive/10 text-destructive">
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </span>
  ),
  warning: (
    <span className="p-2 rounded-full bg-warning/10 text-warning">
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </span>
  ),
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
  danger = false,
  icon,
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirmation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md mx-4 rounded-lg bg-background shadow-xl border animate-in zoom-in-95 fade-in-0 duration-200">
        <div className="p-6">
          {/* Header with Icon */}
          <div className="flex items-start gap-4 mb-4">
            {(icon ?? confirmIcons[variant]) && (
              <div className="flex-shrink-0">{icon ?? confirmIcons[variant]}</div>
            )}
            
            <div className="flex-1 min-w-0">
              <h2 id="confirm-title" className="text-lg font-semibold text-foreground">
                {title}
              </h2>
              
              {message && (
                <p id="confirm-message" className="mt-2 text-sm text-muted-foreground">
                  {message}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
            
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50',
                danger || variant === 'destructive'
                  ? 'bg-destructive text-white hover:bg-destructive/90'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
            >
              {isLoading ? 'Processing...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Error Boundary Component
// ============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Fallback UI when error occurs */
  fallback?: React.ReactNode | ((error: Error, resetError: () => void) => React.ReactNode);
  /** Callback on error */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class ErrorBoundaryInner extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback(this.state.error!, this.resetError)
          : this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
          <div className="p-3 rounded-full bg-destructive/10 mb-4">
            <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h3 className="text-lg font-semibold text-foreground mb-2">Something went wrong</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-4">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          
          <button
            type="button"
            onClick={this.resetError}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorBoundaryInner {...props} />;
}

// ============================================================================
// Success Animation Component
// ============================================================================

export interface SuccessAnimationProps {
  /** Show animation */
  show: boolean;
  /** Message */
  message?: string;
  /** Duration in ms before auto-hide */
  duration?: number;
  /** On complete callback */
  onComplete?: () => void;
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  /** Class names */
  className?: string;
}

export function SuccessAnimation({
  show,
  message,
  duration = 3000,
  onComplete,
  size = 'md',
  className,
}: SuccessAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onComplete]);

  if (!show && !isVisible) return null;

  const sizes = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-in fade-in-0',
        className
      )}
    >
      <div className="flex flex-col items-center gap-4 bg-background rounded-xl shadow-xl p-8 animate-in zoom-in-95 fade-in-0 duration-300">
        {/* Checkmark Animation */}
        <div className={cn('relative', sizes[size])}>
          <svg
            className={cn(
              'w-full h-full text-success',
              isVisible && 'animate-bounce-in'
            )}
            viewBox="0 0 52 52"
            fill="none"
          >
            <circle cx="26" cy="26" r="25" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" />
            <path
              className="checkmark-path"
              d="M14 27l8 8 16-16"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 48,
                strokeDashoffset: isVisible ? 0 : 48,
                transition: 'stroke-dashoffset 0.5s ease-out 0.2s',
              }}
            />
          </svg>
        </div>

        {message && (
          <p className="text-lg font-medium text-foreground animate-in fade-in-0 slide-in-from-bottom-2 delay-200">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export default Alert;
