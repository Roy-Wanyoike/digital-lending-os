# ADR-006: Dashboard Frontend Architecture

**Status:** Accepted
**Author:** dashboard-frontend-owner (D6)
**Date:** 2025-01

---

## Context

The Digital Lending OS dashboard consists of 13 tabs loaded lazily inside `DashboardShell.tsx`. Prior to this ADR, several architectural issues existed:

1. **Monolithic `dashboard-helpers.tsx`** (528 lines): Mixed data-fetching logic (`useApi`), React UI components (`KPICard`, `LoadingSkeleton`, `ErrorState`, `Toast`), type definitions (20+ interfaces), constants, and helper functions. The `'use client'` directive forced everything client-side.

2. **framer-motion leak**: The file imported `AnimatePresence` from `framer-motion` for the `Toast` component. Since every tab imported `useApi` from this file, every tab also bundled framer-motion — even tabs that never used `Toast`.

3. **No error boundaries**: A render crash in any single tab (e.g., a null-reference in `WalletTab`) would unmount the entire `DashboardShell`, killing the sidebar, header, and navigation.

4. **Duplicate toast systems**: The project uses `sonner` (configured in `layout.tsx`) for global toasts, but 3 tabs (Wallet, Escrow, PaymentLinks) used a custom `Toast` component powered by `AnimatePresence`.

## Decision

### 1. Extract `useApi` into `src/frontend/hooks/use-api.ts`

- Standalone hook with **zero UI imports** (no framer-motion, no Card, no lucide).
- Generic signature: `useApi<T>(url, options?)`.
- Features: loading/error/data states, refetch via cache-busting, `invalidateCache()` for manual key busting.
- Auth error handling: 401 responses redirect to `/login` by default (configurable via `onAuthError`).
- Backward-compatible re-export kept in `dashboard-helpers.tsx` for tabs not yet migrated.

### 2. React Error Boundary per tab

- Created `src/frontend/components/ErrorBoundary.tsx` as a class component (required for `getDerivedStateFromError`).
- `DashboardShell.tsx` wraps the active tab component in `<ErrorBoundary name={tabLabel}>`.
- On crash: the tab shows a fallback UI with error message + retry button. The sidebar, header, and navigation remain intact.

### 3. Remove framer-motion from `dashboard-helpers.tsx`

- Removed `AnimatePresence` import and the `Toast` component entirely.
- Migrated WalletTab, EscrowTab, and PaymentLinksTab to use `toast` from `sonner`.
- Result: tabs that only import types/constants from `dashboard-helpers` no longer pull in framer-motion.

### 4. Tab import migration (5 most complex tabs)

Tabs updated to import `useApi` from `@/hooks/use-api` instead of `@/lib/dashboard-helpers`:
- `WalletTab` — also migrated Toast → sonner
- `EscrowTab` — also migrated Toast → sonner
- `PaymentsTab`
- `PaymentLinksTab` — also migrated Toast → sonner
- `ReferralTab`

Remaining 8 tabs continue to work via the re-export in `dashboard-helpers.tsx` and can be migrated incrementally.

## Architecture Diagram

```
src/frontend/hooks/use-api.ts          ← Standalone, zero-UI, tree-shakeable
     ↑
     │ (direct import)
     │
src/frontend/components/dashboard/     ← 5 migrated tabs
  ├── WalletTab.tsx                     useApi from @/hooks/use-api
  ├── EscrowTab.tsx                     useApi from @/hooks/use-api
  ├── PaymentsTab.tsx                   useApi from @/hooks/use-api
  ├── PaymentLinksTab.tsx               useApi from @/hooks/use-api
  ├── ReferralTab.tsx                   useApi from @/hooks/use-api
  └── (8 remaining tabs)                useApi via re-export (backward compat)

src/backend/lib/dashboard-helpers.tsx  ← UI components, types, constants, helpers
  └── export { useApi } from '@/hooks/use-api'  ← backward-compat re-export

src/frontend/components/ErrorBoundary.tsx  ← Tab-level error isolation

src/app/DashboardShell.tsx             ← Wraps active tab in <ErrorBoundary>
```

## Consequences

### Positive
- **Bundle size**: Tabs that don't need framer-motion no longer bundle it. `useApi` consumers only pull in ~1KB of hook logic.
- **Resilience**: A crash in one tab no longer kills the dashboard. Users can navigate away and back.
- **Separation of concerns**: Data-fetching, UI components, and type definitions are in distinct modules.
- **Incremental migration**: Backward-compatible re-export lets remaining tabs be migrated one at a time.

### Neutral
- `dashboard-helpers.tsx` still contains UI components. This is acceptable — they're pure presentational components shared across tabs.
- Some tabs still import `AnimatePresence` directly from `framer-motion` (for their own animations). This is intentional — those tabs need animation.

### Risks
- The `useApi` re-export in `dashboard-helpers.tsx` should be removed once all 13 tabs are migrated.
- The in-memory fetch cache in `use-api.ts` is per-session (not shared across tabs for the same URL). Consider SWR or React Query if this becomes a problem.
