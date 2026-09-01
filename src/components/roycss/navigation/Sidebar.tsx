'use client';

/**
 * Sidebar Component
 * 
 * Documentation sidebar with collapsible sections.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  Code2,
  Layout,
  Palette,
  Zap,
  FileText,
  Settings,
  HelpCircle
} from 'lucide-react';

interface SidebarItem {
  title: string;
  href?: string;
  icon?: React.ReactNode;
  children?: SidebarItem[];
  badge?: string;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

const sidebarSections: SidebarSection[] = [
  {
    title: 'Getting Started',
    items: [
      { title: 'Introduction', href: '/roycss/docs/getting-started', icon: <BookOpen className="w-4 h-4" /> },
      { title: 'Installation', href: '/roycss/docs/installation', icon: <Code2 className="w-4 h-4" /> },
      { title: 'Quick Start', href: '/roycss/docs/quick-start', icon: <Zap className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Core Concepts',
    items: [
      { 
        title: 'Design Tokens', 
        href: '/roycss/docs/tokens',
        icon: <Palette className="w-4 h-4" />,
        children: [
          { title: 'Colors', href: '/roycss/docs/tokens/colors' },
          { title: 'Spacing', href: '/roycss/docs/tokens/spacing' },
          { title: 'Typography', href: '/roycss/docs/tokens/typography' },
          { title: 'Shadows', href: '/roycss/docs/tokens/shadows' },
        ],
      },
      { 
        title: 'Components',
        href: '/roycss/components',
        icon: <Layout className="w-4 h-4" />,
        badge: '500+'
      },
      { 
        title: 'Effects',
        href: '/roycss/effects',
        icon: <Zap className="w-4 h-4" />,
        badge: '1800+'
      },
      { 
        title: 'Patterns',
        href: '/roycss/patterns',
        icon: <FileText className="w-4 h-4" />
      },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { title: 'Overview', href: '/roycss/docs/api-reference' },
      { title: 'Utility Classes', href: '/roycss/docs/api-reference/utilities' },
      { title: 'React Components', href: '/roycss/docs/api-reference/components' },
      { title: 'Hooks', href: '/roycss/docs/api-reference/hooks' },
    ],
  },
  {
    title: 'Resources',
    items: [
      { title: 'Guides', href: '/roycss/docs/guides' },
      { title: 'Examples', href: '/roycss/examples' },
      { title: 'Changelog', href: '/changelog' },
      { title: 'Community', href: '/community' },
    ],
  },
];

interface SidebarProps {
  className?: string;
  open?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ className, open = true }: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['Design Tokens']));

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(href + '/');
  };

  const renderSidebarItem = (item: SidebarItem, level: number = 0) => {
    const isExpanded = expandedItems.has(item.title);
    const hasChildren = item.children && item.children.length > 0;
    const active = isActive(item.href);

    return (
      <div key={item.title}>
        <Link
          href={item.href || '#'}
          onClick={(e) => {
            if (hasChildren) {
              e.preventDefault();
              toggleExpanded(item.title);
            }
          }}
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors w-full',
            level > 0 && 'ml-4 pl-4',
            active
              ? 'text-primary bg-primary/10 font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          {/* Expand/Collapse Icon */}
          {hasChildren ? (
            <span className="w-4 h-4 shrink-0">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </span>
          ) : (
            <span className="w-4 h-4 shrink-0" />
          )}

          {/* Item Icon */}
          {item.icon && !hasChildren && (
            <span className="shrink-0">{item.icon}</span>
          )}

          {/* Title */}
          <span className="flex-1 truncate">{item.title}</span>

          {/* Badge */}
          {item.badge && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
              {item.badge}
            </span>
          )}
        </Link>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-0.5 animate-in slide-in-from-top-2 duration-200">
            {item.children!.map((child) => renderSidebarItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!open) return null;

  return (
    <aside
      className={cn(
        'w-64 shrink-0 border-r bg-background/50 backdrop-blur-sm hidden lg:block',
        className
      )}
    >
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <nav className="p-4 space-y-6">
          {sidebarSections.map((section) => (
            <div key={section.title}>
              <h3 className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                {section.title}
              </h3>
              <div className="space-y-0.5">
                {section.items.map((item) => renderSidebarItem(item))}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}

// Mobile sidebar variant (slide-in)
export function MobileSidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // ... similar implementation for mobile

  return null; // Placeholder - would implement full mobile sidebar
}

export default Sidebar;
