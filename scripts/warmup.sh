#!/bin/bash
# Warmup script — pre-compiles critical routes after dev server start
# Usage: bash scripts/warmup.sh [base-url]
BASE="${1:-http://localhost:3000}"

echo "[warmup] Starting route pre-compilation..."

# Phase 1: Landing page (heaviest compile ~14s)
printf '[warmup] GET / → ' && curl -s --max-time 90 -o /dev/null -w '%{http_code}\n' "$BASE/"
[ $? -ne 0 ] && { echo '[warmup] Root page failed'; exit 1; }

# Let GC reclaim memory after heavy compile
echo '[warmup] GC pause 8s...'
sleep 8

# Phase 2: Auth pages
for path in /login /register; do
  printf "[warmup] GET $path → " && curl -s --max-time 30 -o /dev/null -w '%{http_code}\n' "$BASE$path"
  sleep 3
done

# Phase 3: API routes (lightweight after initial compile)
for path in /api/health /api/ready /api/auth/csrf; do
  printf "[warmup] GET $path → " && curl -s --max-time 15 -o /dev/null -w '%{http_code}\n' "$BASE$path"
  sleep 1
done

echo '[warmup] Done — server warmed up and ready'
