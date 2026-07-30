# ADR-010: Infrastructure & Reliability Performance Benchmarks

## Measurement Targets

### Container Startup

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| Cold start (container pull + start) | < 60s | ~30-45s | Alpine image <200MB, node:20-alpine |
| Warm start (image cached, process start) | < 10s | ~5-8s | Next.js standalone startup |
| Health check passing (`/api/health`) | < 15s after start | ~10s | HEALTHCHECK in Dockerfile |
| Graceful shutdown (SIGTERM → process exit) | < 10s | ~5s | Drain connections, close DB pools |
| Prisma client generation (build time) | < 30s | ~15s | Part of Docker build stage |

### Horizontal Pod Autoscaler (HPA)

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| HPA scale-up latency (pod scheduled → ready) | < 60s | ~30-45s | Image pull + start + health check |
| HPA scale-down cooldown | 300s | Configurable | Prevents thrashing |
| CPU utilization target | 50-80% | 70% default | Triggers scale-up when exceeded |
| Min replicas | 3 | — | Always 3 pods for availability |
| Max replicas | 100 | — | Headroom for 10x traffic spike |
| Scale-up trigger (CPU > 70% for 30s) | 30s stabilization window | — | Prevents false-positive scaling |

### Recovery Time Objective (RTO)

| Scenario | RTO Target | Current Estimate | Notes |
|----------|-----------|-----------------|-------|
| Single pod crash (OOM, panic) | < 30s | ~15-20s | Kubernetes restarts pod automatically |
| Single node failure | < 60s | ~30-45s | Pods rescheduled to healthy nodes |
| PostgreSQL primary failover (Patroni) | < 30s | ~15-20s | Automatic leader election |
| PostgreSQL replica failover | < 60s | ~30s | Patroni promotes replica |
| Redis Sentinel failover | < 30s | ~10-15s | Sentinel promotes slave |
| Kafka broker failure | < 30s | ~10-15s | Leader election on affected partitions |
| OpenSearch node failure | < 60s | ~30s | Shard relocation |
| Full cluster recovery (all nodes) | < 15 min | ~10min | RTO target from architecture doc |
| Database PITR recovery | < 15 min | ~10-12min | Latest base backup + WAL replay |

### Recovery Point Objective (RPO)

| Component | RPO Target | Mechanism |
|-----------|-----------|----------|
| PostgreSQL | < 1 min | Synchronous replication to Replica B |
| Redis | < 1 min | AOF persistence every 1s |
| Kafka | < 1 min | Replication factor 3, acks=all for Tier 1 |
| OpenSearch | < 5 min | Replica shards (1 per index) |
| Static assets / backups | < 24h | Daily base backup at 02:00 UTC |

### Build & CI/CD

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| `npm ci` (cold) | < 60s | ~30-45s | With npm cache |
| `npm ci` (warm, cache hit) | < 20s | ~10-15s | npm cache in CI runner |
| `npm run lint` | < 30s | ~15-20s | ESLint on entire codebase |
| `tsc --noEmit` | < 60s | ~30-45s | Full type check |
| `vitest run` | < 120s | ~60-90s | All unit + integration tests |
| `next build` (production) | < 300s | ~120-180s | Standalone output, Dockerfile builder stage |
| Docker image build (full) | < 300s | ~180-240s | 3 stages (deps, builder, runner) |
| Docker image push (to registry) | < 120s | ~60-90s | <200MB image |
| Full CI pipeline (lint + type-check + test + build) | < 10 min | ~6-8min | GitHub Actions, sequential steps |

### Image Size

| Layer | Target | Current Estimate |
|-------|--------|-----------------|
| deps stage (node_modules) | ~800MB (build only) | Full node_modules |
| builder stage (standalone output) | ~150MB (build only) | Next.js standalone + .next |
| runner stage (final image) | < 200MB | Alpine + standalone + Prisma engine |

## Testing Approach

1. **Health check test:** Verify `/api/health` returns 200 within 15s of container start.
2. **Graceful shutdown test:** Send SIGTERM, verify process exits within 10s with no 500 errors.
3. **HPA test:** Increase load to trigger scale-up, verify new pods pass health check within 60s.
4. **Failover test:** Kill PostgreSQL primary, verify Patroni promotes replica within 30s.
5. **Redis failover test:** Kill Redis master, verify Sentinel promotes slave within 30s.
6. **CI pipeline test:** Verify full pipeline completes in < 10 minutes on clean branch.
7. **Image size test:** Verify final Docker image < 200MB via `docker images`.
8. **Build reproducibility:** Run `docker build` twice, verify identical image hash.