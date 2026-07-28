#!/bin/bash
# Youngsend production startup script
# Loads environment variables and starts the Next.js production server

set -e

cd /home/z/my-project

# Load .env file (next start does NOT auto-load .env in production mode)
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

# Ensure NEXTAUTH_SECRET is always set (required in production)
export NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-youngsend-super-secret-key-change-in-production-2026}"
export NEXTAUTH_URL="${NEXTAUTH_URL:-http://localhost:3000}"
export DATABASE_URL="${DATABASE_URL:-file:/home/z/my-project/db/custom.db}"

exec npx next start -p "${PORT:-3000}"
