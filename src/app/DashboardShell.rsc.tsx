import { Suspense } from 'react'
import { Menu, LogOut, X } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import type { Session } from 'next-auth'
import type { Role } from '@/lib/dashboard-helpers'

// Server-side data that would be fetched on the server
// In the real implementation, this comes from DB/Redis/cache
interface ServerNavData {
  userName: string
  userEmail: string
  userInitials: string
  userRole: Role
  visibleTabs: string[]
  activeTab: string
  sseConnected: boolean
}

/**
 * Server Component — renders the dashboard chrome (sidebar + header).
 * No 'use client' directive. This runs entirely on the server.
 *
 * Pattern: Server Component provides layout + data → passes to thin client island
 * for interactivity (tab switching, sign-out, realtime, etc.)
 */
export async function DashboardShellServer({ session }: { session: Session }) {
  // ── Server-side data fetching ───────────────────────────────────────
  // This would be a DB call or Redis cache lookup in production.
  // For the PoC we extract from session.
  const userName = (session?.user as any)?.name || 'User'
  const userEmail = session?.user?.email || ''
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const userRole = ((session?.user as any)?.role as Role) || 'admin'

  // Build nav data on the server — no client JS needed for this
  const navData: ServerNavData = {
    userName,
    userEmail,
    userInitials,
    userRole,
    visibleTabs: getVisibleTabs(userRole),
    activeTab: 'overview',
    sseConnected: false,
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background">
      <div className="flex flex-1">
        {/* ── Server-rendered sidebar (zero client JS) ────────────────── */}
        <aside className="hidden lg:flex w-60 bg-card border-r flex-col flex-shrink-0 overflow-hidden">
          <ServerSidebar navData={navData} />
        </aside>

        {/* ── Mobile sidebar (thin client island) ────────────────────── */}
        <MobileSidebar navData={navData} />

        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* ── Server-rendered header (zero client JS) ────────────────── */}
          <ServerHeader navData={navData} />

          {/* ── Tab content — client island with Suspense streaming ─── */}
          <main className="flex-1 p-4 sm:p-6">
            <Suspense fallback={<TabSkeleton />}>
              {/* <DashboardClientIsland navData={navData} /> */}
              {/* In full migration this would be the dynamic tab component */}
              <TabSkeleton />
            </Suspense>
          </main>

          <footer className="border-t px-4 sm:px-6 py-4 mt-auto">
            <p className="text-xs text-muted-foreground text-center">
              Youngsend Trust Network — The Financial Operating System for Global Commerce
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}

// ── Server-rendered sidebar (pure Server Component) ──────────────────────────
function ServerSidebar({ navData }: { navData: ServerNavData }) {
  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'trust-graph', label: 'Trust Graph' },
    { id: 'escrow', label: 'Escrow' },
    { id: 'payments', label: 'Payments' },
    { id: 'passport', label: 'Passport' },
    { id: 'digital-twin', label: 'Digital Twin' },
    { id: 'payment-links', label: 'Payment Links' },
    { id: 'wallet', label: 'Wallet' },
    { id: 'referral', label: 'Referral' },
    { id: 'fraud', label: 'Fraud' },
    { id: 'matching', label: 'Matching' },
    { id: 'collections', label: 'Collections' },
    { id: 'compliance', label: 'Compliance' },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 sm:p-6 border-b border-border">
        <h1 className="text-xl font-bold text-emerald-500">Youngsend</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Trust Network</p>
      </div>
      <nav className="space-y-1 px-3 py-4" aria-label="Dashboard navigation">
        {navItems.map(item => {
          if (!navData.visibleTabs.includes(item.id)) return null
          const isActive = navData.activeTab === item.id
          return (
            <a
              key={item.id}
              href={`?tab=${item.id}`}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {item.label}
            </a>
          )
        })}
      </nav>
      <div className="p-4 border-t border-border">
        <p className="text-[10px] text-muted-foreground text-center">The Financial Operating System</p>
        <p className="text-[10px] text-muted-foreground text-center">for Global Commerce</p>
      </div>
    </div>
  )
}

// ── Server-rendered header (pure Server Component) ────────────────────────────
function ServerHeader({ navData }: { navData: ServerNavData }) {
  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-[10px] font-medium hidden sm:inline text-muted-foreground">Connecting…</span>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline capitalize">{navData.userRole}</span>
        </div>
      </div>
    </header>
  )
}

// ── Mobile sidebar — thin client island (imported dynamically in real impl) ──
function MobileSidebar({ navData }: { navData: ServerNavData }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden fixed top-3 left-4 z-40" aria-label="Open navigation">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-60 p-0 bg-card border-border">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <ServerSidebar navData={navData} />
      </SheetContent>
    </Sheet>
  )
}

// ── Pure Server Component skeleton (zero client JS) ──────────────────────────
function TabSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-64 rounded-lg bg-muted" />
      <div className="h-48 rounded-lg bg-muted" />
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getVisibleTabs(role: Role): string[] {
  const map: Record<Role, string[]> = {
    admin: ['overview', 'trust-graph', 'escrow', 'payments', 'passport', 'digital-twin', 'payment-links', 'wallet', 'referral', 'fraud', 'matching', 'collections', 'compliance'],
    buyer: ['overview', 'payments', 'payment-links', 'wallet', 'referral'],
    seller: ['overview', 'trust-graph', 'escrow', 'payment-links', 'wallet', 'referral'],
    auditor: ['overview', 'trust-graph', 'fraud', 'compliance', 'collections'],
    viewer: ['overview', 'trust-graph', 'payments'],
  }
  return map[role] || map.admin
}
