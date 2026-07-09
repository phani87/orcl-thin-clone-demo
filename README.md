# Retail Inventory Ops Thin-Clone Demo

This repository contains a retail inventory operations application designed to demonstrate how a cloud-native application can run with Oracle Exadata Database Service on Exascale Infrastructure as the persistent backend, while using Oracle thin-cloned pluggable databases to create production-like development and test environments.

The demo models a common retail workflow:

- a source application runs against a seeded source PDB
- a second deployment of the exact same application runs against a thin-cloned PDB
- teams can test replenishment changes, stock corrections, store edits, and catalog growth in the clone without changing the source environment

The application stack is:

- `inventory-ui`: React + Vite frontend
- `inventory-api`: Node.js + Express API
- `db`: Oracle schema, migrations, and synthetic data seeding tools
- `scripts`: local runtime, seed, clone, smoke-test, and deployment helpers
- `k8s/helm/inventory-ops`: Helm chart for Kubernetes deployment
- `infra/oke`: Terraform for an optional Oracle Kubernetes Engine path

## Why this demo exists

Kubernetes has made it straightforward to spin up application environments quickly. The harder problem is usually the persistent backend. Teams often want production-like data and isolated environments, but full database copies are slower and heavier than the app tier.

This demo shows a cleaner pattern:

1. seed a source Oracle PDB with realistic retail data
2. deploy the application against that source database
3. create a thin-cloned PDB using OCI CLI
4. start a second copy of the same app against the clone
5. make changes in the clone and verify that the source remains unchanged

That makes this a development and testing workflow, not a DR workflow.

## Application overview

The app focuses on retail inventory operations. It exposes a dashboard for inventory health, replenishment recommendations, scenario testing, products, stores, and environment scaling. The same UI and API are deployed for both the source and clone environments. The only difference between those deployments is configuration: each points to a different pluggable database. The UI still makes the distinction visible with environment labeling and clone-specific visual cues.

Core API endpoints include:

- `GET /api/health`
- `GET /api/inventory/summary`
- `GET /api/stores`
- `GET /api/warehouses`
- `POST /api/stores/demo`
- `POST /api/environment/expand`
- `GET /api/products`
- `GET /api/replenishment/recommendations`
- `GET /api/scenarios`
- `POST /api/scenarios`
- `POST /api/scenarios/:id/apply`

## Data model

The schema is intentionally shaped like a small but realistic retail operations system.

### Core entities

- `retail_stores`: store master data such as store code, name, format, region, city, and state
- `retail_warehouses`: warehouse master data and regional supply nodes
- `retail_products`: product catalog with category, subcategory, brand, lifecycle status, and price
- `inventory_positions`: current on-hand and reserved inventory by location and product
- `replenishment_rules`: target stocking logic such as reorder points, reorder quantity, and safety stock
- `customer_orders`: order headers tied to stores and fulfillment flow
- `order_lines`: order-level SKU demand
- `inventory_events`: operational inventory mutations and movement history
- `scenarios` and related actions: testable scenario changes applied in the clone

### What the app computes

The dashboard uses the schema and the inventory health view to classify positions into states such as:

- `CRITICAL`
- `LOW`
- `HEALTHY`
- `OVERSTOCK`

This gives the UI enough realism to show stock distribution, top categories, replenishment queues, and scenario-driven changes.

## Repository layout

```text
inventory-api/      Node.js API
inventory-ui/       React UI
db/                 Oracle schema, migrations, seed tools
scripts/            Seed, clone, local runtime, smoke tests
k8s/helm/           Helm chart for app deployment
infra/oke/          Optional Terraform for OKE
docs/               Architecture and demo guide
sql/                Safe admin SQL helpers for setup
```

## Prerequisites

### For the recommended compute VM demo path

- Oracle Linux compute VM
- Node.js 20+
- npm
- OCI CLI configured with a profile that can create local PDB clones
- SQL*Plus or another Oracle client for validation
- a reachable ExaDB-XS source PDB and target CDB

### For the optional Kubernetes path

- `kubectl`
- `helm`
- `terraform`
- access to Oracle Kubernetes Engine and an image registry

## Configuration

Copy the safe environment template:

```bash
cp .env.example .env
```

Then edit `.env` and set values for:

- source database credentials
- source connect string
- clone PDB OCIDs and naming
- OCI region and profile
- optional clone connect string override

The public `.env.example` intentionally contains placeholders only.

## Database setup

Use the helper SQL in [sql/retail_app_setup.sql](sql/retail_app_setup.sql) as a starting point for creating the `retail_app` user and grants in your source PDB.

You should run that script as an administrative user after replacing placeholder values with your own secure password and correct PDB names.

## Seed the source PDB

Once your `.env` is configured:

```bash
set -a
source .env
set +a
```

Load a small validation dataset first:

```bash
export SEED_SCALE=tiny
export RESET_SCHEMA=true
./scripts/seed-source.sh
```

Then load the medium production-like demo dataset:

```bash
export SEED_SCALE=medium
export RESET_SCHEMA=true
./scripts/seed-source.sh
```

## Run the source application locally

Install dependencies:

```bash
npm install
```

Start the source environment:

```bash
./scripts/run-source-local.sh
./scripts/status-local.sh
```

By default:

- source API: `http://127.0.0.1:3000`
- source UI: `http://127.0.0.1:5173`

If you open the UI from another machine, use the compute host IP or hostname instead of `127.0.0.1`.

## Create the thin-cloned PDB

The clone script uses OCI CLI `create-local-clone` with thin cloning enabled.

Run:

```bash
./scripts/clone-pdb.sh
```

The script expects:

- `SOURCE_PDB_OCID`
- `TARGET_CDB_OCID`
- `CLONE_PDB_NAME`
- `TDE_WALLET_PASSWORD`
- `PDB_ADMIN_PASSWORD`

If the clone service name cannot be inferred from the source connect string, set:

```bash
export CLONE_DB_CONNECT_STRING='clone-host.example.com:1521/CLONE_SERVICE_NAME'
```

## Run the clone application locally

After the clone is available:

```bash
./scripts/run-clone-local.sh
./scripts/status-local.sh
```

By default:

- clone API: `http://127.0.0.1:3001`
- clone UI: `http://127.0.0.1:5174`

## Validate source versus clone

Use the built-in smoke test:

```bash
export SOURCE_BASE_URL='http://127.0.0.1:5173'
export CLONE_BASE_URL='http://127.0.0.1:5174'
./scripts/smoke-test.sh
```

The expected result is:

- source and clone start from the same production-like data shape
- a scenario applied in the clone mutates clone data only
- the source application remains unchanged

## Interactive demo changes

The application includes interactive controls for:

- scaling stores, warehouses, products, and positions
- applying scenario mutations

For isolated testing, point those actions at the clone deployment.

### Scale the clone to 350 stores

```bash
curl -X POST http://127.0.0.1:3001/api/environment/expand \
  -H "Content-Type: application/json" \
  -d '{
    "targetStores": 350,
    "requestedBy": "retail-ops-demo"
  }'
```

### Scale the clone to 100 warehouses

```bash
curl -X POST http://127.0.0.1:3001/api/environment/expand \
  -H "Content-Type: application/json" \
  -d '{
    "targetWarehouses": 100,
    "requestedBy": "retail-ops-demo"
  }'
```

### Scale the clone to 35,000 products

```bash
curl -X POST http://127.0.0.1:3001/api/environment/expand \
  -H "Content-Type: application/json" \
  -d '{
    "targetProducts": 35000,
    "requestedBy": "retail-ops-demo"
  }'
```

### Scale the clone to 370,000 positions

```bash
curl -X POST http://127.0.0.1:3001/api/environment/expand \
  -H "Content-Type: application/json" \
  -d '{
    "targetPositions": 370000,
    "requestedBy": "retail-ops-demo"
  }'
```

### Run the bundled clone expansion script

```bash
./scripts/expand-clone-data.sh
```

You can verify the new totals with:

```bash
curl http://127.0.0.1:3001/api/inventory/summary
curl http://127.0.0.1:3000/api/inventory/summary
```

The clone should show the larger counts. The source should remain unchanged.

## Package this repo for a VM handoff

If you want to move this demo to another Oracle Linux VM as a single artifact:

```bash
cd ..
zip -r retail-inventory-ops-thin-clone-demo.zip retail-inventory-ops-thin-clone-demo
```

Copy that zip to the target VM, unzip it, then follow the deploy steps in the next section.

## Deploy on the VM

On the target Oracle Linux VM:

```bash
unzip retail-inventory-ops-thin-clone-demo.zip
cd retail-inventory-ops-thin-clone-demo
cp .env.example .env
vi .env
set -a
source .env
set +a
npm install
export SEED_SCALE=medium
export RESET_SCHEMA=true
./scripts/seed-source.sh
./scripts/run-source-local.sh
./scripts/clone-pdb.sh
./scripts/run-clone-local.sh
./scripts/status-local.sh
```

Then validate:

```bash
curl http://127.0.0.1:3000/api/health
curl http://127.0.0.1:3001/api/health
curl http://127.0.0.1:3000/api/inventory/summary
curl http://127.0.0.1:3001/api/inventory/summary
```

Recommended browser targets:

- source UI: `http://<vm-host>:5173`
- clone UI: `http://<vm-host>:5174`

## Optional Kubernetes deployment path

This repository also includes a Kubernetes-oriented path for later expansion.

### Build images

```bash
./scripts/build-images.sh
```

### Deploy with Helm

Use the chart in `k8s/helm/inventory-ops` together with your database secret values and image repository.

You can render the manifests locally with:

```bash
npm run helm:template
```

### Provision OKE

The `infra/oke` folder contains Terraform for a two-cluster OKE pattern. Start from:

```bash
cp infra/oke/terraform.tfvars.example infra/oke/terraform.tfvars
terraform -chdir=infra/oke init
terraform -chdir=infra/oke plan
```

## Local development

Run the API and UI directly:

```bash
npm run dev:api
npm run dev:ui
```

If `DB_CONNECT_STRING` is not set, the API serves deterministic mock data so the frontend still works locally.

## Redeploy after code changes

If you update the repo and want to refresh the local compute VM demo:

### 1. Pull the latest code

```bash
git pull origin main
```

### 2. Reinstall dependencies if package files changed

```bash
npm install
```

### 3. Stop any running source or clone processes

```bash
./scripts/stop-local.sh
```

### 4. Start the source app again

```bash
./scripts/run-source-local.sh
```

### 5. Start the clone app again

```bash
./scripts/run-clone-local.sh
```

### 6. Check runtime status

```bash
./scripts/status-local.sh
```

### 7. Verify both APIs

```bash
curl http://127.0.0.1:3000/api/health
curl http://127.0.0.1:3001/api/health
```

If you changed the database seed logic and want a fresh data baseline, reseed the source PDB and create a fresh thin clone before restarting the clone app.

## Public repo safety notes

This GitHub-ready copy does not include:

- live passwords
- real IP addresses
- real hostnames
- wallet passwords
- real OCIDs beyond placeholder examples
- private `.env` values

Before publishing, do one more quick check that you have not added a real `.env`, wallet directory, or generated output.

## References

- ExaDB-XS overview: https://docs.oracle.com/en-us/iaas/exadb-xs/doc/overview-exadb-xs-service.html
- ExaDB-XS database management and PDB clone operations: https://docs.oracle.com/en-us/iaas/exadb-xs/doc/manage-databases-exadb-xs.html
- OCI CLI local PDB thin clone: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/db/pluggable-database/create-local-clone.html
- Oracle Database for Containers and Kubernetes: https://www.oracle.com/database/kubernetes-for-container-database/
