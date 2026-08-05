#!/bin/bash
cd /home/z/my-project
HOSTNAME=0.0.0.0 PORT=3000 nohup node .next/standalone/server.js > /tmp/next-prod-final.log 2>&1 &
echo $! > /tmp/next-prod.pid
echo "Started PID: $!"
exit 0
