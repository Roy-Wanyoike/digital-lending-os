/**
 * TextArea Component
 * @module roycss/ui/form/TextArea
 * @description Multi-line input with character count
 */

'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface TextAreaProps {
  /** Textarea label */
  label?: string;
  /** Textarea value */
  value: string;
  /** On change handler */
  onChange: (value: string) => void;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Required field */
  required?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Textarea name */
  name?: string;
  /** Number of rows */
  rows?: number;
  /** Maximum rows (for auto-resize) */
  maxRows?: number;
  /** Maximum character count */
  maxLength?: number;
  /** Show character count */
  showCount?: boolean;
  /** Auto-focus */
  autoFocus?: boolean;
  /** Read-only state */
  readOnly?: boolean;
  /** Success state */
  success?: boolean;
  /** Custom class name */
  className?: string;
  /** Textarea ID */
  id?: string;
  /** On blur handler */
  onBlur?: () => void;
  /** On focus handler */
  onFocus?: () => void;
  /** Resize behavior */
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      label,
      value,
      onChange,
      error,
      helperText,
      disabled = false,
      required = false,
      placeholder,
      name,
      rows = 4,
      maxRows,
      maxLength,
      showCount = false,
      autoFocus = false,
      readOnly = false,
      success = false,
      className,
      id,
      onBlur,
      onFocus,
      resize = 'vertical',
    },
    ref
  ) => {
    const textareaId = id || `textarea-${label?.replace(/\s+/g, '-').toLowerCase()}`;
    const errorId = `${textareaId}-error`;
    const helperId = `${textareaId}-helper`;

    const hasError = !!error;
    const isSuccess = success && !hasError;

    const resizeClasses = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    };

    return (
      <div className={cn('space-y-1.5 w-full', className)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-foreground"
          >
            {label}
            {required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}
          </label>
        )}

        {/* Textarea Wrapper */}
        <div className="relative">
          <textarea
            ref={ref}
            id={textareaId}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            readOnly={readOnly}
            placeholder={placeholder}
            rows={rows}
            maxLength={maxLength}
            autoFocus={autoFocus}
            onBlur={onBlur}
            onFocus={onFocus}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? errorId : helperText ? helperId : undefined
            }
            aria-required={required}
            className={cn(
              'w-full rounded-md border bg-background px-3 py-2 text-sm transition-colors',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'read-only:bg-muted read-only:cursor-default',
              resizeClasses[resize],
              hasError && 'border-destructive focus:ring-destructive',
              isSuccess && 'border-success focus:ring-success',
              !hasError && !isSuccess && 'border-input hover:border-border'
            )}
          />

          {/* Character Count */}
          {(showCount || maxLength) && (
            <div className="flex justify-end mt-1">
              <span
                className={cn(
                  'text-xs',
                  maxLength && value.length > maxLength * 0.9
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                )}
              >
                {value.length}
                {maxLength && ` / ${maxLength}`}
              </span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {hasError && (
          <p id={errorId} className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {/* Helper Text */}
        {helperText && !hasError && (
          <p id={helperId} className="text-sm text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';

export default TextArea;
