#!/bin/bash
# Digital Lending OS Dev Server — startup with warmup
# Usage: bash scripts/start.sh
set -e

cd "$(dirname "$0")/.."

export NODE_OPTIONS="--max-old-space-size=3072"
export NEXT_TELEMETRY_DISABLED=1

echo "[start] Starting Next.js dev server..."
rm -rf .next
npx next dev -p 3000 -H 0.0.0.0 --turbopack > /tmp/next-server.log 2>&1 &
SERVER_PID=$!
echo "[start] Server PID: $SERVER_PID"

# Wait for "Ready" in log
echo "[start] Waiting for Ready..."
for i in $(seq 1 30); do
  if rg -q 'Ready' /tmp/next-server.log 2>/dev/null; then
    echo "[start] Server ready after ${i}s"
    break
  fi
  sleep 1
done

# Warmup with GC pauses
echo "[warmup] Phase 1: Root page (heaviest)"
printf "  / → "; curl -s --max-time 120 -o /dev/null -w '%{http_code}\n' http://localhost:3000/
sleep 10
kill -0 $SERVER_PID 2>/dev/null || { echo "[warmup] Died after /"; exit 1; }

echo "[warmup] Phase 2: Auth pages"
for route in "/login" "/register"; do
  printf "  $route → "; curl -s --max-time 30 -o /dev/null -w '%{http_code}\n' "http://localhost:3000$route"
  sleep 5
  kill -0 $SERVER_PID 2>/dev/null || { echo "[warmup] Died after $route"; exit 1; }
done

echo "[warmup] Phase 3: API routes"
for route in "/api/health" "/api/ready" "/api/auth/csrf"; do
  printf "  $route → "; curl -s --max-time 20 -o /dev/null -w '%{http_code}\n' "http://localhost:3000$route"
  sleep 2
  kill -0 $SERVER_PID 2>/dev/null || { echo "[warmup] Died after $route"; exit 1; }
done

echo "[start] ✅ Warmed up — http://0.0.0.0:3000"
echo "[start] Logs: /tmp/next-server.log"
wait $SERVER_PID
