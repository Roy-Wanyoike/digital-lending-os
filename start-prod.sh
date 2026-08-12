#!/bin/bash
# Youngsend production startup script
# Loads environment variables and starts the Next.js production server
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
export DATABASE_URL="${DATABASE_URL:-file:/home/z/my-project/db/custom.db}"
export HOSTNAME="0.0.0.0"
export PORT="${PORT:-3000}"
export NODE_ENV="production"

# Verify the standalone build exists
if [ ! -f .next/standalone/server.js ]; then
  echo "ERROR: .next/standalone/server.js not found. Run 'npm run build' first."
  exit 1
fi

exec node .next/standalone/server.js
