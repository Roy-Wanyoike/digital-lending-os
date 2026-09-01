/**
 * ROYCSS Component System - Demo Page
 * @module app/roycss
 * @description Main demo page for ROYCSS component system with component browser
 */

'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/components/roycss/shared/utils';

// ============================================================================
// Types
// ============================================================================

interface ComponentDemo {
  id: string;
  name: string;
  category: string;
  description: string;
  component: React.ReactNode;
}

// ============================================================================
// Mock Data for Demos
// ============================================================================

const tableData = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Active' },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'Inactive' },
  { id: '4', name: 'Alice Brown', email: 'alice@example.com', role: 'Editor', status: 'Active' },
];

const tabs = [
  { id: 'overview', label: 'Overview', content: <p className="text-muted-foreground">Overview content goes here.</p> },
  { id: 'analytics', label: 'Analytics', content: <p className="text-muted-foreground">Analytics content goes here.</p> },
  { id: 'reports', label: 'Reports', content: <p className="text-muted-foreground">Reports content goes here.</p> },
];

const breadcrumbItems = [
  { label: 'Home', href: '/' },
  { label: 'Components', href: '/roycss' },
  { label: 'Dashboard', current: true },
];

const sidebarItems = [
  { id: 'dashboard', label: 'Dashboard', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
  { id: 'users', label: 'Users', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 016 0v1a2 2 0 01-2 2H9a2 2 0 01-2-2z" /></svg>, badge: 12 },
  { id: 'settings', label: 'Settings', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
];

// ============================================================================
// Category Definitions
// ============================================================================

const categories = [
  { id: 'form', name: 'Form Components', icon: '📝', count: 20 },
  { id: 'data', name: 'Data Display', icon: '📊', count: 15 },
  { id: 'nav', name: 'Navigation', icon: '🧭', count: 10 },
  { id: 'overlay', name: 'Overlay', icon: '🪟', count: 8 },
  { id: 'feedback', name: 'Feedback', icon: '💬', count: 6 },
];

// ============================================================================
// Page Component
// ============================================================================

export default function RoyCSSDemoPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);

  // Keyboard shortcut for command palette
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <span className="text-3xl">🎨</span>
                ROYCSS Component System
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Comprehensive UI component library for Digital Lending OS (Phases 8-12)
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowCommandPalette(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-accent transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search components...
              <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-xs bg-muted rounded">⌘K</kbd>
            </button>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(activeCategory === cat.id ? 'all' : cat.id)}
                className={cn(
                  'p-3 rounded-lg border text-left transition-all',
                  activeCategory === cat.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                )}
              >
                <span className="text-xl">{cat.icon}</span>
                <p className="font-medium text-sm mt-1">{cat.name}</p>
                <p className="text-xs text-muted-foreground">{cat.count}+ components</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Form Components Section */}
        {(activeCategory === 'all' || activeCategory === 'form') && (
          <section className="mb-16">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              📝 Form Components
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Masked Input Demo */}
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="font-semibold">MaskedInput</h3>
                <p className="text-sm text-muted-foreground">Phone number input with masking</p>
                <div className="p-3 bg-muted/50 rounded-md">
                  <label className="block text-sm mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="(555) 000-0000"
                    className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                    defaultValue="(555) 123-4567"
                  />
                </div>
              </div>

              {/* Validated Input Demo */}
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="font-semibold">ValidatedInput</h3>
                <p className="text-sm text-muted-foreground">Email input with validation</p>
                <div className="p-3 bg-muted/50 rounded-md">
                  <label className="block text-sm mb-1">Email Address *</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:ring-2 focus:ring-success/20 focus:border-success"
                    defaultValue="user@example.com"
                  />
                  <p className="text-xs text-success mt-1">✓ Valid email address</p>
                </div>
              </div>

              {/* Select Demo */}
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="font-semibold">Select</h3>
                <p className="text-sm text-muted-foreground">Searchable select dropdown</p>
                <div className="p-3 bg-muted/50 rounded-md">
                  <select className="w-full px-3 py-2 border rounded-md text-sm bg-background">
                    <option>Select an option...</option>
                    <option>Option 1</option>
                    <option>Option 2</option>
                    <option>Option 3</option>
                  </select>
                </div>
              </div>

              {/* Date Picker Demo */}
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="font-semibold">DatePicker</h3>
                <p className="text-sm text-muted-foreground">Date selection with calendar</p>
                <div className="p-3 bg-muted/50 rounded-md">
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                    defaultValue="2024-01-15"
                  />
                </div>
              </div>

              {/* File Upload Demo */}
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="font-semibold">FileUpload</h3>
                <p className="text-sm text-muted-foreground">Drag & drop file upload</p>
                <div className="p-6 border-2 border-dashed rounded-md text-center cursor-pointer hover:bg-accent/50 transition-colors">
                  <svg className="mx-auto w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mt-2 text-sm text-muted-foreground">Drop files here or click to browse</p>
                </div>
              </div>

              {/* Form Wizard Demo */}
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="font-semibold">FormWizard</h3>
                <p className="text-sm text-muted-foreground">Multi-step form wizard</p>
                <div className="p-3 bg-muted/50 rounded-md">
                  <div className="flex justify-between mb-4">
                    {[1, 2, 3].map((step) => (
                      <div key={step} className="flex items-center gap-2">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                          step <= 2 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                        )}>
                          {step}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full w-2/3 bg-primary rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Data Display Components Section */}
        {(activeCategory === 'all' || activeCategory === 'data') && (
          <section className="mb-16">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              📊 Data Display Components
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Stat Cards */}
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="font-semibold">StatCard</h3>
                <p className="text-sm text-muted-foreground">Statistics display card</p>
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-emerald-600">$45,231</p>
                  <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                    ↑ 20.1% from last month
                  </p>
                </div>
              </div>

              {/* Badge Variants */}
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="font-semibold">Badge</h3>
                <p className="text-sm text-muted-foreground">Status badges and tags</p>
                <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-md">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">Default</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/30">Success</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/30">Warning</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/30">Error</span>
                </div>
              </div>

              {/* Avatar Group */}
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="font-semibold">Avatar & AvatarGroup</h3>
                <p className="text-sm text-muted-foreground">User avatars</p>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">JD</div>
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-medium">JS</div>
                  <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-medium">AB</div>
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-medium">+5</div>
                </div>
              </div>

              {/* Progress Indicators */}
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="font-semibold">Progress</h3>
                <p className="text-sm text-muted-foreground">Linear & circular progress</p>
                <div className="space-y-3 p-3 bg-muted/50 rounded-md">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Upload Progress</span>
                      <span>75%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full w-3/4 bg-primary rounded-full" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" className="text-muted" strokeWidth="3" />
                        <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" className="text-primary" strokeWidth="3" strokeDasharray="100" strokeDashoffset="25" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span className="text-sm">75%</span>
                  </div>
                </div>
              </div>

              {/* Table Preview */}
              <div className="md:col-span-2 rounded-lg border p-4 space-y-4">
                <h3 className="font-semibold">DataTable</h3>
                <p className="text-sm text-muted-foreground">Sortable, filterable data table</p>
                <div className="overflow-x-auto p-3 bg-muted/50 rounded-md">
                  <table className="w-full text-sm">
                    <thead>
                      <tr class="border-b">
                        <th className="text-left p-2 font-medium">Name</th>
                        <th className="text-left p-2 font-medium">Email</th>
                        <th className="text-left p-2 font-medium">Role</th>
                        <th className="text-left p-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row) => (
                        <tr key={row.id} className="border-b last:border-0">
                          <td className="p-2">{row.name}</td>
                          <td className="p-2 text-muted-foreground">{row.email}</td>
                          <td className="p-2">{row.role}</td>
                          <td className="p-2">
                            <span className={cn(
                              'px-2 py-0.5 rounded-full text-xs',
                              row.status === 'Active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                            )}>{row.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Navigation Components Section */}
        {(activeCategory === 'all' || activeCategory === 'nav') && (
          <section className="mb-16">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              🧭 Navigation Components
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Breadcrumb */}
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="font-semibold">Breadcrumb</h3>
                <p className="text-sm text-muted-foreground">Navigation breadcrumbs</p>
                <div className="p-3 bg-muted/50 rounded-md">
                  <nav className="flex items-center gap-2 text-sm">
                    <a href="#" className="text-muted-foreground hover:text-foreground">Home</a>
                    <span className="text-muted-foreground">/</span>
                    <a href="#" className="text-muted-foreground hover:text-foreground">Components</a>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-foreground font-medium">Current</span>
                  </nav>
                </div>
              </div>

              {/* Tabs */}
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="font-semibold">Tabs</h3>
                <p className="text-sm text-muted-foreground">Tab navigation variants</p>
                <div className="p-3 bg-muted/50 rounded-md">
                  <div className="flex border-b gap-4">
                    <button className="pb-2 text-sm font-medium border-b-2 border-primary text-primary">Overview</button>
                    <button className="pb-2 text-sm text-muted-foreground hover:text-foreground">Analytics</button>
                    <button className="pb-2 text-sm text-muted-foreground hover:text-foreground">Reports</button>
                  </div>
                </div>
              </div>

              {/* Pagination */}
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="font-semibold">Pagination</h3>
                <p className="text-sm text-muted-foreground">Page navigation</p>
                <div className="flex items-center justify-center gap-1 p-3 bg-muted/50 rounded-md">
                  <button className="p-1.5 text-sm border rounded hover:bg-accent">‹</button>
                  <button className="p-1.5 text-sm border rounded bg-primary text-white">1</button>
                  <button className="p-1.5 text-sm border rounded hover:bg-accent">2</button>
                  <button className="p-1.5 text-sm border rounded hover:bg-accent">3</button>
                  <button className="p-1.5 text-sm border rounded hover:bg-accent">›</button>
                </div>
              </div>

              {/* Sidebar Preview */}
              <div className="md:col-span-2 lg:col-span-3 rounded-lg border p-4 space-y-4">
                <h3 className="font-semibold">Sidebar Navigation</h3>
                <p className="text-sm text-muted-foreground">Collapsible sidebar with icons</p>
                <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="w-56 bg-background border rounded-lg p-3 space-y-1">
                    {sidebarItems.map((item) => (
                      <button key={item.id} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent text-left">
                        {item.icon}
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary">{item.badge}</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 bg-background border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Main content area</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Overlay Components Section */}
        {(activeCategory === 'all' || activeCategory === 'overlay') && (
          <section className="mb-16">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              🪟 Overlay Components
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Modal Trigger */}
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="font-semibold">Modal / Dialog</h3>
                <p className="text-sm text-muted-foreground">Modal dialogs with animations</p>
                <div className="p-3 bg-muted/50 rounded-md">
                  <button
                    type="button"
                    onClick={() => setSelectedComponent('modal')}
                    className="w-full px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90"
                  >
                    Open Modal
                  </button>
                </div>
              </div>

              {/* Drawer Trigger */}
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="font-semibold">Drawer / Sheet</h3>
                <p className="text-sm text-muted-foreground">Slide-over panels</p>
                <div className="p-3 bg-muted/50 rounded-md">
                  <button
                    type="button"
                    onClick={() => setSelectedComponent('drawer')}
                    className="w-full px-4 py-2 border rounded-md text-sm hover:bg-accent"
                  >
                    Open Drawer
                  </button>
                </div>
              </div>

              {/* Tooltip Demo */}
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="font-semibold">Tooltip & Popover</h3>
                <p className="text-sm text-muted-foreground">Hover information displays</p>
                <div className="flex gap-3 p-3 bg-muted/50 rounded-md">
                  <button
                    type="button"
                    className="px-3 py-1.5 border rounded-md text-sm relative group"
                  >
                    Hover me
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-foreground text-background rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Tooltip content
                    </span>
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 border rounded-md text-sm"
                  >
                    Popover →
                  </button>
                </div>
              </div>

              {/* Toast Notification Demo */}
              <div className="md:col-span-2 lg:col-span-3 rounded-lg border p-4 space-y-4">
                <h3 className="font-semibold">Toast Notifications</h3>
                <p className="text-sm text-muted-foreground">Feedback notifications</p>
                <div className="grid sm:grid-cols-4 gap-3 p-3 bg-muted/50 rounded-md">
                  <div className="p-3 rounded-lg bg-success/10 text-success border border-success/30 text-sm">
                    ✓ Success message
                  </div>
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/30 text-sm">
                    ✕ Error message
                  </div>
                  <div className="p-3 rounded-lg bg-warning/10 text-warning border border-warning/30 text-sm">
                    ⚠ Warning message
                  </div>
                  <div className="p-3 rounded-lg bg-info/10 text-info border border-info/30 text-sm">
                    ℹ Info message
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Feedback Components Section */}
        {(activeCategory === 'all' || activeCategory === 'feedback') && (
          <section className="mb-16">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              💬 Feedback Components
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Alert Banners */}
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="font-semibold">Alert Banners</h3>
                <p className="text-sm text-muted-foreground">Contextual alert messages</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-info/10 text-info border border-info/30">
                    <span>ℹ</span>
                    <div><p className="font-medium text-sm">Information</p><p className="text-sm opacity-90">This is an informational alert.</p></div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10 text-success border border-success/30">
                    <span>✓</span>
                    <div><p className="font-medium text-sm">Success</p><p className="text-sm opacity-90">Operation completed successfully.</p></div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 text-warning border border-warning/30">
                    <span>⚠</span>
                    <div><p className="font-medium text-sm">Warning</p><p className="text-sm opacity-90">Please review before proceeding.</p></div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/30">
                    <span>✕</span>
                    <div><p className="font-medium text-sm">Error</p><p className="text-sm opacity-90">Something went wrong.</p></div>
                  </div>
                </div>
              </div>

              {/* Empty State & Confirmation */}
              <div className="space-y-6">
                {/* Empty State */}
                <div className="rounded-lg border p-4 space-y-4">
                  <h3 className="font-semibold">EmptyState</h3>
                  <p className="text-sm text-muted-foreground">No data placeholder</p>
                  <div className="flex flex-col items-center justify-center py-8 px-4 text-center border rounded-lg bg-muted/30">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
                      <svg className="w-8 h-8 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <p className="font-medium text-foreground">No data found</p>
                    <p className="text-sm text-muted-foreground mt-1">Start by adding your first item.</p>
                    <button className="mt-4 px-4 py-2 bg-primary text-white rounded-md text-sm">Add Item</button>
                  </div>
                </div>

                {/* Confirmation Dialog */}
                <div className="rounded-lg border p-4 space-y-4">
                  <h3 className="font-semibold">ConfirmDialog</h3>
                  <p className="text-sm text-muted-foreground">Confirmation prompts</p>
                  <div className="p-4 rounded-lg border bg-destructive/5">
                    <div className="flex items-start gap-3">
                      <span className="p-2 rounded-full bg-destructive/10 text-destructive">⚠</span>
                      <div>
                        <p className="font-medium text-sm">Delete this item?</p>
                        <p className="text-sm text-muted-foreground mt-1">This action cannot be undone.</p>
                        <div className="flex gap-2 mt-4">
                          <button className="px-3 py-1.5 border rounded-md text-sm hover:bg-accent">Cancel</button>
                          <button className="px-3 py-1.5 bg-destructive text-white rounded-md text-sm">Delete</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>ROYCSS Component System • Digital Lending OS Platform</p>
          <p className="mt-1">Phases 8-12 Complete • Built with Next.js, TypeScript & Tailwind CSS</p>
        </div>
      </footer>

      {/* Command Palette Modal */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCommandPalette(false)} />
          <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-full max-w-lg rounded-lg bg-background shadow-2xl border animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center border-b px-4">
              <svg className="w-5 h-5 text-muted-foreground mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search components..."
                autoFocus
                className="flex-1 py-3 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
              <kbd className="px-2 py-0.5 text-xs text-muted-foreground border rounded">ESC</kbd>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-2">
              <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase">Components</p>
              {['MaskedInput', 'ValidatedInput', 'Select', 'DatePicker', 'FileUpload', 'DataTable', 'StatCard', 'Modal', 'Drawer', 'Alert'].map((name) => (
                <button
                  key={name}
                  type="button"
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm hover:bg-accent"
                  onClick={() => {
                    setShowCommandPalette(false);
                    // Could navigate to specific component
                  }}
                >
                  <span className="text-muted-foreground">📦</span>
                  <span>{name}</span>
                  <span className="ml-auto text-xs text-muted-foreground capitalize">
                    {['MaskedInput', 'ValidatedInput', 'Select', 'DatePicker', 'FileUpload'].includes(name) ? 'form' :
                     ['DataTable', 'StatCard', 'Badge', 'Avatar', 'Progress'].includes(name) ? 'data' :
                     ['Breadcrumb', 'Tabs', 'Pagination', 'Sidebar'].includes(name) ? 'nav' :
                     ['Modal', 'Drawer', 'Popover', 'Tooltip', 'ToastContainer'].includes(name) ? 'overlay' : 'feedback'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
