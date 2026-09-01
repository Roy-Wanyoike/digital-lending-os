'use client';

/**
 * TabNavigation Component
 * 
 * Tab-based navigation for switching between content sections.
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface TabItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: number | string;
  disabled?: boolean;
}

interface TabNavigationProps {
  items: TabItem[];
  className?: string;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function TabNavigation({
  items,
  className,
  variant = 'default',
  size = 'md',
  fullWidth = false,
}: TabNavigationProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  const baseStyles = {
    default: {
      container: 'bg-muted/50 p-1 rounded-lg inline-flex gap-1',
      tab: (active: boolean) => cn(
        'px-4 py-2 font-medium rounded-md transition-all duration-200',
        active 
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      ),
    },
    pills: {
      container: 'inline-flex gap-2',
      tab: (active: boolean) => cn(
        'px-4 py-2 font-medium rounded-full transition-all duration-200',
        active 
          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      ),
    },
    underline: {
      container: 'border-b inline-flex gap-0',
      tab: (active: boolean) => cn(
        'px-4 py-3 font-medium border-b-2 -mb-px transition-all duration-200',
        active 
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
      ),
    },
  };

  const sizes = {
    sm: { tab: 'text-xs', icon: 'w-3.5 h-3.5' },
    md: { tab: 'text-sm', icon: 'w-4 h-4' },
    lg: { tab: 'text-base', icon: 'w-5 h-5' },
  };

  const styles = baseStyles[variant];
  const sizeConfig = sizes[size];

  return (
    <nav className={cn('overflow-x-auto', !fullWidth && 'w-fit', className)}>
      <div className={cn(styles.container, fullWidth && 'w-full justify-stretch')}>
        {items.map((item) => {
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.href}
              href={item.disabled ? '#' : item.href}
              className={cn(
                styles.tab(active),
                sizeConfig.tab,
                fullWidth && 'flex-1 justify-center',
                item.disabled && 'opacity-50 pointer-events-none',
                'flex items-center gap-2 whitespace-nowrap'
              )}
              aria-current={active ? 'page' : undefined}
            >
              {/* Icon */}
              {item.icon && (
                <span className={sizeConfig.icon}>{item.icon}</span>
              )}
              
              {/* Label */}
              <span>{item.label}</span>
              
              {/* Badge */}
              {item.badge !== undefined && (
                <span className={cn(
                  'min-w-[18px] h-[18px] px-1.5 flex items-center justify-center rounded-full text-[10px] font-semibold',
                  active
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Preset configurations for common use cases
export function DocsTabs({ className }: { className?: string }) {
  const tabs = [
    { label: 'Overview', href: '/roycss/docs' },
    { label: 'Getting Started', href: '/roycss/docs/getting-started' },
    { label: 'API Reference', href: '/roycss/docs/api-reference' },
    { label: 'Guides', href: '/roycss/docs/guides' },
  ];

  return <TabNavigation items={tabs} variant="underline" className={className} />;
}

export function ProductTabs({ className }: { className?: string }) {
  const tabs = [
    { label: 'Effects', href: '/roycss/effects', badge: '1800+' },
    { label: 'Components', href: '/roycss/components', badge: '500+' },
    { label: 'Patterns', href: '/roycss/patterns' },
  ];

  return <TabNavigation items={tabs} variant="default" className={className} />;
}

export default TabNavigation;
