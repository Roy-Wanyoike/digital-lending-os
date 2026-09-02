#!/bin/bash
# Digital Lending OS Smoke Test — runs immediately after server start
# Usage: bash scripts/smoke-test.sh
set -e

BASE="http://localhost:3000"
UA="User-Agent: Mozilla/5.0"
PASSED=0
FAILED=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  ✅ $name → $actual"
    PASSED=$((PASSED+1))
  else
    echo "  ❌ $name → expected $expected, got $actual"
    FAILED=$((FAILED+1))
  fi
}

check_header() {
  local name="$1" header="$2" url="$3"
  local val=$(curl -sI -H "$UA" "$url" 2>/dev/null | rg -i "^$header" | head -1 | tr -d '\r')
  if [ -n "$val" ]; then
    echo "  ✅ $name → $val"
    PASSED=$((PASSED+1))
  else
    echo "  ❌ $name → MISSING"
    FAILED=$((FAILED+1))
  fi
}

echo "═══════════════════════════════════════════"
echo " Digital Lending OS Smoke Test"
echo "═══════════════════════════════════════════"

# Wait for server
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w '%{http_code}' -H "$UA" $BASE/api/health 2>/dev/null | grep -q 200; then
    echo "Server ready after ${i}s"
    break
  fi
  sleep 1
done

echo ""
echo "── Public Endpoints ──"

# Health
body=$(curl -s -H "$UA" $BASE/api/health)
status=$(curl -s -o /dev/null -w '%{http_code}' -H "$UA" $BASE/api/health)
check "GET /api/health" "200" "$status"
echo "$body" | grep -q '"status":"ok"' && echo "  ✅ Health status ok" || echo "  ❌ Health status not ok"
PASSED=$((PASSED+1))

# Ready
status=$(curl -s -o /dev/null -w '%{http_code}' -H "$UA" $BASE/api/ready)
check "GET /api/ready" "200" "$status"

# Landing page
status=$(curl -s -o /dev/null -w '%{http_code}' -H "$UA" $BASE/)
check "GET / (Landing)" "200" "$status"

# Login page
status=$(curl -s -o /dev/null -w '%{http_code}' -H "$UA" $BASE/login)
check "GET /login" "200" "$status"

# Register page
status=$(curl -s -o /dev/null -w '%{http_code}' -H "$UA" $BASE/register)
check "GET /register" "200" "$status"

echo ""
echo "── Auth Guards (should return 401) ──"

status=$(curl -s -o /dev/null -w '%{http_code}' -H "$UA" $BASE/api/wallets)
check "GET /api/wallets (no auth)" "401" "$status"

status=$(curl -s -o /dev/null -w '%{http_code}' -H "$UA" $BASE/api/transactions)
check "GET /api/transactions (no auth)" "401" "$status"

status=$(curl -s -o /dev/null -w '%{http_code}' -H "$UA" $BASE/api/payments/intents)
check "GET /api/payments/intents (no auth)" "401" "$status"

status=$(curl -s -o /dev/null -w '%{http_code}' -H "$UA" $BASE/api/escrow/transactions)
check "GET /api/escrow/transactions (no auth)" "401" "$status"

status=$(curl -s -o /dev/null -w '%{http_code}' -H "$UA" $BASE/api/businesses)
check "GET /api/businesses (no auth)" "401" "$status"

echo ""
echo "── Redirects ──"

code=$(curl -s -o /dev/null -w '%{http_code}' -H "$UA" $BASE/dashboard)
check "GET /dashboard → / (308)" "308" "$code"

echo ""
echo "── Security Headers ──"

check_header "X-Frame-Options" "x-frame-options" "$BASE/"
check_header "X-Content-Type-Options" "x-content-type-options" "$BASE/"
check_header "Referrer-Policy" "referrer-policy" "$BASE/"
check_header "Permissions-Policy" "permissions-policy" "$BASE/"
check_header "Strict-Transport-Security" "strict-transport-security" "$BASE/"
check_header "X-Request-Id" "x-request-id" "$BASE/"

echo ""
echo "── Rate Limit Headers ──"

check_header "X-Ratelimit-Limit" "x-ratelimit-limit" "$BASE/api/health"
check_header "X-Ratelimit-Remaining" "x-ratelimit-remaining" "$BASE/api/health"
check_header "X-Ratelimit-Reset" "x-ratelimit-reset" "$BASE/api/health"
check_header "X-Response-Time" "x-response-time" "$BASE/api/health"

echo ""
echo "── CORS Headers ──"

check_header "Access-Control-Allow-Origin" "access-control-allow-origin" "$BASE/api/health"

# OPTIONS preflight
code=$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS -H "$UA" $BASE/api/wallets)
check "OPTIONS /api/wallets (preflight)" "204" "$code"

echo ""
echo "── Login Flow ──"

# Get CSRF token and store cookies
CSRF_RESP=$(curl -s -H "$UA" -c /tmp/ys-cookies $BASE/api/auth/csrf)
CSRF_TOKEN=$(echo "$CSRF_RESP" | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).csrfToken" 2>/dev/null || echo "")

if [ -n "$CSRF_TOKEN" ] && [ "$CSRF_TOKEN" != "undefined" ]; then
  echo "  ✅ CSRF token obtained (${CSRF_TOKEN:0:20}...)"
  PASSED=$((PASSED+1))
else
  echo "  ❌ Failed to get CSRF token"
  FAILED=$((FAILED+1))
  CSRF_TOKEN="dummy"
fi

# Login flow — cookies already set from CSRF request above
URL="$BASE/api/auth/callback/credentials"
for hop in 1 2 3 4 5; do
  RESP=$(curl -si -X POST \
    -H "$UA" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    -b /tmp/ys-cookies \
    -c /tmp/ys-cookies \
    --data-urlencode "csrfToken=$CSRF_TOKEN" \
    --data-urlencode 'email=admin@digitallendingos.co.ke' \
    --data-urlencode 'password=demo1234' \
    --data-urlencode 'callbackUrl=/' \
    "$URL" 2>&1)
  LOGIN_CODE=$(echo "$RESP" | head -1 | awk '{print $2}')
  REDIR=$(echo "$RESP" | rg -i '^location:' | head -1 | sed 's/location: *//' | tr -d '\r')
  
  # Stop if no redirect or if we reached a page (not auth callback)
  if [ -z "$REDIR" ] || ! echo "$REDIR" | grep -q '/api/auth/'; then
    break
  fi
  # Convert relative URL to absolute
  if echo "$REDIR" | grep -q '^/'; then
    URL="${BASE}${REDIR}"
  else
    URL="$REDIR"
  fi
done

# Check if we got a session cookie
if grep -q 'session-token' /tmp/ys-cookies 2>/dev/null; then
  echo "  ✅ Login successful (session cookie set, last HTTP $LOGIN_CODE)"
  PASSED=$((PASSED+1))
else
  echo "  ❌ Login failed (no session cookie, last HTTP $LOGIN_CODE)"
  cat /tmp/ys-cookies 2>/dev/null | head -10
  FAILED=$((FAILED+1))
fi

# Verify session
SESSION_DATA=$(curl -s -H "$UA" -b /tmp/ys-cookies $BASE/api/auth/session 2>/dev/null)
EMAIL=$(echo "$SESSION_DATA" | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).user?.email || ''" 2>/dev/null)
if [ "$EMAIL" = "admin@digitallendingos.co.ke" ]; then
  echo "  ✅ Session verified: $EMAIL"
  PASSED=$((PASSED+1))
else
  echo "  ❌ Session not verified (got: $EMAIL)"
  FAILED=$((FAILED+1))
fi

echo ""
echo "── Authenticated API Endpoints ──"

if grep -q 'session-token' /tmp/ys-cookies 2>/dev/null; then
  status=$(curl -s -o /dev/null -w '%{http_code}' -H "$UA" -b /tmp/ys-cookies $BASE/api/dashboard/stats)
  check "GET /api/dashboard/stats (auth)" "200" "$status"

  status=$(curl -s -o /dev/null -w '%{http_code}' -H "$UA" -b /tmp/ys-cookies $BASE/api/wallets)
  check "GET /api/wallets (auth)" "200" "$status"

  status=$(curl -s -o /dev/null -w '%{http_code}' -H "$UA" -b /tmp/ys-cookies $BASE/api/transactions)
  check "GET /api/transactions (auth)" "200" "$status"

  status=$(curl -s -o /dev/null -w '%{http_code}' -H "$UA" -b /tmp/ys-cookies $BASE/api/payments/providers)
  check "GET /api/payments/providers (auth)" "200" "$status"

  status=$(curl -s -o /dev/null -w '%{http_code}' -H "$UA" -b /tmp/ys-cookies $BASE/api/analytics)
  check "GET /api/analytics (auth)" "200" "$status"

  status=$(curl -s -o /dev/null -w '%{http_code}' -H "$UA" -b /tmp/ys-cookies $BASE/api/roles)
  check "GET /api/roles (auth)" "200" "$status"

  status=$(curl -s -o /dev/null -w '%{http_code}' -H "$UA" -b /tmp/ys-cookies $BASE/api/notifications)
  check "GET /api/notifications (auth)" "200" "$status"

  status=$(curl -s -o /dev/null -w '%{http_code}' -H "$UA" -b /tmp/ys-cookies $BASE/api/referral)
  check "GET /api/referral (auth)" "200" "$status"
else
  echo "  ⏭️  Skipped (no session)"
fi

echo ""
echo "═══════════════════════════════════════════"
echo " Results: $PASSED passed, $FAILED failed"
echo "═══════════════════════════════════════════"

if [ $FAILED -gt 0 ]; then
  exit 1
fi
