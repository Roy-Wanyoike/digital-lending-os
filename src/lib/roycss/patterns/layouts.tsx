/**
 * ROYCSS Pattern Library - Layout Patterns
 * @module roycss/patterns/layouts
 * @description Reusable layout patterns for common UI structures
 */

'use client';

import React from 'react';
import { cn } from '@/components/roycss/shared/utils';

// ============================================================================
// Dashboard Grid Pattern
// ============================================================================

export interface DashboardGridProps {
  /** Sidebar content */
  sidebar?: React.ReactNode;
  /** Header content */
  header?: React.ReactNode;
  /** Main content */
  children: React.ReactNode;
  /** Footer content */
  footer?: React.ReactNode;
  /** Grid columns for main area */
  columns?: number | { default: number; sm?: number; md?: number; lg?: number; xl?: number };
  /** Gap between grid items */
  gap?: string;
  /** Class names */
  className?: string;
}

/**
 * Dashboard Grid Pattern
 * A responsive dashboard layout with optional sidebar, header, and footer.
 */
export function DashboardGrid({
  sidebar,
  header,
  children,
  footer,
  columns = { default: 1, md: 2, lg: 3 },
  gap = 'gap-6',
  className,
}: DashboardGridProps) {
  const getCols = () => {
    if (typeof columns === 'number') {
      return `grid-cols-${columns}`;
    }
    return `grid-cols-${columns.default} sm:grid-cols-${columns.sm || columns.default} md:grid-cols-${columns.md || columns.sm || columns.default} lg:grid-cols-${columns.lg || columns.md || columns.sm || columns.default} xl:grid-cols-${columns.xl || columns.lg || columns.md || columns.sm || columns.default}`;
  };

  return (
    <div className={cn('min-h-screen flex bg-background', className)}>
      {/* Sidebar */}
      {sidebar && (
        <aside className="w-64 border-r bg-background flex-shrink-0 hidden lg:block">
          {sidebar}
        </aside>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        {header && (
          <header className="border-b bg-background px-6 py-4 sticky top-0 z-10">
            {header}
          </header>
        )}

        {/* Content Grid */}
        <main className={`flex-1 p-6 ${getCols()} ${gap}`}>
          {children}
        </main>

        {/* Footer */}
        {footer && (
          <footer className="border-t bg-background px-6 py-4 mt-auto">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Settings Page Layout
// ============================================================================

export interface SettingsLayoutProps {
  /** Navigation items */
  navigation: {
    id: string;
    label: string;
    icon?: React.ReactNode;
    href?: string;
  }[];
  /** Active section ID */
  activeSection: string;
  /** On section change callback */
  onSectionChange: (id: string) => void;
  /** Page title */
  title?: string;
  /** Description */
  description?: string;
  /** Main content */
  children: React.ReactNode;
  /** Action buttons in header */
  actions?: React.ReactNode;
  /** Class names */
  className?: string;
}

/**
 * Settings Page Layout
 * Common settings page with sidebar navigation and main content area.
 */
export function SettingsLayout({
  navigation,
  activeSection,
  onSectionChange,
  title,
  description,
  children,
  actions,
  className,
}: SettingsLayoutProps) {
  return (
    <div className={cn('max-w-7xl mx-auto', className)}>
      {/* Header */}
      {(title || description) && (
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              {title && (
                <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              )}
              {description && (
                <p className="mt-2 text-muted-foreground">{description}</p>
              )}
            </div>
            {actions && <div className="flex gap-3">{actions}</div>}
          </div>
        </div>
      )}

      <div className="flex gap-8">
        {/* Navigation Sidebar */}
        <nav className="w-56 flex-shrink-0 hidden md:block" aria-label="Settings navigation">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSectionChange(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    activeSection === item.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  {item.icon && <span className="w-5 h-5">{item.icon}</span>}
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 max-w-3xl">
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Profile Page Layout
// ============================================================================

export interface ProfileLayoutProps {
  /** User avatar URL or initials */
  avatar?: string;
  /** User name */
  name: string;
  /** User role/title */
  title?: string;
  /** Bio/description */
  bio?: string;
  /** Stats/metrics */
  stats?: { label: string; value: string; icon?: React.ReactNode }[];
  /** Tab items */
  tabs: {
    id: string;
    label: string;
    content: React.ReactNode;
    badge?: number;
  }[];
  /** Active tab */
  activeTab: string;
  /** On tab change */
  onTabChange: (id: string) => void;
  /** Action buttons */
  actions?: React.ReactNode;
  /** Cover image */
  coverImage?: string;
  /** Class names */
  className?: string;
}

/**
 * Profile Page Layout
 * User profile with cover image, info card, and tabbed content.
 */
export function ProfileLayout({
  avatar,
  name,
  title,
  bio,
  stats,
  tabs,
  activeTab,
  onTabChange,
  actions,
  coverImage,
  className,
}: ProfileLayoutProps) {
  const getInitials = (name: string): string =>
    name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className={cn('max-w-4xl mx-auto', className)}>
      {/* Cover Image */}
      {coverImage ? (
        <div className="h-48 rounded-lg overflow-hidden mb-[-60px] relative">
          <img src={coverImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        </div>
      ) : (
        <div className="h-24 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg mb-12" />
      )}

      {/* Profile Info Card */}
      <div className="bg-background rounded-lg border shadow-sm mb-6 relative">
        <div className="p-6 pt-16">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="absolute -top-12 left-6 w-24 h-24 rounded-full bg-primary/10 border-4 border-background flex items-center justify-center text-2xl font-bold text-primary">
              {avatar?.startsWith('http') ? (
                <img src={avatar} alt={`${name}'s avatar`} className="w-full h-full rounded-full object-cover" />
              ) : (
                getInitials(name)
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 sm:ml-28">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-foreground">{name}</h1>
                  {title && (
                    <p className="text-muted-foreground">{title}</p>
                  )}
                </div>
                
                {actions && <div className="flex gap-2">{actions}</div>}
              </div>

              {bio && (
                <p className="mt-3 text-sm text-muted-foreground max-w-2xl">{bio}</p>
              )}

              {/* Stats */}
              {stats && stats.length > 0 && (
                <div className="flex gap-6 mt-4 pt-4 border-t">
                  {stats.map((stat) => (
                    <div key={stat.label} className="text-center">
                      <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t">
          <nav className="flex -mb-px" aria-label="Profile tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                )}
              >
                {tab.label}
                {tab.badge !== undefined && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-muted">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {tabs.find(t => t.id === activeTab)?.content}
      </div>
    </div>
  );
}

// ============================================================================
// List-Detail Pattern
// ============================================================================

export interface ListDetailProps<T> {
  /** List of items */
  items: T[];
  /** Item key extractor */
  itemKey: (item: T) => string;
  /** Item renderer for list */
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
  /** Detail renderer */
  renderDetail: (item: T) => React.ReactNode;
  /** Selected item (controlled) */
  selectedItem?: T | null;
  /** On selection change */
  onSelectItem: (item: T) => void;
  /** Empty state message */
  emptyMessage?: string;
  /** List width */
  listWidth?: string;
  /** Detail width */
  detailWidth?: string;
  /** Show search */
  showSearch?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Search filter function */
  searchFilter?: (item: T, query: string) => boolean;
  /** Class names */
  className?: string;
}

/**
 * List-Detail Pattern
 * Master-detail view with selectable list and detail panel.
 */
function ListDetailInner<T>({
  items,
  itemKey,
  renderItem,
  renderDetail,
  selectedItem,
  onSelectItem,
  emptyMessage = 'No items found',
  listWidth = '320px',
  detailWidth = 'auto',
  showSearch = false,
  searchPlaceholder = 'Search...',
  searchFilter,
  className,
}: ListDetailProps<T>) {
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredItems = React.useMemo(() => {
    if (!searchQuery || !searchFilter) return items;
    return items.filter(item => searchFilter(item, searchQuery));
  }, [items, searchQuery, searchFilter]);

  return (
    <div className={cn('flex h-[600px] rounded-lg border bg-background overflow-hidden', className)}>
      {/* List Panel */}
      <div
        className="flex flex-col border-r"
        style={{ width: listWidth }}
      >
        {/* Search */}
        {showSearch && (
          <div className="p-3 border-b">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}

        {/* Items List */}
        <div className="flex-1 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            filteredItems.map((item) => {
              const key = itemKey(item);
              const isSelected = selectedItem ? itemKey(selectedItem) === key : false;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectItem(item)}
                  className={cn(
                    'w-full text-left p-3 border-b transition-colors hover:bg-accent',
                    isSelected && 'bg-primary/5'
                  )}
                >
                  {renderItem(item, isSelected)}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Detail Panel */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ width: detailWidth }}
      >
        {selectedItem ? (
          renderDetail(selectedItem)
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select an item to view details
          </div>
        )}
      </div>
    </div>
  );
}

export const ListDetail = ListDetailInner as <T>(props: ListDetailProps<T>) => React.ReactElement<ListDetailProps<T>>;

// ============================================================================
// Master-Detail Layout
// ============================================================================

export interface MasterDetailLayoutProps {
  /** Master panel content */
  master: React.ReactNode;
  /** Detail panel content */
  detail: React.ReactNode;
  /** Master panel width */
  masterWidth?: string;
  /** Detail panel width */
  detailWidth?: string;
  /** Resizable */
  resizable?: boolean;
  /** Initial split ratio (0-1) */
  initialSplitRatio?: number;
  /** Minimum panel sizes */
  minMasterWidth?: number;
  minDetailWidth?: number;
  /** Class names */
  className?: string;
}

/**
 * Master-Detail Layout
 * Split-pane layout with resizable divider.
 */
export function MasterDetailLayout({
  master,
  detail,
  masterWidth = '40%',
  detailWidth = '60%',
  resizable = false,
  initialSplitRatio = 0.4,
  minMasterWidth = 250,
  minDetailWidth = 400,
  className,
}: MasterDetailLayoutProps) {
  const [splitRatio, setSplitRatio] = React.useState(initialSplitRatio);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isDragging = React.useRef(false);

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    if (!resizable) return;
    e.preventDefault();
    isDragging.current = true;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !isDragging.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const newRatio = (e.clientX - rect.left) / rect.width;
      setSplitRatio(Math.max(minMasterWidth / rect.width, Math.min(1 - minDetailWidth / rect.width, newRatio)));
    };
    
    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [resizable, minMasterWidth, minDetailWidth]);

  return (
    <div
      ref={containerRef}
      className={cn('flex h-full overflow-hidden', className)}
    >
      {/* Master Panel */}
      <div style={{ width: `${splitRatio * 100}%` }} className="overflow-auto border-r">
        {master}
      </div>

      {/* Resizer Handle */}
      {resizable && (
        <div
          onMouseDown={handleMouseDown}
          className="w-1 cursor-col-resize bg-border hover:bg-primary transition-colors flex-shrink-0"
        />
      )}

      {/* Detail Panel */}
      <div style={{ width: `${(1 - splitRatio) * 100}%` }} className="overflow-auto">
        {detail}
      </div>
    </div>
  );
}

export default DashboardGrid;
