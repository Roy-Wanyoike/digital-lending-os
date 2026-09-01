'use client';

/**
 * Components Page
 * 
 * Browse and search through 500+ UI components.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/roycss/navigation/Header';
import { Footer } from '@/components/roycss/navigation/Footer';
import { PageHeader } from '@/components/roycss/navigation/BreadcrumbNav';
import {
  Search,
  Grid3X3,
  List,
  Heart,
  Eye,
  Layers,
  ArrowRight,
  Layout,
  FormInput,
  Navigation,
  Image,
  Bell,
  Settings
} from 'lucide-react';

// Component categories with icons
const componentCategories = [
  { name: 'All', icon: <Layers className="w-4 h-4" />, count: 512 },
  { name: 'Layout', icon: <Layout className="w-4 h-4" />, count: 48 },
  { name: 'Forms', icon: <FormInput className="w-4 h-4" />, count: 86 },
  { name: 'Navigation', icon: <Navigation className="w-4 h-4" />, count: 34 },
  { name: 'Data Display', icon: <Image className="w-4 h-4" />, count: 72 },
  { name: 'Feedback', icon: <Bell className="w-4 h-4" />, count: 56 },
  { name: 'Overlay', icon: <Settings className="w-4 h-4" />, count: 42 },
];

// Sample components data
const components = [
  { id: 1, name: 'Button Group', category: 'Forms', description: 'Grouped buttons with various states' },
  { id: 2, name: 'Stats Card', category: 'Data Display', description: 'Statistics display card with trend' },
  { id: 3, name: 'Sidebar Nav', category: 'Navigation', description: 'Collapsible sidebar navigation' },
  { id: 4, name: 'Modal Dialog', category: 'Overlay', description: 'Accessible modal dialog' },
  { id: 5, name: 'Form Field', category: 'Forms', description: 'Input with label and validation' },
  { id: 6, name: 'Table', category: 'Data Display', description: 'Sortable data table' },
  { id: 7, name: 'Breadcrumb', category: 'Navigation', description: 'Breadcrumb navigation' },
  { id: 8, name: 'Toast Notification', category: 'Feedback', description: 'Notification toast messages' },
  { id: 9, name: 'Avatar Stack', category: 'Data Display', description: 'Stacked user avatars' },
  { id: 10, name: 'Dropdown Menu', category: 'Overlay', description: 'Dropdown with keyboard support' },
  { id: 11, name: 'Tabs Component', category: 'Navigation', description: 'Tab navigation component' },
  { id: 12, name: 'Progress Bar', category: 'Feedback', description: 'Progress indicator' },
];

export function ComponentsPageClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredComponents = components.filter((component) => {
    const matchesSearch = component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      component.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || component.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <PageHeader
        title="UI Components"
        description="Production-ready UI components built with accessibility in mind. Copy and paste into any project."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'ROYCSS', href: '/roycss' },
          { label: 'Components', href: '/roycss/components' },
        ]}
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="relative max-w-md mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
          {componentCategories.map((category) => (
            <button
              key={category.name}
              onClick={() => setSelectedCategory(category.name)}
              className={cn(
                "flex flex-col items-center p-4 rounded-xl border transition-all",
                selectedCategory === category.name
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border/50 hover:border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {category.icon}
              <span className="text-xs font-medium mt-2">{category.name}</span>
              <span className="text-[10px] opacity-60">{category.count}</span>
            </button>
          ))}
        </div>

        {/* Results */}
        <p className="text-sm text-muted-foreground mb-4">
          Showing {filteredComponents.length} of {components.length} components
        </p>

        {/* Components Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredComponents.map((component) => (
            <Link key={component.id} href={`/roycss/components/${component.id}`}>
              <Card className="group overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-lg bg-muted">
                      <Layers className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {component.category}
                    </Badge>
                  </div>
                  
                  <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                    {component.name}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {component.description}
                  </p>

                  <div className="mt-4 flex items-center text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    View component
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default ComponentsPageClient;
