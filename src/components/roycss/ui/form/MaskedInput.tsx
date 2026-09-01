/**
 * ROYCSS Masked Input Component
 * @module roycss/ui/form/MaskedInput
 * @description Input component with built-in masking support for phone numbers, dates, currency, etc.
 */

'use client';

import React, { useState, useCallback, useRef, forwardRef } from 'react';
import { cn, generateId } from '@/components/roycss/shared/utils';

// ============================================================================
// Types
// ============================================================================

/** Built-in mask patterns */
export type MaskPattern =
  | 'phone'
  | 'date'
  | 'datetime'
  | 'time'
  | 'currency'
  | 'percentage'
  | 'ssn'
  | 'zip-code'
  | 'credit-card'
  | 'custom';

export interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  /** Mask pattern to apply */
  mask: MaskPattern;
  /** Custom mask pattern (used when mask='custom') */
  customPattern?: string;
  /** Placeholder character for mask */
  placeholderChar?: string;
  /** Callback when value changes */
  onChange?: (value: string, rawValue: string) => void;
  /** Label for the input */
  label?: string;
  /** Helper text below input */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Show clear button */
  showClear?: boolean;
  /** Left icon or element */
  leftElement?: React.ReactNode;
  /** Right icon or element */
  rightElement?: React.ReactNode;
}

// ============================================================================
// Mask Patterns Configuration
// ============================================================================

const MASK_PATTERNS: Record<string, { pattern: RegExp; format: (value: string) => string }> = {
  phone: {
    pattern: /^[\d\s\-\(\)]+$/,
    format: (value: string) => {
      const digits = value.replace(/\D/g, '');
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    },
  },
  date: {
    pattern: /^[\d\/\-]+$/,
    format: (value: string) => {
      const digits = value.replace(/\D/g, '');
      if (digits.length <= 2) return digits;
      if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    },
  },
  datetime: {
    pattern: /^[\d\/\-\s\:]+$/,
    format: (value: string) => {
      const clean = value.replace(/\D/g, '');
      if (clean.length <= 2) return clean;
      if (clean.length <= 4) return `${clean.slice(0, 2)}/${clean.slice(2)}`;
      if (clean.length <= 8) return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4, 8)}`;
      if (clean.length <= 10) return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4, 8)} ${clean.slice(8)}`;
      return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4, 8)} ${clean.slice(8, 10)}:${clean.slice(10, 12)}`;
    },
  },
  time: {
    pattern: /^[\d\:]+$/,
    format: (value: string) => {
      const digits = value.replace(/\D/g, '');
      if (digits.length <= 2) return digits;
      return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
    },
  },
  currency: {
    pattern: /^[\d\.\,\$]+$/,
    format: (value: string) => {
      const num = value.replace(/[^\d.]/g, '');
      const parts = num.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return parts.length > 1 ? `${parts[0]}.${parts[1].slice(0, 2)}` : parts[0];
    },
  },
  percentage: {
    pattern: /^[\d\.%]+$/,
    format: (value: string) => {
      const num = value.replace(/[^0-9.]/g, '');
      const parsed = parseFloat(num);
      if (isNaN(parsed)) return '';
      return `${Math.min(parsed, 100)}%`;
    },
  },
  ssn: {
    pattern: /^[\d\-]+$/,
    format: (value: string) => {
      const digits = value.replace(/\D/g, '');
      if (digits.length <= 3) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
      return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`;
    },
  },
  'zip-code': {
    pattern: /^[\d\-]+$/,
    format: (value: string) => {
      const digits = value.replace(/\D/g, '');
      if (digits.length <= 5) return digits;
      return `${digits.slice(0, 5)}-${digits.slice(5, 9)}`;
    },
  },
  'credit-card': {
    pattern: /^[\d\s\-]+$/,
    format: (value: string) => {
      const digits = value.replace(/\D/g, '');
      return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
    },
  },
};

// ============================================================================
// Component
// ============================================================================

const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  (
    {
      mask,
      customPattern,
      placeholderChar = '_',
      onChange,
      label,
      helperText,
      error,
      showClear = false,
      leftElement,
      rightElement,
      className,
      id: propId,
      disabled,
      ...props
    },
    ref
  ) => {
    const [value, setValue] = useState(props.defaultValue?.toString() ?? props.value?.toString() ?? '');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const generatedId = useMemo(() => generateId('masked-input'), []);
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

    // Format value based on mask
    const formatValue = useCallback(
      (inputValue: string): string => {
        if (!inputValue) return '';

        if (mask === 'custom' && customPattern) {
          // Simple custom pattern matching
          let result = '';
          let inputIndex = 0;
          for (const char of customPattern) {
            if (inputIndex >= inputValue.length) break;
            if (char === '#') {
              while (inputIndex < inputValue.length && !/\d/.test(inputValue[inputIndex])) {
                inputIndex++;
              }
              if (inputIndex < inputValue.length) {
                result += inputValue[inputIndex];
                inputIndex++;
              }
            } else if (char === 'A') {
              while (inputIndex < inputValue.length && !/[a-zA-Z]/.test(inputValue[inputIndex])) {
                inputIndex++;
              }
              if (inputIndex < inputValue.length) {
                result += inputValue[inputIndex];
                inputIndex++;
              }
            } else if (char === '*') {
              result += inputValue[inputIndex];
              inputIndex++;
            } else {
              result += char;
            }
          }
          return result;
        }

        const maskConfig = MASK_PATTERNS[mask];
        if (maskConfig) {
          return maskConfig.format(inputValue);
        }

        return inputValue;
      },
      [mask, customPattern]
    );

    // Handle change
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        
        // Validate against pattern
        const maskConfig = MASK_PATTERNS[mask];
        if (maskConfig && newValue && !maskConfig.pattern.test(newValue)) {
          return;
        }

        const formatted = formatValue(newValue);
        setValue(formatted);
        onChange?.(formatted, newValue);
      },
      [mask, formatValue, onChange]
    );

    // Handle clear
    const handleClear = useCallback(() => {
      setValue('');
      onChange?.('', '');
      inputRef.current?.focus();
    }, [onChange]);

    // Get max length based on mask
    const getMaxLength = (): number => {
      switch (mask) {
        case 'phone': return 14; // (123) 456-7890
        case 'date': return 10;   // MM/DD/YYYY
        case 'time': return 5;    // HH:MM
        case 'ssn': return 11;    // 123-45-6789
        case 'zip-code': return 10; // 12345-6789
        case 'credit-card': return 19; // 1234 5678 9012 3456
        default: return props.maxLength ?? 255;
      }
    };

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            {label}
          </label>
        )}

        {/* Input Container */}
        <div
          className={cn(
            'relative flex items-center rounded-md border transition-colors',
            'bg-background',
            error
              ? 'border-destructive focus-within:ring-destructive/20 focus-within:border-destructive'
              : 'border-input hover:border-primary/50 focus-within:ring-primary/20 focus-within:border-primary',
            'focus-within:ring-2 focus-within:outline-none',
            disabled && 'opacity-50 cursor-not-allowed',
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
            type="text"
            value={value}
            onChange={handleChange}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            maxLength={getMaxLength()}
            disabled={disabled}
            className={cn(
              'flex-1 bg-transparent px-3 py-2 text-sm text-foreground',
              'placeholder:text-muted-foreground',
              'focus:outline-none disabled:cursor-not-allowed',
              leftElement && 'pl-2',
              (showClear && value) && 'pr-8'
            )}
            aria-invalid={error ? 'true' : 'undefined'}
            aria-describedby={
              error
                ? `${id}-error`
                : helperText
                  ? `${id}-helper`
                  : undefined
            }
          />

          {/* Clear Button */}
          {showClear && value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 p-0.5 rounded-sm hover:bg-muted transition-colors"
              aria-label="Clear input"
            >
              <svg
                className="w-4 h-4 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}

          {/* Right Element */}
          {rightElement && (
            <div className="pr-3 flex items-center text-muted-foreground">
              {rightElement}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p id={`${id}-error`} className="mt-1.5 text-xs text-destructive" role="alert">
            {error}
          </p>
        )}

        {/* Helper Text */}
        {helperText && !error && (
          <p id={`${id}-helper`} className="mt-1.5 text-xs text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

MaskedInput.displayName = 'MaskedInput';

export default MaskedInput;

/**
 * @example
 * ```tsx
 * // Phone number input
 * <MaskedInput
 *   label="Phone Number"
 *   mask="phone"
 *   placeholder="(555) 000-0000"
 *   onChange={(formatted, raw) => console.log(formatted, raw)}
 * />
 *
 * // Currency input
 * <MaskedInput
 *   label="Amount"
 *   mask="currency"
 *   placeholder="$0.00"
 * />
 *
 * // Custom date format
 * <MaskedInput
 *   label="Date of Birth"
 *   mask="custom"
 *   customPattern="##/##/####"
 * />
 * ```
 */
