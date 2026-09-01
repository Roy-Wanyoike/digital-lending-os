/**
 * TextInput Component
 * @module roycss/ui/form/TextInput
 * @description Input with label, error, and validation states
 */

'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface TextInputProps {
  /** Input label */
  label?: string;
  /** Input value */
  value: string;
  /** On change handler */
  onChange: (value: string) => void;
  /** Error message */
  error?: string;
  /** Helper text shown below input */
  helperText?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Required field indicator */
  required?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Input type */
  type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'number';
  /** Input name attribute */
  name?: string;
  /** Left icon */
  leftIcon?: React.ReactNode;
  /** Right icon */
  rightIcon?: React.ReactNode;
  /** Full width */
  fullWidth?: boolean;
  /** Maximum length */
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
  /** Input ID */
  id?: string;
  /** On blur handler */
  onBlur?: () => void;
  /** On focus handler */
  onFocus?: () => void;
  /** On key press handler */
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
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
      type = 'text',
      name,
      leftIcon,
      rightIcon,
      fullWidth = true,
      maxLength,
      showCount = false,
      autoFocus = false,
      readOnly = false,
      success = false,
      className,
      id,
      onBlur,
      onFocus,
      onKeyDown,
    },
    ref
  ) => {
    const inputId = id || `text-input-${label?.replace(/\s+/g, '-').toLowerCase()}`;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const hasError = !!error;
    const isSuccess = success && !hasError;

    return (
      <div className={cn('space-y-1.5', fullWidth && 'w-full', className)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground"
          >
            {label}
            {required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}
          </label>
        )}

        {/* Input Wrapper */}
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            type={type}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            readOnly={readOnly}
            placeholder={placeholder}
            maxLength={maxLength}
            autoFocus={autoFocus}
            onBlur={onBlur}
            onFocus={onFocus}
            onKeyDown={onKeyDown}
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
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              hasError && 'border-destructive focus:ring-destructive',
              isSuccess && 'border-success focus:ring-success',
              !hasError && !isSuccess && 'border-input hover:border-border'
            )}
          />

          {/* Right Icon */}
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {rightIcon}
            </div>
          )}

          {/* Character Count */}
          {showCount && maxLength && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {value.length}/{maxLength}
            </span>
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

TextInput.displayName = 'TextInput';

export default TextInput;
