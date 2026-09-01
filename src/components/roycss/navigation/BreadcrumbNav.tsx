'use client';

/**
 * BreadcrumbNav Component
 * 
 * Breadcrumb navigation for showing current page location.
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface BreadcrumbNavProps {
  items?: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
  separator?: React.ReactNode;
}

// Auto-generate breadcrumbs from pathname
function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  let currentPath = '';
  
  // Add home
  breadcrumbs.push({
    label: 'Home',
    href: '/',
    icon: <Home className="w-3.5 h-3.5" />,
  });

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    
    // Convert slug to readable title
    const title = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Don't add the last segment as a link (current page)
    if (index === segments.length - 1) {
      breadcrumbs.push({ label: title, href: currentPath });
    } else {
      breadcrumbs.push({ label: title, href: currentPath });
    }
  });

  return breadcrumbs;
}

export function BreadcrumbNav({
  items,
  className,
  showHome = true,
  separator = <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />,
}: BreadcrumbNavProps) {
  const pathname = usePathname();
  const breadcrumbs = items || generateBreadcrumbs(pathname);

  // Filter out home if not showing
  const displayItems = showHome 
    ? breadcrumbs 
    : breadcrumbs.filter((_, i) => i > 0);

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center', className)}>
      <ol className="flex items-center gap-1 flex-wrap text-sm">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          
          return (
            <li key={`${item.href}-${index}`} className="flex items-center gap-1">
              {/* Separator (not before first item) */}
              {index > 0 && (
                <span className="shrink-0" aria-hidden="true">
                  {separator}
                </span>
              )}

              {/* Item */}
              {isLast ? (
                <span
                  className="font-medium text-foreground"
                  aria-current="page"
                >
                  {item.icon && <span className="mr-1 inline-flex">{item.icon}</span>}
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.icon && <span className="mr-1 inline-flex">{item.icon}</span>}
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Compact variant for page headers
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('border-b bg-background/50 backdrop-blur-sm', className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {breadcrumbs && (
          <BreadcrumbNav 
            items={breadcrumbs} 
            className="mb-4" 
          />
        )}
        
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {title}
            </h1>
            {description && (
              <p className="mt-2 text-muted-foreground max-w-2xl">
                {description}
              </p>
            )}
          </div>
          
          {actions && (
            <div className="shrink-0 flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BreadcrumbNav;
