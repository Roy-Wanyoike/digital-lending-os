'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Thin client island — ONLY the interactive parts:
 * - signIn() buttons (requires next-auth client)
 * - Mobile nav toggle (requires useState)
 *
 * Everything else (hero text, trust badges, footer) lives in the
 * Server Component wrapper so it ships as zero-JS HTML.
 */
export function ClientBanner() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <>
      {/* Desktop nav — sign-in buttons */}
      <nav className="hidden sm:flex items-center gap-4">
        <a href="https://youngsend.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</a>
        <a href="https://youngsend.com/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => signIn()}>Sign In</Button>
        <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white" onClick={() => signIn()}>Get Started</Button>
      </nav>

      {/* Mobile menu toggle */}
      <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setMobileNavOpen(!mobileNavOpen)} aria-label="Toggle menu">
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile nav drawer */}
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

      {/* Hero CTA — sign-in buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button size="lg" className="bg-emerald-700 hover:bg-emerald-800 text-white px-8 h-11 text-base font-semibold" onClick={() => signIn()}>
          Sign in to Dashboard
        </Button>
        <Button size="lg" variant="outline" className="px-8 h-11 text-base" asChild>
          <Link href="/register" prefetch={true}>Create Account</Link>
        </Button>
      </div>
    </>
  )
}
