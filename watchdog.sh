#!/bin/bash
# Youngsend Dev Server Watchdog — auto-restart on crash
while true; do
  rm -f /tmp/ys-cookies
  NODE_OPTIONS="--max-old-space-size=256" NEXT_TELEMETRY_DISABLED=1 npx next dev -p 3000 -H 0.0.0.0
  echo "[$(date)] Server exited, restarting in 3s..."
  sleep 3
done
