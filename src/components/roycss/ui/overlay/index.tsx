/**
 * ROYCSS Overlay Components
 * @module roycss/ui/overlay
 * @description Modal, Drawer, Toast notification components
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn, generateId, scrollLock, focusTrap } from '@/components/roycss/shared/utils';
import type { ModalSize, DrawerPosition, ToastNotification, ToastType } from '@/lib/roycss/types';

// ============================================================================
// Modal Component
// ============================================================================

export interface ModalProps {
  /** Open state */
  open: boolean;
  /** On close callback */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Description for accessibility */
  description?: string;
  /** Size */
  size?: ModalSize;
  /** Close on backdrop click */
  closeOnBackdrop?: boolean;
  /** Close on escape key */
  closeOnEscape?: boolean;
  /** Show close button */
  showCloseButton?: boolean;
  /** Header content (overrides title) */
  header?: React.ReactNode;
  /** Footer content */
  footer?: React.ReactNode;
  /** Loading state */
  loading?: boolean;
  /** Class names */
  className?: string;
  /** Content class names */
  contentClassName?: string;
  /** Children */
  children: React.ReactNode;
}

const modalSizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]',
  auto: 'max-w-fit',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  header,
  footer,
  loading = false,
  className,
  contentClassName,
  children,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Handle escape key
  useEffect(() => {
    if (!open || !closeOnEscape) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, closeOnEscape, onClose]);

  // Handle focus trap and scroll lock
  useEffect(() => {
    if (open && modalRef.current) {
      cleanupRef.current = focusTrap.create(modalRef.current);
      scrollLock.enable();
    }

    return () => {
      cleanupRef.current?.();
      scrollLock.disable();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        ref={modalRef}
        className={cn(
          'relative z-10 w-full rounded-lg bg-background shadow-xl border animate-in zoom-in-95 fade-in-0 duration-200',
          modalSizes[size],
          size === 'full' && 'flex flex-col',
          className
        )}
      >
        {/* Header */}
        {(title || header || showCloseButton) && (
          <div className="flex items-start justify-between p-4 md:p-6 border-b">
            <div className="space-y-1">
              {header ?? (
                <>
                  {title && (
                    <h2 id="modal-title" className="text-lg font-semibold text-foreground">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p id="modal-description" className="text-sm text-muted-foreground">
                      {description}
                    </p>
                  )}
                </>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md hover:bg-accent transition-colors"
                aria-label="Close dialog"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div
          className={cn(
            'p-4 md:p-6 overflow-y-auto',
            size === 'full' && 'flex-1',
            contentClassName
          )}
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            children
          )}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-4 md:p-6 border-t">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Drawer Component
// ============================================================================

export interface DrawerProps {
  /** Open state */
  open: boolean;
  /** On close callback */
  onClose: () => void;
  /** Position */
  position?: DrawerPosition;
  /** Size */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Title */
  title?: string;
  /** Description */
  description?: string;
  /** Show close button */
  showCloseButton?: boolean;
  /** Header content */
  header?: React.ReactNode;
  /** Footer content */
  footer?: React.ReactNode;
  /** Close on backdrop click */
  closeOnBackdrop?: boolean;
  /** Class names */
  className?: string;
  /** Children */
  children: React.ReactNode;
}

const drawerSizes = {
  sm: position === 'left' || position === 'right' ? 'w-64' : 'h-64',
  md: position === 'left' || position === 'right' ? 'w-80' : 'h-80',
  lg: position === 'left' || position === 'right' ? 'w-96' : 'h-96',
  xl: position === 'left' || position === 'right' ? 'w-[480px]' : 'h-[480px]',
  full: position === 'left' || position === 'right' ? 'w-full' : 'h-full',
};

const positionClasses = {
  left: 'inset-y-0 left-0',
  right: 'inset-y-0 right-0',
  top: 'inset-x-0 top-0',
  bottom: 'inset-x-0 bottom-0',
};

const slideAnimations = {
  left: 'translate-x-0 -translate-x-full',
  right: 'translate-x-0 translate-x-full',
  top: 'translate-y-0 -translate-y-full',
  bottom: 'translate-y-0 translate-y-full',
};

export function Drawer({
  open,
  onClose,
  position = 'right',
  size = 'md',
  title,
  description,
  showCloseButton = true,
  header,
  footer,
  closeOnBackdrop = true,
  className,
  children,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Handle escape key
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Handle scroll lock
  useEffect(() => {
    if (open) {
      scrollLock.enable();
    }
    return () => scrollLock.disable();
  }, [open]);

  if (!open) return null;

  const isHorizontal = position === 'left' || position === 'right';

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Drawer'}
        className={cn(
          'absolute bg-background shadow-xl border transition-transform duration-300 ease-out',
          positionClasses[position],
          drawerSizes[size].replace('w-', '').replace('h-', ''), // Will be handled properly below
          isHorizontal ? `h-full ${size === 'sm' ? 'w-64' : size === 'md' ? 'w-80' : size === 'lg' ? 'w-96' : size === 'xl' ? 'w-[480px]' : 'w-full'}` : `w-full ${size === 'sm' ? 'h-64' : size === 'md' ? 'h-80' : size === 'lg' ? 'h-96' : size === 'xl' ? 'h-[480px]' : 'h-full'}`,
          className
        )}
        style={{
          transform: open ? 'translate(0)' : undefined,
        }}
      >
        {/* Header */}
        {(title || header || showCloseButton) && (
          <div className="flex items-center justify-between p-4 border-b">
            {header ?? (
              <div>
                {title && (
                  <h2 className="text-lg font-semibold">{title}</h2>
                )}
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>
            )}

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md hover:bg-accent"
                aria-label="Close drawer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={`overflow-y-auto ${isHorizontal ? 'h-[calc(100%-120px)]' : ''} p-4`}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Toast System Component
// ============================================================================

export interface ToastContainerProps {
  /** Toast notifications */
  toasts: ToastNotification[];
  /** Remove toast callback */
  onRemove: (id: string) => void;
  /** Position */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  /** Class names */
  className?: string;
}

const toastIcons: Record<ToastType, React.ReactNode> = {
  success: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  ),
};

const toastColors: Record<ToastType, string> = {
  success: 'border-success/30 bg-success/10 text-success',
  error: 'border-destructive/30 bg-destructive/10 text-destructive',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  info: 'border-info/30 bg-info/10 text-info',
};

const positionClassesMap = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
};

export function ToastContainer({
  toasts,
  onRemove,
  position = 'top-right',
  className,
}: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className={cn(
        'fixed z-[100] flex flex-col gap-2 w-full max-w-sm',
        positionClassesMap[position],
        className
      )}
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-start gap-3 rounded-lg border p-4 shadow-lg animate-in slide-in-from-top fade-in duration-300',
            toastColors[toast.type]
          )}
          role="alert"
        >
          <span className="flex-shrink-0 mt-0.5">{toastIcons[toast.type]}</span>
          
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{toast.title}</p>
            {toast.message && (
              <p className="text-sm opacity-90 mt-0.5">{toast.message}</p>
            )}
            
            {toast.action && (
              <button
                type="button"
                onClick={toast.action.onClick}
                className="mt-2 text-sm font-medium underline hover:no-underline"
              >
                {toast.action.label}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => onRemove(toast.id)}
            className="flex-shrink-0 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
            aria-label="Dismiss notification"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Popover Component
// ============================================================================

export interface PopoverProps {
  /** Trigger element */
  trigger: React.ReactNode;
  /** Popover content */
  content: React.ReactNode;
  /** Open state (controlled) */
  open?: boolean;
  /** On open change */
  onOpenChange?: (open: boolean) => void;
  /** Position */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Alignment */
  align?: 'start' | 'center' | 'end';
  /** Offset from trigger */
  offset?: number;
  /** Show arrow */
  showArrow?: boolean;
  /** Class names */
  className?: string;
  /** Content class names */
  contentClassName?: string;
}

export function Popover({
  trigger,
  content,
  open: propOpen,
  onOpenChange,
  side = 'bottom',
  align = 'center',
  offset = 8,
  showArrow = false,
  className,
  contentClassName,
}: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = propOpen ?? internalOpen;
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        handleClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleToggle = () => {
    const newState = !open;
    setInternalOpen(newState);
    onOpenChange?.(newState);
  };

  const handleClose = () => {
    setInternalOpen(false);
    onOpenChange?.(false);
  };

  const sideClasses = {
    top: 'bottom-full mb-' + offset,
    bottom: 'top-full mt-' + offset,
    left: 'right-full mr-' + offset,
    right: 'left-full ml-' + offset,
  };

  const alignClasses = {
    start: side === 'top' || side === 'bottom' ? 'left-0' : 'top-0',
    center: side === 'top' || side === 'bottom' ? 'left-1/2 -translate-x-1/2' : 'top-1/2 -translate-y-1/2',
    end: side === 'top' || side === 'bottom' ? 'right-0' : 'bottom-0',
  };

  return (
    <div ref={popoverRef} className={cn('relative inline-block', className)}>
      {/* Trigger */}
      <div onClick={handleToggle}>{trigger}</div>

      {/* Content */}
      {open && (
        <div
          className={cn(
            'absolute z-50 w-max min-w-[200px] rounded-lg bg-background border shadow-lg p-4 animate-in fade-in-0 zoom-in-95 duration-200',
            sideClasses[side],
            alignClasses[align],
            contentClassName
          )}
          role="tooltip"
        >
          {content}
          
          {showArrow && (
            <div
              className={cn(
                'absolute w-2 h-2 bg-background border rotate-45',
                side === 'bottom' && '-top-1 border-r-0 border-t-0',
                side === 'top' && '-bottom-1 border-l-0 border-b-0',
                side === 'left' && '-right-1 border-t-0 border-r-0',
                side === 'right' && '-left-1 border-b-0 border-l-0'
              )}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Tooltip Component
// ============================================================================

export interface TooltipProps {
  /** Content to wrap */
  children: React.ReactNode;
  /** Tooltip content */
  content: React.ReactNode;
  /** Position */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Delay in ms */
  delay?: number;
  /** Disabled */
  disabled?: boolean;
  /** Class names */
  className?: string;
}

export function Tooltip({
  children,
  content,
  side = 'top',
  delay = 200,
  disabled = false,
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const showTooltip = () => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const hideTooltip = () => {
    clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      
      {isVisible && !disabled && (
        <div
          className={cn(
            'absolute z-50 px-2 py-1 text-xs font-medium text-primary-foreground bg-foreground rounded shadow-md whitespace-nowrap animate-in fade-in-0 zoom-in-95 duration-150',
            side === 'top' && 'bottom-full left-1/2 -translate-x-1/2 mb-1',
            side === 'bottom' && 'top-full left-1/2 -translate-x-1/2 mt-1',
            side === 'left' && 'right-full top-1/2 -translate-y-1/2 mr-1',
            side === 'right' && 'left-full top-1/2 -translate-y-1/2 ml-1',
            className
          )}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  );
}

export default Modal;
