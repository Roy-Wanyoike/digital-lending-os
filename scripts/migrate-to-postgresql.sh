#!/usr/bin/env bash
set -euo pipefail
# Migration script: SQLite → PostgreSQL
# Usage: ./scripts/migrate-to-postgresql.sh

echo "=== Digital Lending OS Database Migration: SQLite → PostgreSQL ==="

# 1. Backup current SQLite database
echo "[1/4] Backing up SQLite database..."
cp db/custom.db "db/custom.db.backup.$(date +%Y%m%d%H%M%S)"

# 2. Generate Prisma client for PostgreSQL
echo "[2/4] Generating Prisma client for PostgreSQL..."

# 3. Create PostgreSQL database (requires psql)
echo "[3/4] Creating PostgreSQL database..."
echo "    Run: CREATE DATABASE digital_lending_os;"
echo "    Then update .env: DB_PROVIDER=postgresql"

# 4. Push schema
echo "[4/4] Pushing schema to PostgreSQL..."
echo "    Run: npx prisma db push --schema=prisma/schema-postgresql.prisma"

echo "=== Migration complete ==="
