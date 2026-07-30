# ADR-011: Threat Model - Data Layer

## STRIDE Analysis

### S - Spoofing

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| Unauthorized database access | Low | Critical | PgBouncer enforces authentication; separate credentials for each pool (WRITE, READ, ANALYTICS) | Low |
| Impersonate application service account | Low | Critical | K8s Secrets for DB credentials; service account token auto-rotation | Very Low |
| Direct database connection bypassing app | Low | Critical | PostgreSQL in private subnet; no public IP; only app pods can reach PgBouncer port | Very Low |
| Stale Prisma client used by old pod | Low | Medium | Prisma client regenerated on each deployment; `globalThis` singleton per pod | Very Low |

### T - Tampering

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| SQL injection via Prisma | Very Low | Critical | Prisma generates parameterized queries; no raw SQL in application code | Very Low |
| SQL injection via raw Prisma queries | Low | Critical | No `$queryRaw` or `$executeRaw` used in application code; code review enforces this | Very Low |
| Data tampering via direct DB access | Low | Critical | Private subnet; RBAC restricts direct DB access to DBA team | Low |
| Schema migration tampering | Low | High | Migrations in version control; CI runs `prisma migrate deploy`; manual migration requires DBA approval | Low |
| Data tampering via replica | Low | Medium | Read replicas are read-only (PgBouncer Pool B/C route SELECT only) | Very Low |
| Cascade delete accidentally destroys financial data | Medium | Critical | ADR-011 documents cascade risks; Wallet → WalletTransaction should be Restrict (TODO) | Medium |

### R - Repudiation

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| Deny modifying a record | Medium | Medium | `updatedAt` timestamp on all models; `logAudit()` on critical mutations | Low |
| Deny deleting a record | Medium | High | Soft-delete pattern (status field) preferred; hard-delete audit log (future) | Medium |
| No evidence of who changed tenant data | Low | Critical | All writes go through `requireAuth()`; actor in audit log; `log_min_duration_statement` for slow queries | Low |
| Database-level audit gap | Medium | Medium | PostgreSQL `pgaudit` extension (TODO) for DDL and data-level audit | Medium |

### I - Information Disclosure

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| SQL injection exposes all data | Very Low | Critical | Prisma parameterized queries; no raw SQL | Very Low |
| Read replica returns data from other tenant | Low | Critical | Application-level `tenantId` filtering on every query; PostgreSQL RLS (future) | Low |
| Query logging exposes sensitive data | Medium | Medium | `log: ['query']` in dev only; production disables query logging | Low |
| Backup data exposure | Low | Critical | GCS buckets with IAM auth; encryption at rest; backup encryption key in KMS | Low |
| WAL archive contains sensitive data | Low | High | WAL archived to GCS with encryption; 90-day retention; access restricted to DBA | Low |
| Prisma schema exposes business logic | Inherent | Low | Schema is not sensitive; table/column names reveal domain model | Accepted |
| Connection string leakage | Low | Critical | `DATABASE_URL` in K8s Secret; not in code, not in image, not in CI logs | Very Low |

### D - Denial of Service

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| Connection pool exhaustion | Medium | High | PgBouncer limits: 10,000 client connections; transaction mode releases fast; HPA scales pods | Medium |
| Slow query blocks connections | Medium | Medium | `log_min_duration_statement = 500ms`; PgBouncer transaction mode (5-50ms per tx); timeout on long queries | Medium |
| Replica lag exploitation (read stale data) | Low | Medium | Sync replica lag < 100ms; application reads from sync replica for user-facing queries | Low |
| Full table scan on unpartitioned table | Medium | Medium | 4 high-volume tables partitioned by month; partial indexes for active records; BRIN indexes | Low |
| Migration lock (ALTER TABLE blocks reads) | Low | Medium | `CREATE INDEX CONCURRENTLY` for non-blocking index creation; column additions without defaults | Low |
| Database disk full | Low | High | Disk usage monitoring at 80% alert threshold; WAL archive rotation; log rotation | Medium |
| Patroni failover during peak | Low | Medium | Automatic failover < 30s; read queries route to surviving replicas during switchover | Low |

### E - Elevation of Privilege

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| Bypass tenant isolation (read other tenant's data) | Low | Critical | `tenantId` filter on every query via `tenantScope()`; Prisma parameterized; no raw SQL | Very Low |
| Bypass RLS (PostgreSQL Row Level Security) | Very Low | Critical | RLS policies enforced by PostgreSQL engine; cannot be bypassed by application | Very Low |
| Escalate to superuser via SQL injection | Very Low | Critical | Prisma parameterized queries; no raw SQL; application connects as limited user, not superuser | Very Low |
| Access PgBouncer admin console | Low | High | PgBouncer admin port (6432) restricted to localhost; no remote admin access | Very Low |
| Read from analytics replica as if it were primary | Low | Medium | PgBouncer Pool C routes to async replica only; Pool B for sync reads | Very Low |

---

## Attack Trees

### Attack Tree 1: SQL Injection

```
SQL Injection
+-- 1.1 User input in Prisma where clause
|   +-- Mitigated: Prisma generates parameterized queries automatically
|   +-- Mitigated: All user input passes through Zod validation first
+-- 1.2 Raw SQL via $queryRaw
|   +-- Mitigated: No $queryRaw or $executeRaw in application code
|   +-- Mitigated: ESLint rule bans raw Prisma queries
+-- 1.3 Raw SQL in migration
|   +-- Mitigated: Migrations are written by DBA team; code review required
|   +-- Risk: Migration SQL injection during deployment
|       +-- Mitigated: Migrations run against known schema; no user input
+-- 1.4 OrderBy / select injection
    +-- Mitigated: Prisma enforces valid field names at compile time
    +-- Mitigated: No string interpolation in orderBy/select clauses
```

### Attack Tree 2: Connection Pool Exhaustion

```
Connection Pool Exhaustion
+-- 2.1 Flood of API requests opens too many DB connections
|   +-- Mitigated: PgBouncer multiplexes 10,000 clients onto 160 server connections
|   +-- Mitigated: Prisma connection_limit=1 per pod
|   +-- Mitigated: HPA scales pods to handle traffic surge
+-- 2.2 Slow queries hold connections too long
|   +-- Mitigated: Transaction mode releases connections after each transaction
|   +-- Mitigated: Slow query logging (> 500ms) identifies problematic queries
+-- 2.3 Long-running analytics query blocks pool
|   +-- Mitigated: Separate Pool C (ANALYTICS) for long-running queries
|   +-- Mitigated: Statement timeout on analytics pool
+-- 2.4 PgBouncer server connection exhaustion
    +-- Mitigated: 160 server connections per pool; utilization alerting at 70%
    +-- Mitigated: HPA triggers scale-up when pool utilization > 70%
```

### Attack Tree 3: Replica Lag Exploitation

```
Replica Lag Exploitation
+-- 3.1 Read stale data from async replica
|   +-- Mitigated: User-facing reads go to sync replica (lag < 100ms)
|   +-- Mitigated: Analytics reads go to async replica (stale data acceptable)
+-- 3.2 Write then immediate read sees old data
|   +-- Mitigated: Read-after-write consistency for critical flows (payment → wallet credit via Kafka)
|   +-- Mitigated: Redis cache invalidation via Pub/Sub on writes
+-- 3.3 Exploit replica lag during dispute
    +-- Mitigated: Escrow state machine is authoritative; reads from replica are for display only
    +-- Mitigated: State transitions always read from primary (SELECT FOR UPDATE)
```

### Attack Tree 4: Backup Tampering

```
Backup Tampering
+-- 4.1 Modify backup files in GCS
|   +-- Mitigated: GCS bucket versioning; immutable backup policy
|   +-- Mitigated: IAM restricts write access to backup service account only
+-- 4.2 Delete backup files
|   +-- Mitigated: Object lifecycle policies; object lock (WORM)
|   +-- Mitigated: Cross-region backup replication
+-- 4.3 Tamper with WAL archive
|   +-- Mitigated: WAL files are append-only in GCS
|   +-- Mitigated: GCS object integrity verification
+-- 4.4 Restore from tampered backup
    +-- Mitigated: Weekly automated restore verification to staging
    +-- Mitigated: PITR verification: restore to a point and compare checksums
```

### Attack Tree 5: RLS Bypass

```
RLS Bypass
+-- 5.1 Set app.tenant_id to bypass filter
|   +-- Mitigated: app.tenant_id is set via SET LOCAL (transaction-scoped)
|   +-- Mitigated: Application code sets it from JWT session (server-controlled)
|   +-- Risk: Application bug sets wrong tenantId
|       +-- Mitigated: Defense-in-depth: application-level tenantId filtering too
+-- 5.2 Bypass RLS via table owner
|   +-- Mitigated: Application connects as limited user, not table owner
|   +-- Mitigated: RLS policies apply to all non-superuser roles
+-- 5.3 Disable RLS via ALTER TABLE
    +-- Mitigated: Application user has no DDL privileges
    +-- Mitigated: Only superuser can disable RLS
    +-- Mitigated: Superuser access restricted to DBA team via SSH bastion
```

## Risk Summary

| Risk | Level | Key Gap |
|------|-------|----------|
| SQL injection | VERY LOW | Prisma parameterized; no raw SQL |
| Connection pool exhaustion | MEDIUM | PgBouncer + HPA mitigate; no per-pod rate limit on DB queries |
| Replica lag exploitation | LOW | Sync replica < 100ms; critical reads from primary |
| Backup tampering | LOW | GCS versioning + weekly restore verification |
| Cascade delete on financial data | MEDIUM | ADR-011 documents risk; Wallet cascades not yet fixed |
| RLS bypass | VERY LOW | Application + DB level defense |
| Query logging data exposure | LOW | Disabled in production |
| No pgaudit extension | MEDIUM | No database-level audit trail for DDL/DML |

**Top priority:** Fix Wallet → WalletTransaction cascade from `Cascade` to `Restrict` (documented in ADR-011) and implement soft-delete for wallets. Add `pgaudit` extension for database-level audit trail.