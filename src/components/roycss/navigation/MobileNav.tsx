'use client';

/**
 * MobileNav Component
 * 
 * Hamburger menu navigation for mobile devices.
 */

import React, { useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  ChevronRight, 
  Sparkles,
  Github,
  Search,
  X
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  children?: {
    label: string;
    href: string;
    description?: string;
  }[];
}

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: NavItem[];
  isActive: (href: string) => boolean;
}

export function MobileNav({
  isOpen,
  onClose,
  navItems,
  isActive,
}: MobileNavProps) {
  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Menu */}
      <div
        className={cn(
          'fixed top-16 right-0 bottom-0 z-50 w-full max-w-sm bg-background border-l shadow-2xl lg:hidden',
          'transform transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <span className="font-semibold text-lg">Menu</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100%-140px)]">
          {navItems.map((item) => (
            <div key={item.label}>
              {/* Parent Item */}
              <Link
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center justify-between px-4 py-3 rounded-lg text-base font-medium transition-colors',
                  isActive(item.href)
                    ? 'text-primary bg-primary/10'
                    : 'text-foreground hover:bg-muted'
                )}
              >
                <span>{item.label}</span>
                {item.children && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </Link>

              {/* Children */}
              {item.children && (
                <div className="ml-4 mt-1 space-y-1 border-l pl-4">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onClose}
                      className={cn(
                        'block px-3 py-2 text-sm rounded-md transition-colors',
                        isActive(child.href)
                          ? 'text-primary bg-primary/5'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background space-y-3">
          {/* Search */}
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => console.log('Mobile search')}
          >
            <Search className="w-4 h-4" />
            Search...
            <kbd className="ml-auto text-xs text-muted-foreground">⌘K</kbd>
          </Button>

          {/* CTA Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              asChild
              className="gap-2"
            >
              <a href="https://github.com/Roy-Wanyoike/digital-lending-os" target="_blank" rel="noopener noreferrer">
                <Github className="w-4 h-4" />
                GitHub
              </a>
            </Button>
            <Button
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              asChild
            >
              <Link href="/roycss" onClick={onClose}>
                Get Started
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default MobileNav;
