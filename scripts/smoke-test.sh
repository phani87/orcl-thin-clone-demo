#!/usr/bin/env bash
source "$(dirname "$0")/lib/common.sh"

require_command curl
require_env SOURCE_BASE_URL
require_env CLONE_BASE_URL
mkdir -p "$GENERATED_DIR"

metric() {
  local field="$1"
  json_field "$field"
}

log "Reading source and clone summaries"
SOURCE_BEFORE="$(curl -fsS "${SOURCE_BASE_URL}/api/inventory/summary")"
CLONE_BEFORE="$(curl -fsS "${CLONE_BASE_URL}/api/inventory/summary")"

SOURCE_POSITIONS="$(printf '%s' "$SOURCE_BEFORE" | metric totals.inventoryPositions)"
CLONE_POSITIONS="$(printf '%s' "$CLONE_BEFORE" | metric totals.inventoryPositions)"

if [[ "$SOURCE_POSITIONS" != "$CLONE_POSITIONS" ]]; then
  printf 'Source and clone position counts differ before scenario: source=%s clone=%s\n' "$SOURCE_POSITIONS" "$CLONE_POSITIONS" >&2
  exit 1
fi

SOURCE_ON_HAND_BEFORE="$(printf '%s' "$SOURCE_BEFORE" | metric totals.totalOnHand)"
CLONE_ON_HAND_BEFORE="$(printf '%s' "$CLONE_BEFORE" | metric totals.totalOnHand)"

log "Applying scenario only to clone"
curl -fsS -X POST "${CLONE_BASE_URL}/api/scenarios/tighten-replenishment/apply" \
  -H 'Content-Type: application/json' \
  -d '{"maxActions":12,"requestedBy":"smoke-test"}' > "${GENERATED_DIR}/clone-scenario-result.json"

SOURCE_AFTER="$(curl -fsS "${SOURCE_BASE_URL}/api/inventory/summary")"
CLONE_AFTER="$(curl -fsS "${CLONE_BASE_URL}/api/inventory/summary")"
SOURCE_ON_HAND_AFTER="$(printf '%s' "$SOURCE_AFTER" | metric totals.totalOnHand)"
CLONE_ON_HAND_AFTER="$(printf '%s' "$CLONE_AFTER" | metric totals.totalOnHand)"

if [[ "$SOURCE_ON_HAND_BEFORE" != "$SOURCE_ON_HAND_AFTER" ]]; then
  printf 'Source changed after clone scenario: before=%s after=%s\n' "$SOURCE_ON_HAND_BEFORE" "$SOURCE_ON_HAND_AFTER" >&2
  exit 1
fi

if [[ "$CLONE_ON_HAND_BEFORE" == "$CLONE_ON_HAND_AFTER" ]]; then
  printf 'Clone did not change after scenario: before=%s after=%s\n' "$CLONE_ON_HAND_BEFORE" "$CLONE_ON_HAND_AFTER" >&2
  exit 1
fi

log "Smoke test passed: clone changed while source remained unchanged"
