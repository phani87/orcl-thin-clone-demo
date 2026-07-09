# Database Assets

`migrations/` contains the Oracle schema and inventory health view. `seed/` contains deterministic synthetic retail data generation and an Oracle seeder.

## Run Against Oracle

```bash
export DB_USER=retail_app
export DB_PASSWORD='...'
export DB_CONNECT_STRING='host:1521/RETAILPDB'
export SEED_SCALE=medium
npm --workspace @retail-thin-clone/db-tools run migrate
npm --workspace @retail-thin-clone/db-tools run seed
```

Set `RESET_SCHEMA=true` only when you intentionally want the seeder to truncate demo tables before loading.

## Scales

- `tiny`: local checks and quick samples.
- `medium`: production-like demo default with hundreds of stores, tens of thousands of SKUs, and hundreds of thousands of operational rows.
