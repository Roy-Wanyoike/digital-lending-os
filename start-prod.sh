#!/bin/bash
# ──────────────────────────────────────────────────────────────────────
# start-prod.sh — PRODUCTION server (interactive, foreground)
# ──────────────────────────────────────────────────────────────────────
# Loads .env, validates DATABASE_URL, runs Prisma migrations, then
# starts the Next.js standalone production server via exec.
#
# Intended for direct use or as the entrypoint in a container / PM2.
# For development, use: ./start.sh
# For backgrounded dev startup with warmup, use: scripts/start.sh
#
# Prerequisites:
#   - NEXTAUTH_SECRET  set in .env or environment
#   - DATABASE_URL     pointing to a PostgreSQL instance
#   - npm run build    completed (produces .next/standalone/server.js)
#
# Usage: ./start-prod.sh
# ──────────────────────────────────────────────────────────────────────

set -e

# Resolve project root from script location (not hardcoded)
cd "$(dirname "$0")"

# Load .env file (standalone server does NOT auto-load .env)
if [ -f .env ]; then
  set -a
  source <(grep -v '^#' .env | grep -v '^$')
  set +a
fi

# NEXTAUTH_SECRET must be set externally (env file, CI/CD, orchestrator).
# App will fail if unset — this is intentional for production.
export NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
export NEXTAUTH_URL="${NEXTAUTH_URL:-http://localhost:3000}"
export HOSTNAME="0.0.0.0"
export PORT="${PORT:-3000}"
export NODE_ENV="production"

# ── Validate DATABASE_URL ───────────────────────────────────────────
if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set. Aborting."
  exit 1
fi

if [[ "${DATABASE_URL}" != postgresql://* ]]; then
  echo "ERROR: DATABASE_URL must be a PostgreSQL connection string (postgresql://...). Got: ${DATABASE_URL}"
  exit 1
fi

echo "[startup] DATABASE_URL is configured (postgresql)"

# ── Run pending migrations ──────────────────────────────────────────
if [ -n "${DIRECT_URL:-}" ]; then
  echo "[startup] Running prisma migrate deploy with DIRECT_URL..."
  DATABASE_URL="${DIRECT_URL}" npx prisma migrate deploy
  echo "[startup] Migrations applied."
else
  echo "[startup] Skipping migrations (DIRECT_URL not set)."
fi

# Verify the standalone build exists
if [ ! -f .next/standalone/server.js ]; then
  echo "ERROR: .next/standalone/server.js not found. Run 'npm run build' first."
  exit 1
fi

exec node .next/standalone/server.js
