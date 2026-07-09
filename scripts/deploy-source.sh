#!/usr/bin/env bash
source "$(dirname "$0")/lib/common.sh"

require_command helm
require_command kubectl
require_env PROD_KUBE_CONTEXT
require_env DB_USER
require_env DB_PASSWORD
require_env DB_CONNECT_STRING
require_env IMAGE_REPO

export KUBE_CONTEXT="$PROD_KUBE_CONTEXT"
"${ROOT_DIR}/scripts/create-db-secret.sh"

NAMESPACE="$(namespace)"
RELEASE="${SOURCE_RELEASE:-retail-source}"

log "Deploying source app release ${RELEASE} to ${PROD_KUBE_CONTEXT}"
helm upgrade --install "$RELEASE" "$HELM_CHART" \
  --kube-context "$PROD_KUBE_CONTEXT" \
  --namespace "$NAMESPACE" \
  --create-namespace \
  --set environment.appEnv=production-like \
  --set environment.scenarioLabel=source \
  --set db.existingSecret="${DB_SECRET_NAME:-inventory-ops-db}" \
  --set api.image.repository="${IMAGE_REPO}-api" \
  --set api.image.tag="$(image_tag)" \
  --set ui.image.repository="${IMAGE_REPO}-ui" \
  --set ui.image.tag="$(image_tag)"

kubectl --context "$PROD_KUBE_CONTEXT" -n "$NAMESPACE" rollout status "deployment/${RELEASE}-inventory-ops-api" --timeout=180s
kubectl --context "$PROD_KUBE_CONTEXT" -n "$NAMESPACE" rollout status "deployment/${RELEASE}-inventory-ops-ui" --timeout=180s
