export const SCALE_PRESETS = {
  tiny: {
    stores: 8,
    warehouses: 2,
    products: 120,
    positions: 900,
    orders: 300,
    events: 1200,
    replenishmentRules: 260
  },
  medium: {
    stores: 250,
    warehouses: 8,
    products: 20000,
    positions: 300000,
    orders: 150000,
    events: 350000,
    replenishmentRules: 75000
  }
};

const REGIONS = [
  ["Northeast", "New York", "NY"],
  ["Mid-Atlantic", "Philadelphia", "PA"],
  ["Southeast", "Atlanta", "GA"],
  ["Midwest", "Chicago", "IL"],
  ["Texas", "Dallas", "TX"],
  ["Mountain", "Denver", "CO"],
  ["Pacific", "Los Angeles", "CA"],
  ["Northwest", "Seattle", "WA"]
];

const FORMATS = ["Flagship", "Mall", "Urban", "Outlet", "Neighborhood"];
const CATEGORIES = [
  ["Apparel", ["Outerwear", "Athletic", "Denim", "Workwear", "Footwear"]],
  ["Home", ["Kitchen", "Bath", "Decor", "Storage", "Bedding"]],
  ["Grocery", ["Pantry", "Beverage", "Snacks", "Fresh", "Frozen"]],
  ["Electronics", ["Audio", "Mobile", "Gaming", "Accessories", "Smart Home"]],
  ["Beauty", ["Skin Care", "Hair Care", "Fragrance", "Cosmetics", "Tools"]],
  ["Seasonal", ["Holiday", "Garden", "Outdoor", "Travel", "School"]]
];
const BRANDS = ["Northline", "BrightPeak", "Aster", "UrbanKit", "Fieldstone", "Kindred", "Oracle Ridge", "Cobalt Bay"];
const EVENT_TYPES = ["SALE", "RETURN", "RECEIPT", "TRANSFER_IN", "TRANSFER_OUT", "ADJUSTMENT"];
const ORDER_STATUSES = ["PLACED", "FULFILLED", "FULFILLED", "FULFILLED", "CANCELLED", "RETURNED"];

function hashSeed(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createRng(seed = "retail-thin-clone") {
  let state = hashSeed(seed);
  return function rng() {
    state += 0x6d2b79f5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

function integer(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function money(value) {
  return Math.round(value * 100) / 100;
}

function daysAgo(rng, maxDays) {
  const date = new Date("2026-06-01T12:00:00.000Z");
  date.setUTCDate(date.getUTCDate() - integer(rng, 0, maxDays));
  date.setUTCHours(integer(rng, 0, 23), integer(rng, 0, 59), integer(rng, 0, 59), 0);
  return date;
}

export function buildRetailData(options = {}) {
  const scale = { ...SCALE_PRESETS.medium, ...options.scale };
  const rng = createRng(options.seed);
  const stores = buildStores(scale.stores, rng);
  const warehouses = buildWarehouses(scale.warehouses, rng);
  const products = buildProducts(scale.products, rng);
  const positions = buildInventoryPositions(scale.positions, { stores, warehouses, products }, rng);
  const replenishmentRules = buildReplenishmentRules(scale.replenishmentRules, { stores, products, positions }, rng);
  const orders = buildOrders(scale.orders, { stores, products }, rng);
  const events = buildInventoryEvents(scale.events, { positions, products }, rng);

  return {
    stores,
    warehouses,
    products,
    positions,
    replenishmentRules,
    orders: orders.orders,
    orderLines: orders.orderLines,
    events
  };
}

export function buildStores(count, rng = createRng()) {
  return Array.from({ length: count }, (_, index) => {
    const [regionName, city, stateCode] = REGIONS[index % REGIONS.length];
    const storeId = index + 1;
    return {
      store_id: storeId,
      store_code: `STR${String(storeId).padStart(5, "0")}`,
      store_name: `${city} ${pick(rng, FORMATS)} Store ${storeId}`,
      region_name: regionName,
      city,
      state_code: stateCode,
      store_format: pick(rng, FORMATS),
      status: rng() < 0.94 ? "OPEN" : "REMODEL",
      opened_on: daysAgo(rng, 4000)
    };
  });
}

export function buildWarehouses(count, rng = createRng()) {
  return Array.from({ length: count }, (_, index) => {
    const [regionName, city, stateCode] = REGIONS[(index * 2) % REGIONS.length];
    const warehouseId = index + 1;
    return {
      warehouse_id: warehouseId,
      warehouse_code: `WH${String(warehouseId).padStart(3, "0")}`,
      warehouse_name: `${regionName} Fulfillment Hub`,
      region_name: regionName,
      city,
      state_code: stateCode,
      capacity_units: integer(rng, 650000, 2400000),
      status: rng() < 0.9 ? "ACTIVE" : "LIMITED"
    };
  });
}

export function buildProducts(count, rng = createRng()) {
  return Array.from({ length: count }, (_, index) => {
    const [category, subcategories] = pick(rng, CATEGORIES);
    const productId = index + 1;
    const unitCost = money(integer(rng, 300, 14000) / 100);
    const markup = 1.25 + rng() * 1.1;
    return {
      product_id: productId,
      sku: `SKU-${String(productId).padStart(8, "0")}`,
      product_name: `${pick(rng, BRANDS)} ${pick(rng, subcategories)} Item ${productId}`,
      category,
      subcategory: pick(rng, subcategories),
      brand: pick(rng, BRANDS),
      unit_cost: unitCost,
      unit_price: money(unitCost * markup),
      lifecycle_status: rng() < 0.78 ? "ACTIVE" : pick(rng, ["SEASONAL", "CLEARANCE"])
    };
  });
}

export function buildInventoryPositions(count, sources, rng = createRng()) {
  const positions = [];
  const seen = new Set();
  const maxCombinations = sources.products.length * (sources.stores.length + sources.warehouses.length);
  const target = Math.min(count, maxCombinations);

  while (positions.length < target) {
    const product = pick(rng, sources.products);
    const locationType = rng() < 0.88 ? "STORE" : "WAREHOUSE";
    const location = locationType === "STORE" ? pick(rng, sources.stores) : pick(rng, sources.warehouses);
    const locationId = locationType === "STORE" ? location.store_id : location.warehouse_id;
    const key = `${product.product_id}:${locationType}:${locationId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const reorderPoint = integer(rng, 8, locationType === "STORE" ? 90 : 550);
    const safetyStock = Math.max(2, Math.floor(reorderPoint * (0.25 + rng() * 0.35)));
    const onHand = Math.max(0, Math.floor(reorderPoint * (0.2 + rng() * 3.1)));

    positions.push({
      position_id: positions.length + 1,
      product_id: product.product_id,
      location_type: locationType,
      location_id: locationId,
      on_hand: onHand,
      reserved_qty: integer(rng, 0, Math.max(1, Math.floor(onHand * 0.22))),
      reorder_point: reorderPoint,
      reorder_qty: integer(rng, reorderPoint, reorderPoint * 4),
      safety_stock: safetyStock,
      last_updated: daysAgo(rng, 21)
    });
  }

  return positions;
}

export function buildReplenishmentRules(count, sources, rng = createRng()) {
  const rules = [];
  const seen = new Set();
  const storePositions = sources.positions.filter((position) => position.location_type === "STORE");

  while (rules.length < Math.min(count, storePositions.length)) {
    const position = pick(rng, storePositions);
    const key = `${position.product_id}:${position.location_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rules.push({
      rule_id: rules.length + 1,
      product_id: position.product_id,
      store_id: position.location_id,
      min_on_hand: position.reorder_point,
      max_on_hand: position.reorder_point + position.reorder_qty,
      reorder_qty: position.reorder_qty,
      active_flag: rng() < 0.96 ? "Y" : "N"
    });
  }

  return rules;
}

export function buildOrders(count, sources, rng = createRng()) {
  const orders = [];
  const orderLines = [];
  let nextLineId = 1;

  for (let index = 0; index < count; index += 1) {
    const orderId = index + 1;
    const lineCount = integer(rng, 1, 4);
    let total = 0;
    const lineProducts = Array.from({ length: lineCount }, () => pick(rng, sources.products));
    const lines = lineProducts.map((product) => {
      const quantity = integer(rng, 1, 3);
      total += product.unit_price * quantity;
      return {
        line_id: nextLineId++,
        order_id: orderId,
        product_id: product.product_id,
        quantity,
        unit_price: product.unit_price
      };
    });

    orders.push({
      order_id: orderId,
      order_number: `ORD-${String(orderId).padStart(10, "0")}`,
      store_id: pick(rng, sources.stores).store_id,
      order_status: pick(rng, ORDER_STATUSES),
      order_ts: daysAgo(rng, 120),
      total_amount: money(total)
    });
    orderLines.push(...lines);
  }

  return { orders, orderLines };
}

export function buildInventoryEvents(count, sources, rng = createRng()) {
  return Array.from({ length: count }, (_, index) => {
    const position = pick(rng, sources.positions);
    const eventType = pick(rng, EVENT_TYPES);
    const direction = eventType === "SALE" || eventType === "TRANSFER_OUT" ? -1 : 1;
    return {
      event_id: index + 1,
      product_id: position.product_id,
      location_type: position.location_type,
      location_id: position.location_id,
      event_type: eventType,
      quantity_delta: direction * integer(rng, 1, eventType === "RECEIPT" ? 150 : 18),
      reference_id: `${eventType}-${String(index + 1).padStart(9, "0")}`,
      scenario_id: null,
      event_ts: daysAgo(rng, 120)
    };
  });
}

export function summarizeInventory(data) {
  const summary = {
    stores: data.stores.length,
    warehouses: data.warehouses.length,
    products: data.products.length,
    positions: data.positions.length,
    orders: data.orders.length,
    orderLines: data.orderLines.length,
    events: data.events.length,
    replenishmentRules: data.replenishmentRules.length,
    criticalPositions: 0,
    lowPositions: 0,
    overstockPositions: 0
  };

  for (const position of data.positions) {
    if (position.on_hand <= position.safety_stock) summary.criticalPositions += 1;
    else if (position.on_hand <= position.reorder_point) summary.lowPositions += 1;
    else if (position.on_hand >= position.reorder_point + position.reorder_qty) summary.overstockPositions += 1;
  }

  return summary;
}
