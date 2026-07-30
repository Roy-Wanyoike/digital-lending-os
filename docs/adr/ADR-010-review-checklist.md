# ADR-010 Review Checklist — Infrastructure & Reliability

## Dockerfile

- [ ] Multi-stage build (deps → builder → runner)
- [ ] Final stage uses `node:20-alpine`
- [ ] Non-root user (`nextjs:1001`) with `USER nextjs`
- [ ] `HEALTHCHECK` configured against `/api/health`
- [ ] `CMD ["node", "server.js"]` for standalone mode
- [ ] `NODE_ENV=production` set in runtime stage
- [ ] `.next/static` and `public/` copied to runner
- [ ] Prisma engine (`node_modules/.prisma`, `@prisma`) copied to runner
- [ ] `NEXT_TELEMETRY_DISABLED=1` set
- [ ] Final image < 200 MB (verify with `docker images`)
- [ ] `.dockerignore` excludes `node_modules`, `.next`, `.env`, tests, docs

## docker-compose.yml

- [ ] `nextjs` service builds from Dockerfile, maps port 3000
- [ ] `postgres` service uses `postgres:16-alpine` with healthcheck
- [ ] `redis` service uses `redis:7-alpine` with AOF persistence
- [ ] Named volumes for postgres data and redis data
- [ ] `env_file: .env` on nextjs service
- [ ] Isolated bridge network (`youngsend-net`)
- [ ] nextjs `depends_on` postgres (with `condition: service_healthy`)
- [ ] All services have `restart: unless-stopped`

## .env.example

- [ ] `DATABASE_URL` documented with SQLite (dev) and PostgreSQL (prod) examples
- [ ] `REDIS_URL` documented
- [ ] `NEXTAUTH_SECRET` documented (required in prod, generate command included)
- [ ] `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` documented
- [ ] All 5 payment provider key groups present (Stripe, Paystack, Flutterwave, IntaSend, Paya)
- [ ] `KAFKA_BROKERS` documented
- [ ] `OPENSEARCH_URL` documented
- [ ] `OTEL_EXPORTER_OTLP_ENDPOINT` documented
- [ ] `SOCKET_URL` documented
- [ ] Docker Compose Postgres vars (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`) documented
- [ ] No real secrets or keys in the file

## next.config.ts

- [ ] `output: 'standalone'` present
- [ ] `poweredByHeader: false` present
- [ ] `reactStrictMode: true` present
- [ ] `typescript.ignoreBuildErrors: false` (or omitted, defaulting to false)
- [ ] No dev-only config (`allowedDevOrigins`, etc.)
- [ ] `serverExternalPackages` preserved for `bcryptjs`

## CI/CD (.github/workflows/ci.yml)

- [ ] Triggers on push and PR to `main`
- [ ] Checkout step present
- [ ] Node.js 20 setup with npm cache
- [ ] `npm ci` for reproducible installs
- [ ] Lint step (`npm run lint`)
- [ ] Type-check step (`tsc --noEmit`) — fails fast on type errors
- [ ] Test step (`vitest run`)
- [ ] Build step (`npm run build`)
- [ ] Concurrency group to cancel redundant runs
- [ ] Required env vars set for build step (`DATABASE_URL`, `NEXTAUTH_SECRET`)

## Documentation

- [ ] ADR-010-infra-reliability.md written and filed
- [ ] This checklist written and filed
- [ ] Worklog updated with task D10