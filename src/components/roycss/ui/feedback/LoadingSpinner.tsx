/**
 * LoadingSpinner Component
 * @module roycss/ui/feedback/LoadingSpinner
 * @description Loading indicator with various styles
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// ============================================================================
// Spinner Types
// ============================================================================

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerVariant = 'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'muted';

export interface LoadingSpinnerProps {
  /** Size of spinner */
  size?: SpinnerSize;
  /** Color variant */
  variant?: SpinnerVariant;
  /** Label for screen readers */
  label?: string;
  /** Full width/centered container */
  centered?: boolean;
  /** Show as overlay */
  overlay?: boolean;
  /** Overlay background opacity */
  overlayOpacity?: 'light' | 'medium' | 'dark';
  /** Text below spinner */
  text?: string;
  /** Custom class name */
  className?: string;
}

const sizes: Record<SpinnerSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

const strokeWidths: Record<SpinnerSize, string> = {
  xs: '2',
  sm: '2',
  md: '2.5',
  lg: '3',
  xl: '3',
};

const variantColors: Record<SpinnerVariant, string> = {
  default: 'text-primary',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  muted: 'text-muted-foreground',
};

const overlayOpacities = {
  light: 'bg-white/50 dark:bg-gray-900/50',
  medium: 'bg-white/80 dark:bg-gray-900/80',
  dark: 'bg-white/95 dark:bg-gray-900/95',
};

export function LoadingSpinner({
  size = 'md',
  variant = 'default',
  label = 'Loading...',
  centered = false,
  overlay = false,
  overlayOpacity = 'medium',
  text,
  className,
}: LoadingSpinnerProps) {
  const spinnerElement = (
    <Loader2
      className={cn('animate-spin', sizes[size], variantColors[variant])}
      style={{ strokeWidth: strokeWidths[size] }}
    />
  );

  // Overlay mode
  if (overlay) {
    return (
      <div
        className={cn(
          'absolute inset-0 z-50 flex flex-col items-center justify-center gap-3',
          overlayOpacities[overlayOpacity],
          className
        )}
        role="status"
        aria-label={label}
      >
        {spinnerElement}
        {(text || label) && (
          <p className="text-sm text-muted-foreground">{text || label}</p>
        )}
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  // Centered mode
  if (centered) {
    return (
      <div
        className={cn('flex flex-col items-center justify-center gap-3 py-8', className)}
        role="status"
        aria-label={label}
      >
        {spinnerElement}
        {(text || label) && (
          <p className="text-sm text-muted-foreground">{text || label}</p>
        )}
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  // Default inline mode
  return (
    <>
      <span className={cn('inline-flex', className)} role="status">
        {spinnerElement}
        <span className="sr-only">{label}</span>
      </span>
    </>
  );
}

// ============================================================================
// Dots Spinner
// ============================================================================

export interface DotsSpinnerProps {
  /** Size */
  size?: SpinnerSize;
  /** Color variant */
  variant?: SpinnerVariant;
  /** Number of dots */
  dots?: 3 | 4;
  /** Screen reader label */
  label?: string;
  /** Custom class name */
  className?: string;
}

const dotSizes: Record<SpinnerSize, string> = {
  xs: 'h-1 w-1',
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
  lg: 'h-3 w-3',
  xl: 'h-4 w-4',
};

export function DotsSpinner({
  size = 'md',
  variant = 'default',
  dots = 3,
  label = 'Loading...',
  className,
}: DotsSpinnerProps) {
  return (
    <div
      className={cn('flex items-center gap-1', className)}
      role="status"
      aria-label={label}
    >
      {Array.from({ length: dots }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'rounded-full animate-bounce',
            dotSizes[size],
            variantColors[variant]
          )}
          style={{
            animationDelay: `${i * 150}ms`,
            animationDuration: '600ms',
          }}
        />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}

// ============================================================================
// Pulse Spinner
// ============================================================================

export interface PulseSpinnerProps {
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  /** Color variant */
  variant?: SpinnerVariant;
  /** Screen reader label */
  label?: string;
  /** Custom class name */
  className?: string;
}

const pulseSizes = {
  sm: 'h-6 w-6',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
};

export function PulseSpinner({
  size = 'md',
  variant = 'default',
  label = 'Loading...',
  className,
}: PulseSpinnerProps) {
  return (
    <div
      className={cn('relative inline-flex', className)}
      role="status"
      aria-label={label}
    >
      {/* Outer ring */}
      <span
        className={cn(
          'absolute inline-flex h-full w-full rounded-full opacity-75',
          pulseSizes[size],
          variantColors[variant],
          'animate-ping'
        )}
      />
      {/* Inner core */}
      <span
        className={cn(
          'relative inline-flex rounded-full',
          pulseSizes[size],
          variant === 'muted' ? 'bg-muted-foreground/30' : `bg-${variant === 'default' ? 'primary' : variant}/20`
        )}
        style={{
          backgroundColor:
            variant === 'muted'
              ? undefined
              : variant === 'default'
              ? 'hsl(var(--primary))'
              : variant === 'success'
              ? '#16a34a'
              : variant === 'warning'
              ? '#ca8a04'
              : variant === 'destructive'
              ? '#dc2626'
              : undefined,
        }}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

// ============================================================================
// Skeleton Loader (wrapper)
// ============================================================================

export interface SkeletonLoaderProps {
  /** Lines of skeleton */
  lines?: number;
  /** Width class */
  width?: string;
  /** Height class */
  height?: string;
  /** Custom class name */
  className?: string;
}

export function SkeletonLoader({
  lines = 3,
  width = 'full',
  height = 'base',
  className,
}: SkeletonLoaderProps) {
  const heightMap: Record<string, string> = {
    xs: 'h-2',
    sm: 'h-4',
    base: 'h-6',
    md: 'h-8',
    lg: 'h-12',
  };

  const widthMap: Record<string, string> = {
    full: 'w-full',
    '3/4': 'w-3/4',
    '1/2': 'w-1/2',
    '1/3': 'w-1/3',
    '1/4': 'w-1/4',
  };

  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded bg-muted animate-pulse',
            heightMap[height] || height,
            i === lines - 1 ? (widthMap['2/3'] || 'w-2/3') : (widthMap[width] || width)
          )}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Page Loader (full page loading state)
// ============================================================================

export interface PageLoaderProps {
  /** Text to display */
  text?: string;
  /** Variant */
  variant?: SpinnerVariant;
  /** Custom class name */
  className?: string;
}

export function PageLoader({
  text = 'Loading...',
  variant = 'default',
  className,
}: PageLoaderProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm',
        className
      )}
      role="status"
      aria-label={text}
    >
      <LoadingSpinner size="xl" variant={variant} />
      <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
    </div>
  );
}

export default LoadingSpinner;
