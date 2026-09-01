/**
 * SearchInput Component
 * @module roycss/ui/form/SearchInput
 * @description Search input with debounce functionality
 */

'use client';

import React, { useState, useCallback, useRef, useEffect, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Search, X, Loader2 } from 'lucide-react';

export interface SearchInputProps {
  /** Search value */
  value: string;
  /** On change handler */
  onChange: (value: string) => void;
  /** On search submit handler */
  onSearch?: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Debounce delay in ms */
  debounceMs?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Clearable */
  clearable?: boolean;
  /** Show search button */
  showButton?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  /** Custom class name */
  className?: string;
  /** Input ID */
  id?: string;
  /** Name attribute */
  name?: string;
  /** On focus handler */
  onFocus?: () => void;
  /** On blur handler */
  onBlur?: () => void;
  /** Minimum characters before triggering search */
  minLength?: number;
  /** Icon position */
  iconPosition?: 'left' | 'right';
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onChange,
      onSearch,
      placeholder = 'Search...',
      debounceMs = 300,
      disabled = false,
      loading = false,
      clearable = true,
      showButton = false,
      fullWidth = true,
      size = 'md',
      className,
      id,
      name,
      onFocus,
      onBlur,
      minLength = 0,
      iconPosition = 'left',
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(value);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();

    // Sync external value
    useEffect(() => {
      setInternalValue(value);
    }, [value]);

    // Debounced change handler
    const debouncedOnChange = useCallback(
      (newValue: string) => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
          onChange(newValue);
        }, debounceMs);
      },
      [onChange, debounceMs]
    );

    // Cleanup debounce timer
    useEffect(() => {
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInternalValue(newValue);
      debouncedOnChange(newValue);
    };

    const handleClear = () => {
      setInternalValue('');
      onChange('');
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (onSearch && internalValue.length >= minLength) {
        onSearch(internalValue);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClear();
      }
      if (e.key === 'Enter' && onSearch && internalValue.length >= minLength) {
        e.preventDefault();
        onSearch(internalValue);
      }
    };

    const sizeClasses = {
      sm: 'h-8 text-xs pl-8 pr-8',
      md: 'h-10 text-sm pl-10 pr-10',
      lg: 'h-12 text-base pl-12 pr-12',
    };

    const iconSizes = {
      sm: 'h-3.5 w-3.5',
      md: 'h-4 w-4',
      lg: 'h-5 w-5',
    };

    return (
      <form
        onSubmit={handleSubmit}
        className={cn('relative', fullWidth && 'w-full', className)}
        role="search"
      >
        <div className="relative">
          {/* Search Icon */}
          {iconPosition === 'left' && (
            <div
              className={cn(
                'absolute top-1/2 -translate-y-1/2 text-muted-foreground',
                iconPosition === 'left' ? 'left-3' : 'right-3'
              )}
            >
              {loading ? (
                <Loader2 className={cn(iconSizes[size], 'animate-spin')} />
              ) : (
                <Search className={iconSizes[size]} />
              )}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            type="search"
            id={id}
            name={name}
            value={internalValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
            disabled={disabled}
            placeholder={placeholder}
            aria-label={placeholder}
            autoComplete="off"
            className={cn(
              'w-full rounded-md border border-input bg-background transition-colors',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              sizeClasses[size],
              iconPosition === 'right' && 'pl-4',
              showButton && (iconPosition === 'left' ? 'pr-20' : 'pr-20')
            )}
          />

          {/* Clear Button */}
          {clearable && internalValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors',
                iconPosition === 'left' ? 'right-8' : 'right-8',
                showButton && 'right-16'
              )}
              aria-label="Clear search"
            >
              <X className={iconSizes[size]} />
            </button>
          )}

          {/* Search Button */}
          {showButton && (
            <button
              type="submit"
              disabled={disabled || loading || internalValue.length < minLength}
              className={cn(
                'absolute top-0 bottom-0 right-0 px-4 text-sm font-medium text-primary-foreground bg-primary rounded-r-md',
                'hover:bg-primary/90 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              Search
            </button>
          )}

          {/* Right Icon */}
          {iconPosition === 'right' && !clearable && (
            <div className="absolute top-1/2 -translate-y-1/2 right-3 text-muted-foreground">
              {loading ? (
                <Loader2 className={cn(iconSizes[size], 'animate-spin')} />
              ) : (
                <Search className={iconSizes[size]} />
              )}
            </div>
          )}
        </div>
      </form>
    );
  }
);

SearchInput.displayName = 'SearchInput';

export default SearchInput;
