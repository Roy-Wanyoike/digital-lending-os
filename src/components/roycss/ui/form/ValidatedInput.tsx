/**
 * ROYCSS Validated Input Component
 * @module roycss/ui/form/ValidatedInput
 * @description Input component with built-in validation support
 */

'use client';

import React, { useState, useCallback, useRef, useEffect, forwardRef } from 'react';
import { cn, generateId, debounce } from '@/components/roycss/shared/utils';
import { type ValidationState } from '@/lib/roycss/types';

// ============================================================================
// Types
// ============================================================================

/** Validation rule definition */
export interface ValidationRule {
  /** Rule name for error messages */
  name: string;
  /** Validation function - returns error message or undefined if valid */
  validate: (value: string) => string | undefined;
  /** When to trigger validation */
  trigger?: 'onChange' | 'onBlur' | 'onSubmit';
}

/** Built-in validators */
export const validators = {
  required: (message = 'This field is required'): ValidationRule => ({
    name: 'required',
    validate: (value) => (!value || value.trim() === '' ? message : undefined),
    trigger: 'onBlur',
  }),

  minLength: (min: number): ValidationRule => ({
    name: 'minLength',
    validate: (value) =>
      value && value.length < min
        ? `Must be at least ${min} characters`
        : undefined,
    trigger: 'onBlur',
  }),

  maxLength: (max: number): ValidationRule => ({
    name: 'maxLength',
    validate: (value) =>
      value && value.length > max
        ? `Must be no more than ${max} characters`
        : undefined,
    trigger: 'onChange',
  }),

  email: (message = 'Please enter a valid email address'): ValidationRule => ({
    name: 'email',
    validate: (value) => {
      if (!value) return undefined;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return !emailRegex.test(value) ? message : undefined;
    },
    trigger: 'onBlur',
  }),

  url: (message = 'Please enter a valid URL'): ValidationRule => ({
    name: 'url',
    validate: (value) => {
      if (!value) return undefined;
      try {
        new URL(value);
        return undefined;
      } catch {
        return message;
      }
    },
    trigger: 'onBlur',
  }),

  phone: (message = 'Please enter a valid phone number'): ValidationRule => ({
    name: 'phone',
    validate: (value) => {
      if (!value) return undefined;
      const phoneRegex = /^[\d\s\-\(\)]{10,}$/;
      return !phoneRegex.test(value.replace(/\D/g, '')) ? message : undefined;
    },
    trigger: 'onBlur',
  }),

  pattern: (regex: RegExp, message = 'Invalid format'): ValidationRule => ({
    name: 'pattern',
    validate: (value) => (value && !regex.test(value) ? message : undefined),
    trigger: 'onBlur',
  }),

  custom: (
    fn: (value: string) => string | undefined,
    name = 'custom'
  ): ValidationRule => ({
    name,
    validate: fn,
    trigger: 'onBlur',
  }),
};

export interface ValidatedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  /** Label for the input */
  label?: string;
  /** Helper text below input */
  helperText?: string;
  /** Validation rules to apply */
  rules?: ValidationRule[];
  /** Callback when validation state changes */
  onValidationChange?: (state: ValidationState) => void;
  /** Show character count */
  showCount?: boolean;
  /** Maximum characters for count display */
  maxLength?: number;
  /** Left icon or element */
  leftElement?: React.ReactNode;
  /** Right icon or element */
  rightElement?: React.ReactNode;
  /** Success message when valid */
  successMessage?: string;
  /** Debounce validation delay in ms */
  debounceMs?: number;
}

// ============================================================================
// Component
// ============================================================================

const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  (
    {
      label,
      helperText,
      rules = [],
      onValidationChange,
      showCount = false,
      maxLength,
      leftElement,
      rightElement,
      successMessage,
      debounceMs = 300,
      className,
      id: propId,
      onChange,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [value, setValue] = useState(props.defaultValue?.toString() ?? props.value?.toString() ?? '');
    const [validationState, setValidationState] = useState<ValidationState>({
      isValid: null,
      touched: false,
    });
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const generatedId = useMemo(() => generateId('validated-input'), []);
    const id = propId || generatedId;

    // Merge refs
    const setRefs = useCallback(
      (node: HTMLInputElement | null) => {
        (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
      },
      [ref]
    );

    // Run validation
    const runValidation = useCallback(
      (inputValue: string): ValidationState => {
        if (rules.length === 0) {
          return { isValid: true, touched: true };
        }

        for (const rule of rules) {
          const error = rule.validate(inputValue);
          if (error) {
            return { isValid: false, error, touched: true };
          }
        }

        return { isValid: true, touched: true };
      },
      [rules]
    );

    // Debounced validation
    const debouncedValidate = useMemo(
      () =>
        debounce((inputValue: string) => {
          const state = runValidation(inputValue);
          setValidationState(state);
          onValidationChange?.(state);
        }, debounceMs),
      [runValidation, onValidationChange, debounceMs]
    );

    // Handle change
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setValue(newValue);
        onChange?.(e);

        // Trigger onChange validations immediately
        const onChangeRules = rules.filter(r => r.trigger === 'onChange');
        if (onChangeRules.length > 0) {
          for (const rule of onChangeRules) {
            const error = rule.validate(newValue);
            if (error) {
              setValidationState({ isValid: false, error, touched: true });
              onValidationChange?.({ isValid: false, error, touched: true });
              return;
            }
          }
        }

        // Debounce other validations
        debouncedValidate(newValue);
      },
      [onChange, rules, debouncedValidate, onValidationChange]
    );

    // Handle blur
    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);
        onBlur?.(e);

        // Run all validations on blur
        const state = runValidation(value);
        setValidationState(state);
        onValidationChange?.(state);
      },
      [onBlur, runValidation, value, onValidationChange]
    );

    // Cleanup debounce on unmount
    useEffect(() => {
      return () => debouncedValidate.cancel?.();
    }, [debouncedValidate]);

    // Determine visual state
    const showError = validationState.touched && validationState.isValid === false;
    const showSuccess =
      validationState.touched &&
      validationState.isValid === true &&
      value.length > 0;

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'block text-sm font-medium mb-1.5 transition-colors',
              showError
                ? 'text-destructive'
                : 'text-foreground'
            )}
          >
            {label}
            {rules.some(r => r.name === 'required') && (
              <span className="text-destructive ml-0.5" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        {/* Input Container */}
        <div
          className={cn(
            'relative flex items-center rounded-md border transition-colors',
            'bg-background',
            showError
              ? 'border-destructive focus-within:ring-destructive/20 focus-within:border-destructive'
              : showSuccess
                ? 'border-success focus-within:ring-success/20 focus-within:border-success'
                : isFocused
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-input hover:border-primary/50',
            props.disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
        >
          {/* Left Element */}
          {leftElement && (
            <div className="pl-3 flex items-center text-muted-foreground">
              {leftElement}
            </div>
          )}

          {/* Input */}
          <input
            {...props}
            ref={setRefs}
            id={id}
            type={props.type ?? 'text'}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            maxLength={maxLength}
            aria-invalid={showError ? 'true' : 'false'}
            aria-describedby={
              showError
                ? `${id}-error`
                : showSuccess && successMessage
                  ? `${id}-success`
                  : helperText
                    ? `${id}-helper`
                    : undefined
            }
            className={cn(
              'flex-1 bg-transparent px-3 py-2 text-sm text-foreground',
              'placeholder:text-muted-foreground',
              'focus:outline-none disabled:cursor-not-allowed',
              leftElement && 'pl-2',
              rightElement && 'pr-2'
            )}
          />

          {/* Right Element / Status Icon */}
          <div className="pr-3 flex items-center">
            {showError && (
              <span className="text-destructive" role="img" aria-label="Error">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            )}
            {showSuccess && !rightElement && (
              <span className="text-success" role="img" aria-label="Success">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            )}
            {rightElement && !showError && rightElement}
          </div>
        </div>

        {/* Character Count */}
        {showCount && maxLength && (
          <div className="flex justify-end mt-1">
            <span
              className={cn(
                'text-xs',
                value.length > maxLength ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              {value.length}/{maxLength}
            </span>
          </div>
        )}

        {/* Error Message */}
        {showError && validationState.error && (
          <p id={`${id}-error`} className="mt-1.5 text-xs text-destructive" role="alert">
            {validationState.error}
          </p>
        )}

        {/* Success Message */}
        {showSuccess && successMessage && (
          <p id={`${id}-success`} className="mt-1.5 text-xs text-success">
            {successMessage}
          </p>
        )}

        {/* Helper Text */}
        {helperText && !showError && (
          <p id={`${id}-helper`} className="mt-1.5 text-xs text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = 'ValidatedInput';

export default ValidatedInput;

/**
 * @example
 * ```tsx
 * // Email with validation
 * <ValidatedInput
 *   label="Email Address"
 *   type="email"
 *   placeholder="you@example.com"
 *   rules={[validators.required(), validators.email()]}
 *   onValidationChange={(state) => console.log(state)}
 * />
 *
 * // Password with requirements
 * <ValidatedInput
 *   label="Password"
 *   type="password"
 *   rules={[
 *     validators.required(),
 *     validators.minLength(8),
 *     validators.pattern(/^(?=.*[A-Z])(?=.*\d)/, 'Must contain uppercase and number')
 *   ]}
 *   showCount
 *   maxLength={32}
 * />
 * ```
 */
