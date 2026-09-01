/**
 * RadioGroup Component
 * @module roycss/ui/form/RadioGroup
 * @description Radio buttons with custom styling
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface RadioOption {
  /** Option value */
  value: string;
  /** Option label */
  label: string;
  /** Description text */
  description?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Optional icon */
  icon?: React.ReactNode;
}

export interface RadioGroupProps {
  /** Group label */
  label?: string;
  /** Selected value */
  value: string;
  /** On change handler */
  onChange: (value: string) => void;
  /** Available options */
  options: RadioOption[];
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Disabled state for entire group */
  disabled?: boolean;
  /** Required field */
  required?: boolean;
  /** Group name */
  name?: string;
  /** Orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Custom class name */
  className?: string;
  /** Group ID */
  id?: string;
  /** Display style */
  variant?: 'default' | 'card' | 'button';
  /** Size */
  size?: 'sm' | 'md' | 'lg';
}

export function RadioGroup({
  label,
  value,
  onChange,
  options,
  error,
  helperText,
  disabled = false,
  required = false,
  name,
  orientation = 'vertical',
  className,
  id,
  variant = 'default',
  size = 'md',
}: RadioGroupProps) {
  const groupId = id || `radio-group-${label?.replace(/\s+/g, '-').toLowerCase()}`;
  const errorId = `${groupId}-error`;

  const hasError = !!error;
  const isSelected = (optionValue: string) => value === optionValue;

  const sizeClasses = {
    sm: {
      radio: 'h-3.5 w-3.5',
      dot: 'h-1.5 w-1.5',
      text: 'text-xs',
      gap: 'gap-1.5',
    },
    md: {
      radio: 'h-4 w-4',
      dot: 'h-2 w-2',
      text: 'text-sm',
      gap: 'gap-2',
    },
    lg: {
      radio: 'h-5 w-5',
      dot: 'h-2.5 w-2.5',
      text: 'text-base',
      gap: 'gap-2.5',
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={cn('space-y-2', className)} role="radiogroup" aria-labelledby={`${groupId}-label`}>
      {/* Group Label */}
      {label && (
        <span
          id={`${groupId}-label`}
          className={cn('font-medium text-foreground', currentSize.text)}
        >
          {label}
          {required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}
        </span>
      )}

      {/* Options Container */}
      <div
        className={cn(
          orientation === 'horizontal' ? 'flex flex-wrap gap-4' : 'space-y-2',
          variant === 'card' && 'grid grid-cols-1 sm:grid-cols-2 gap-2'
        )}
        role="group"
        aria-invalid={hasError}
      >
        {options.map((option) => {
          const selected = isSelected(option.value);
          const optionDisabled = disabled || option.disabled;

          if (variant === 'card') {
            return (
              <label
                key={option.value}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-all',
                  selected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-input hover:border-border',
                  optionDisabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={selected}
                  disabled={optionDisabled}
                  onChange={() => onChange(option.value)}
                  className="sr-only"
                  aria-describedby={option.description ? `${groupId}-${option.value}-desc` : undefined}
                />
                <div
                  className={cn(
                    'mt-0.5 flex shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    currentSize.radio,
                    selected
                      ? 'border-primary'
                      : 'border-muted-foreground/30'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-full bg-primary transition-transform',
                      currentSize.dot,
                      selected ? 'scale-100' : 'scale-0'
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {option.icon}
                    <span className={cn('font-medium text-foreground', currentSize.text)}>
                      {option.label}
                    </span>
                  </div>
                  {option.description && (
                    <p
                      id={`${groupId}-${option.value}-desc`}
                      className={cn('text-muted-foreground mt-0.5', currentSize.text)}
                    >
                      {option.description}
                    </p>
                  )}
                </div>
              </label>
            );
          }

          if (variant === 'button') {
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={optionDisabled}
                onClick={() => onChange(option.value)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-md px-4 py-2 font-medium transition-all border',
                  currentSize.text,
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background text-foreground hover:bg-accent',
                  optionDisabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {option.icon}
                {option.label}
              </button>
            );
          }

          // Default variant
          return (
            <label
              key={option.value}
              className={cn(
                'flex items-center cursor-pointer',
                currentSize.gap,
                optionDisabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                disabled={optionDisabled}
                onChange={() => onChange(option.value)}
                className={cn(
                  'rounded-full border transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  currentSize.radio,
                  selected
                    ? 'border-primary'
                    : 'border-input'
                )}
                aria-describedby={option.description ? `${groupId}-${option.value}-desc` : undefined}
              />
              <div
                className={cn(
                  'flex items-center justify-center rounded-full pointer-events-none',
                  currentSize.dot,
                  selected ? 'bg-primary' : 'transparent',
                  selected && 'absolute'
                )}
              />
              <div className="flex items-center gap-1.5">
                {option.icon}
                <span className={cn('text-foreground', currentSize.text)}>
                  {option.label}
                </span>
              </div>
              {option.description && (
                <span
                  id={`${groupId}-${option.value}-desc`}
                  className={cn('text-muted-foreground', currentSize.text)}
                >
                  ({option.description})
                </span>
              )}
            </label>
          );
        })}
      </div>

      {/* Error Message */}
      {hasError && (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {/* Helper Text */}
      {helperText && !hasError && (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}

export default RadioGroup;
