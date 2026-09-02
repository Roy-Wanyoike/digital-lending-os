#!/bin/bash
# Digital Lending OS Dev Server Watchdog — auto-restart on crash
# Memory: 3GB heap needed for Turbopack + 72 routes + 12 dashboard tabs
while true; do
  rm -f /tmp/dlo-cookies
  NODE_OPTIONS="--max-old-space-size=3072" NEXT_TELEMETRY_DISABLED=1 npx next dev -p 3000 -H 0.0.0.0 --turbopack
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3s..."
  sleep 3
done
