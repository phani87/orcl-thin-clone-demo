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

const STORE_FORMATS = ["Flagship", "Mall", "Urban", "Outlet", "Neighborhood"];
const CATEGORIES = [
  ["Apparel", ["Outerwear", "Athletic", "Denim", "Workwear", "Footwear"]],
  ["Home", ["Kitchen", "Bath", "Decor", "Storage", "Bedding"]],
  ["Grocery", ["Pantry", "Beverage", "Snacks", "Fresh", "Frozen"]],
  ["Electronics", ["Audio", "Mobile", "Gaming", "Accessories", "Smart Home"]],
  ["Beauty", ["Skin Care", "Hair Care", "Fragrance", "Cosmetics", "Tools"]],
  ["Seasonal", ["Holiday", "Garden", "Outdoor", "Travel", "School"]]
];
const BRANDS = ["Northline", "BrightPeak", "Aster", "UrbanKit", "Fieldstone", "Kindred", "Oracle Ridge", "Cobalt Bay"];

function money(value) {
  return Math.round(value * 100) / 100;
}

function normalizeTarget(targetValue, currentValue) {
  if (targetValue == null || targetValue === "") return currentValue;
  const parsed = Number(targetValue);
  if (!Number.isFinite(parsed) || parsed < currentValue) {
    throw new Error(`Target values must be numeric and greater than or equal to current counts. Current value: ${currentValue}.`);
  }
  return Math.floor(parsed);
}

function regionFor(index) {
  return REGIONS[index % REGIONS.length];
}

function buildStore(storeId, index) {
  const [regionName, city, stateCode] = regionFor(index);
  const storeFormat = STORE_FORMATS[index % STORE_FORMATS.length];
  return {
    storeId,
    storeCode: `STR${String(storeId).padStart(5, "0")}`,
    storeName: `${city} ${storeFormat} Store ${storeId}`,
    regionName,
    city,
    stateCode,
    storeFormat,
    status: index % 19 === 0 ? "REMODEL" : "OPEN"
  };
}

function buildWarehouse(warehouseId, index) {
  const [regionName, city, stateCode] = regionFor(index * 2);
  return {
    warehouseId,
    warehouseCode: `WH${String(warehouseId).padStart(3, "0")}`,
    warehouseName: `${regionName} Fulfillment Hub ${warehouseId}`,
    regionName,
    city,
    stateCode,
    capacityUnits: 650000 + ((index % 18) * 85000),
    status: index % 11 === 0 ? "LIMITED" : "ACTIVE"
  };
}

function buildProduct(productId, index) {
  const [category, subcategories] = CATEGORIES[index % CATEGORIES.length];
  const subcategory = subcategories[index % subcategories.length];
  const brand = BRANDS[index % BRANDS.length];
  const unitCost = money(4.5 + ((index % 220) * 1.37));
  const unitPrice = money(unitCost * (1.34 + ((index % 7) * 0.06)));

  return {
    productId,
    sku: `SKU-${String(productId).padStart(8, "0")}`,
    productName: `${brand} ${subcategory} Item ${productId}`,
    category,
    subcategory,
    brand,
    unitCost,
    unitPrice,
    lifecycleStatus: index % 9 === 0 ? "SEASONAL" : "ACTIVE"
  };
}

function buildPosition(positionId, productId, location, sequence) {
  const reorderPoint = location.locationType === "STORE"
    ? 16 + (sequence % 75)
    : 110 + (sequence % 420);
  const reorderQty = reorderPoint + 36 + (sequence % 180);
  const safetyStock = Math.max(5, Math.floor(reorderPoint * 0.42));
  const onHand = Math.max(0, Math.floor(reorderPoint * (0.55 + ((sequence % 9) * 0.21))));
  const reservedQty = Math.min(onHand, sequence % 7);

  return {
    positionId,
    productId,
    locationType: location.locationType,
    locationId: location.locationId,
    onHand,
    reservedQty,
    reorderPoint,
    reorderQty,
    safetyStock
  };
}

function productRef(product) {
  return {
    productId: product.productId ?? product.product_id
  };
}

function storeRef(store) {
  return {
    storeId: store.storeId ?? store.store_id
  };
}

function warehouseRef(warehouse) {
  return {
    warehouseId: warehouse.warehouseId ?? warehouse.warehouse_id
  };
}

export function buildEnvironmentExpansionPlan({
  currentStoreCount,
  currentWarehouseCount,
  currentProductCount,
  currentPositionCount,
  currentMaxStoreId,
  currentMaxWarehouseId,
  currentMaxProductId,
  currentMaxPositionId,
  targetStores,
  targetWarehouses,
  targetProducts,
  targetPositions,
  existingStores = [],
  existingWarehouses = [],
  existingProducts = [],
  existingPositionKeys = []
}) {
  const desiredStores = normalizeTarget(targetStores, Number(currentStoreCount || 0));
  const desiredWarehouses = normalizeTarget(targetWarehouses, Number(currentWarehouseCount || 0));
  const desiredProducts = normalizeTarget(targetProducts, Number(currentProductCount || 0));
  const desiredPositions = normalizeTarget(targetPositions, Number(currentPositionCount || 0));

  const deltaStores = desiredStores - Number(currentStoreCount || 0);
  const deltaWarehouses = desiredWarehouses - Number(currentWarehouseCount || 0);
  const deltaProducts = desiredProducts - Number(currentProductCount || 0);
  const deltaPositions = desiredPositions - Number(currentPositionCount || 0);

  const nextStoreBase = Number(
    currentMaxStoreId
      ?? existingStores.reduce((max, store) => Math.max(max, Number(storeRef(store).storeId || 0)), 0)
      ?? 0
  );
  const nextWarehouseBase = Number(
    currentMaxWarehouseId
      ?? existingWarehouses.reduce((max, warehouse) => Math.max(max, Number(warehouseRef(warehouse).warehouseId || 0)), 0)
      ?? 0
  );
  const nextProductBase = Number(
    currentMaxProductId
      ?? existingProducts.reduce((max, product) => Math.max(max, Number(productRef(product).productId || 0)), 0)
      ?? 0
  );
  const nextPositionBase = Number(currentMaxPositionId || 0);

  const stores = Array.from({ length: deltaStores }, (_, index) =>
    buildStore(nextStoreBase + index + 1, nextStoreBase + index)
  );
  const warehouses = Array.from({ length: deltaWarehouses }, (_, index) =>
    buildWarehouse(nextWarehouseBase + index + 1, nextWarehouseBase + index)
  );
  const products = Array.from({ length: deltaProducts }, (_, index) =>
    buildProduct(nextProductBase + index + 1, nextProductBase + index)
  );

  const allLocations = [
    ...existingStores.map(storeRef).map((store) => ({ locationType: "STORE", locationId: store.storeId })),
    ...stores.map((store) => ({ locationType: "STORE", locationId: store.storeId })),
    ...existingWarehouses.map(warehouseRef).map((warehouse) => ({ locationType: "WAREHOUSE", locationId: warehouse.warehouseId })),
    ...warehouses.map((warehouse) => ({ locationType: "WAREHOUSE", locationId: warehouse.warehouseId }))
  ];
  const allProducts = [
    ...existingProducts.map(productRef),
    ...products.map(productRef)
  ];

  if (deltaPositions > 0 && (!allLocations.length || !allProducts.length)) {
    throw new Error("Products and locations must exist before positions can be expanded.");
  }

  const occupied = new Set(existingPositionKeys.map((key) => String(key)));
  const maxCapacity = allLocations.length * allProducts.length;
  if (deltaPositions > (maxCapacity - occupied.size)) {
    throw new Error(`Requested ${deltaPositions} new positions, but only ${maxCapacity - occupied.size} unique product/location combinations remain.`);
  }

  const positions = [];
  let attempts = 0;
  let nextPositionId = nextPositionBase + 1;
  const maxAttempts = Math.max(deltaPositions * 20, 1000);

  while (positions.length < deltaPositions) {
    const product = allProducts[(attempts * 17) % allProducts.length];
    const location = allLocations[(attempts * 31) % allLocations.length];
    const key = `${product.productId}:${location.locationType}:${location.locationId}`;

    if (!occupied.has(key)) {
      occupied.add(key);
      positions.push(buildPosition(nextPositionId++, product.productId, location, attempts + 1));
    }

    attempts += 1;
    if (attempts > maxAttempts && positions.length < deltaPositions) {
      throw new Error("Unable to generate the requested number of unique positions.");
    }
  }

  return {
    stores,
    warehouses,
    products,
    positions,
    totals: {
      stores: desiredStores,
      warehouses: desiredWarehouses,
      products: desiredProducts,
      inventoryPositions: desiredPositions
    }
  };
}
