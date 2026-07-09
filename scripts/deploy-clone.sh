#!/usr/bin/env bash
source "$(dirname "$0")/lib/common.sh"

require_command helm
require_command kubectl
require_env CLONE_KUBE_CONTEXT
require_env DB_USER
require_env DB_PASSWORD
require_env CLONE_PDB_NAME
require_env IMAGE_REPO

export KUBE_CONTEXT="$CLONE_KUBE_CONTEXT"
export DB_CONNECT_STRING="$(clone_connect_string)"
"${ROOT_DIR}/scripts/create-db-secret.sh"

NAMESPACE="$(namespace)"
RELEASE="${CLONE_RELEASE:-retail-clone}"

log "Deploying clone app release ${RELEASE} to ${CLONE_KUBE_CONTEXT}"
helm upgrade --install "$RELEASE" "$HELM_CHART" \
  --kube-context "$CLONE_KUBE_CONTEXT" \
  --namespace "$NAMESPACE" \
  --create-namespace \
  --set environment.appEnv=thin-clone-test \
  --set environment.scenarioLabel="$CLONE_PDB_NAME" \
  --set db.existingSecret="${DB_SECRET_NAME:-inventory-ops-db}" \
  --set api.image.repository="${IMAGE_REPO}-api" \
  --set api.image.tag="$(image_tag)" \
  --set ui.image.repository="${IMAGE_REPO}-ui" \
  --set ui.image.tag="$(image_tag)"

kubectl --context "$CLONE_KUBE_CONTEXT" -n "$NAMESPACE" rollout status "deployment/${RELEASE}-inventory-ops-api" --timeout=180s
kubectl --context "$CLONE_KUBE_CONTEXT" -n "$NAMESPACE" rollout status "deployment/${RELEASE}-inventory-ops-ui" --timeout=180s
