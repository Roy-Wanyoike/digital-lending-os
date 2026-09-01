/**
 * ToggleSwitch Component
 * @module roycss/ui/form/ToggleSwitch
 * @description On/off toggle switch
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface ToggleSwitchProps {
  /** Toggle label */
  label?: string;
  /** Description text */
  description?: string;
  /** Checked state */
  checked: boolean;
  /** On change handler */
  onChange: (checked: boolean) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Required field */
  required?: boolean;
  /** Toggle name */
  name?: string;
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  /** Label position */
  labelPosition?: 'left' | 'right' | 'top' | 'bottom';
  /** Custom class name */
  className?: string;
  /** Toggle ID */
  id?: string;
  /** On color (when checked) */
  activeColor?: string;
  /** Track color (when unchecked) */
  inactiveColor?: string;
  /** Thumb color */
  thumbColor?: string;
  /** Show aria label for screen readers */
  ariaLabel?: string;
  /** Loading state */
  loading?: boolean;
}

export function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  required = false,
  name,
  size = 'md',
  labelPosition = 'right',
  className,
  id,
  loading = false,
  ariaLabel,
}: ToggleSwitchProps) {
  const toggleId = id || `toggle-${label?.replace(/\s+/g, '-').toLowerCase()}`;

  const sizes = {
    sm: {
      track: 'h-5 w-9',
      thumb: 'h-3.5 w-3.5',
      translate: 'translate-x-4',
    },
    md: {
      track: 'h-6 w-11',
      thumb: 'h-4 w-4',
      translate: 'translate-x-5',
    },
    lg: {
      track: 'h-7 w-13',
      thumb: 'h-5 w-5',
      translate: 'translate-x-6',
    },
  };

  const currentSize = sizes[size];

  const isVertical = labelPosition === 'top' || labelPosition === 'bottom';

  return (
    <div
      className={cn(
        'flex items-center gap-3',
        isVertical ? 'flex-col items-start gap-1' : labelPosition === 'left' && 'flex-row-reverse',
        className
      )}
    >
      {/* Label (top/bottom or left) */}
      {label && (labelPosition === 'top' || labelPosition === 'left') && (
        <div className={cn(isVertical ? 'order-1' : '')}>
          <label
            htmlFor={toggleId}
            className="text-sm font-medium text-foreground cursor-pointer"
          >
            {label}
            {required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}
          </label>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      {/* Toggle Switch */}
      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || label}
        aria-disabled={disabled || loading}
        disabled={disabled || loading}
        onClick={() => !disabled && !loading && onChange(!checked)}
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          currentSize.track,
          checked ? 'bg-primary' : 'bg-input'
        )}
      >
        {/* Thumb */}
        <span
          className={cn(
            'pointer-events-none inline-block rounded-full bg-background shadow-lg transform ring-0 transition duration-200 ease-in-out',
            currentSize.thumb,
            checked ? currentSize.translate : 'translate-x-0',
            loading && 'animate-pulse'
          )}
        >
          {loading && (
            <svg
              className="animate-spin h-full w-full text-muted-foreground p-0.5"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
        </span>
      </button>

      {/* Label (right or bottom) */}
      {label && (labelPosition === 'right' || labelPosition === 'bottom') && (
        <div className={cn(labelPosition === 'bottom' && 'order-3')}>
          <label
            htmlFor={toggleId}
            className="text-sm font-medium text-foreground cursor-pointer"
          >
            {label}
            {required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}
          </label>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      {/* Hidden input for form submission */}
      <input
        type="hidden"
        name={name}
        value={checked ? 'on' : 'off'}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}

export default ToggleSwitch;
