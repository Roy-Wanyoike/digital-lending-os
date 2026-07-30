# ADR-010: Infrastructure & Reliability

**Status:** Accepted  
**Date:** 2025-07-26  
**Owner:** infra-reliability-owner (D10)

---

## Context

Youngsend needs a production-grade containerization and CI/CD strategy. The application is a Next.js 16 app backed by PostgreSQL, Redis, Kafka, and OpenSearch. Prior to this ADR, the project had no Dockerfile, no docker-compose, no `.env.example`, and the `next.config.ts` had `ignoreBuildErrors: true` with `reactStrictMode: false`.

## Decision

### 1. Container Strategy

- **Multi-stage Dockerfile** with three stages:
  - **deps** — install all node_modules on a full `node:20-alpine` image.
  - **builder** — copy node_modules from deps, generate Prisma client, run `next build` with `output: 'standalone'`.
  - **runner** — minimal `node:20-alpine` with only the standalone output, static assets, and Prisma engine. Runs as non-root user (`nextjs:1001`). Includes a `HEALTHCHECK` against `/api/health`.
- **Target image size:** <200 MB (alpine-based, no devDependencies in final layer).
- **`.dockerignore`** excludes `node_modules`, `.next`, tests, docs, and tool artifacts to keep the build context small.

### 2. Docker Compose (Local Dev)

Three services on an isolated bridge network (`youngsend-net`):
| Service | Image | Notes |
|---------|-------|-------|
| `nextjs` | Built from Dockerfile | Port 3000, depends on postgres + redis |
| `postgres` | `postgres:16-alpine` | Healthcheck via `pg_isready`, persistent volume |
| `redis` | `redis:7-alpine` | AOF persistence, 128 MB max memory, LRU eviction |

Environment variables are loaded from `.env` via `env_file`.

### 3. Environment Variable Management

- **`.env.example`** documents every required variable with safe defaults and comments.
- **Centralized validation** is handled by `src/backend/config/env.ts` (zod schema) at startup.
- **Production enforcement:** `NEXTAUTH_SECRET` and `DATABASE_URL` are required in production — the app refuses to boot without them.

### 4. `next.config.ts` Optimizations

| Change | Reason |
|--------|--------|
| `output: 'standalone'` | Required for Docker standalone mode. Static assets copied separately in Dockerfile. |
| `poweredByHeader: false` | Removes `X-Powered-By` header (security hardening). |
| `reactStrictMode: true` | Enables double-render checks to catch bugs early. |
| `typescript.ignoreBuildErrors: false` | Build fails on type errors; CI type-checks separately for clarity. |
| Removed `allowedDevOrigins` | Dev-only config that has no effect in production builds. |

> **Note:** `experimental.optimizeCss` is not available in Next.js 16 and was omitted.

### 5. CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`):
- **Triggers:** push and pull request to `main`.
- **Steps:** checkout → setup Node 20 (with npm cache) → `npm ci` → lint → type-check (`tsc --noEmit`) → test (`vitest run`) → build.
- **Fail-fast:** type-check step will fail the pipeline immediately on type errors.
- **Concurrency:** concurrent runs on the same ref are cancelled to save resources.

## Consequences

- **Positive:** Reproducible builds, consistent dev environments, automated quality gates.
- **Positive:** Non-root container, health checks, and small image size improve security and operability.
- **Positive:** Strict TypeScript and React strict mode will surface bugs earlier.
- **Trade-off:** `ignoreBuildErrors: false` means the build step requires all types to be valid. Existing type errors in the codebase must be resolved before the CI pipeline will pass.
- **Trade-off:** `reactStrictMode: true` causes double-invoke of effects in development, which may expose previously hidden side-effect bugs.
