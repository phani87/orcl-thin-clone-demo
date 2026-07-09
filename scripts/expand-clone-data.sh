#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "${ROOT_DIR}/scripts/lib/common.sh"

load_dotenv
require_command curl

CLONE_API_BASE="${CLONE_API_BASE:-http://127.0.0.1:${CLONE_API_PORT:-3001}}"
REQUESTED_BY="${REQUESTED_BY:-retail-ops-demo}"

TARGET_STORES="${TARGET_STORES:-350}"
TARGET_WAREHOUSES="${TARGET_WAREHOUSES:-100}"
TARGET_PRODUCTS="${TARGET_PRODUCTS:-35000}"
TARGET_POSITIONS="${TARGET_POSITIONS:-370000}"

post_expand() {
  local payload="$1"
  curl -fsS -X POST "${CLONE_API_BASE}/api/environment/expand" \
    -H "Content-Type: application/json" \
    -d "$payload"
  printf '\n'
}

log "Expanding clone stores to ${TARGET_STORES}"
post_expand "{\"targetStores\":${TARGET_STORES},\"requestedBy\":\"${REQUESTED_BY}\"}"

log "Expanding clone warehouses to ${TARGET_WAREHOUSES}"
post_expand "{\"targetWarehouses\":${TARGET_WAREHOUSES},\"requestedBy\":\"${REQUESTED_BY}\"}"

log "Expanding clone products to ${TARGET_PRODUCTS}"
post_expand "{\"targetProducts\":${TARGET_PRODUCTS},\"requestedBy\":\"${REQUESTED_BY}\"}"

log "Expanding clone positions to ${TARGET_POSITIONS}"
post_expand "{\"targetPositions\":${TARGET_POSITIONS},\"requestedBy\":\"${REQUESTED_BY}\"}"

log "Final clone inventory summary"
curl -fsS "${CLONE_API_BASE}/api/inventory/summary"
printf '\n'
