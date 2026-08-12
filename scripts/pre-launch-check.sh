#!/usr/bin/env bash
# ─── Pre-Launch Checklist ─────────────────────────────────────────
# Runs all validation checks before a production deployment.
# Must exit 0 for a green-light deploy.
# ─────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

PASS=0
FAIL=0
WARN=0

pass() { PASS=$((PASS + 1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  ❌ $1"; }
warn() { WARN=$((WARN + 1)); echo "  ⚠️  $1"; }

echo "═══════════════════════════════════════════════════════"
echo "  YOUNGSEND Pre-Launch Checklist"
echo "═══════════════════════════════════════════════════════"

# ── 1. TypeScript check ────────────────────────────────────────────
echo ""
echo "[1/6] TypeScript type check..."
if npx tsc --noEmit 2>&1; then
  pass "TypeScript: 0 errors"
else
  fail "TypeScript check failed"
fi

# ── 2. All tests pass ──────────────────────────────────────────────
echo ""
echo "[2/6] Running test suite..."
if npm test 2>&1; then
  pass "All tests pass"
else
  fail "Tests failed"
fi

# ── 3. Production build succeeds ───────────────────────────────────
echo ""
echo "[3/6] Production build..."
if NODE_ENV=production npx next build 2>&1; then
  pass "Production build succeeded"
else
  fail "Production build failed"
fi

# ── 4. No hardcoded secrets ────────────────────────────────────────
echo ""
echo "[4/6] Scanning for hardcoded secrets..."
SECRETS_FOUND=0

# Common secret patterns (excluding test files, .env.example, this script, and lock files)
PATTERNS=(
  'sk_live_[a-zA-Z0-9]{20,}'
  'sk_test_[a-zA-Z0-9]{20,}'
  'rk_live_[a-zA-Z0-9]{20,}'
  'FLWSECK-[a-zA-Z0-9]{20,}'
  'INTASEND_LIVE_[a-zA-Z0-9]{20,}'
)

EXCLUDE_DIRS=(
  --exclude-dir=node_modules
  --exclude-dir=.next
  --exclude-dir=.git
  --exclude-dir=dist
)

for pattern in "${PATTERNS[@]}"; do
  if rg --no-filename "$pattern" src/ scripts/ --glob '!*.test.*' --glob '!*.spec.*' --glob '!*.example*' 2>/dev/null; then
    SECRETS_FOUND=$((SECRETS_FOUND + 1))
  fi
done

if [ "$SECRETS_FOUND" -eq 0 ]; then
  pass "No hardcoded secrets found"
else
  fail "Found $SECRETS_FOUND potential hardcoded secrets"
fi

# ── 5. Bundle size check ───────────────────────────────────────────
echo ""
echo "[5/6] Bundle size check (standalone < 200MB)..."
if [ -d ".next/standalone" ]; then
  BUNDLE_SIZE_MB=$(du -sm .next/standalone 2>/dev/null | cut -f1)
  echo "       Current size: ${BUNDLE_SIZE_MB}MB"
  if [ "$BUNDLE_SIZE_MB" -le 200 ]; then
    pass "Bundle size ${BUNDLE_SIZE_MB}MB (within 200MB limit)"
  else
    fail "Bundle size ${BUNDLE_SIZE_MB}MB exceeds 200MB limit"
  fi
else
  warn "Standalone bundle not found (run build first)"
fi

# ── 6. Environment variables validated ─────────────────────────────
echo ""
echo "[6/6] Environment variable validation..."
if node scripts/validate-env.js 2>&1; then
  pass "Environment variables validated"
else
  fail "Environment variable validation failed"
fi

# ── Summary ─────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Results:  ✅ $PASS passed  ❌ $FAIL failed  ⚠️  $WARN warnings"
echo "═══════════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "❌ PRE-LAUNCH CHECK FAILED — do not deploy."
  exit 1
fi

echo ""
echo "🚀 All checks passed. Ready to launch!"
exit 0
