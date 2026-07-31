#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Youngsend — Local Deployment Helper
# Usage: ./deploy.sh [staging|production]
#
# Builds the Docker image locally, pushes it to GCR, and applies
# K8s manifests to the target GKE cluster.
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────
ENVIRONMENT="${1:-staging}"
PROJECT_ID="${GCP_PROJECT_ID:-YOUR_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
IMAGE_NAME="gcr.io/${PROJECT_ID}/youngsend"
GIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo 'local')"
NAMESPACE="youngsend-${ENVIRONMENT}"
CLUSTER="youngsend-${ENVIRONMENT}"
K8S_DIR="infra/k8s"

# ── Colours ───────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Colour

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Validation ────────────────────────────────────────────────────────
if [[ "${ENVIRONMENT}" != "staging" && "${ENVIRONMENT}" != "production" ]]; then
  error "Invalid environment: ${ENVIRONMENT}. Use 'staging' or 'production'."
fi

if [[ "${PROJECT_ID}" == "YOUR_PROJECT_ID" ]]; then
  warn "GCP_PROJECT_ID not set — using placeholder. Set it via:\n"
  warn "  export GCP_PROJECT_ID=my-gcp-project"
fi

# ── Pre-flight ────────────────────────────────────────────────────────
for cmd in docker gcloud kubectl envsubst git; do
  command -v "$cmd" &>/dev/null || error "Required command not found: $cmd"
done

# ── Step 1: Build Docker Image ───────────────────────────────────────
info "Building Docker image → ${IMAGE_NAME}:${GIT_SHA}"
docker build \
  -t "${IMAGE_NAME}:${GIT_SHA}" \
  -t "${IMAGE_NAME}:latest" \
  .
info "Build complete."

# ── Step 2: Push to GCR ──────────────────────────────────────────────
info "Pushing ${IMAGE_NAME}:${GIT_SHA} to GCR..."
docker push "${IMAGE_NAME}:${GIT_SHA}"
docker push "${IMAGE_NAME}:latest"
info "Push complete."

# ── Step 3: Get GKE Credentials ──────────────────────────────────────
info "Fetching GKE credentials for cluster '${CLUSTER}' in ${REGION}..."
gcloud container clusters get-credentials "${CLUSTER}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}"
info "Credentials configured."

# ── Step 4: Apply K8s Manifests ─────────────────────────────────────
info "Applying K8s manifests to namespace '${NAMESPACE}'..."
export IMAGE_TAG="${GIT_SHA}"
export PROJECT_ID="${PROJECT_ID}"
export NAMESPACE="${NAMESPACE}"

for file in "${K8S_DIR}"/*.yaml; do
  info "  Applying $(basename "$file")..."
  envsubst < "${file}" | kubectl apply -f -
done
info "Manifests applied."

# ── Step 5: Wait for Rollout ─────────────────────────────────────────
info "Waiting for rollout of deployment/youngsend-nextjs in ${NAMESPACE}..."
if kubectl rollout status deployment/youngsend-nextjs \
  -n "${NAMESPACE}" \
  --timeout=300s; then
  info "Rollout successful!"
else
  error "Rollout failed or timed out after 300s."
fi

# ── Step 6: Status ────────────────────────────────────────────────────
echo ""
info "═══════════════════════════════════════════════════════"
info "  Deployment Summary"
info "═══════════════════════════════════════════════════════"
info "  Environment:  ${ENVIRONMENT}"
info "  Namespace:    ${NAMESPACE}"
info "  Cluster:      ${CLUSTER}"
info "  Image:        ${IMAGE_NAME}:${GIT_SHA}"
info "═══════════════════════════════════════════════════════"
kubectl get pods -n "${NAMESPACE}" -l app.kubernetes.io/name=youngsend-nextjs
