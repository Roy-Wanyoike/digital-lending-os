'use client';

/**
 * Docs Page
 * 
 * Main documentation page for ROYCSS.
 */

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/roycss/navigation/Header';
import { Footer } from '@/components/roycss/navigation/Footer';
import {
  BookOpen,
  Code2,
  Zap,
  ArrowRight,
  FileText,
  GraduationCap,
  Lightbulb,
  Rocket,
  CheckCircle2
} from 'lucide-react';

// Documentation sections
const docSections = [
  {
    title: 'Getting Started',
    description: 'New to ROYCSS? Start here to get up and running quickly.',
    icon: <Rocket className="w-6 h-6" />,
    href: '/roycss/docs/getting-started',
    color: 'from-blue-500 to-cyan-500',
    articles: ['Installation', 'Quick Start', 'Basic Usage', 'Configuration'],
  },
  {
    title: 'API Reference',
    description: 'Complete API documentation for all effects and components.',
    icon: <Code2 className="w-6 h-6" />,
    href: '/roycss/docs/api-reference',
    color: 'from-purple-500 to-pink-500',
    articles: ['Utility Classes', 'React Components', 'CSS Variables', 'TypeScript Types'],
  },
  {
    title: 'Guides',
    description: 'Step-by-step guides for common use cases and best practices.',
    icon: <GraduationCap className="w-6 h-6" />,
    href: '/roycss/docs/guides',
    color: 'from-orange-500 to-yellow-500',
    articles: ['Customization', 'Theming', 'Accessibility', 'Performance'],
  },
];

// Quick start steps
const quickStartSteps = [
  { step: 1, title: 'Install', description: 'Copy the CSS or install via npm' },
  { step: 2, title: 'Import', description: 'Add the styles to your project' },
  { step: 3, title: 'Use', description: 'Apply classes or copy components' },
];

export function DocsPageClient() {
  return (
    <div className="flex-1 min-h-screen">
      <Header />
      
      {/* Docs Header */}
      <div className="border-b bg-background/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-8 py-12">
          <Badge variant="secondary" className="mb-4">Documentation</Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ROYCSS Docs
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Everything you need to build beautiful interfaces with ROYCSS. 
            From installation to advanced customization.
          </p>

          {/* Quick Search */}
          <div className="mt-8 max-w-md">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors text-left">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <span className="text-muted-foreground">Search documentation...</span>
              <kbd className="ml-auto text-xs text-muted-foreground border rounded px-1.5 py-0.5">⌘K</kbd>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-8 py-12 space-y-16">
        {/* Quick Start */}
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            Quick Start
          </h2>
          
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-6">
                {quickStartSteps.map((item) => (
                  <div key={item.step} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t flex justify-center">
                <Button asChild>
                  <Link href="/roycss/docs/getting-started">
                    Read Full Guide
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Documentation Sections */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Documentation</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {docSections.map((section) => (
              <Link key={section.title} href={section.href}>
                <Card className="group h-full hover:border-primary/30 transition-all duration-300 hover:shadow-lg cursor-pointer">
                  <CardHeader>
                    <div className={cn(
                      "inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 bg-gradient-to-br text-white",
                      section.color
                    )}>
                      {section.icon}
                    </div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {section.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {section.description}
                    </p>
                    
                    <ul className="space-y-2">
                      {section.articles.map((article) => (
                        <li key={article} className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                          {article}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Resources */}
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-yellow-500" />
            Additional Resources
          </h2>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="hover:border-primary/20 transition-colors">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Examples Gallery</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">See ROYCSS in action</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </CardContent>
            </Card>

            <Card className="hover:border-primary/20 transition-colors">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">API Reference</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Complete technical docs</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </CardContent>
            </Card>

            <Card className="hover:border-primary/20 transition-colors">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Tutorials</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Step-by-step learning</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </CardContent>
            </Card>

            <Card className="hover:border-primary/20 transition-colors">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Changelog</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">What's new in v2.0</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default DocsPageClient;
