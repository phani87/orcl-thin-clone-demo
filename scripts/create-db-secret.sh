#!/usr/bin/env bash
source "$(dirname "$0")/lib/common.sh"

require_command kubectl
require_env KUBE_CONTEXT
require_env DB_USER
require_env DB_PASSWORD
require_env DB_CONNECT_STRING

SECRET_NAME="${DB_SECRET_NAME:-inventory-ops-db}"
NAMESPACE="$(namespace)"

log "Creating/updating Kubernetes DB secret ${SECRET_NAME} in ${NAMESPACE} using context ${KUBE_CONTEXT}"
kubectl --context "$KUBE_CONTEXT" create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl --context "$KUBE_CONTEXT" apply -f -

kubectl --context "$KUBE_CONTEXT" -n "$NAMESPACE" create secret generic "$SECRET_NAME" \
  --from-literal=DB_USER="$DB_USER" \
  --from-literal=DB_PASSWORD="$DB_PASSWORD" \
  --from-literal=DB_CONNECT_STRING="$DB_CONNECT_STRING" \
  --dry-run=client -o yaml | kubectl --context "$KUBE_CONTEXT" -n "$NAMESPACE" apply -f -
