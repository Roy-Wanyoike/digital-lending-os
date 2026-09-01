/**
 * SelectInput Component
 * @module roycss/ui/form/SelectInput
 * @description Select dropdown with search functionality
 */

'use client';

import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Search, ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  /** Option value */
  value: string;
  /** Option label */
  label: string;
  /** Optional description */
  description?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Optional icon */
  icon?: React.ReactNode;
}

export interface SelectInputProps {
  /** Select label */
  label?: string;
  /** Selected value */
  value: string;
  /** On change handler */
  onChange: (value: string) => void;
  /** Available options */
  options: SelectOption[];
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
  /** Select name */
  name?: string;
  /** Enable search/filter */
  searchable?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Empty state message when no results */
  emptyMessage?: string;
  /** Loading state */
  loading?: boolean;
  /** Success state */
  success?: boolean;
  /** Custom class name */
  className?: string;
  /** Select ID */
  id?: string;
  /** On blur handler */
  onBlur?: () => void;
}

export const SelectInput = forwardRef<HTMLButtonElement, SelectInputProps>(
  (
    {
      label,
      value,
      onChange,
      options,
      error,
      helperText,
      disabled = false,
      required = false,
      placeholder = 'Select an option...',
      name,
      searchable = false,
      searchPlaceholder = 'Search...',
      emptyMessage = 'No options found',
      loading = false,
      success = false,
      className,
      id,
      onBlur,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const selectId = id || `select-${label?.replace(/\s+/g, '-').toLowerCase()}`;
    const errorId = `${selectId}-error`;
    const helperId = `${selectId}-helper`;

    const hasError = !!error;
    const isSuccess = success && !hasError;

    // Get selected option
    const selectedOption = options.find((opt) => opt.value === value);

    // Filtered options based on search
    const filteredOptions = searchable
      ? options.filter((opt) =>
          opt.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : options;

    // Close on outside click
    useEffect(() => {
      function handleClickOutside(e: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
          setSearchQuery('');
        }
      }

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }

      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Focus search input when opened
    useEffect(() => {
      if (isOpen && searchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [isOpen, searchable]);

    // Handle keyboard navigation
    useEffect(() => {
      if (!isOpen || focusedIndex < 0) return;

      const focusedItem = listRef.current?.children[focusedIndex] as HTMLElement;
      focusedItem?.scrollIntoView({ block: 'nearest' });
    }, [focusedIndex, isOpen]);

    const handleSelect = (optionValue: string) => {
      onChange(optionValue);
      setIsOpen(false);
      setSearchQuery('');
      setFocusedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (isOpen && focusedIndex >= 0) {
            const option = filteredOptions[focusedIndex];
            if (option && !option.disabled) {
              handleSelect(option.value);
            }
          } else {
            setIsOpen(true);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setFocusedIndex((prev) =>
              prev < filteredOptions.length - 1 ? prev + 1 : prev
            );
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (isOpen) {
            setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSearchQuery('');
          break;
        case 'Tab':
          setIsOpen(false);
          break;
      }
    };

    return (
      <div className={cn('space-y-1.5 w-full', className)} ref={containerRef}>
        {/* Label */}
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-foreground"
          >
            {label}
            {required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}
          </label>
        )}

        {/* Trigger Button */}
        <button
          ref={ref}
          id={selectId}
          type="button"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-invalid={hasError}
          aria-describedby={
            hasError ? errorId : helperText ? helperId : undefined
          }
          aria-required={required}
          aria-disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
          disabled={disabled}
          className={cn(
            'flex w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-left text-sm transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            hasError && 'border-destructive focus:ring-destructive',
            isSuccess && 'border-success focus:ring-success',
            !hasError && !isSuccess && 'border-input hover:border-border',
            !selectedOption && 'text-muted-foreground'
          )}
        >
          <span className="truncate">
            {selectedOption ? (
              <span className="flex items-center gap-2">
                {selectedOption.icon}
                {selectedOption.label}
              </span>
            ) : (
              placeholder
            )}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div
            className="absolute z-50 mt-1 w-full min-w-[8rem] rounded-md border bg-background shadow-lg animate-in fade-in-0 zoom-in-95"
            role="listbox"
            aria-label={label || 'Select option'}
          >
            {/* Search Input */}
            {searchable && (
              <div className="border-b p-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setFocusedIndex(0);
                    }}
                    placeholder={searchPlaceholder}
                    className="w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            {/* Options List */}
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              <ul ref={listRef} className="max-h-60 overflow-auto p-1">
                {filteredOptions.map((option, index) => (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={value === option.value}
                    aria-disabled={option.disabled}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
                      value === option.value &&
                        'bg-accent text-accent-foreground',
                      focusedIndex === index && 'bg-accent/50',
                      option.disabled &&
                        'pointer-events-none opacity-50',
                      !option.disabled && 'hover:bg-accent/50'
                    )}
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    onMouseEnter={() => setFocusedIndex(index)}
                  >
                    {option.icon}
                    <span className="flex-1 truncate">{option.label}</span>
                    {value === option.value && (
                      <Check className="h-4 w-4 shrink-0" />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

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

SelectInput.displayName = 'SelectInput';

export default SelectInput;
