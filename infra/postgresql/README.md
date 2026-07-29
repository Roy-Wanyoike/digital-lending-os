# Youngsend PostgreSQL Migration Infrastructure

## Overview

This document describes the PostgreSQL database architecture for Youngsend, a multi-tenant B2B escrow and payment platform designed to scale to **100M+ users**. The architecture covers primary/replica topologies, connection pooling via PgBouncer, WAL-based streaming replication, Point-in-Time Recovery (PITR), and index optimization strategies.

---

## 1. Topology: Primary vs Read Replica

### Architecture

```
                    ┌─────────────────────────┐
                    │      PgBouncer           │
                    │  (Transaction Mode)      │
                    │  Pool A: WRITE           │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │    PRIMARY (Node A)      │
                    │    - All writes          │
                    │    - WAL streaming src   │
                    │    - Synchronous commit  │
                    └───────────┬─────────────┘
                                │
                       WAL Streaming
                       (synchronous)
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
    ┌─────────▼──────┐ ┌───────▼──────┐ ┌───────▼──────┐
    │ REPLICA (Node B)│ │ REPLICA (C)  │ │ REPLICA (D)  │
    │ - Read queries  │ │ - Read qry   │ │ - Analytics  │
    │ - Lag < 100ms   │ │ - Lag < 1s   │ │ - Async      │
    └────────┬───────┘ └──────┬───────┘ └──────┬───────┘
             │                │                │
    ┌────────▼──────┐ ┌──────▼────────┐
    │   PgBouncer    │ │   PgBouncer   │
    │  Pool B: READ  │ │  Pool C: ANALYTICS │
    └───────────────┘ └───────────────┘
```

### Routing Strategy

| Query Type | Target | Rationale |
|---|---|---|
| `SELECT` (within explicit read transaction) | Read Replica | Offload reads from primary |
| `SELECT FOR UPDATE` | Primary | Requires row locks on primary |
| `INSERT / UPDATE / DELETE` | Primary | All mutations go to primary |
| `BEGIN READ ONLY` | Read Replica | Explicit read-only transaction hint |
| Analytics / Reporting | Async Replica | Long-running queries on async replica |
| Reads within 100ms of a write | Primary | Avoid replica lag stale reads |

### Read Replica Router

Implemented in `read-replica-router.ts`:

- **`getReadClient()`** — Returns Prisma client connected to `DATABASE_READ_URL`
- **`getWriteClient()`** — Returns Prisma client connected to `DATABASE_URL` (primary)
- **Automatic failover** — If replica health check fails, falls back to primary
- **Health checking** — Periodic `SELECT 1` with latency measurement
- **Staleness guard** — Configurable max acceptable replica lag (default: 500ms)

### Replication Lag Monitoring

```sql
-- On replica, check lag
SELECT
  now() - pg_last_xact_replay_timestamp() AS replication_lag,
  pg_last_xact_replay_timestamp() AS last_replay;
```

Alert thresholds:
- **Warning**: lag > 500ms
- **Critical**: lag > 5s
- **Escalation**: lag > 30s (auto-failover to primary for reads)

---

## 2. Connection Pooling with PgBouncer

### Why PgBouncer?

PostgreSQL uses a process-per-connection model. Each connection consumes ~10MB of RAM for the backend process. With 100M users, connection spikes from application servers would overwhelm PostgreSQL. PgBouncer multiplexes thousands of client connections onto a small pool of server connections.

### Pool Size Formula

```
pool_size = (core_count * 2) + effective_spindle_count
```

For a 64-core machine with NVMe SSD (effective_spindle_count ~= 32):

```
pool_size = (64 * 2) + 32 = 160 connections
```

### PgBouncer Modes

| Mode | Use Case | Pool Size | Description |
|---|---|---|---|
| **Transaction** | OLTP (primary workload) | 160 | Server connection held only for duration of transaction. Best for web app queries. |
| **Session** | Long-running operations | 40 | Server connection held for entire client session. Used for migrations, admin, and BULK operations. |
| **Statement** | Analytics / Reporting | 20 | Server connection released after every statement. Maximum multiplexing for batch/analytics queries. |

### PgBouncer Configuration

```ini
[databases]
youngsend_primary = host=primary.internal port=5432 dbname=youngsend
youngsend_read    = host=replica.internal port=5432 dbname=youngsend

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

; Connection limits
max_client_conn = 10000
pool_mode = transaction
default_pool_size = 160
min_pool_size = 20
reserve_pool_size = 20
reserve_pool_timeout = 3

; Timeouts
server_idle_timeout = 300
server_lifetime = 3600
server_connect_timeout = 15
client_idle_timeout = 0
client_login_timeout = 60

; Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
```

### Prisma Connection Pooling Config

Prisma's built-in connection pooler (when not using PgBouncer) is configured in `migration-schema.prisma`:

```prisma
datasource db {
  provider          = "postgresql"
  url               = env("DATABASE_URL")
  directUrl         = env("DIRECT_DATABASE_URL")
  connection_limit  = 20
  pool_timeout      = 30
}
```

For production with PgBouncer, use `?connection_limit=1&pool_timeout=30` in the URL to ensure Prisma doesn't compete with PgBouncer's own pooling.

---

## 3. WAL Configuration for Streaming Replication

### postgresql.conf (Replication Settings)

```ini
# WAL Settings
wal_level = replica                    # Full WAL for replication
max_wal_senders = 12                   # Max concurrent replication connections
wal_keep_size = 4GB                    # Retain WAL for replica catch-up
max_replication_slots = 10             # Replication slots

# Synchronous commit settings
synchronous_commit = on                # Strong durability for financial data
commit_delay = 100                     # Microseconds to group commits
commit_siblings = 5                    # Min transactions before group commit
```

### Synchronous vs Async Replication

| Replica | Mode | Purpose | Commit Impact |
|---|---|---|---|
| Replica B | **Synchronous** | Primary read replica for user-facing queries | +1-2ms latency per commit |
| Replica C | **Asynchronous** | Secondary read replica for batch operations | None |
| Replica D | **Asynchronous** | Analytics / reporting | None |

```ini
# On Primary
synchronous_standby_names = 'FIRST 1 (replica_b)'
synchronous_commit = on
```

### Replication Slot Setup

```sql
-- On primary
SELECT pg_create_physical_replication_slot('replica_b_slot');
SELECT pg_create_physical_replication_slot('replica_c_slot');
SELECT pg_create_physical_replication_slot('replica_d_slot');
```

### Replica Connection String

```
primary_conninfo = 'host=primary.internal port=5432 user=replication_user sslmode=require sslcert=/etc/postgresql/ssl/replica.crt sslkey=/etc/postgresql/ssl/replica.key'
```

---

## 4. PITR Backup Strategy

### Backup Architecture

```
Schedule:
  - Full base backup: Daily at 02:00 UTC via pg_basebackup
  - WAL archiving: Continuous to S3-compatible storage
  - Point-in-Time Recovery: Any second within 90-day retention
```

### WAL Archiving

```ini
# postgresql.conf
archive_mode = on
archive_command = 'aws s3 cp %p s3://youngsend-backups/wal-archive/%f'
archive_timeout = 300    # Force archive every 5 min even if WAL not full
```

### Base Backup (Cron)

```bash
#!/bin/bash
# /etc/cron.daily/youngsend-pg-backup
BACKUP_DIR="/backups/base/$(date +%Y-%m-%d)"
pg_basebackup \
  -h localhost -U backup_user -D "$BACKUP_DIR" \
  -Ft -z -P \
  --checkpoint=fast \
  --label="daily_$(date +%Y%m%d)"

# Upload to S3
aws s3 sync "$BACKUP_DIR" "s3://youngsend-backups/base/$BACKUP_DIR/"

# Retention: keep last 30 daily, 12 monthly
find /backups/base/ -maxdepth 1 -mtime +30 -exec rm -rf {} \;
```

### Point-in-Time Recovery

```bash
# Restore to specific timestamp
restore_command = 'aws s3 cp s3://youngsend-backups/wal-archive/%f %p'
recovery_target_time = '2025-01-15 14:30:00 UTC'
recovery_target_action = 'pause'  # Inspect before promoting
```

### Backup Verification

- Weekly automated restore to staging environment
- Run `pg_verifybackup` on base backups
- Monitor backup age: alert if > 26 hours

### RPO/RTO Targets

| Metric | Target | Notes |
|---|---|---|
| RPO (Recovery Point Objective) | < 1 minute | Synchronous replication to Replica B |
| RTO (Recovery Time Objective) | < 15 minutes | Automated PITR from latest base backup + WAL |
| Backup Retention | 90 days | Full WAL archive in S3 |

---

## 5. Index Strategy for 100M Users

### Index Strategy by Table Size

| Table Category | Estimated Rows | Index Strategy |
|---|---|---|
| Tenant, Account, User | 10K-100K | B-tree on all foreign keys + unique constraints |
| Business, Wallet, CommercePassport | 1M-10M | B-tree + partial indexes for active records |
| EscrowTransaction, PaymentIntent, PaymentTransaction | 10M-100M | B-tree + BRIN on timestamps + partitioning by month |
| WalletTransaction, Notification, EscrowAuditLog | 100M+ | Partitioned by month, BRIN on `created_at`, GIN for JSONB |
| CollectionCase, FraudAlert | 10M+ | B-tree + partial indexes for active/open items |

### B-Tree Indexes (Default)

Used for: equality and range queries on scalar columns.

```sql
-- Multi-tenant query: always filter by tenantId first
CREATE INDEX idx_account_tenant_email ON "Account" (tenant_id, email);
CREATE INDEX idx_wallet_business_currency ON "Wallet" (business_id, currency);
```

### Partial Indexes

Drastically reduce index size by indexing only relevant rows.

```sql
-- Only active escrows (vast majority of queries)
CREATE INDEX idx_escrow_active
  ON "EscrowTransaction" (status, created_at)
  WHERE status NOT IN ('completed', 'cancelled', 'refunded');

-- Only unread notifications
CREATE INDEX idx_notification_unread
  ON "Notification" (account_id, created_at DESC)
  WHERE is_read = false;

-- Only active/open collection cases
CREATE INDEX idx_collection_active
  ON "CollectionCase" (business_id, priority, created_at DESC)
  WHERE status = 'active';
```

### BRIN Indexes (Block Range Index)

Best for time-series data with natural physical ordering. ~99% smaller than B-tree.

```sql
-- Time-series tables: WalletTransaction, EscrowAuditLog, Notification
CREATE INDEX idx_wallet_tx_created_brin
  ON "WalletTransaction" USING brin (created_at)
  WITH (pages_per_range = 32);
```

### GIN Indexes (Inverted Index)

For full-text search and JSONB containment queries.

```sql
-- Full-text search on business name and description
CREATE INDEX idx_business_search
  ON "Business" USING gin (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
  );

-- JSONB metadata queries
CREATE INDEX idx_wallet_tx_metadata_gin
  ON "WalletTransaction" USING gin (metadata);
```

### Covering Indexes

Include frequently selected columns to enable index-only scans.

```sql
-- Dashboard: list escrows with status and amount without hitting table
CREATE INDEX idx_escrow_dashboard
  ON "EscrowTransaction" (buyer_id, status, created_at DESC)
  INCLUDE (amount, currency, description);

-- Wallet balance overview
CREATE INDEX idx_wallet_balance
  ON "Wallet" (business_id, currency)
  INCLUDE (balance, available_balance, status);
```

### Composite Indexes for Common Query Patterns

```sql
-- Business relationship lookup
CREATE INDEX idx_bizrel_from_type
  ON "BusinessRelationship" (from_business_id, type, status);

-- Payment intent lookup by business pair
CREATE INDEX idx_payment_intent_businesses
  ON "PaymentIntent" (from_business_id, to_business_id, created_at DESC);

-- Fraud alerts for a business, sorted by severity
CREATE INDEX idx_fraud_business_severity
  ON "FraudAlert" (business_id, severity, created_at DESC);

-- Escrow transactions for a seller
CREATE INDEX idx_escrow_seller_status
  ON "EscrowTransaction" (seller_id, status, created_at DESC);
```

### Table Partitioning

High-volume tables are partitioned by month using declarative partitioning:

- **`Transaction`** (WalletTransaction) — ~100M+ rows/year
- **`AuditLog`** (EscrowAuditLog) — ~50M+ rows/year
- **`Notification`** — ~500M+ rows/year
- **`PaymentTransaction`** — ~50M+ rows/year

Benefits:
- Partition pruning: queries filtering by `created_at` only scan relevant months
- Parallel query: each partition scanned independently
- Easy archival: `DETACH PARTITION` old months and move to cold storage
- Maintenance: `VACUUM`, `REINDEX` run per-partition (less lock contention)

---

## 6. Multi-Tenancy with Row Level Security (RLS)

All tenant-scoped tables enforce Row Level Security to guarantee zero data leakage between tenants:

```sql
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "Account"
  USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_insert ON "Account"
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
```

Application sets tenant context at connection/session level:

```sql
SET LOCAL app.tenant_id = 'clx...';
```

RLS is applied to all tenant-scoped tables. Tables that are system-level (e.g. `GlobalPaymentMethod`, `CurrencyRate`) do not have RLS.

---

## 7. PostgreSQL-Specific Type Optimizations

| SQLite Type | PostgreSQL Type | Rationale |
|---|---|---|
| `Float` (money/amount) | `Decimal` | Exact precision, no floating-point errors for financial data |
| `String` (JSON metadata) | `Json` | Native JSONB operations, GIN indexing, containment queries |
| `String` (enum fields) | Native `ENUM` types | Type safety, smaller storage, constraint enforcement |
| `String` (email) | `String` + CITEXT extension | Case-insensitive email lookup without LOWER() |

### ENUM Types Used

- `TenantPlan` (starter, professional, enterprise)
- `TenantStatus` (active, suspended, trial_expired)
- `AccountRole` (admin, buyer, seller, auditor, viewer)
- `BusinessStatus` (pending, verified, suspended, deactivated)
- `EscrowStatus` (created, funded, in_escrow, partial_release, completed, disputed, refunded, cancelled)
- `PaymentStatus` (pending, processing, settled, failed, refunded)
- `WalletStatus` (active, frozen, closed)
- `TransactionType` (credit, debit, transfer_in, transfer_out, conversion, fee, refund, deposit, withdrawal, crypto_withdrawal)
- `FraudSeverity` (low, medium, high, critical)
- `CollectionStatus` (active, paused, resolved, written_off, escalated)
- `SubscriptionStatus` (active, past_due, cancelled, paused, trialing)
- `NotificationType` (info, success, warning, error, payment, escrow, invoice, system)

---

## 8. Migration Runbook

### From SQLite to PostgreSQL

1. **Schema migration**: Apply `V1__initial_postgresql.sql` and `V2__indexes_and_partitions.sql`
2. **Data migration**: Use `pgloader` or custom ETL script to migrate SQLite data
3. **Switch application**: Update `DATABASE_URL` to point to PostgreSQL via PgBouncer
4. **Validate**: Run read-only queries in parallel on both databases for 48 hours
5. **Cut over**: Switch writes to PostgreSQL, keep SQLite as hot standby for 72 hours

### Monthly Partition Maintenance

```bash
# Cron: first day of each month, create next month's partitions
./scripts/create-monthly-partitions.sh

# Archive partitions older than 12 months
./scripts/archive-old-partitions.sh
```

---

## File Inventory

```
infra/postgresql/
├── README.md                      # This document
├── migration-schema.prisma        # PostgreSQL Prisma schema
├── read-replica-router.ts         # Read/write splitting module
├── connection-pool.ts             # PgBouncer pool configuration
└── migrations/
    ├── V1__initial_postgresql.sql # Initial schema (enums, tables, RLS)
    └── V2__indexes_and_partitions.sql # Performance indexes & partitioning
```
