#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HELM_CHART="${ROOT_DIR}/k8s/helm/inventory-ops"
GENERATED_DIR="${ROOT_DIR}/generated"
LOCAL_RUNTIME_DIR="${GENERATED_DIR}/local-runtime"
LOCAL_LOG_DIR="${LOCAL_RUNTIME_DIR}/logs"
LOCAL_PID_DIR="${LOCAL_RUNTIME_DIR}/pids"

log() {
  printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"
}

load_dotenv() {
  if [[ -f "${ROOT_DIR}/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "${ROOT_DIR}/.env"
    set +a
  fi
}

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    printf 'Missing required environment variable: %s\n' "$name" >&2
    exit 1
  fi
}

require_command() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$name" >&2
    exit 1
  fi
}

namespace() {
  printf '%s' "${KUBE_NAMESPACE:-retail-inventory}"
}

image_tag() {
  printf '%s' "${IMAGE_TAG:-0.1.0}"
}

api_image() {
  require_env IMAGE_REPO
  printf '%s-api:%s' "$IMAGE_REPO" "$(image_tag)"
}

ui_image() {
  require_env IMAGE_REPO
  printf '%s-ui:%s' "$IMAGE_REPO" "$(image_tag)"
}

clone_connect_string() {
  if [[ -n "${CLONE_DB_CONNECT_STRING:-}" ]]; then
    printf '%s' "$CLONE_DB_CONNECT_STRING"
    return
  fi

  require_env DB_CONNECT_STRING
  require_env CLONE_PDB_NAME

  if [[ "$DB_CONNECT_STRING" == */* ]]; then
    printf '%s/%s' "${DB_CONNECT_STRING%/*}" "$CLONE_PDB_NAME"
    return
  fi

  printf 'CLONE_DB_CONNECT_STRING must be set when DB_CONNECT_STRING is not host:port/service style.\n' >&2
  exit 1
}

json_field() {
  local field="$1"
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const o=JSON.parse(d); const v='${field}'.split('.').reduce((a,k)=>a&&a[k],o); process.stdout.write(String(v ?? ''));});"
}

ensure_local_runtime_dirs() {
  mkdir -p "$GENERATED_DIR" "$LOCAL_RUNTIME_DIR" "$LOCAL_LOG_DIR" "$LOCAL_PID_DIR"
}
