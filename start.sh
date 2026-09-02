#!/bin/bash
# ──────────────────────────────────────────────────────────────────────
# start.sh — DEVELOPMENT server (interactive, foreground)
# ──────────────────────────────────────────────────────────────────────
# Starts the Next.js dev server on port 3000 with hot-reload.
# For backgrounded dev startup with warmup, use: scripts/start.sh
# For production, use: ./start-prod.sh
#
# Usage: ./start.sh
# ──────────────────────────────────────────────────────────────────────

set -e

# Resolve project root from script location (not hardcoded)
cd "$(dirname "$0")"

# Ensure .env has required vars for local dev
if ! grep -q 'NEXTAUTH_SECRET' .env 2>/dev/null; then
  echo 'NEXTAUTH_URL=http://localhost:3000' >> .env
  echo 'NEXTAUTH_SECRET=dev-secret-change-in-production-min-32-chars-ok' >> .env
fi

# Kill stale dev processes
pkill -9 -f 'next dev' 2>/dev/null || true
pkill -9 -f 'next-server' 2>/dev/null || true
sleep 1

echo 'Starting Digital Lending OS dev server on port 3000...'
NODE_OPTIONS='--max-old-space-size=2048' \
  NEXT_TELEMETRY_DISABLED=1 \
  npx next dev -p 3000 -H 0.0.0.0
