#!/bin/bash
# Youngsend Dev Server Watchdog — auto-restart on crash
# Memory budget: ~4GB container, Node needs ~1.5GB for Turbopack + all routes
while true; do
  rm -f /tmp/ys-cookies
  NODE_OPTIONS="--max-old-space-size=2048" NEXT_TELEMETRY_DISABLED=1 npx next dev -p 3000 -H 0.0.0.0 --turbopack
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3s..."
  sleep 3
done
