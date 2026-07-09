#!/usr/bin/env bash
source "$(dirname "$0")/lib/common.sh"

require_command npm
require_env DB_USER
require_env DB_PASSWORD
require_env DB_CONNECT_STRING

log "Applying Oracle migrations to source PDB"
npm --prefix "$ROOT_DIR" run db:migrate

log "Seeding source PDB with ${SEED_SCALE:-medium} synthetic retail data"
npm --prefix "$ROOT_DIR" run db:seed
