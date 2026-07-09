# Architecture

## Runtime Shape

```text
OKE Cluster A                         ExaDB-XS
  UI Service  ---- /api ---- API  ---> Source PDB
                                      retail_app schema

OKE Cluster B                         ExaDB-XS
  UI Service  ---- /api ---- API  ---> Thin-cloned PDB
                                      same schema, independent writes
```

The database stays outside Kubernetes. Kubernetes owns the application runtime, rollout, service exposure, and DB connection secrets. ExaDB-XS owns the source PDB and the thin-cloned PDB.

## Demo Narrative

Retail operations teams often need production-like inventory data to test replenishment rules, warehouse constraints, and regional demand spikes. Copying the full database is slow, expensive, and risky. This demo shows a faster path:

1. Seed a source PDB with synthetic production-like retail data.
2. Deploy the app to OKE Cluster A.
3. Create a thin-cloned PDB.
4. Deploy the same app to OKE Cluster B.
5. Apply an inventory scenario in Cluster B.
6. Confirm source data in Cluster A is unchanged.

## Data Model

The core schema covers stores, warehouses, products, inventory positions, inventory events, orders, order lines, replenishment rules, scenarios, and scenario actions. The app reads from `v_inventory_health` to classify each position as `CRITICAL`, `LOW`, `HEALTHY`, or `OVERSTOCK`.

## Interfaces

API endpoints:

- `GET /api/health`
- `GET /api/inventory/summary`
- `GET /api/stores`
- `GET /api/products`
- `GET /api/replenishment/recommendations`
- `GET /api/scenarios`
- `POST /api/scenarios`
- `POST /api/scenarios/:id/apply`

Runtime env vars:

- `DB_USER`
- `DB_PASSWORD`
- `DB_CONNECT_STRING`
- `TNS_ADMIN`
- `APP_ENV`
- `SCENARIO_LABEL`

Pipeline env vars:

- `OCI_PROFILE`
- `OCI_REGION`
- `SOURCE_PDB_OCID`
- `TARGET_CDB_OCID`
- `CLONE_PDB_NAME`
- `TDE_WALLET_PASSWORD`
- `PDB_ADMIN_PASSWORD`
- `PROD_KUBE_CONTEXT`
- `CLONE_KUBE_CONTEXT`
- `IMAGE_REPO`
