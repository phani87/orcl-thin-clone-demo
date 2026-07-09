#!/usr/bin/env bash
source "$(dirname "$0")/lib/common.sh"

require_command oci
require_env SOURCE_PDB_OCID
require_env TARGET_CDB_OCID
require_env CLONE_PDB_NAME
require_env TDE_WALLET_PASSWORD
require_env PDB_ADMIN_PASSWORD

mkdir -p "$GENERATED_DIR"

OCI_ARGS=(--profile "${OCI_PROFILE:-DEFAULT}")
if [[ -n "${OCI_REGION:-}" ]]; then
  OCI_ARGS+=(--region "$OCI_REGION")
fi
if [[ -n "${CDB_ADMIN_PASSWORD:-}" ]]; then
  CDB_ADMIN_ARGS=(--cdb-admin-password "$CDB_ADMIN_PASSWORD")
else
  CDB_ADMIN_ARGS=()
fi

START_SECONDS="$(date +%s)"
log "Creating thin-cloned PDB ${CLONE_PDB_NAME} from ${SOURCE_PDB_OCID}"
oci db pluggable-database create-local-clone \
  --source-pdb-id "$SOURCE_PDB_OCID" \
  --cdb-id "$TARGET_CDB_OCID" \
  --pdb-name "$CLONE_PDB_NAME" \
  --is-thin-clone true \
  --tde-wallet-password "$TDE_WALLET_PASSWORD" \
  --pdb-admin-password "$PDB_ADMIN_PASSWORD" \
  "${CDB_ADMIN_ARGS[@]}" \
  --wait-for-state AVAILABLE \
  --wait-interval-seconds "${OCI_WAIT_INTERVAL_SECONDS:-30}" \
  --max-wait-seconds "${OCI_MAX_WAIT_SECONDS:-2400}" \
  "${OCI_ARGS[@]}" > "${GENERATED_DIR}/clone-pdb.json"

END_SECONDS="$(date +%s)"
CLONE_PDB_OCID="$(json_field data.id < "${GENERATED_DIR}/clone-pdb.json")"
log "Thin clone available: ${CLONE_PDB_OCID}"
log "Clone duration seconds: $((END_SECONDS - START_SECONDS))"
