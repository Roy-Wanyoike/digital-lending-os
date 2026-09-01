'use client';

/**
 * API Reference Page
 * 
 * Complete API documentation for ROYCSS.
 */

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/roycss/navigation/Header';
import { Footer } from '@/components/roycss/navigation/Footer';

// API sections
const apiSections = [
  {
    title: 'Utility Classes',
    description: 'CSS utility classes for common effects and styles.',
    items: [
      { name: '.btn-glow', description: 'Adds glow effect to buttons' },
      { name: '.card-glass', description: 'Glassmorphism card effect' },
      { name: '.text-gradient', description: 'Gradient text effect' },
      { name: '.animate-shimmer', description: 'Shimmer loading animation' },
      { name: '.border-neon', description: 'Neon border animation' },
    ],
  },
  {
    title: 'React Components',
    description: 'Pre-built React components with TypeScript support.',
    items: [
      { name: '<GlowButton>', description: 'Button with glow effect' },
      { name: '<GlassCard>', description: 'Glassmorphism card component' },
      { name: '<AnimatedText>', description: 'Text with animations' },
      { name: '<ShimmerLoader>', description: 'Loading skeleton' },
      { name: '<NeonInput>', description: 'Neon-styled input field' },
    ],
  },
  {
    title: 'CSS Variables',
    description: 'Customizable CSS variables for theming.',
    items: [
      { name: '--roycss-primary', description: 'Primary color variable' },
      { name: '--roycss-radius', description: 'Border radius scale' },
      { name: '--roycss-shadow', description: 'Shadow definitions' },
      { name: '--roycss-transition', description: 'Transition timing' },
      { name: '--roycss-font', description: 'Font family stack' },
    ],
  },
];

export function ApiReferenceClient() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link href="/roycss" className="hover:text-foreground">ROYCSS</Link>
          <span>/</span>
          <Link href="/roycss/docs" className="hover:text-foreground">Docs</Link>
          <span>/</span>
          <span className="text-foreground">API Reference</span>
        </nav>

        {/* Title */}
        <Badge variant="secondary" className="mb-4">API Reference</Badge>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
          API Reference
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mb-12">
          Complete reference documentation for all ROYCSS utilities, components, and configuration options.
        </p>

        {/* API Sections */}
        <div className="space-y-12">
          {apiSections.map((section) => (
            <section key={section.title}>
              <h2 className="text-2xl font-bold mb-2">{section.title}</h2>
              <p className="text-muted-foreground mb-6">{section.description}</p>

              <Card>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/50">
                    {section.items.map((item) => (
                      <div key={item.name} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
                        <code className="font-mono text-sm bg-primary/10 text-primary px-2 py-1 rounded shrink-0">
                          {item.name}
                        </code>
                        <span className="text-sm text-muted-foreground pt-0.5">
                          {item.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>
          ))}

          {/* TypeScript Types */}
          <section>
            <h2 className="text-2xl font-bold mb-6">TypeScript Support</h2>
            <Card>
              <CardContent className="p-6 space-y-4">
                <p className="text-muted-foreground">
                  ROYCSS provides full TypeScript support with type definitions included:
                </p>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{`import type { 
  GlowButtonProps,
  GlassCardProps,
  AnimationConfig,
  ThemeConfig
} from 'roycss/types';`}</code>
                </pre>
                <Button variant="outline" asChild>
                  <Link href="#">View All Types →</Link>
                </Button>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default ApiReferenceClient;
