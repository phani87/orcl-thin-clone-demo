#!/usr/bin/env bash
source "$(dirname "$0")/lib/common.sh"

require_command docker
require_env IMAGE_REPO

log "Building API image $(api_image)"
docker build -t "$(api_image)" "${ROOT_DIR}/inventory-api"

log "Building UI image $(ui_image)"
docker build -t "$(ui_image)" "${ROOT_DIR}/inventory-ui"

if [[ "${PUSH_IMAGES:-true}" == "true" ]]; then
  log "Pushing API image"
  docker push "$(api_image)"
  log "Pushing UI image"
  docker push "$(ui_image)"
fi
