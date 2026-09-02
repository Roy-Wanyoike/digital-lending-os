#!/bin/bash
set -e
cd /home/z/my-project

export NEXTAUTH_SECRET='dlo-super-secret-key-change-in-production-2026'
export NEXTAUTH_URL='http://localhost:3000'
export DATABASE_URL='file:/home/z/my-project/db/custom.db'

# Kill any existing server
kill -9 $(ss -tlnp | grep 3000 | grep -oP 'pid=\K\d+') 2>/dev/null || true
sleep 2

# Start server in background
node .next/standalone/server.js > /tmp/dlo_test_server.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Wait for server to be ready
for i in $(seq 1 30); do
  if curl -s --max-time 2 http://localhost:3000/api/auth/session > /dev/null 2>&1; then
    echo "Server ready after ${i}s"
    break
  fi
  sleep 1
done

# Run tests
NEXTAUTH_SECRET='dlo-super-secret-key-change-in-production-2026' npx vitest run "$@" 2>&1
TEST_EXIT=$?

# Cleanup
kill $SERVER_PID 2>/dev/null || true
exit $TEST_EXIT
