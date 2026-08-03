#!/bin/bash
# Persistent dev server — survives session disconnects
cd /home/z/my-project
pkill -9 -f 'next dev' 2>/dev/null
pkill -9 -f 'next-server' 2>/dev/null
sleep 1

nohup env NODE_OPTIONS='--max-old-space-size=2048' \
  NEXT_TELEMETRY_DISABLED=1 \
  npx next dev -p 3000 -H 0.0.0.0 \
  > /tmp/next-dev.log 2>&1 &

echo $! > /tmp/next-dev.pid
echo "Server starting... PID=$(cat /tmp/next-dev.pid)"
