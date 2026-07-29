'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LandingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm">YS</div>
            <span className="text-lg font-bold text-foreground">Youngsend</span>
          </div>
          <nav className="hidden sm:flex items-center gap-4">
            <a href="https://youngsend.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</a>
            <a href="https://youngsend.com/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => signIn()}>Sign In</Button>
            <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white" onClick={() => signIn()}>Get Started</Button>
          </nav>
          <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setMobileNavOpen(!mobileNavOpen)} aria-label="Toggle menu">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        {mobileNavOpen && (
          <nav className="sm:hidden border-t bg-card px-4 py-3 space-y-3">
            <a href="https://youngsend.com" className="block text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileNavOpen(false)}>About</a>
            <a href="https://youngsend.com/pricing" className="block text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileNavOpen(false)}>Pricing</a>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => { setMobileNavOpen(false); signIn() }}>Sign In</Button>
              <Button size="sm" className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white" onClick={() => { setMobileNavOpen(false); signIn() }}>Get Started</Button>
            </div>
          </nav>
        )}
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-lg space-y-8">
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white font-bold text-2xl shadow-lg shadow-emerald-600/25">YS</div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              The Financial Operating System<br />for Global Commerce
            </h1>
            <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
              Escrow, wallets, payment links, and AI-powered trust — all in one secure platform built for businesses that trade across borders.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="bg-emerald-700 hover:bg-emerald-800 text-white px-8 h-11 text-base font-semibold" onClick={() => signIn()}>
              Sign in to Dashboard
            </Button>
            <Button size="lg" variant="outline" className="px-8 h-11 text-base" asChild>
              <a href="/register">Create Account</a>
            </Button>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
              Bank-grade encryption
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
              SOC 2 Compliant
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
              24/7 Support
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-600 text-white font-bold text-[10px]">YS</div>
              <span className="text-sm font-medium text-foreground">Youngsend</span>
            </div>
            <nav className="flex items-center gap-6 text-xs text-muted-foreground">
              <a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a>
              <a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="https://youngsend.com/contact" className="hover:text-foreground transition-colors">Contact</a>
            </nav>
            <p className="text-xs text-muted-foreground">2026 Youngsend. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
