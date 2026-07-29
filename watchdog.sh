#!/bin/bash
# Auto-restart watchdog for Next.js dev server
# Keeps the server alive by restarting it whenever it dies

export DATABASE_URL="file:/home/z/my-project/db/custom.db"
export NEXTAUTH_SECRET="youngsend-super-secret-key-change-in-production-2026"
export NEXTAUTH_URL="http://localhost:3000"

while true; do
  # Check if server is responding
  if ! curl -s -o /dev/null -w '' http://localhost:3000/api/auth/csrf 2>/dev/null; then
    # Kill any leftover process
    kill -9 $(ss -tlnp 2>/dev/null | rg '3000' | rg -oP 'pid=\K[0-9]+') 2>/dev/null
    sleep 2
    # Restart
    echo "[$(date)] Restarting Next.js server..." >> /home/z/my-project/watchdog.log
    cd /home/z/my-project && npx next dev -p 3000 --turbopack >> /home/z/my-project/dev.log 2>&1 &
    sleep 8
  fi
  sleep 5
done
