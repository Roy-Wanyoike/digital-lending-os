'use client';

/**
 * Getting Started Page
 * 
 * Quick start guide for ROYCSS.
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
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Rocket,
  Code2,
  Zap,
  ArrowRight,
  Terminal
} from 'lucide-react';

export function GettingStartedClient() {
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
          <span className="text-foreground">Getting Started</span>
        </nav>

        {/* Title */}
        <Badge variant="secondary" className="mb-4">Getting Started</Badge>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
          Get Started with{' '}
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">ROYCSS</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mb-12">
          Set up ROYCSS in your project and start building beautiful interfaces in minutes.
        </p>

        {/* Installation */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
              <Download className="w-6 h-6 text-primary" />
              Installation
            </h2>

            {/* Option 1: CDN */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Option 1: CDN (Quickest)</CardTitle>
                  <Badge>Recommended for beginners</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Add this single line to your HTML file to get started immediately:
                </p>
                <div className="relative">
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{`<link rel="stylesheet" href="https://cdn.roycss.dev/v2/roycss.min.css">`}</code>
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-slate-400 hover:text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Option 2: npm */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Option 2: npm (For React/Next.js)</CardTitle>
                  <Badge variant="outline">For build tools</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Install via npm and import the styles:
                </p>
                <div className="relative">
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{`npm install roycss

# or with yarn
yarn add roycss

# or with pnpm
pnpm add roycss`}</code>
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-slate-400 hover:text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Option 3: Download */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Option 3: Download</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Download the CSS file and include it manually:
                </p>
                <Button asChild>
                  <a href="/download/roycss.zip" download>
                    <Download className="w-4 h-4 mr-2" />
                    Download roycss.min.css (v2.0.0)
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Basic Usage */}
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
              <Code2 className="w-6 h-6 text-primary" />
              Basic Usage
            </h2>

            <Card>
              <CardContent className="p-6 space-y-6">
                <p className="text-muted-foreground">
                  Once installed, you can use any effect by adding the corresponding class to your elements:
                </p>

                <div>
                  <h3 className="font-semibold mb-3">Example: Glow Button</h3>
                  <div className="relative">
                    <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{`<button class="btn btn-glow btn-primary">
  Click Me
</button>`}</code>
                    </pre>
                  </div>
                  
                  {/* Live Preview */}
                  <div className="mt-4 p-6 bg-muted/30 rounded-lg flex items-center justify-center">
                    <button className={cn(
                      "px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500",
                      "text-white font-medium shadow-lg shadow-blue-500/25",
                      "hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300"
                    )}>
                      Click Me
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Example: Glassmorphism Card</h3>
                  <div className="relative">
                    <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{`<div class="card card-glass">
  <h2 class="card-title">Card Title</h2>
  <p class="card-text">Card content here...</p>
</div>`}</code>
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Next Steps */}
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
              <Rocket className="w-6 h-6 text-primary" />
              Next Steps
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="hover:border-primary/20 transition-colors cursor-pointer" asChild>
                <Link href="/roycss/docs/api-reference">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">API Reference</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Complete documentation</p>
                    </div>
                    <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground" />
                  </CardContent>
                </Link>
              </Card>

              <Card className="hover:border-primary/20 transition-colors cursor-pointer" asChild>
                <Link href="/roycss/effects">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Browse Effects</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">1800+ effects library</p>
                    </div>
                    <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground" />
                  </CardContent>
                </Link>
              </Card>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}

export default GettingStartedClient;
