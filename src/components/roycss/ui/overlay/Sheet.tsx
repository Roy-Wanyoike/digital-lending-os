/**
 * Sheet Component
 * @module roycss/ui/overlay/Sheet
 * @description Full-screen overlay panel
 */

'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export type SheetSide = 'top' | 'bottom' | 'left' | 'right';
export type SheetSize = 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'content';

export interface SheetProps {
  /** Open state */
  open: boolean;
  /** On close callback */
  onClose: () => void;
  /** Which side sheet slides in from */
  side?: SheetSide;
  /** Size of the sheet */
  size?: SheetSize;
  /** Sheet title */
  title?: string;
  /** Description for accessibility */
  description?: string;
  /** Show close button */
  showCloseButton?: boolean;
  /** Header content (overrides title) */
  header?: React.ReactNode;
  /** Footer content */
  footer?: React.ReactNode;
  /** Close on backdrop click */
  closeOnBackdrop?: boolean;
  /** Close on escape key */
  closeOnEscape?: boolean;
  /** Trap focus inside sheet */
  trapFocus?: boolean;
  /** Lock body scroll when open */
  lockScroll?: boolean;
  /** Children content */
  children: React.ReactNode;
  /** Custom class name */
  className?: string;
  /** Content class name */
  contentClassName?: string;
  /** Z-index value */
  zIndex?: number;
}

const sidePositions: Record<SheetSide, string> = {
  top: 'inset-x-0 top-0',
  bottom: 'inset-x-0 bottom-0',
  left: 'inset-y-0 left-0',
  right: 'inset-y-0 right-0',
};

const sizeDimensions: Record<SheetSide, Record<SheetSize, string>> = {
  top: {
    sm: 'h-[25vh]',
    md: 'h-[50vh]',
    lg: 'h-[75vh]',
    xl: 'h-[90vh]',
    full: 'h-screen',
    content: 'h-auto max-h-[90vh]',
  },
  bottom: {
    sm: 'h-[25vh]',
    md: 'h-[50vh]',
    lg: 'h-[75vh]',
    xl: 'h-[90vh]',
    full: 'h-screen',
    content: 'h-auto max-h-[90vh]',
  },
  left: {
    sm: 'w-[25vw]',
    md: 'w-[400px]',
    lg: 'w-[500px]',
    xl: 'w-[600px]',
    full: 'w-screen',
    content: 'w-auto max-w-[90vw]',
  },
  right: {
    sm: 'w-[25vw]',
    md: 'w-[400px]',
    lg: 'w-[500px]',
    xl: 'w-[600px]',
    full: 'w-screen',
    content: 'w-auto max-w-[90vw]',
  },
};

const slideAnimations: Record<SheetSide, { enter: string; exit: string }> = {
  top: {
    enter: 'animate-in slide-in-from-top',
    exit: 'animate-out slide-out-to-top',
  },
  bottom: {
    enter: 'animate-in slide-in-from-bottom',
    exit: 'animate-out slide-out-to-bottom',
  },
  left: {
    enter: 'animate-in slide-in-from-left',
    exit: 'animate-out slide-out-to-left',
  },
  right: {
    enter: 'animate-in slide-in-from-right',
    exit: 'animate-out slide-out-to-right',
  },
};

export function Sheet({
  open,
  onClose,
  side = 'right',
  size = 'md',
  title,
  description,
  showCloseButton = true,
  header,
  footer,
  closeOnBackdrop = true,
  closeOnEscape = true,
  trapFocus = true,
  lockScroll = true,
  children,
  className,
  contentClassName,
  zIndex = 50,
}: SheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  // Handle tab trapping
  const handleTabKey = useCallback((e: KeyboardEvent) => {
    if (!trapFocus || !sheetRef.current) return;

    const focusableElements = sheetRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement?.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement?.focus();
    }
  }, [trapFocus]);

  // Effects
  useEffect(() => {
    if (!open) return;

    // Store previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    if (trapFocus) {
      document.addEventListener('keydown', handleTabKey);
    }

    // Lock scroll
    if (lockScroll) {
      document.body.style.overflow = 'hidden';
    }

    // Focus first element
    if (sheetRef.current) {
      const firstFocusable = sheetRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleTabKey);

      // Restore scroll
      if (lockScroll) {
        document.body.style.overflow = '';
      }

      // Restore focus
      previousFocusRef.current?.focus();
    };
  }, [open, handleKeyDown, handleTabKey, trapFocus, lockScroll]);

  if (!open) return null;

  const isHorizontal = side === 'left' || side === 'right';

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'sheet-title' : undefined}
      aria-describedby={description ? 'sheet-description' : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
        style={{ zIndex }}
      />

      {/* Sheet Panel */}
      <div
        ref={sheetRef}
        className={cn(
          'fixed bg-background shadow-xl border flex flex-col',
          'transition-transform duration-300 ease-out',
          sidePositions[side],
          sizeDimensions[side][size],
          isHorizontal ? 'h-full' : 'w-full',
          slideAnimations[side].enter,
          className
        )}
        style={{ zIndex: zIndex + 1 }}
      >
        {/* Header */}
        {(title || header || showCloseButton) && (
          <div className="flex items-center justify-between p-4 border-b shrink-0">
            {header ?? (
              <div className="space-y-1">
                {title && (
                  <h2 id="sheet-title" className="text-lg font-semibold text-foreground">
                    {title}
                  </h2>
                )}
                {description && (
                  <p id="sheet-description" className="text-sm text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>
            )}

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-md hover:bg-accent transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div
          className={cn(
            'flex-1 overflow-y-auto p-4',
            contentClassName
          )}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 border-t p-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Sheet Trigger Button
// ============================================================================

export interface SheetTriggerProps {
  /** Open state */
  open: boolean;
  /** On toggle callback */
  onToggle: () => void;
  /** Trigger children */
  children: React.ReactNode;
  /** Disabled state */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
  /** Aria label */
  ariaLabel?: string;
}

export function SheetTrigger({
  open,
  onToggle,
  children,
  disabled = false,
  className,
  ariaLabel,
}: SheetTriggerProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={ariaLabel || 'Open sheet'}
      className={className}
    >
      {children}
    </button>
  );
}

// ============================================================================
// Sheet Components Compound
// ============================================================================

export interface SheetComponents {
  Root: React.FC<SheetProps>;
  Trigger: React.FC<SheetTriggerProps>;
  Header: React.FC<{ children: React.ReactNode; className?: string }>;
  Title: React.FC<{ children: React.ReactNode; className?: string }>;
  Description: React.FC<{ children: React.ReactNode; className?: string }>;
  Content: React.FC<{ children: React.ReactNode; className?: string }>;
  Footer: React.FC<{ children: React.ReactNode; className?: string }>;
  Close: React.FC<{ className?: string; ariaLabel?: string }>;
}

export const SheetComponents: SheetComponents = {
  Root: Sheet,
  Trigger: SheetTrigger,
  Header: ({ children, className }) => (
    <div className={cn('flex items-center justify-between p-4 border-b', className)}>
      {children}
    </div>
  ),
  Title: ({ children, className }) => (
    <h2 id="sheet-title" className={cn('text-lg font-semibold text-foreground', className)}>
      {children}
    </h2>
  ),
  Description: ({ children, className }) => (
    <p id="sheet-description" className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </p>
  ),
  Content: ({ children, className }) => (
    <div className={cn('flex-1 overflow-y-auto p-4', className)}>
      {children}
    </div>
  ),
  Footer: ({ children, className }) => (
    <div className={cn('shrink-0 border-t p-4', className)}>
      {children}
    </div>
  ),
  Close: ({ className, ariaLabel }) => (
    <button
      type="button"
      className={cn('p-2 rounded-md hover:bg-accent transition-colors', className)}
      aria-label={ariaLabel || 'Close'}
    >
      <X className="h-5 w-5" />
    </button>
  ),
};

export default Sheet;
