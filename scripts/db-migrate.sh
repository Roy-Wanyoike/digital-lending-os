#!/usr/bin/env bash
# ─── Database Migration Script ─────────────────────────────────────
# Generates the Prisma client, then applies the schema to the database.
# - SQLite (dev):    uses prisma db push (no migration history)
# - PostgreSQL (prod): uses prisma migrate deploy (applies pending migrations)
# ─────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "═══════════════════════════════════════════════════════"
echo "  YOUNGSEND Database Migration"
echo "═══════════════════════════════════════════════════════"

# ── Step 1: Generate Prisma Client ─────────────────────────────────
echo ""
echo "[1/3] Generating Prisma client..."
npx prisma generate
echo "      ✅ Prisma client generated."

# ── Step 2: Apply schema to database ────────────────────────────────
echo ""
DATABASE_URL="${DATABASE_URL:-}"

if [[ "$DATABASE_URL" == postgresql://* ]]; then
  echo "[2/3] Detected PostgreSQL — running prisma migrate deploy..."
  npx prisma migrate deploy
  echo "      ✅ Migrations applied."
else
  echo "[2/3] Detected SQLite — running prisma db push..."
  npx prisma db push --accept-data-loss
  echo "      ✅ Schema pushed to database."
fi

# ── Step 3: Verify schema is applied ───────────────────────────────
echo ""
echo "[3/3] Verifying schema..."

# Run a simple query to confirm the database is accessible and schema applied
VERIFY_QUERY="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

if [[ "$DATABASE_URL" == postgresql://* ]]; then
  # PostgreSQL: list tables from information_schema
  npx prisma db execute --stdin <<'SQL'
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
SQL
else
  # SQLite: list tables via sqlite3 or prisma
  node -e "
    const { PrismaClient } = require('@prisma/client');
    const db = new PrismaClient();
    db.\$queryRaw\\\`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name\\\`
      .then(rows => {
        const tables = rows.map(r => r.name).join(', ');
        console.log('      ✅ Tables found:', tables);
        return db.\$disconnect();
      })
      .catch(e => { console.error('      ❌ Verification failed:', e.message); process.exit(1); });
  "
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Database migration complete."
echo "═══════════════════════════════════════════════════════"
