#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Youngsend — Self-Signed SSL Certificate Generator (Development Only)
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSL_DIR="${SCRIPT_DIR}/ssl"

mkdir -p "${SSL_DIR}"

echo "==> Generating self-signed certificate for youngsend.space-z.ai …"

openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout "${SSL_DIR}/key.pem" \
  -out    "${SSL_DIR}/cert.pem" \
  -subj "/C=KE/ST=Nairobi/L=Nairobi/O=Youngsend/CN=youngsend.space-z.ai"

echo "==> Done. Files written to:"
echo "    ${SSL_DIR}/cert.pem"
echo "    ${SSL_DIR}/key.pem"
echo ""
echo "────────────────────────────────────────────────────────────────"
echo "  NOTE: This is a self-signed certificate for local development."
echo "  Browsers will show a privacy warning — click through it."
echo ""
echo "  For production, use Let's Encrypt with Certbot:"
echo "    certbot --nginx -d youngsend.space-z.ai"
echo "────────────────────────────────────────────────────────────────"
