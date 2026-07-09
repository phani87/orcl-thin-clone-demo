#!/usr/bin/env bash
source "$(dirname "$0")/lib/common.sh"

START_SECONDS="$(date +%s)"

if [[ "${BUILD_IMAGES:-true}" == "true" ]]; then
  "${ROOT_DIR}/scripts/build-images.sh"
fi

"${ROOT_DIR}/scripts/deploy-source.sh"

if [[ "${SEED_SOURCE:-true}" == "true" ]]; then
  "${ROOT_DIR}/scripts/seed-source.sh"
fi

"${ROOT_DIR}/scripts/clone-pdb.sh"
"${ROOT_DIR}/scripts/deploy-clone.sh"

END_SECONDS="$(date +%s)"
log "Full demo orchestration complete in $((END_SECONDS - START_SECONDS)) seconds"
log "Set SOURCE_BASE_URL and CLONE_BASE_URL, then run ./scripts/smoke-test.sh"
