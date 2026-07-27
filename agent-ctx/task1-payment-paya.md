# Task 1 — Add Paya Ventures as a Payment Provider + Centralized env.ts

**Agent:** Z.ai Code (main)
**Date:** 2026-07-27
**Scope:** `src/backend/lib/payment/providers/paya.ts`, `src/backend/lib/payment/index.ts`, `src/app/api/payments/{initialize,verify,webhooks/paya}/route.ts`, `src/backend/config/env.ts`

## Summary

Wired up the Paya Ventures (getpaya.com) provider end-to-end and added a centralized, zod-validated env module. The paya.ts provider file and config.ts registry entry already existed in the codebase from a prior pass; this task completed the wiring (registry, API routes, webhook) and hardened the provider itself. No existing provider was broken — `bun run lint` is cleaner after the change (5 pre-existing `require()` lint errors in `index.ts` were eliminated as a side-effect of the refactor).

## Files created

| Path | Purpose |
|------|---------|
| `src/app/api/payments/webhooks/paya/route.ts` | Paya webhook receiver — validates `x-paya-signature` (HMAC-SHA256), then settles the matching `PaymentTransaction` / `PaymentIntent` and runs the same escrow-funding + payment-link accounting logic used by the Paystack/IntaSend webhooks. |
| `src/backend/config/env.ts` | Centralized env validation. Single zod schema covers every env var listed in the task (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, all five provider key bundles, `SOCKET_URL`, `REDIS_URL`). Exports a typed `env` object, plus `isProduction` / `isDevelopment` / `isTest`, `isProviderConfigured()`, and a safe `publicEnv` subset. Cached on `globalThis` to survive HMR. |
| `agent-ctx/task1-payment-paya.md` | This work record. |

## Files modified

| Path | Change |
|------|--------|
| `src/backend/lib/payment/providers/paya.ts` | Hardened the existing implementation: (1) `PAYA_BASE_URL` env override now respected (defaults to `https://getpaya.com/api/v1`); (2) request helper split into `doFetch` + `parseJson` so non-JSON responses surface a real error instead of throwing inside `res.json()`; (3) concurrent `ensureToken()` calls now share a single in-flight auth request via `authPromise`; (4) `expires_in` from the JWT response is honoured when present; (5) webhook signature comparison uses `crypto.timingSafeEqual` to prevent timing attacks; (6) demo-mode `verify()` returns `status: 'completed'` so end-to-end flows exercise the success path; (7) demo-mode responses now mirror the shape of real Paya responses (deposit / wallet / withdrawal). |
| `src/backend/lib/payment/index.ts` | Registered `paya` in the provider registry (lazy singleton + `providerMap` entry). Refactored all five provider loaders from `require()` to top-level ESM `import` statements — eliminates 5 `@typescript-eslint/no-require-imports` lint errors (4 pre-existing + 1 new) while preserving the lazy-instantiation behaviour. |
| `src/app/api/payments/initialize/route.ts` | Added `'paya'` to the `provider` zod enum so clients can explicitly request the Paya provider. |
| `src/app/api/payments/verify/route.ts` | Added `'paya'` to the `provider` zod enum. |

## Design decisions

1. **Auth strategy.** `PAYA_API_KEY` (pre-issued bearer) takes precedence and is treated as non-expiring. `PAYA_EMAIL` + `PAYA_PASSWORD` triggers JWT login via `POST /auth/login`, with the token cached in-memory for 55 min (or `expires_in - 5 min` if the API returns it). On `401` the token is cleared and a single re-auth+retry is attempted.
2. **Demo mode.** When neither `PAYA_API_KEY` nor `PAYA_EMAIL`+`PAYA_PASSWORD` is set, `isConfigured()` returns false and every method short-circuits to a mock response — matching the behaviour of Paystack/IntaSend/Flutterwave/Stripe when their keys are absent. This keeps the dev server fully functional without real credentials.
3. **Webhook signature.** HMAC-SHA256 over the raw body, read from `x-paya-signature`. Falls back to accepting the payload in test mode with no secret configured (mirrors the other providers). Uses `crypto.timingSafeEqual` for the comparison.
4. **env.ts strictness.** `DATABASE_URL` is always required. `NEXTAUTH_SECRET` is required in production (throws if missing) but optional in development (logs a warning) — this matches NextAuth's own dev fallback so the existing dev server stays runnable with the current minimal `.env`. All payment-provider keys are optional with sensible defaults. The parsed object is cached on `globalThis.__YOUNGSEND_ENV__` so HMR doesn't re-run validation.
5. **No breaking changes.** Existing providers were untouched. The `require()` → `import` refactor in `index.ts` preserves lazy instantiation (singletons are still created on first `getProvider()` call); only the module-loading strategy changed (eager module import, lazy class instantiation). Verified by hitting `/api/payments/providers` and `/api/payments/initialize` — both compile and respond correctly.

## Verification

- `bun run lint`: 7 remaining errors, all pre-existing and unrelated to this task (`prisma/seed.ts` require, `page.tsx` setState-in-effect, `dashboard-helpers.tsx` setState-in-effect, `ReferralTab.tsx` React Compiler memoization, `theme-toggle.tsx` setState-in-effect). All 5 `require()` errors that were in `src/backend/lib/payment/index.ts` are now resolved.
- Dev server log shows clean compilation of `/api/payments/providers`, `/api/payments/initialize`, and `/api/payments/webhooks/paya` after the changes.
- `POST /api/payments/initialize` with `{"provider":"paya",...}` returns 401 (auth) rather than 400 (validation) — confirms the zod enum now accepts `paya`.
- `POST /api/payments/webhooks/paya` returns 500 "Paya provider not configured" — confirms the webhook route compiles and `providerRegistry.getProvider('paya')` is wired (returns null only because no credentials are set in the current `.env`).

## Env vars consumed by Paya

| Var | Required | Purpose |
|-----|----------|---------|
| `PAYA_API_KEY` | one of | Pre-issued bearer token (preferred for prod) |
| `PAYA_EMAIL` | one of | Login email for JWT flow |
| `PAYA_PASSWORD` | one of | Login password for JWT flow |
| `PAYA_BASE_URL` | optional | Override API base URL (default `https://getpaya.com/api/v1`) |
| `PAYA_WEBHOOK_SECRET` | optional | HMAC-SHA256 secret for webhook signatures |
| `PAYA_TEST_MODE` | optional | `true`/`1`/`yes` → relaxes webhook validation when no secret is set |
