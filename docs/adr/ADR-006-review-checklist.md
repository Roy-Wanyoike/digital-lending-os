# ADR-006 Review Checklist — Dashboard Frontend

## 1. useApi Extraction

- [x] `src/frontend/hooks/use-api.ts` created — standalone, no UI imports
- [x] Generic signature: `useApi<T>(url, options?)` with `UseApiOptions` and `UseApiResult<T>` exported
- [x] Handles loading, error, data states
- [x] Supports `refetch()` (cache-busting via key increment)
- [x] Exports `invalidateCache(url?)` for manual cache busting
- [x] Handles 401 → redirect to `/login` (default) or `onAuthError` callback
- [x] Auto-unwraps `{ data: T }` envelope from API routes
- [x] AbortController cleanup on unmount / URL change
- [x] `'use client'` directive present
- [x] Zero side-effect imports (tree-shakeable)
- [x] Backward-compatible re-export in `dashboard-helpers.tsx`

## 2. Error Boundary

- [x] `src/frontend/components/ErrorBoundary.tsx` created as class component
- [x] Catches render errors in tabs via `getDerivedStateFromError`
- [x] Shows fallback UI with error message and retry button
- [x] Logs errors to `console.error` with component stack
- [x] Does NOT unmount entire dashboard — only the failed tab
- [x] `TabErrorBoundary` functional wrapper exported for convenience
- [x] `DashboardShell.tsx` wraps `ActiveTabComponent` in `<ErrorBoundary>`
- [x] Tab name passed to ErrorBoundary for contextual error messages

## 3. framer-motion Leak Fix

- [x] `AnimatePresence` import removed from `dashboard-helpers.tsx`
- [x] `Toast` component removed from `dashboard-helpers.tsx`
- [x] WalletTab migrated: `Toast` → `toast` from `sonner`
- [x] EscrowTab migrated: `Toast` → `toast` from `sonner`
- [x] PaymentLinksTab migrated: `Toast` → `toast` from `sonner`
- [x] `toastMsg`/`toastVis` state variables removed from all 3 tabs
- [x] `useState, useEffect, useCallback` removed from `dashboard-helpers.tsx` (no longer needed)

## 4. Tab Import Migration (5 complex tabs)

- [x] WalletTab: `useApi` from `@/hooks/use-api`
- [x] EscrowTab: `useApi` from `@/hooks/use-api`
- [x] PaymentsTab: `useApi` from `@/hooks/use-api`
- [x] PaymentLinksTab: `useApi` from `@/hooks/use-api`
- [x] ReferralTab: `useApi` from `@/hooks/use-api`
- [ ] Remaining 8 tabs still use re-export (acceptable — track for next sprint)

## 5. Documentation

- [x] `docs/adr/ADR-006-dashboard-frontend.md` created
- [x] Architecture diagram included
- [x] Consequences (positive/neutral/risks) documented
- [x] `docs/adr/ADR-006-review-checklist.md` created (this file)
- [x] Worklog entry appended with Task ID: D6

## 6. Build Verification

- [ ] `npm run build` passes with no TypeScript errors
- [ ] No runtime errors in browser console for migrated tabs
- [ ] Error boundary renders correctly when a tab throws
- [ ] Toast notifications work via sonner in Wallet/Escrow/PaymentLinks tabs
- [ ] `useApi` refetch works correctly in all 5 migrated tabs
- [ ] 401 response triggers redirect to `/login`

---

**Total items:** 30 checked, 6 pending (build/runtime verification + remaining 8 tabs)
**Coverage:** 83% complete
