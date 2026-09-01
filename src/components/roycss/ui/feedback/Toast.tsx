/**
 * Toast Component
 * @module roycss/ui/feedback/Toast
 * @description Toast notification system
 */

'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastOptions {
  /** Toast ID (auto-generated if not provided) */
  id?: string;
  /** Toast type */
  type?: ToastType;
  /** Title */
  title?: string;
  /** Message */
  message?: string;
  /** Duration in ms (0 for persistent) */
  duration?: number;
  /** Action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Dismissible */
  dismissible?: boolean;
  /** On close callback */
  onClose?: () => void;
  /** Custom icon */
  icon?: React.ReactNode;
  /** Position in toast container */
  position?: ToastPosition;
}

export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

export interface ToastItem extends ToastOptions {
  id: string;
  createdAt: Date;
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (options: ToastOptions) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

// ============================================================================
// Context
// ============================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ============================================================================
// Provider
// ============================================================================

export interface ToastProviderProps {
  children: React.ReactNode;
  /** Default position for toasts */
  defaultPosition?: ToastPosition;
  /** Maximum visible toasts */
  maxToasts?: number;
  /** Custom class name for container */
  className?: string;
}

let toastCounter = 0;

export function ToastProvider({
  children,
  defaultPosition = 'top-right',
  maxToasts = 5,
  className,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const addToast = useCallback((options: ToastOptions): string => {
    const id = options.id || `toast-${++toastCounter}`;
    const newToast: ToastItem = {
      ...options,
      id,
      createdAt: new Date(),
      type: options.type || 'info',
      duration: options.duration ?? 5000,
      dismissible: options.dismissible !== false,
    };

    setToasts((prev) => {
      const updated = [...prev, newToast];
      // Limit max toasts
      if (updated.length > maxToasts) {
        return updated.slice(-maxToasts);
      }
      return updated;
    });

    // Auto-dismiss
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
        options.onClose?.();
      }, newToast.duration);
    }

    return id;
  }, [maxToasts, removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      
      {/* Toast Container */}
      <ToastContainer
        toasts={toasts}
        onRemove={removeToast}
        position={defaultPosition}
        className={className}
      />
    </ToastContext.Provider>
  );
}

// ============================================================================
// Container Component
// ============================================================================

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
  position: ToastPosition;
  className?: string;
}

const positionClasses: Record<ToastPosition, string> = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
};

const typeStyles: Record<ToastType, string> = {
  success: 'border-success/30 bg-success/10 text-success',
  error: 'border-destructive/30 bg-destructive/10 text-destructive',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  info: 'border-info/30 bg-info/10 text-info',
  loading: 'border-muted bg-muted text-foreground',
};

const typeIcons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5" />,
  error: <AlertCircle className="h-5 w-5" />,
  warning: <AlertTriangle className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />,
  loading: <Loader2 className="h-5 w-5 animate-spin" />,
};

function ToastContainer({ toasts, onRemove, position, className }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className={cn(
        'fixed z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none',
        positionClasses[position],
        className
      )}
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

// ============================================================================
// Individual Toast Item
// ============================================================================

interface ToastItemProps {
  toast: ToastItem;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isExiting, setIsExiting] = React.useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(toast.id);
      toast.onClose?.();
    }, 300); // Wait for exit animation
  };

  return (
    <div
      className={cn(
        'pointer-events-auto w-full rounded-lg border p-4 shadow-lg backdrop-blur-sm',
        'animate-in slide-in-from-top-2 fade-in duration-300',
        isExiting && 'animate-out slide-out-to-top-2 fade-out duration-300',
        typeStyles[toast.type]
      )}
      role="alert"
      aria-label={toast.title || toast.message || 'Notification'}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="shrink-0 mt-0.5">
          {toast.icon || typeIcons[toast.type]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          {toast.title && (
            <p className="font-semibold text-sm leading-tight">{toast.title}</p>
          )}
          {toast.message && (
            <p className="text-sm opacity-90 leading-snug">{toast.message}</p>
          )}

          {/* Action */}
          {toast.action && (
            <button
              type="button"
              onClick={toast.action.onClick}
              className="text-sm font-medium underline underline-offset-4 hover:no-underline mt-1"
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {/* Dismiss Button */}
        {toast.dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 p-0.5 rounded opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Progress bar for auto-dismiss */}
      {toast.duration && toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-current opacity-20 rounded-b-lg overflow-hidden">
          <div
            className="h-full bg-current opacity-50"
            style={{
              animation: `toast-progress ${toast.duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Convenience hooks
// ============================================================================

interface UseToastReturn {
  toast: (options: ToastOptions) => string;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
  loading: (message: string, title?: string) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

export function useToastActions(): UseToastReturn {
  const { addToast, removeToast, clearToasts } = useToast();

  return {
    toast: addToast,
    success: (message, title) => addToast({ type: 'success', message, title }),
    error: (message, title) => addToast({ type: 'error', message, title }),
    warning: (message, title) => addToast({ type: 'warning', message, title }),
    info: (message, title) => addToast({ type: 'info', message, title }),
    loading: (message, title) => addToast({ type: 'loading', message, title, duration: 0 }),
    dismiss: removeToast,
    dismissAll: clearToasts,
  };
}

export default ToastProvider;
