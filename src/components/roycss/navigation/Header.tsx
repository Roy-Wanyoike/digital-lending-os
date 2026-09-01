'use client';

/**
 * Header Component
 * 
 * Main header with logo, navigation, and action buttons.
 * Features sticky positioning with blur backdrop effect.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Menu, 
  X, 
  Search, 
  Github, 
  Twitter,
  Moon,
  Sun,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { MobileNav } from './MobileNav';

// Navigation items configuration
const navItems = [
  {
    label: 'Products',
    href: '/roycss',
    children: [
      { label: 'Effects', href: '/roycss/effects', description: '1800+ CSS effects' },
      { label: 'Components', href: '/roycss/components', description: '500+ UI components' },
      { label: 'Patterns', href: '/roycss/patterns', description: 'Design patterns' },
    ],
  },
  {
    label: 'Docs',
    href: '/roycss/docs',
    children: [
      { label: 'Getting Started', href: '/roycss/docs/getting-started' },
      { label: 'API Reference', href: '/roycss/docs/api-reference' },
      { label: 'Guides', href: '/roycss/docs/guides' },
    ],
  },
  {
    label: 'Examples',
    href: '/roycss/examples',
  },
  {
    label: 'Pricing',
    href: '/roycss/pricing',
  },
  {
    label: 'Resources',
    href: '#',
    children: [
      { label: 'Blog', href: '/blog' },
      { label: 'Changelog', href: '/changelog' },
      { label: 'Community', href: '/community' },
      { label: 'Status', href: '/status' },
    ],
  },
];

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const pathname = usePathname();

  // Handle scroll for header background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Keyboard shortcut for search (Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Trigger search modal here
        console.log('Search triggered');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isActive = useCallback((href: string) => {
    if (href === '/roycss') {
      return pathname === '/roycss' || pathname.startsWith('/roycss/');
    }
    return pathname === href || pathname.startsWith(href + '/');
  }, [pathname]);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300',
        isScrolled
          ? 'bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm'
          : 'bg-transparent',
        className
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link 
              href="/" 
              className="flex items-center gap-2 group"
            >
              <div className={cn(
                "relative w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105",
                "bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500",
                "shadow-lg shadow-primary/25"
              )}>
                <Sparkles className="w-5 h-5 text-white" />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 opacity-75 blur-sm -z-10" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                ROY<span className="text-primary">CSS</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => item.children && setActiveDropdown(item.label)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                      isActive(item.href)
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    {item.label}
                    {item.children && (
                      <ChevronDown className={cn(
                        'w-3.5 h-3.5 transition-transform',
                        activeDropdown === item.label && 'rotate-180'
                      )} />
                    )}
                  </Link>

                  {/* Dropdown Menu */}
                  {item.children && activeDropdown === item.label && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-popover border border-border rounded-xl shadow-lg py-2 animate-in fade-in-0 zoom-in-95">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            'block px-4 py-2.5 text-sm transition-colors',
                            pathname === child.href
                              ? 'text-primary bg-primary/5'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          )}
                        >
                          <div className="font-medium">{child.label}</div>
                          {child.description && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {child.description}
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Search Button */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:flex items-center gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => console.log('Search clicked')}
            >
              <Search className="w-4 h-4" />
              <span className="text-xs">Search</span>
              <kbd className="pointer-events-none hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                ⌘K
              </kbd>
            </Button>

            {/* GitHub Link */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex text-muted-foreground hover:text-foreground"
              asChild
            >
              <a href="https://github.com/Roy-Wanyoike/digital-lending-os" target="_blank" rel="noopener noreferrer">
                <Github className="w-4.5 h-4.5" />
              </a>
            </Button>

            {/* Theme Toggle (placeholder) */}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
            >
              <Sun className="w-4.5 h-4.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute w-4.5 h-4.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            {/* CTA Button */}
            <Button
              size="sm"
              className="hidden md:flex bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md shadow-primary/25"
              asChild
            >
              <Link href="/roycss">Get Started</Link>
            </Button>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-muted-foreground"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        navItems={navItems}
        isActive={isActive}
      />
    </header>
  );
}

export default Header;
