/**
 * ROYCSS Date Picker Component
 * @module roycss/ui/form/DatePicker
 * @description Date and time picker with calendar view
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { cn, generateId } from '@/components/roycss/shared/utils';

// ============================================================================
// Types
// ============================================================================

export type DatePickerVariant = 'single' | 'range' | 'multiple';
export type DatePickerView = 'days' | 'months' | 'years';

export interface DatePickerProps {
  /** Selected date(s) */
  value?: Date | Date[] | { from: Date; to: Date } | null;
  /** Callback when selection changes */
  onChange?: (value: Date | Date[] | { from: Date; to: Date }) => void;
  /** Label for the picker */
  label?: string;
  /** Helper text */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Picker variant */
  variant?: DatePickerVariant;
  /** Placeholder text */
  placeholder?: string;
  /** Minimum selectable date */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
  /** Disable specific dates */
  disabledDates?: (date: Date) => boolean;
  /** Enable time selection */
  showTime?: boolean;
  /** Format for display */
  format?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Required field */
  required?: boolean;
  /** Locale for formatting */
  locale?: string;
  /** Week starts on (0=Sunday, 1=Monday) */
  weekStartsOn?: 0 | 1;
}

// ============================================================================
// Utilities
// ============================================================================

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function isDateInRange(date: Date, from: Date, to: Date): boolean {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const f = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const t = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return d >= f && d <= t;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function formatDate(date: Date, format = 'MM/dd/yyyy'): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();

  return format
    .replace('MM', month)
    .replace('dd', day)
    .replace('yyyy', String(year));
}

// ============================================================================
// Component
// ============================================================================

export function DatePicker({
  value,
  onChange,
  label,
  helperText,
  error,
  variant = 'single',
  placeholder = 'Select date...',
  minDate,
  maxDate,
  disabledDates,
  showTime = false,
  format = 'MM/dd/yyyy',
  disabled = false,
  required = false,
  weekStartsOn = 0,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => value instanceof Date ? new Date(value) : new Date());
  const [view, setView] = useState<DatePickerView>('days');
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  const id = useMemo(() => generateId('datepicker'), []);

  // Get selected dates based on variant
  const getSelectedDates = (): { single: Date | null; range: { from: Date; to: Date } | null; multiple: Date[] } => {
    if (!value) return { single: null, range: null, multiple: [] };
    
    if (variant === 'single') {
      return { single: value as Date, range: null, multiple: [] };
    }
    if (variant === 'range' && typeof value === 'object' && 'from' in value) {
      return { single: null, range: value as { from: Date; to: Date }, multiple: [] };
    }
    if (Array.isArray(value)) {
      return { single: null, range: null, multiple: value };
    }
    return { single: null, range: null, multiple: [] };
  };

  const selected = getSelectedDates();

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days: (Date | null)[] = [];

    // Adjust for week start
    const adjustedFirstDay = (firstDay - weekStartsOn + 7) % 7;

    // Previous month days
    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    // Next month days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  }, [viewDate, weekStartsOn]);

  // Check if date is disabled
  const isDisabled = useCallback((date: Date): boolean => {
    if (minDate && date < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) {
      return true;
    }
    if (maxDate && date > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) {
      return true;
    }
    if (disabledDates?.(date)) {
      return true;
    }
    return false;
  }, [minDate, maxDate, disabledDates]);

  // Check if date is selected
  const isSelected = useCallback((date: Date): boolean => {
    if (variant === 'single' && selected.single) {
      return isSameDay(date, selected.single);
    }
    if (variant === 'range' && selected.range) {
      return isSameDay(date, selected.range.from) || isSameDay(date, selected.range.to);
    }
    if (variant === 'multiple') {
      return selected.multiple.some(d => isSameDay(d, date));
    }
    return false;
  }, [variant, selected]);

  // Check if date is in range
  const isInRange = useCallback((date: Date): boolean => {
    if (variant !== 'range' || !selected.range) return false;
    
    const { from, to } = selected.range;
    if (hoveredDate && !to) {
      return isDateInRange(date, from, hoveredDate);
    }
    return isDateInRange(date, from, to);
  }, [variant, selected.range, hoveredDate]);

  // Handle date click
  const handleDateClick = useCallback((date: Date) => {
    if (isDisabled(date)) return;

    if (variant === 'single') {
      onChange?.(date);
      setIsOpen(false);
    } else if (variant === 'range') {
      if (!selected.range || selected.range.to) {
        onChange?.({ from: date, to: date });
      } else {
        const { from } = selected.range;
        if (date < from) {
          onChange?.({ from: date, to: from });
        } else {
          onChange?.({ from, to: date });
        }
        setIsOpen(false);
      }
    } else if (variant === 'multiple') {
      const isSelected = selected.multiple.some(d => isSameDay(d, date));
      const newMultiple = isSelected
        ? selected.multiple.filter(d => !isSameDay(d, date))
        : [...selected.multiple, date];
      onChange?.(newMultiple);
    }
  }, [variant, isDisabled, selected, onChange]);

  // Navigate months
  const navigate = useCallback((direction: number) => {
    setViewDate(prev => addMonths(prev, direction));
  }, []);

  // Format display value
  const displayValue = useMemo(() => {
    if (!value) return '';
    
    if (variant === 'single' && value instanceof Date) {
      return formatDate(value, format);
    }
    if (variant === 'range' && typeof value === 'object' && 'from' in value) {
      return `${formatDate(value.from, format)} - ${formatDate(value.to, format)}`;
    }
    if (Array.isArray(value)) {
      return `${value.length} dates selected`;
    }
    return '';
  }, [value, variant, format]);

  // Generate years for year view
  const yearRange = useMemo(() => {
    const currentYear = viewDate.getFullYear();
    const startYear = Math.floor(currentYear / 10) * 10 - 1;
    const years: number[] = [];
    for (let i = startYear; i < startYear + 12; i++) {
      years.push(i);
    }
    return years;
  }, [viewDate]);

  return (
    <div className="w-full relative">
      {/* Label */}
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1.5">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}

      {/* Trigger */}
      <button
        id={id}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm',
          'bg-background transition-colors',
          error
            ? 'border-destructive'
            : isOpen
              ? 'border-primary ring-2 ring-primary/20'
              : 'border-input hover:border-primary/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <span className={!displayValue ? 'text-muted-foreground' : ''}>
          {displayValue || placeholder}
        </span>
        <svg className="w-4 h-4 text-muted-foreground ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {/* Calendar Popover */}
      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-full sm:w-80 rounded-lg border bg-background shadow-lg p-4"
          role="dialog"
          aria-label="Calendar"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-1 rounded-sm hover:bg-accent"
              aria-label="Previous month"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setView('months')}
                className="font-semibold text-sm hover:bg-accent px-2 py-1 rounded"
              >
                {MONTHS[viewDate.getMonth()]}
              </button>
              <button
                type="button"
                onClick={() => setView('years')}
                className="font-semibold text-sm hover:bg-accent px-2 py-1 rounded"
              >
                {viewDate.getFullYear()}
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate(1)}
              className="p-1 rounded-sm hover:bg-accent"
              aria-label="Next month"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Days View */}
          {view === 'days' && (
            <>
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS.map((day, index) => {
                  const adjustedIndex = (index + weekStartsOn) % 7;
                  return (
                    <div key={adjustedIndex} className="text-center text-xs font-medium text-muted-foreground py-1">
                      {DAYS[adjustedIndex]}
                    </div>
                  );
                })}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, index) => {
                  if (!date) return <div key={`empty-${index}`} className="h-8" />;

                  const isCurrentMonth = date.getMonth() === viewDate.getMonth();
                  const isToday = isSameDay(date, new Date());
                  const selected = isSelected(date);
                  const inRange = isInRange(date);
                  const disabled = isDisabled(date);
                  const isFirstOrLast = variant === 'range' && selected.range && (
                    isSameDay(date, selected.range.from) || isSameDay(date, selected.range.to)
                  );

                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleDateClick(date)}
                      onMouseEnter={() => setHoveredDate(date)}
                      onMouseLeave={() => setHoveredDate(null)}
                      className={cn(
                        'h-8 w-full flex items-center justify-center text-sm rounded-sm transition-colors',
                        !isCurrentMonth && 'text-muted-foreground/40',
                        isToday && !selected && 'ring-1 ring-primary',
                        disabled && 'opacity-50 cursor-not-allowed',
                        inRange && !selected && 'bg-primary/10',
                        selected || (inRange && isFirstOrLast)
                          ? 'bg-primary text-primary-foreground hover:bg-primary'
                          : 'hover:bg-accent'
                      )}
                      aria-selected={selected}
                      aria-disabled={disabled}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Months View */}
          {view === 'months' && (
            <div className="grid grid-cols-3 gap-2">
              {MONTHS.map((month, index) => (
                <button
                  key={month}
                  type="button"
                  onClick={() => {
                    setViewDate(new Date(viewDate.getFullYear(), index, 1));
                    setView('days');
                  }}
                  className={cn(
                    'py-2 text-sm rounded-sm hover:bg-accent',
                    viewDate.getMonth() === index && 'bg-primary text-primary-foreground'
                  )}
                >
                  {month.slice(0, 3)}
                </button>
              ))}
            </div>
          )}

          {/* Years View */}
          {view === 'years' && (
            <div className="grid grid-cols-3 gap-2">
              {yearRange.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => {
                    setViewDate(new Date(year, viewDate.getMonth(), 1));
                    setView('days');
                  }}
                  className={cn(
                    'py-2 text-sm rounded-sm hover:bg-accent',
                    viewDate.getFullYear() === year && 'bg-primary text-primary-foreground',
                    (year < 1900 || year > 2100) && 'text-muted-foreground'
                  )}
                  disabled={year < 1900 || year > 2100}
                >
                  {year}
                </button>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-between mt-4 pt-3 border-t">
            <button
              type="button"
              onClick={() => {
                onChange?.(new Date());
                setIsOpen(false);
              }}
              className="text-sm text-primary hover:underline"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
      
      {/* Helper Text */}
      {helperText && !error && (
        <p className="mt-1.5 text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}

export default DatePicker;
