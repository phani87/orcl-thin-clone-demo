#!/usr/bin/env bash
source "$(dirname "$0")/lib/common.sh"

ensure_local_runtime_dirs

report_pid_file() {
  local label="$1"
  local pid_file="$2"
  if [[ ! -f "$pid_file" ]]; then
    printf '%-12s %s\n' "$label" "not-started"
    return
  fi

  local pid
  pid="$(cat "$pid_file")"
  if kill -0 "$pid" >/dev/null 2>&1; then
    printf '%-12s running (pid %s)\n' "$label" "$pid"
  else
    printf '%-12s stale-pid (%s)\n' "$label" "$pid"
  fi
}

report_pid_file "source-api" "${LOCAL_PID_DIR}/source-api.pid"
report_pid_file "source-ui" "${LOCAL_PID_DIR}/source-ui.pid"
report_pid_file "clone-api" "${LOCAL_PID_DIR}/clone-api.pid"
report_pid_file "clone-ui" "${LOCAL_PID_DIR}/clone-ui.pid"
