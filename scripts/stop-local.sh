#!/usr/bin/env bash
source "$(dirname "$0")/lib/common.sh"

ensure_local_runtime_dirs

stop_pid_file() {
  local label="$1"
  local pid_file="$2"
  if [[ ! -f "$pid_file" ]]; then
    log "No ${label} pid file found"
    return
  fi

  local pid
  pid="$(cat "$pid_file")"
  if kill -0 "$pid" >/dev/null 2>&1; then
    log "Stopping ${label} (${pid})"
    kill "$pid"
  else
    log "${label} pid ${pid} is not running"
  fi
  rm -f "$pid_file"
}

stop_pid_file "source API" "${LOCAL_PID_DIR}/source-api.pid"
stop_pid_file "source UI" "${LOCAL_PID_DIR}/source-ui.pid"
stop_pid_file "clone API" "${LOCAL_PID_DIR}/clone-api.pid"
stop_pid_file "clone UI" "${LOCAL_PID_DIR}/clone-ui.pid"
