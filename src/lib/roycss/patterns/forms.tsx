/**
 * ROYCSS Pattern Library - Form Patterns
 * @module roycss/patterns/forms
 * @description Reusable form patterns for common use cases
 */

'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/components/roycss/shared/utils';

// ============================================================================
// Search + Filter Bar Pattern
// ============================================================================

export interface FilterOption {
  id: string;
  label: string;
  value: string | number | boolean;
}

export interface SearchFilterBarProps {
  /** Search value */
  searchValue?: string;
  /** On search change */
  onSearchChange?: (value: string) => void;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Filter options */
  filters?: {
    id: string;
    label: string;
    options: FilterOption[];
    value?: string;
    onChange: (value: string) => void;
  }[];
  /** Sort options */
  sortOptions?: {
    label: string;
    value: string;
  }[];
  /** Current sort value */
  sortValue?: string;
  /** On sort change */
  onSortChange?: (value: string) => void;
  /** View toggle (grid/list) */
  showViewToggle?: boolean;
  /** Current view */
  view?: 'grid' | 'list';
  /** On view change */
  onViewChange?: (view: 'grid' | 'list') => void;
  /** Action buttons */
  actions?: React.ReactNode;
  /** Class names */
  className?: string;
}

/**
 * Search & Filter Bar
 * Combined search input with filters, sorting, and view options.
 */
export function SearchFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  sortOptions = [],
  sortValue,
  onSortChange,
  showViewToggle = false,
  view = 'grid',
  onViewChange,
  actions,
  className,
}: SearchFilterBarProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row gap-4 items-start sm:items-center', className)}>
      {/* Search Input */}
      <div className="relative flex-1 w-full sm:max-w-sm">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {/* Filters */}
        {filters.map((filter) => (
          <select
            key={filter.id}
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            className="px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label={filter.label}
          >
            <option value="">{filter.label}</option>
            {filter.options.map((option) => (
              <option key={option.id} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </select>
        ))}

        {/* Sort */}
        {sortOptions.length > 0 && (
          <select
            value={sortValue}
            onChange={(e) => onSortChange?.(e.target.value)}
            className="px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Sort by"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {/* View Toggle */}
        {showViewToggle && (
          <div className="inline-flex rounded-lg border p-1">
            <button
              type="button"
              onClick={() => onViewChange?.('grid')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                view === 'grid' ? 'bg-accent' : 'hover:bg-accent/50'
              )}
              aria-label="Grid view"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onViewChange?.('list')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                view === 'list' ? 'bg-accent' : 'hover:bg-accent/50'
              )}
              aria-label="List view"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        )}

        {/* Actions */}
        {actions}
      </div>
    </div>
  );
}

// ============================================================================
// Advanced Search Panel Pattern
// ============================================================================

export interface AdvancedSearchField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'date-range' | 'number' | 'boolean';
  value?: unknown;
  options?: { label: string; value: string }[];
  placeholder?: string;
  min?: number;
  max?: number;
}

export interface AdvancedSearchPanelProps {
  /** Search fields configuration */
  fields: AdvancedSearchField[];
  /** Values for each field */
  values: Record<string, unknown>;
  /** On values change */
  onValuesChange: (values: Record<string, unknown>) => void;
  /** On search callback */
  onSearch: () => void;
  /** On reset callback */
  onReset: () => void;
  /** Is panel expanded */
  expanded?: boolean;
  /** On expand toggle */
  onExpandToggle?: () => void;
  /** Loading state */
  loading?: boolean;
  /** Class names */
  className?: string;
}

/**
 * Advanced Search Panel
 * Expandable panel with multiple search criteria fields.
 */
export function AdvancedSearchPanel({
  fields,
  values,
  onValuesChange,
  onSearch,
  onReset,
  expanded = true,
  onExpandToggle,
  loading = false,
  className,
}: AdvancedSearchPanelProps) {
  const updateField = (fieldId: string, value: unknown) => {
    onValuesChange({ ...values, [fieldId]: value });
  };

  return (
    <div className={cn('border rounded-lg bg-background overflow-hidden', className)}>
      {/* Header / Toggle */}
      <button
        type="button"
        onClick={onExpandToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors"
        aria-expanded={expanded}
      >
        <span className="font-medium text-sm">Advanced Search</span>
        <svg
          className={cn('w-5 h-5 text-muted-foreground transition-transform', expanded && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Fields */}
      {expanded && (
        <div className="px-4 pb-4 border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fields.map((field) => (
              <div key={field.id}>
                <label htmlFor={`adv-search-${field.id}`} className="block text-sm font-medium mb-1.5">
                  {field.label}
                </label>

                {field.type === 'text' && (
                  <input
                    id={`adv-search-${field.id}`}
                    type="text"
                    value={(values[field.id] as string) ?? ''}
                    onChange={(e) => updateField(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                )}

                {field.type === 'select' && field.options && (
                  <select
                    id={`adv-search-${field.id}`}
                    value={(values[field.id] as string) ?? ''}
                    onChange={(e) => updateField(field.id, e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">All</option>
                    {field.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}

                {field.type === 'date' && (
                  <input
                    id={`adv-search-${field.id}`}
                    type="date"
                    value={(values[field.id] as string) ?? ''}
                    onChange={(e) => updateField(field.id, e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                )}

                {field.type === 'number' && (
                  <input
                    id={`adv-search-${field.id}`}
                    type="number"
                    value={(values[field.id] as number) ?? ''}
                    onChange={(e) => updateField(field.id, e.target.valueAsNumber)}
                    placeholder={field.placeholder}
                    min={field.min}
                    max={field.max}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                )}

                {field.type === 'boolean' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(values[field.id] as boolean) ?? false}
                      onChange={(e) => updateField(field.id, e.target.checked)}
                      className="rounded border-input"
                    />
                    <span className="text-sm">Yes</span>
                  </label>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
            <button
              type="button"
              onClick={onReset}
              className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent transition-colors"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onSearch}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Inline Editing Pattern
// ============================================================================

export interface InlineEditProps<T> {
  /** Current value */
  value: T;
  /** Type of editor */
  type?: 'text' | 'textarea' | 'select' | 'number';
  /** Options for select type */
  options?: { label: string; value: T }[];
  /** Save callback */
  onSave: (value: T) => Promise<void> | void;
  /** Cancel callback */
  onCancel?: () => void;
  /** Display render function */
  displayRender?: (value: T) => React.ReactNode;
  /** Placeholder */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Class names */
  className?: string;
}

/**
 * Inline Edit Component
 * Click to edit inline with save/cancel actions.
 */
export function InlineEdit<T extends string | number>({
  value,
  type = 'text',
  options,
  onSave,
  onCancel,
  displayRender,
  placeholder = 'Click to edit...',
  disabled = false,
  className,
}: InlineEditProps<T>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<T>(value);
  const [isSaving, setIsSaving] = useState(false);

  // Sync external value
  React.useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    onCancel?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!disabled && isEditing) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {type === 'textarea' ? (
          <textarea
            value={editValue as string}
            onChange={(e) => setEditValue(e.target.value as T)}
            onKeyDown={handleKeyDown}
            autoFocus
            rows={2}
            className="flex-1 px-2 py-1 text-sm border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        ) : type === 'select' && options ? (
          <select
            value={editValue as string}
            onChange={(e) => setEditValue(e.target.value as T)}
            autoFocus
            className="flex-1 px-2 py-1 text-sm border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {options.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue((type === 'number' ? parseFloat(e.target.value) : e.target.value) as T)}
            onKeyDown={handleKeyDown}
            autoFocus
            placeholder={placeholder}
            className="flex-1 px-2 py-1 text-sm border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || editValue === value}
          className="p-1 text-success hover:bg-success/10 rounded"
          aria-label="Save"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleCancel}
          className="p-1 text-muted-foreground hover:bg-accent rounded"
          aria-label="Cancel"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && setIsEditing(true)}
      disabled={disabled}
      className={cn(
        'group relative text-left w-full',
        !disabled && 'cursor-pointer hover:bg-accent/30 rounded px-1 -mx-1',
        className
      )}
      title={disabled ? undefined : 'Click to edit'}
    >
      <span>{displayRender ? displayRender(value) : String(value)}</span>
      
      {!disabled && (
        <svg
          className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      )}
    </button>
  );
}

// ============================================================================
// Bulk Edit Pattern
// ============================================================================

export interface BulkEditAction<T> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  action: (selectedItems: T[]) => Promise<void> | void;
  confirmMessage?: string;
  variant?: 'default' | 'destructive';
}

export interface BulkEditBarProps<T> {
  /** Selected items count */
  selectedCount: number;
  /** Total items count */
  totalCount: number;
  /** Available bulk actions */
  actions: BulkEditAction<T>[];
  /** Selected items */
  selectedItems: T[];
  /** On clear selection */
  onClearSelection: () => void;
  /** On select all */
  onSelectAll: () => void;
  /** Loading action ID */
  loadingActionId?: string;
  /** Class names */
  className?: string;
}

/**
 * Bulk Edit Bar
   Appears when multiple items are selected with bulk actions.
 */
export function BulkEditBar<T>({
  selectedCount,
  totalCount,
  actions,
  selectedItems,
  onClearSelection,
  onSelectAll,
  loadingActionId,
  className,
}: BulkEditBarProps<T>) {
  const [confirmAction, setConfirmAction] = useState<BulkEditAction<T> | null>(null);

  const handleAction = async (action: BulkEditAction<T>) => {
    if (action.confirmMessage) {
      setConfirmAction(action);
      return;
    }

    try {
      await action.action(selectedItems);
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-4 px-4 py-3 bg-primary/10 border border-primary/20 rounded-lg animate-in slide-in-from-bottom-2 duration-200',
          className
        )}
      >
        {/* Selection Info */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-primary">{selectedCount}</span>
          <span className="text-sm text-muted-foreground">selected</span>
          
          {selectedCount < totalCount && (
            <button
              type="button"
              onClick={onSelectAll}
              className="text-sm text-primary hover:underline"
            >
              Select all ({totalCount})
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-border" />

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => handleAction(action)}
              disabled={loadingActionId === action.id}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
                action.variant === 'destructive'
                  ? 'text-destructive hover:bg-destructive/10'
                  : 'text-primary hover:bg-primary/10',
                loadingActionId === action.id && 'opacity-50'
              )}
            >
              {loadingActionId === action.id ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                action.icon ?? null
              )}
              {action.label}
            </button>
          ))}
        </div>

        {/* Clear */}
        <button
          type="button"
          onClick={onClearSelection}
          className="ml-auto text-sm text-muted-foreground hover:text-foreground"
        >
          Clear selection
        </button>
      </div>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-xl border p-6 max-w-sm mx-4">
            <p className="text-sm text-foreground mb-4">{confirmAction.confirmMessage}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-3 py-1.5 text-sm border rounded-md hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await confirmAction.action(selectedItems);
                    setConfirmAction(null);
                  } catch (error) {
                    console.error('Action failed:', error);
                  }
                }}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md text-white',
                  confirmAction.variant === 'destructive'
                    ? 'bg-destructive hover:bg-destructive/90'
                    : 'bg-primary hover:bg-primary/90'
                )}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SearchFilterBar;
