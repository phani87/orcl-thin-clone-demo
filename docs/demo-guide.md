# Demo Guide

## Prerequisites

- OCI CLI authenticated with permission to manage PDB clones.
- Node.js 20+ for migrations, seeding, and local tests.
- Existing ExaDB-XS VM cluster, CDB, and source PDB reachable from both OKE clusters.
- One Oracle Linux compute VM where both the source app and clone app can run side by side.
- SQL*Plus or another Oracle client you can use to validate DB connectivity if needed.

## Configure

```bash
cp .env.example .env
source .env
```

Set these values for the source database and clone workflow:

```bash
export DB_USER=retail_app
export DB_PASSWORD='...'
export DB_CONNECT_STRING='source-host.example.com:1521/RETAILPDB'
export SOURCE_API_PORT=3000
export SOURCE_UI_PORT=5173
export CLONE_API_PORT=3001
export CLONE_UI_PORT=5174
export SOURCE_PDB_OCID='ocid1.pluggabledatabase...'
export TARGET_CDB_OCID='ocid1.database...'
export CLONE_PDB_NAME='RETAILCLONE'
export TDE_WALLET_PASSWORD='...'
export PDB_ADMIN_PASSWORD='...'
```

If the clone connect string cannot be derived by replacing the service name in `DB_CONNECT_STRING`, set:

```bash
export CLONE_DB_CONNECT_STRING='clone-host.example.com:1521/RETAILCLONE'
```

## Seed The Source PDB

```bash
export SEED_SCALE=tiny
export RESET_SCHEMA=true
./scripts/seed-source.sh
```

Once tiny works, load the production-like demo dataset:

```bash
export SEED_SCALE=medium
export RESET_SCHEMA=true
./scripts/seed-source.sh
```

## Run The Source App

```bash
./scripts/run-source-local.sh
./scripts/status-local.sh
```

Open:

```bash
http://<compute-host>:5173
```

The source API health endpoint is:

```bash
http://<compute-host>:3000/api/health
```

## Create The Thin Clone

```bash
./scripts/clone-pdb.sh
```

If the clone service name is not simply the source host plus `/$CLONE_PDB_NAME`, set `CLONE_DB_CONNECT_STRING` in `.env` before starting the clone app.

## Run The Clone App

```bash
./scripts/run-clone-local.sh
./scripts/status-local.sh
```

Open:

```bash
http://<compute-host>:5174
```

The clone API health endpoint is:

```bash
http://<compute-host>:3001/api/health
```

## Validate Source Vs Clone

```bash
export SOURCE_BASE_URL='http://127.0.0.1:5173'
export CLONE_BASE_URL='http://127.0.0.1:5174'
./scripts/smoke-test.sh
```

Acceptance criteria:

- Source and clone inventory counts match before scenario apply.
- Applying a replenishment scenario changes clone on-hand quantity.
- Source on-hand quantity remains unchanged.
- The clone app shows the scenario in the scenario log.

## Stop The Local Runtime

```bash
./scripts/stop-local.sh
```

## Optional OKE Later

If you later get OCIR and OKE prerequisites sorted out, the repo still includes:

- `infra/oke` for OKE cluster creation
- `k8s/helm/inventory-ops` for app deployment
- `scripts/build-images.sh`, `scripts/deploy-source.sh`, and `scripts/deploy-clone.sh` for the cluster-based path

## Local Development

```bash
npm install
npm test
npm --workspace inventory-api run dev
npm --workspace inventory-ui run dev
```

The API uses mock data until `DB_CONNECT_STRING` is set.
