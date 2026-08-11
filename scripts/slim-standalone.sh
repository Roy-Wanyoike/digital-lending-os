#!/usr/bin/env bash
set -euo pipefail

STANDALINE_DIR="${1:-.next/standalone}"

if [ ! -d "$STANDALINE_DIR" ]; then
  echo "Error: $STANDALINE_DIR not found. Run 'NODE_ENV=production next build --webpack' first."
  exit 1
fi

BEFORE=$(du -sm "$STANDALINE_DIR" | cut -f1)
echo "Before: ${BEFORE}MB"

# ═══ SAFE REMOVALS ═══
# These packages are 100% unused at runtime in production.

# 1. Sharp image processing libs (33MB) — images.unoptimized=true
rm -rf "$STANDALINE_DIR/node_modules/@img"
rm -rf "$STANDALINE_DIR/node_modules/sharp"

# 2. TypeScript (8.8MB) — build-time only
rm -rf "$STANDALINE_DIR/node_modules/typescript"

# 3. caniuse-lite (2.5MB) — autoprefixer browser database, build-time only
rm -rf "$STANDALINE_DIR/node_modules/caniuse-lite"

# 4. source-map-js (140KB)
rm -rf "$STANDALINE_DIR/node_modules/source-map-js"

# 5. Sharp transitive deps
rm -rf "$STANDALINE_DIR/node_modules/color" 2>/dev/null || true
rm -rf "$STANDALINE_DIR/node_modules/detect-libc" 2>/dev/null || true
rm -rf "$STANDALINE_DIR/node_modules/@mapbox" 2>/dev/null || true
rm -rf "$STANDALINE_DIR/node_modules/semver" 2>/dev/null || true

# 6. OTel cloud resource detectors (not needed unless on those clouds)
rm -rf "$STANDALINE_DIR/node_modules/@opentelemetry/resource-detector-aws" 2>/dev/null || true
rm -rf "$STANDALINE_DIR/node_modules/@opentelemetry/resource-detector-azure" 2>/dev/null || true
rm -rf "$STANDALINE_DIR/node_modules/@opentelemetry/resource-detector-gcp" 2>/dev/null || true
rm -rf "$STANDALINE_DIR/node_modules/@opentelemetry/resource-detector-container" 2>/dev/null || true

# 7. Next.js compiled build-time only modules (safe — only used during build)
rm -rf "$STANDALINE_DIR/node_modules/next/dist/compiled/postcss-preset-env" 2>/dev/null || true
rm -rf "$STANDALINE_DIR/node_modules/next/dist/compiled/crypto-browserify" 2>/dev/null || true
rm -rf "$STANDALINE_DIR/node_modules/next/dist/compiled/compression" 2>/dev/null || true
rm -rf "$STANDALINE_DIR/node_modules/next/dist/compiled/cssnano-simple" 2>/dev/null || true
rm -rf "$STANDALINE_DIR/node_modules/next/dist/compiled/@modelcontextprotocol" 2>/dev/null || true
rm -rf "$STANDALINE_DIR/node_modules/next/dist/compiled/schema-utils3" 2>/dev/null || true
rm -rf "$STANDALINE_DIR/node_modules/next/dist/compiled/comment-json" 2>/dev/null || true
rm -rf "$STANDALINE_DIR/node_modules/next/dist/compiled/conf" 2>/dev/null || true
rm -rf "$STANDALINE_DIR/node_modules/next/dist/compiled/raw-body" 2>/dev/null || true
rm -rf "$STANDALINE_DIR/node_modules/next/dist/compiled/@vercel" 2>/dev/null || true
rm -rf "$STANDALINE_DIR/node_modules/next/dist/compiled/pnpapi" 2>/dev/null || true
rm -rf "$STANDALINE_DIR/node_modules/next/dist/compiled/edge-runtime" 2>/dev/null || true
rm -rf "$STANDALINE_DIR/node_modules/next/dist/compiled/next-devtools" 2>/dev/null || true

# 8. Misc build-time only
rm -rf "$STANDALINE_DIR/node_modules/baseline-browser-mapping" 2>/dev/null || true
rm -rf "$STANDALINE_DIR/node_modules/debug" 2>/dev/null || true
rm -rf "$STANDALINE_DIR/node_modules/styled-jsx" 2>/dev/null || true

# 9. Redis (optional — not used unless REDIS_URL is set)
rm -rf "$STANDALINE_DIR/node_modules/ioredis" 2>/dev/null || true
rm -rf "$STANDALINE_DIR/node_modules/@ioredis" 2>/dev/null || true
rm -rf "$STANDALINE_DIR/node_modules/redis-parser" 2>/dev/null || true
rm -rf "$STANDALINE_DIR/node_modules/redis-errors" 2>/dev/null || true
rm -rf "$STANDALINE_DIR/node_modules/cluster-key-slot" 2>/dev/null || true

# 10. Font metrics JSON (4.2MB) — only used during build for @next/font
rm -f "$STANDALINE_DIR/node_modules/next/dist/server/capsize-font-metrics.json" 2>/dev/null || true


# 12. TypeScript server rules (build-time only type checking)
rm -rf "$STANDALINE_DIR/node_modules/next/dist/server/typescript" 2>/dev/null || true

AFTER=$(du -sm "$STANDALINE_DIR" | cut -f1)
echo "After:  ${AFTER}MB"
echo "Saved:  $((BEFORE - AFTER))MB"
echo ''
echo 'Run: cp -r .next/static $STANDALINE_DIR/.next/static'
