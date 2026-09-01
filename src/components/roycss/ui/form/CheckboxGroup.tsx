/**
 * CheckboxGroup Component
 * @module roycss/ui/form/CheckboxGroup
 * @description Checkboxes with group validation
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface CheckboxOption {
  /** Option value */
  value: string;
  /** Option label */
  label: string;
  /** Description text */
  description?: string;
  /** Disabled state */
  disabled?: boolean;
}

export interface CheckboxGroupProps {
  /** Group label */
  label?: string;
  /** Selected values */
  value: string[];
  /** On change handler */
  onChange: (values: string[]) => void;
  /** Available options */
  options: CheckboxOption[];
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
  /** Minimum selections required */
  minSelections?: number;
  /** Maximum selections allowed */
  maxSelections?: number;
  /** Custom class name */
  className?: string;
  /** Group ID */
  id?: string;
  /** Display style */
  variant?: 'default' | 'card' | 'toggle';
}

export function CheckboxGroup({
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
  minSelections,
  maxSelections,
  className,
  id,
  variant = 'default',
}: CheckboxGroupProps) {
  const groupId = id || `checkbox-group-${label?.replace(/\s+/g, '-').toLowerCase()}`;
  const errorId = `${groupId}-error`;

  const hasError = !!error;
  const isChecked = (optionValue: string) => value.includes(optionValue);

  const handleToggle = (optionValue: string) => {
    if (isChecked(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      if (maxSelections && value.length >= maxSelections) {
        return; // Max reached
      }
      onChange([...value, optionValue]);
    }
  };

  const isOptionDisabled = (option: CheckboxOption) => {
    if (disabled || option.disabled) return true;
    if (maxSelections && !isChecked(option.value) && value.length >= maxSelections) {
      return true;
    }
    return false;
  };

  return (
    <div className={cn('space-y-2', className)} role="group" aria-labelledby={`${groupId}-label`}>
      {/* Group Label */}
      {label && (
        <div className="flex items-center gap-2">
          <span
            id={`${groupId}-label`}
            className="text-sm font-medium text-foreground"
          >
            {label}
          </span>
          {required && <span className="text-destructive" aria-hidden="true">*</span>}
          {minSelections && (
            <span className="text-xs text-muted-foreground">
              (min. {minSelections})
            </span>
          )}
        </div>
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
          const checked = isChecked(option.value);
          const optionDisabled = isOptionDisabled(option);

          if (variant === 'card') {
            return (
              <label
                key={option.value}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all',
                  checked
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-input hover:border-border',
                  optionDisabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <input
                  type="checkbox"
                  name={name}
                  value={option.value}
                  checked={checked}
                  disabled={optionDisabled}
                  onChange={() => handleToggle(option.value)}
                  className="sr-only"
                  aria-describedby={option.description ? `${groupId}-${option.value}-desc` : undefined}
                />
                <div
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
                    checked
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30 bg-background'
                  )}
                >
                  {checked && <Check className="h-3 w-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">
                    {option.label}
                  </span>
                  {option.description && (
                    <p
                      id={`${groupId}-${option.value}-desc`}
                      className="text-xs text-muted-foreground mt-0.5"
                    >
                      {option.description}
                    </p>
                  )}
                </div>
              </label>
            );
          }

          if (variant === 'toggle') {
            return (
              <button
                key={option.value}
                type="button"
                role="checkbox"
                aria-checked={checked}
                disabled={optionDisabled}
                onClick={() => handleToggle(option.value)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all',
                  checked
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                  optionDisabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {option.label}
              </button>
            );
          }

          // Default variant
          return (
            <label
              key={option.value}
              className={cn(
                'flex items-center gap-2 cursor-pointer',
                optionDisabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <input
                type="checkbox"
                name={name}
                value={option.value}
                checked={checked}
                disabled={optionDisabled}
                onChange={() => handleToggle(option.value)}
                className={cn(
                  'h-4 w-4 rounded border transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  checked
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input'
                )}
                aria-describedby={option.description ? `${groupId}-${option.value}-desc` : undefined}
              />
              <span className="text-sm text-foreground">{option.label}</span>
              {option.description && (
                <span
                  id={`${groupId}-${option.value}-desc`}
                  className="text-xs text-muted-foreground"
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

export default CheckboxGroup;
