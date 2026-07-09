import { buildRetailData, SCALE_PRESETS, summarizeInventory } from "./generateRetailData.mjs";

const TABLES = [
  "scenario_actions",
  "inventory_scenarios",
  "order_lines",
  "customer_orders",
  "inventory_events",
  "replenishment_rules",
  "inventory_positions",
  "retail_products",
  "retail_warehouses",
  "retail_stores"
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

function scaleFromEnv() {
  const presetName = process.env.SEED_SCALE || "medium";
  const preset = SCALE_PRESETS[presetName];
  if (!preset) {
    throw new Error(`Unknown SEED_SCALE "${presetName}". Use one of: ${Object.keys(SCALE_PRESETS).join(", ")}`);
  }
  return preset;
}

async function executeMany(connection, sql, rows, bindDefs) {
  if (rows.length === 0) return;
  const batchSize = Number(process.env.SEED_BATCH_SIZE || 5000);
  const options = { autoCommit: false };
  if (bindDefs) options.bindDefs = bindDefs;
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    await connection.executeMany(sql, batch, options);
  }
}

async function resetTables(connection) {
  if (process.env.RESET_SCHEMA !== "true") return;
  for (const table of TABLES) {
    try {
      await connection.execute(`truncate table ${table} cascade`);
    } catch (error) {
      if (error.errorNum !== 942) throw error;
    }
  }
}

async function main() {
  const oracleModule = await import("oracledb");
  const oracledb = oracleModule.default ?? oracleModule;
  const connection = await oracledb.getConnection({
    user: requireEnv("DB_USER"),
    password: requireEnv("DB_PASSWORD"),
    connectString: requireEnv("DB_CONNECT_STRING")
  });

  try {
    await resetTables(connection);
    const data = buildRetailData({ seed: process.env.SEED_VALUE || "retail-source", scale: scaleFromEnv() });
    console.log("Generated retail data", summarizeInventory(data));

    await executeMany(
      connection,
      `insert into retail_stores (store_id, store_code, store_name, region_name, city, state_code, store_format, status, opened_on)
       values (:store_id, :store_code, :store_name, :region_name, :city, :state_code, :store_format, :status, :opened_on)`,
      data.stores
    );

    await executeMany(
      connection,
      `insert into retail_warehouses (warehouse_id, warehouse_code, warehouse_name, region_name, city, state_code, capacity_units, status)
       values (:warehouse_id, :warehouse_code, :warehouse_name, :region_name, :city, :state_code, :capacity_units, :status)`,
      data.warehouses
    );

    await executeMany(
      connection,
      `insert into retail_products (product_id, sku, product_name, category, subcategory, brand, unit_cost, unit_price, lifecycle_status)
       values (:product_id, :sku, :product_name, :category, :subcategory, :brand, :unit_cost, :unit_price, :lifecycle_status)`,
      data.products
    );

    await executeMany(
      connection,
      `insert into inventory_positions (position_id, product_id, location_type, location_id, on_hand, reserved_qty, reorder_point, reorder_qty, safety_stock, last_updated)
       values (:position_id, :product_id, :location_type, :location_id, :on_hand, :reserved_qty, :reorder_point, :reorder_qty, :safety_stock, :last_updated)`,
      data.positions
    );

    await executeMany(
      connection,
      `insert into replenishment_rules (rule_id, product_id, store_id, min_on_hand, max_on_hand, reorder_qty, active_flag)
       values (:rule_id, :product_id, :store_id, :min_on_hand, :max_on_hand, :reorder_qty, :active_flag)`,
      data.replenishmentRules
    );

    await executeMany(
      connection,
      `insert into customer_orders (order_id, order_number, store_id, order_status, order_ts, total_amount)
       values (:order_id, :order_number, :store_id, :order_status, :order_ts, :total_amount)`,
      data.orders
    );

    await executeMany(
      connection,
      `insert into order_lines (line_id, order_id, product_id, quantity, unit_price)
       values (:line_id, :order_id, :product_id, :quantity, :unit_price)`,
      data.orderLines
    );

    await executeMany(
      connection,
      `insert into inventory_events (event_id, product_id, location_type, location_id, event_type, quantity_delta, reference_id, scenario_id, event_ts)
       values (:event_id, :product_id, :location_type, :location_id, :event_type, :quantity_delta, :reference_id, :scenario_id, :event_ts)`,
      data.events
    );

    await connection.commit();
    console.log("Retail data seed complete");
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
