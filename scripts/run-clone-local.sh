#!/usr/bin/env bash
source "$(dirname "$0")/lib/common.sh"

load_dotenv
ensure_local_runtime_dirs
require_command npm
require_env CLONE_PDB_NAME

export DB_CONNECT_STRING="$(clone_connect_string)"
export APP_ENV="${CLONE_APP_ENV:-thin-clone-test}"
export SCENARIO_LABEL="${CLONE_SCENARIO_LABEL:-$CLONE_PDB_NAME}"
export PORT="${CLONE_API_PORT:-3001}"
export VITE_PORT="${CLONE_UI_PORT:-5174}"
export VITE_API_PROXY_TARGET="http://127.0.0.1:${PORT}"

API_LOG="${LOCAL_LOG_DIR}/clone-api.log"
UI_LOG="${LOCAL_LOG_DIR}/clone-ui.log"
API_PID_FILE="${LOCAL_PID_DIR}/clone-api.pid"
UI_PID_FILE="${LOCAL_PID_DIR}/clone-ui.pid"

log "Starting clone API on port ${PORT} using ${DB_CONNECT_STRING}"
(
  cd "$ROOT_DIR"
  nohup npm --workspace inventory-api run start > "$API_LOG" 2>&1 &
  echo $! > "$API_PID_FILE"
)

log "Starting clone UI on port ${VITE_PORT}"
(
  cd "$ROOT_DIR"
  nohup npm --workspace inventory-ui run dev > "$UI_LOG" 2>&1 &
  echo $! > "$UI_PID_FILE"
)

log "Clone UI: http://$(hostname -f 2>/dev/null || hostname):${VITE_PORT}"
log "Clone API health: http://127.0.0.1:${PORT}/api/health"
