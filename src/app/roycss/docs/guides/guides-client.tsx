'use client';

/**
 * Guides Page
 * 
 * Step-by-step guides for ROYCSS.
 */

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/roycss/navigation/Header';
import { Footer } from '@/components/roycss/navigation/Footer';
import {
  Palette,
  Accessibility,
  Zap,
  Code2,
  ArrowRight,
  Clock,
  BookOpen
} from 'lucide-react';

// Guides data
const guides = [
  {
    title: 'Customization Guide',
    description: 'Learn how to customize ROYCSS effects to match your brand.',
    icon: <Palette className="w-6 h-6" />,
    color: 'from-pink-500 to-rose-500',
    duration: '10 min read',
    difficulty: 'Beginner',
  },
  {
    title: 'Theming with CSS Variables',
    description: 'Create custom themes using ROYCSS design tokens.',
    icon: <Code2 className="w-6 h-6" />,
    color: 'from-blue-500 to-cyan-500',
    duration: '15 min read',
    difficulty: 'Intermediate',
  },
  {
    title: 'Accessibility Best Practices',
    description: 'Build accessible interfaces with ROYCSS components.',
    icon: <Accessibility className="w-6 h-6" />,
    color: 'from-green-500 to-emerald-500',
    duration: '12 min read',
    difficulty: 'Intermediate',
  },
  {
    title: 'Performance Optimization',
    description: 'Tips for optimizing ROYCSS in production.',
    icon: <Zap className="w-6 h-6" />,
    color: 'from-yellow-500 to-orange-500',
    duration: '8 min read',
    difficulty: 'Advanced',
  },
];

export function GuidesClient() {
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
          <span className="text-foreground">Guides</span>
        </nav>

        {/* Title */}
        <Badge variant="secondary" className="mb-4">Guides</Badge>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
          Guides & Tutorials
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mb-12">
          Step-by-step guides for common use cases and best practices.
        </p>

        {/* Guides Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {guides.map((guide) => (
            <Card key={guide.title} className="group hover:border-primary/30 transition-all duration-300 hover:shadow-lg cursor-pointer overflow-hidden">
              <CardContent className="p-0">
                <Link href="#" className="block p-6">
                  <div className={cn(
                    "inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 bg-gradient-to-br text-white",
                    guide.color
                  )}>
                    {guide.icon}
                  </div>

                  <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                    {guide.title}
                  </h2>

                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {guide.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {guide.duration}
                      </span>
                      <Badge variant="outline" className="text-[10px]">{guide.difficulty}</Badge>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* More Resources */}
        <Card className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-primary/20">
          <CardContent className="p-8 text-center">
            <BookOpen className="w-10 h-10 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Need more help?</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Check out our examples gallery or join the community Discord for real-time support.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button asChild>
                <Link href="/roycss/examples">View Examples</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/community">Join Community</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}

export default GuidesClient;
