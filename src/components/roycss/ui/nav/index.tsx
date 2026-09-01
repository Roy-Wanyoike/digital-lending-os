/**
 * ROYCSS Navigation Components
 * @module roycss/ui/nav
 * @description Navigation components including breadcrumbs, tabs, sidebar, and more
 */

'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { cn, generateId } from '@/components/roycss/shared/utils';
import type { BreadcrumbItem, NavItem, TabItem } from '@/lib/roycss/types';

// ============================================================================
// Breadcrumb Component
// ============================================================================

export interface BreadcrumbProps {
  /** Breadcrumb items */
  items: BreadcrumbItem[];
  /** Separator between items */
  separator?: React.ReactNode;
  /** Max visible items (will collapse middle) */
  maxItems?: number;
  /** Class names */
  className?: string;
}

export function Breadcrumb({
  items,
  separator,
  maxItems,
  className,
}: BreadcrumbProps) {
  const defaultSeparator = (
    <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );

  // Collapse items if needed
  const displayItems = useMemo(() => {
    if (!maxItems || items.length <= maxItems) return items;

    return [
      items[0],
      { label: '...', current: false },
      ...items.slice(-(maxItems - 1)),
    ];
  }, [items, maxItems]);

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-1.5 flex-wrap">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isEllipsis = item.label === '...';

          return (
            <li key={index} className="flex items-center gap-1.5">
              {/* Separator */}
              {index > 0 && !isEllipsis && (
                <span className="text-muted-foreground" aria-hidden="true">
                  {separator ?? defaultSeparator}
                </span>
              )}

              {/* Item */}
              {isEllipsis ? (
                <span className="text-muted-foreground">{item.label}</span>
              ) : isLast || item.current ? (
                <span
                  className="text-sm font-medium text-foreground"
                  aria-current="page"
                >
                  {item.icon && <span className="mr-1 inline-flex">{item.icon}</span>}
                  {item.label}
                </span>
              ) : item.href ? (
                <a
                  href={item.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.icon && <span className="mr-1 inline-flex">{item.icon}</span>}
                  {item.label}
                </a>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {item.icon && <span className="mr-1 inline-flex">{item.icon}</span>}
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ============================================================================
// Tabs Component
// ============================================================================

export type TabVariant = 'default' | 'pills' | 'underline' | 'enclosed';
export type TabSize = 'sm' | 'md' | 'lg';

export interface TabsProps {
  /** Tab items */
  tabs: TabItem[];
  /** Active tab ID */
  activeTab: string;
  /** Callback when tab changes */
  onTabChange: (tabId: string) => void;
  /** Variant */
  variant?: TabVariant;
  /** Size */
  size?: TabSize;
  /** Full width tabs */
  fullWidth?: boolean;
  /** Vertical orientation */
  vertical?: boolean;
  /** Class names */
  className?: string;
}

const variantClasses = {
  default: {
    container: 'border-b border-border',
    tab: 'border-b-2 border-transparent hover:border-border',
    activeTab: 'border-primary text-primary',
  },
  pills: {
    container: 'bg-muted p-1 rounded-lg',
    tab: 'rounded-md hover:bg-background/50',
    activeTab: 'bg-background shadow-sm text-foreground',
  },
  underline: {
    container: '',
    tab: 'border-b-2 border-transparent hover:border-border/50',
    activeTab: 'border-primary text-primary',
  },
  enclosed: {
    container: 'border border-border rounded-lg p-0.5',
    tab: 'rounded-md',
    activeTab: 'bg-background shadow-sm text-foreground',
  },
};

const sizeClasses = {
  sm: { tab: 'px-3 py-1.5 text-xs', icon: 'w-4 h-4' },
  md: { tab: 'px-4 py-2 text-sm', icon: 'w-4 h-4' },
  lg: { tab: 'px-6 py-3 text-base', icon: 'w-5 h-5' },
};

export function Tabs({
  tabs,
  activeTab,
  onTabChange,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  vertical = false,
  className,
}: TabsProps) {
  const styles = variantClasses[variant];
  const sizes = sizeClasses[size];

  return (
    <div className={cn('w-full', className)}>
      <div
        role="tablist"
        aria-label="Tabs"
        className={cn(
          'flex',
          vertical ? 'flex-col gap-1' : `flex-row ${fullWidth ? '' : '-mb-px'}`,
          styles.container
        )}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              disabled={tab.disabled}
              onClick={() => !tab.disabled && onTabChange(tab.id)}
              className={cn(
                'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-background',
                sizes.tab,
                fullWidth && 'flex-1',
                styles.tab,
                isActive && styles.activeTab,
                tab.disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {tab.icon && <span className={sizes.icon}>{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    'min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-xs font-medium px-1.5',
                    isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {tabs.map((tab) => {
        if (tab.id !== activeTab) return null;
        
        return (
          <div
            key={tab.id}
            id={`tabpanel-${tab.id}`}
            role="tabpanel"
            tabIndex={0}
            aria-labelledby={`tab-${tab.id}`}
            className="mt-4"
          >
            {tab.content}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Pagination Component
// ============================================================================

export interface PaginationProps {
  /** Current page */
  page: number;
  /** Total pages */
  totalPages: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Sibling count for page numbers */
  siblingCount?: number;
  /** Show first/last buttons */
  showFirstLast?: boolean;
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  /** Disabled state */
  disabled?: boolean;
  /** Class names */
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  siblingCount = 1,
  showFirstLast = true,
  size = 'md',
  disabled = false,
  className,
}: PaginationProps) {
  const generatePages = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    
    // Always include first page
    pages.push(1);

    // Calculate range around current page
    const leftSibling = Math.max(page - siblingCount, 2);
    const rightSibling = Math.min(page + siblingCount, totalPages - 1);

    // Add ellipsis and left siblings
    if (leftSibling > 2) {
      pages.push('...');
    }
    
    for (let i = leftSibling; i <= rightSibling; i++) {
      pages.push(i);
    }

    // Add ellipsis and right siblings
    if (rightSibling < totalPages - 1) {
      pages.push('...');
    }

    // Always include last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs min-w-[28px]',
    md: 'px-3 py-2 text-sm min-w-[36px]',
    lg: 'px-4 py-3 text-base min-w-[44px]',
  };

  const canNavigate = !disabled && totalPages > 1;

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center gap-1', className)}
    >
      {/* First Page */}
      {showFirstLast && (
        <button
          type="button"
          onClick={() => canNavigate && onPageChange(1)}
          disabled={!canNavigate || page <= 1}
          className={cn('rounded-md border bg-background hover:bg-accent transition-colors', sizes[size], disabled && 'opacity-50')}
          aria-label="First page"
        >
          ««
        </button>
      )}

      {/* Previous */}
      <button
        type="button"
        onClick={() => canNavigate && onPageChange(page - 1)}
        disabled={!canNavigate || page <= 1}
        className={cn('rounded-md border bg-background hover:bg-accent transition-colors', sizes[size], disabled && 'opacity-50')}
        aria-label="Previous page"
      >
        ‹
      </button>

      {/* Page Numbers */}
      {generatePages().map((p, index) =>
        p === '...' ? (
          <span key={`ellipsis-${index}`} className={cn('px-2', sizes[size])} aria-hidden="true">
            ...
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => canNavigate && onPageChange(p)}
            disabled={!canNavigate}
            className={cn(
              'rounded-md border transition-colors',
              sizes[size],
              p === page
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-background hover:bg-accent',
              disabled && 'opacity-50'
            )}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        type="button"
        onClick={() => canNavigate && onPageChange(page + 1)}
        disabled={!canNavigation || page >= totalPages}
        className={cn('rounded-md border bg-background hover:bg-accent transition-colors', sizes[size], disabled && 'opacity-50')}
        aria-label="Next page"
      >
        ›
      </button>

      {/* Last Page */}
      {showFirstLast && (
        <button
          type="button"
          onClick={() => canNavigate && onPageChange(totalPages)}
          disabled={!canNavigate || page >= totalPages}
          className={cn('rounded-md border bg-background hover:bg-accent transition-colors', sizes[size], disabled && 'opacity-50')}
          aria-label="Last page"
        >
          »»
        </button>
      )}
    </nav>
  );
}

// ============================================================================
// Sidebar Navigation Component
// ============================================================================

export interface SidebarProps {
  /** Navigation items */
  items: NavItem[];
  /** Active item ID */
  activeId?: string;
  /** Callback when item is clicked */
  onItemClick?: (item: NavItem) => void;
  /** Collapsed state */
  collapsed?: boolean;
  /** On collapse toggle */
  onCollapseToggle?: () => void;
  /** Header content */
  header?: React.ReactNode;
  /** Footer content */
  footer?: React.ReactNode;
  /** Logo/brand */
  logo?: React.ReactNode;
  /** Width when expanded */
  expandedWidth?: string;
  /** Width when collapsed */
  collapsedWidth?: string;
  /** Class names */
  className?: string;
}

export function Sidebar({
  items,
  activeId,
  onItemClick,
  collapsed = false,
  onCollapseToggle,
  header,
  footer,
  logo,
  expandedWidth = '256px',
  collapsedWidth = '64px',
  className,
}: SidebarProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleSubmenu = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const renderNavItem = (item: NavItem, depth = 0): React.ReactNode => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isActive = activeId === item.id;
    const isChildActive = item.children?.some(child => child.id === activeId);

    return (
      <div key={item.id}>
        <button
          type="button"
          onClick={() => {
            if (hasChildren) {
              toggleSubmenu(item.id);
            } else {
              onItemClick?.(item);
            }
          }}
          disabled={item.disabled}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
            depth > 0 && 'pl-' + (depth * 3 + 3),
            isActive
              ? 'bg-primary/10 text-primary font-medium'
              : isChildActive
                ? 'text-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            item.disabled && 'opacity-50 cursor-not-allowed',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? item.label : undefined}
        >
          {item.icon && <span className="flex-shrink-0 w-5 h-5">{item.icon}</span>}
          {!collapsed && (
            <>
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.badge !== undefined && (
                <span className="px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                  {item.badge}
                </span>
              )}
              {hasChildren && (
                <svg
                  className={cn(
                    'w-4 h-4 transition-transform',
                    isExpanded && 'rotate-180'
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </>
          )}
        </button>

        {/* Submenu */}
        {hasChildren && isExpanded && !collapsed && (
          <div className="ml-4 mt-1 space-y-1">
            {item.children!.map(child => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-background border-r transition-all duration-300 overflow-hidden',
        className
      )}
      style={{ width: collapsed ? collapsedWidth : expandedWidth }}
      role="navigation"
      aria-label="Sidebar navigation"
    >
      {/* Header */}
      {(logo || header) && (
        <div className={cn('flex items-center gap-3 p-4 border-b', collapsed && 'justify-center')}>
          {logo && <span className="flex-shrink-0">{logo}</span>}
          {!collapsed && header && <div>{header}</div>}
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {items.map(item => renderNavItem(item))}
      </nav>

      {/* Footer / Collapse Toggle */}
      <div className="border-t p-2">
        {footer && !collapsed && footer}
        {onCollapseToggle && (
          <button
            type="button"
            onClick={onCollapseToggle}
            className="w-full flex items-center justify-center p-2 rounded-md hover:bg-accent transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              className={cn('w-5 h-5 transition-transform', collapsed && 'rotate-180')}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>
    </aside>
  );
}

// ============================================================================
// Command Palette Component (Cmd+K)
// ============================================================================

export interface CommandPaletteProps {
  /** Open state */
  open: boolean;
  /** On close callback */
  onClose: () => void;
  /** Commands/groups */
  commands: {
    id: string;
    title: string;
    description?: string;
    icon?: React.ReactNode;
    shortcut?: string;
    action: () => void;
    category?: string;
  }[];
  /** Placeholder text */
  placeholder?: string;
  /** Hotkey to open */
  hotkey?: string;
  /** Class names */
  className?: string;
}

export function CommandPalette({
  open,
  onClose,
  commands,
  placeholder = 'Type a command or search...',
  hotkey = '⌘K',
  className,
}: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    if (!search.trim()) {
      const groups = new Map<string, typeof commands>();
      for (const cmd of commands) {
        const category = cmd.category ?? 'Commands';
        if (!groups.has(category)) groups.set(category, []);
        groups.get(category)!.push(cmd);
      }
      return groups;
    }

    const filtered = commands.filter(cmd =>
      cmd.title.toLowerCase().includes(search.toLowerCase()) ||
      cmd.description?.toLowerCase().includes(search.toLowerCase())
    );

    return new Map([['Results', filtered]]);
  }, [commands, search]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Keyboard handling
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, getTotalCommandCount() - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          executeSelectedCommand();
          break;
        case 'Escape':
          onClose();
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedIndex, groupedCommands]);

  const getTotalCommandCount = () => {
    let total = 0;
    for (const cmds of groupedCommands.values()) {
      total += cmds.length;
    }
    return total;
  };

  const executeSelectedCommand = () => {
    let index = 0;
    for (const cmds of groupedCommands.values()) {
      for (const cmd of cmds) {
        if (index === selectedIndex) {
          cmd.action();
          onClose();
          return;
        }
        index++;
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Command palette">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'relative mx-auto mt-[15vh] max-w-xl rounded-lg bg-background shadow-2xl border overflow-hidden animate-in fade-in-0 zoom-in-95',
          className
        )}
      >
        {/* Search Input */}
        <div className="flex items-center border-b px-3">
          <svg className="w-5 h-5 text-muted-foreground mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={placeholder}
            className="flex-1 py-3 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs text-muted-foreground border rounded">
            ESC
          </kbd>
        </div>

        {/* Commands List */}
        <div className="max-h-[300px] overflow-y-auto p-2">
          {Array.from(groupedCommands.entries()).map(([category, cmds]) => (
            <div key={category}>
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {category}
              </div>
              {cmds.map((cmd, cmdIndex) => {
                const globalIndex = getGlobalIndex(category, cmdIndex);
                return (
                  <button
                    key={cmd.id}
                    type="button"
                    onClick={() => {
                      cmd.action();
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={cn(
                      'w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors',
                      globalIndex === selectedIndex
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/50'
                    )}
                  >
                    {cmd.icon && <span className="flex-shrink-0">{cmd.icon}</span>}
                    <div className="flex-1 text-left">
                      <p className="font-medium">{cmd.title}</p>
                      {cmd.description && (
                        <p className="text-xs text-muted-foreground">{cmd.description}</p>
                      )}
                    </div>
                    {cmd.shortcut && (
                      <kbd className="px-1.5 py-0.5 text-xs text-muted-foreground border rounded">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {getTotalCommandCount() === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results found.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Navigate with ↑↓</span>
          <span>Open with {hotkey}</span>
        </div>
      </div>
    </div>
  );
}

function getGlobalIndex(category: string, cmdIndex: number): number {
  // This would need to be calculated based on the actual group order
  return cmdIndex; // Simplified for now
}

// ============================================================================
// Mega Menu Component
// ============================================================================

export interface MegaMenuProps {
  /** Trigger element or button */
  trigger: React.ReactNode;
  /** Menu sections */
  sections: {
    title: string;
    items: {
      label: string;
      href?: string;
      description?: string;
      icon?: React.ReactNode;
      action?: () => void;
    }[];
  }[];
  /** Open state (controlled) */
  open?: boolean;
  /** On open change */
  onOpenChange?: (open: boolean) => void;
  /** Class names */
  className?: string;
}

export function MegaMenu({
  trigger,
  sections,
  open: propOpen,
  onOpenChange,
  className,
}: MegaMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = propOpen ?? internalOpen;
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleOpen = useCallback((isOpen: boolean) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    if (isOpen) {
      setInternalOpen(true);
      onOpenChange?.(true);
    } else {
      timeoutRef.current = setTimeout(() => {
        setInternalOpen(false);
        onOpenChange?.(false);
      }, 150);
    }
  }, [onOpenChange]);

  return (
    <div
      className="relative"
      onMouseEnter={() => handleOpen(true)}
      onMouseLeave={() => handleOpen(false)}
    >
      {/* Trigger */}
      <div>{trigger}</div>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            'absolute top-full left-0 z-50 mt-2 w-screen max-w-4xl rounded-lg bg-background shadow-xl border p-6 animate-in fade-in-0 zoom-in-95',
            className
          )}
          role="menu"
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {sections.map(section => (
              <div key={section.title}>
                <h3 className="font-semibold text-sm text-foreground mb-3">
                  {section.title}
                </h3>
                <ul className="space-y-2">
                  {section.items.map(item => (
                    <li key={item.label}>
                      {item.href ? (
                        <a
                          href={item.href}
                          className="flex items-start gap-2 p-2 rounded-md hover:bg-accent transition-colors group"
                        >
                          {item.icon && (
                            <span className="mt-0.5 text-muted-foreground group-hover:text-foreground">
                              {item.icon}
                            </span>
                          )}
                          <div>
                            <p className="text-sm font-medium group-hover:text-foreground">
                              {item.label}
                            </p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            item.action?.();
                            handleOpen(false);
                          }}
                          className="flex items-start gap-2 p-2 rounded-md hover:bg-accent transition-colors w-full text-left group"
                        >
                          {item.icon && (
                            <span className="mt-0.5 text-muted-foreground group-hover:text-foreground">
                              {item.icon}
                            </span>
                          )}
                          <div>
                            <p className="text-sm font-medium group-hover:text-foreground">
                              {item.label}
                            </p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Breadcrumb;
