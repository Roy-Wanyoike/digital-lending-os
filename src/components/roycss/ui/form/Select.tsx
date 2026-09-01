/**
 * ROYCSS Select Component
 * @module roycss/ui/form/Select
 * @description Advanced select component with search, multi-select, and async options
 */

'use client';

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  forwardRef,
} from 'react';
import { cn, generateId } from '@/components/roycss/shared/utils';
import { scrollLock } from '@/components/roycss/shared/utils';

// ============================================================================
// Types
// ============================================================================

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  description?: string;
  group?: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  /** Options to display */
  options: SelectOption[];
  /** Selected value(s) */
  value?: string | string[];
  /** Callback when selection changes */
  onChange?: (value: string | string[]) => void;
  /** Label for the select */
  label?: string;
  /** Helper text below select */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Enable multiple selection */
  multiple?: boolean;
  /** Enable search/filter functionality */
  searchable?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Loading state */
  loading?: boolean;
  /** No options message */
  noOptionsMessage?: string;
  /** Clearable (for single select) */
  clearable?: boolean;
  /** Left icon or element */
  leftElement?: React.ReactNode;
  /** Custom option render function */
  renderOption?: (option: SelectOption) => React.ReactNode;
  /** Custom selected value render */
  renderValue?: (value: string | string[], options: SelectOption[]) => React.ReactNode;
  /** Async options loader */
  loadOptions?: (search: string) => Promise<SelectOption[]>;
  /** Debounce time for async search */
  debounceMs?: number;
}

// ============================================================================
// Component
// ============================================================================

const Select = forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      options,
      value: propValue,
      onChange,
      label,
      helperText,
      error,
      placeholder = 'Select an option...',
      multiple = false,
      searchable = false,
      searchPlaceholder = 'Search...',
      loading = false,
      noOptionsMessage = 'No options found',
      clearable = false,
      leftElement,
      renderOption,
      renderValue,
      loadOptions,
      debounceMs = 300,
      className,
      disabled,
      id: propId,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [internalValue, setInternalValue] = useState<string | string[]>(
      propValue ?? (multiple ? [] : '')
    );
    const [asyncOptions, setAsyncOptions] = useState<SelectOption[]>(options);
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const generatedId = useMemo(() => generateId('select'), []);
    const id = propId || generatedId;

    // Sync external value
    useEffect(() => {
      if (propValue !== undefined) {
        setInternalValue(propValue);
      }
    }, [propValue]);

    // Sync options
    useEffect(() => {
      if (!loadOptions) {
        setAsyncOptions(options);
      }
    }, [options, loadOptions]);

    // Close on outside click
    useEffect(() => {
      if (!isOpen) return;

      function handleClickOutside(e: MouseEvent) {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false);
        }
      }

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Handle scroll lock
    useEffect(() => {
      if (isOpen) {
        scrollLock.enable();
      } else {
        scrollLock.disable();
      }
      return () => scrollLock.disable();
    }, [isOpen]);

    // Focus search input when opened
    useEffect(() => {
      if (isOpen && searchable && inputRef.current) {
        inputRef.current.focus();
      }
    }, [isOpen, searchable]);

    // Load async options
    const loadAsyncOptions = useCallback(
      async (query: string) => {
        if (!loadOptions) return;

        setIsLoading(true);
        try {
          const results = await loadOptions(query);
          setAsyncOptions(results);
        } catch (err) {
          console.error('Error loading options:', err);
        } finally {
          setIsLoading(false);
        }
      },
      [loadOptions]
    );

    // Debounced search
    useEffect(() => {
      if (!loadOptions || !isOpen) return;

      const timer = setTimeout(() => {
        loadAsyncOptions(searchQuery);
      }, debounceMs);

      return () => clearTimeout(timer);
    }, [searchQuery, isOpen, loadOptions, debounceMs, loadAsyncOptions]);

    // Filter options based on search
    const filteredOptions = useMemo(() => {
      if (loadOptions || !searchQuery) return asyncOptions;

      const query = searchQuery.toLowerCase();
      return asyncOptions.filter(
        (opt) =>
          opt.label.toLowerCase().includes(query) ||
          opt.value.toLowerCase().includes(query)
      );
    }, [asyncOptions, searchQuery, loadOptions]);

    // Group options
    const groupedOptions = useMemo(() => {
      const groups = new Map<string, SelectOption[]>();
      
      for (const option of filteredOptions) {
        const group = option.group ?? '';
        if (!groups.has(group)) {
          groups.set(group, []);
        }
        groups.get(group)!.push(option);
      }

      return groups;
    }, [filteredOptions]);

    // Get selected option labels
    const getSelectedLabels = useCallback((): string => {
      if (multiple && Array.isArray(internalValue)) {
        return internalValue
          .map((v) => asyncOptions.find((o) => o.value === v)?.label ?? v)
          .join(', ');
      }
      return asyncOptions.find((o) => o.value === internalValue)?.label ?? '';
    }, [internalValue, asyncOptions, multiple]);

    // Handle select
    const handleSelect = useCallback(
      (option: SelectOption) => {
        if (option.disabled) return;

        let newValue: string | string[];

        if (multiple) {
          const currentValues = Array.isArray(internalValue) ? internalValue : [];
          if (currentValues.includes(option.value)) {
            newValue = currentValues.filter((v) => v !== option.value);
          } else {
            newValue = [...currentValues, option.value];
          }
        } else {
          newValue = option.value;
          setIsOpen(false);
        }

        setInternalValue(newValue);
        onChange?.(newValue);
      },
      [multiple, internalValue, onChange]
    );

    // Handle clear
    const handleClear = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        const newValue = multiple ? [] : '';
        setInternalValue(newValue);
        onChange?.(newValue);
      },
      [multiple, onChange]
    );

    // Toggle dropdown
    const toggleDropdown = useCallback(() => {
      if (disabled) return;
      setIsOpen((prev) => !prev);
      setSearchQuery('');
    }, [disabled]);

    // Keyboard navigation
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        switch (e.key) {
          case 'Enter':
          case ' ':
            if (!isOpen) {
              e.preventDefault();
              toggleDropdown();
            }
            break;
          case 'Escape':
            setIsOpen(false);
            break;
          case 'ArrowDown':
            if (!isOpen) {
              e.preventDefault();
              toggleDropdown();
            }
            break;
          case 'Backspace':
            if (clearable && internalValue && !searchQuery) {
              handleClear(e as unknown as React.MouseEvent);
            }
            break;
        }
      },
      [isOpen, toggleDropdown, clearable, internalValue, searchQuery, handleClear]
    );

    // Check if option is selected
    const isSelected = useCallback(
      (optionValue: string): boolean => {
        if (multiple && Array.isArray(internalValue)) {
          return internalValue.includes(optionValue);
        }
        return internalValue === optionValue;
      },
      [internalValue, multiple]
    );

    return (
      <div className="w-full" ref={ref}>
        {/* Label */}
        {label && (
          <label
            htmlFor={`${id}-trigger`}
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            {label}
          </label>
        )}

        {/* Container */}
        <div
          ref={containerRef}
          className={cn('relative', className)}
          data-state={isOpen ? 'open' : 'closed'}
        >
          {/* Trigger */}
          <button
            id={`${id}-trigger`}
            type="button"
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            disabled={disabled}
            onClick={toggleDropdown}
            onKeyDown={handleKeyDown}
            className={cn(
              'flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm',
              'bg-background transition-colors',
              error
                ? 'border-destructive focus-within:ring-destructive/20'
                : isOpen
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-input hover:border-primary/50',
              disabled && 'opacity-50 cursor-not-allowed',
              'focus:outline-none'
            )}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {leftElement && (
                <span className="text-muted-foreground flex-shrink-0">{leftElement}</span>
              )}
              
              {renderValue ? (
                <span className="truncate">
                  {renderValue(internalValue!, asyncOptions)}
                </span>
              ) : internalValue && (typeof internalValue === 'string' ? internalValue : internalValue.length > 0) ? (
                <span className="truncate">{getSelectedLabels()}</span>
              ) : (
                <span className="text-muted-foreground truncate">{placeholder}</span>
              )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              {clearable && internalValue && (
                <span
                  onClick={handleClear}
                  className="p-0.5 rounded-sm hover:bg-muted"
                  role="button"
                  tabIndex={-1}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
              )}
              <svg
                className={cn(
                  'w-4 h-4 text-muted-foreground transition-transform',
                  isOpen && 'rotate-180'
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* Dropdown */}
          {isOpen && (
            <div
              className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-lg animate-in fade-in-0 zoom-in-95"
              role="listbox"
              aria-label={label ?? 'Options'}
              aria-multiselectable={multiple}
            >
              {/* Search Input */}
              {(searchable || loadOptions) && (
                <div className="p-2 border-b">
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
              )}

              {/* Options List */}
              <div className="max-h-60 overflow-y-auto p-1">
                {isLoading || loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : filteredOptions.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {noOptionsMessage}
                  </div>
                ) : (
                  Array.from(groupedOptions.entries()).map(([group, groupOptions]) => (
                    <div key={group}>
                      {group && (
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {group}
                        </div>
                      )}
                      {groupOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          role="option"
                          aria-selected={isSelected(option.value)}
                          disabled={option.disabled}
                          onClick={() => handleSelect(option)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors',
                            isSelected(option.value)
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-accent hover:text-accent-foreground',
                            option.disabled && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          {multiple && (
                            <div
                              className={cn(
                                'h-4 w-4 rounded border flex items-center justify-center',
                                isSelected(option.value)
                                  ? 'bg-primary border-primary text-primary-foreground'
                                  : 'border-input'
                              )}
                            >
                              {isSelected(option.value) && (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          )}
                          
                          {renderOption ? (
                            renderOption(option)
                          ) : (
                            <>
                              {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                              <div className="flex-1 min-w-0 text-left">
                                <span className="block truncate">{option.label}</span>
                                {option.description && (
                                  <span className="block text-xs text-muted-foreground truncate">
                                    {option.description}
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p className="mt-1.5 text-xs text-destructive" role="alert">
            {error}
          </p>
        )}

        {/* Helper Text */}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;

/**
 * @example
 * ```tsx
 * // Basic single select
 * <Select
 *   label="Country"
 *   options={[
 *     { value: 'us', label: 'United States' },
 *     { value: 'uk', label: 'United Kingdom' },
 *     { value: 'ke', label: 'Kenya' },
 *   ]}
 *   value={selected}
 *   onChange={setSelected}
 * />
 *
 * // Multi-select with search
 * <Select
 *   label="Tags"
 *   options={tagOptions}
 *   multiple
 *   searchable
 *   placeholder="Select tags..."
 *   value={selectedTags}
 *   onChange={setSelectedTags}
 * />
 *
 * // Async options
 * <Select
 *   label="Search Users"
 *   loadOptions={async (q) => await searchUsers(q)}
 *   searchable
 *   debounceMs={500}
 * />
 * ```
 */
