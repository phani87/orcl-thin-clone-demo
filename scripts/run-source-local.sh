#!/usr/bin/env bash
source "$(dirname "$0")/lib/common.sh"

load_dotenv
ensure_local_runtime_dirs
require_command npm

export APP_ENV="${APP_ENV:-production-like}"
export SCENARIO_LABEL="${SCENARIO_LABEL:-source}"
export PORT="${SOURCE_API_PORT:-3000}"
export VITE_PORT="${SOURCE_UI_PORT:-5173}"
export VITE_API_PROXY_TARGET="http://127.0.0.1:${PORT}"

API_LOG="${LOCAL_LOG_DIR}/source-api.log"
UI_LOG="${LOCAL_LOG_DIR}/source-ui.log"
API_PID_FILE="${LOCAL_PID_DIR}/source-api.pid"
UI_PID_FILE="${LOCAL_PID_DIR}/source-ui.pid"

log "Starting source API on port ${PORT}"
(
  cd "$ROOT_DIR"
  nohup npm --workspace inventory-api run start > "$API_LOG" 2>&1 &
  echo $! > "$API_PID_FILE"
)

log "Starting source UI on port ${VITE_PORT}"
(
  cd "$ROOT_DIR"
  nohup npm --workspace inventory-ui run dev > "$UI_LOG" 2>&1 &
  echo $! > "$UI_PID_FILE"
)

log "Source UI: http://$(hostname -f 2>/dev/null || hostname):${VITE_PORT}"
log "Source API health: http://127.0.0.1:${PORT}/api/health"
