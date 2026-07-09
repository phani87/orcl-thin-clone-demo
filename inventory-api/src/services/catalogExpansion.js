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

function categoryFor(index) {
  return CATEGORIES[index % CATEGORIES.length];
}

function brandFor(index) {
  return BRANDS[index % BRANDS.length];
}

function buildProduct(productId, productIndex) {
  const [category, subcategories] = categoryFor(productIndex);
  const subcategory = subcategories[productIndex % subcategories.length];
  const brand = brandFor(productIndex);
  const unitCost = money(4.5 + ((productIndex % 220) * 1.37));
  const unitPrice = money(unitCost * (1.34 + ((productIndex % 7) * 0.06)));

  return {
    productId,
    sku: `SKU-${String(productId).padStart(8, "0")}`,
    productName: `${brand} ${subcategory} Item ${productId}`,
    category,
    subcategory,
    brand,
    unitCost,
    unitPrice,
    lifecycleStatus: productIndex % 9 === 0 ? "SEASONAL" : "ACTIVE"
  };
}

function buildPosition(positionId, product, location, sequence) {
  const reorderPoint = location.locationType === "STORE"
    ? 16 + (sequence % 75)
    : 110 + (sequence % 420);
  const reorderQty = reorderPoint + 36 + (sequence % 180);
  const safetyStock = Math.max(5, Math.floor(reorderPoint * 0.42));
  const onHand = Math.max(0, Math.floor(reorderPoint * (0.55 + ((sequence % 9) * 0.21))));
  const reservedQty = Math.min(onHand, sequence % 7);

  return {
    positionId,
    productId: product.productId,
    locationType: location.locationType,
    locationId: location.locationId,
    onHand,
    reservedQty,
    reorderPoint,
    reorderQty,
    safetyStock
  };
}

export function buildCatalogExpansionPlan({
  currentProductCount,
  currentPositionCount,
  targetProducts,
  targetPositions,
  stores,
  warehouses
}) {
  const desiredProducts = Number(targetProducts || 0);
  const desiredPositions = Number(targetPositions || 0);
  const deltaProducts = desiredProducts - Number(currentProductCount || 0);
  const deltaPositions = desiredPositions - Number(currentPositionCount || 0);

  if (!Number.isFinite(desiredProducts) || !Number.isFinite(desiredPositions)) {
    throw new Error("Target products and target positions must be numeric.");
  }
  if (deltaProducts < 0 || deltaPositions < 0) {
    throw new Error("Catalog expansion only supports increasing totals.");
  }
  if (deltaProducts === 0 && deltaPositions === 0) {
    return { products: [], positions: [] };
  }
  if (deltaPositions > 0 && deltaProducts === 0) {
    throw new Error("This demo expansion flow adds positions only when new products are also created.");
  }

  const locations = [
    ...stores.map((store) => ({ locationType: "STORE", locationId: store.storeId ?? store.store_id })),
    ...warehouses.map((warehouse) => ({ locationType: "WAREHOUSE", locationId: warehouse.warehouseId ?? warehouse.warehouse_id }))
  ].filter((item) => item.locationId != null);

  if (!locations.length) {
    throw new Error("No store or warehouse locations are available for position expansion.");
  }

  const maxPositionsFromNewProducts = deltaProducts * locations.length;
  if (deltaPositions > maxPositionsFromNewProducts) {
    throw new Error(`Requested ${deltaPositions} new positions, but only ${maxPositionsFromNewProducts} unique positions can be created from ${deltaProducts} new products and ${locations.length} locations.`);
  }

  const products = Array.from({ length: deltaProducts }, (_, index) =>
    buildProduct(currentProductCount + index + 1, currentProductCount + index)
  );

  const positions = [];
  const basePositionsPerProduct = deltaProducts ? Math.floor(deltaPositions / deltaProducts) : 0;
  const extraPositions = deltaProducts ? deltaPositions % deltaProducts : 0;
  let nextPositionId = currentPositionCount + 1;

  products.forEach((product, productIndex) => {
    const positionCount = basePositionsPerProduct + (productIndex < extraPositions ? 1 : 0);
    const locationOffset = (productIndex * 13) % locations.length;

    for (let index = 0; index < positionCount; index += 1) {
      const location = locations[(locationOffset + index) % locations.length];
      positions.push(buildPosition(nextPositionId++, product, location, productIndex + index + 1));
    }
  });

  return { products, positions };
}
