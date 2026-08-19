#!/bin/bash
# Youngsend production startup script
# Loads environment variables, runs migrations, and starts the Next.js production server
# NOTE: next.config.ts sets output='standalone' in production, so we must
# use node .next/standalone/server.js instead of "npx next start".

set -e

cd /home/z/my-project

# Load .env file (standalone server does NOT auto-load .env)
if [ -f .env ]; then
  set -a
  source <(grep -v '^#' .env | grep -v '^$')
  set +a
fi

# NEXTAUTH_SECRET must be set externally (env file, CI/CD, orchestrator). App will fail if unset — this is intentional for production.
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
