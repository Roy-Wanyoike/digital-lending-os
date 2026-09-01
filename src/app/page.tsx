/**
 * ROYCSS Component System - Main Page
 * Entry point showing link to component system
 */

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-6">
        {/* Logo / Title */}
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            🎨 ROYCSS Component System
          </h1>
          <p className="text-xl text-muted-foreground">
            Digital Lending OS Platform — Phases 8-12
          </p>
        </div>

        {/* Description */}
        <p className="text-muted-foreground max-w-lg mx-auto">
          A comprehensive, accessible UI component library with reusable patterns,
          collection system, and export capabilities. Built with Next.js, TypeScript,
          and Tailwind CSS.
        </p>

        {/* Feature Highlights */}
        <div className="grid sm:grid-cols-3 gap-4 mt-8">
          <div className="p-4 rounded-lg border bg-card">
            <div className="text-2xl mb-2">📝</div>
            <h3 className="font-semibold">20+ Form Components</h3>
            <p className="text-sm text-muted-foreground">Inputs, selects, pickers, uploads & more</p>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="text-2xl mb-2">📊</div>
            <h3 className="font-semibold">15+ Data Display</h3>
            <p className="text-sm text-muted-foreground">Tables, cards, badges, progress indicators</p>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="text-2xl mb-2">🧭</div>
            <h3 className="font-semibold">10+ Navigation</h3>
            <p className="text-sm text-muted-foreground">Breadcrumbs, tabs, sidebar, command palette</p>
          </div>
        </div>

        {/* CTA Button */}
        <Link
          href="/roycss"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Explore Components
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        {/* Quick Stats */}
        <div className="flex items-center justify-center gap-6 pt-8 border-t mt-8">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">60+</p>
            <p className="text-xs text-muted-foreground">Components</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">12+</p>
            <p className="text-xs text-muted-foreground">Patterns</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">5</p>
            <p className="text-xs text-muted-foreground">Presets</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">100%</p>
            <p className="text-xs text-muted-foreground">Accessible</p>
          </div>
        </div>
      </div>
    </div>
  );
}
