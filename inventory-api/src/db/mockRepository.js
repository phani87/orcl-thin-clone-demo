import { buildRetailData, SCALE_PRESETS } from "../../../db/seed/generateRetailData.mjs";
import { buildCatalogExpansionPlan } from "../services/catalogExpansion.js";
import {
  buildScenarioActions,
  rankRecommendations,
  scenarioTemplateFor,
  stockStatus,
  SCENARIO_TEMPLATES
} from "../services/inventorySignals.js";

function locationLookup(data, position) {
  if (position.location_type === "STORE") {
    const store = data.stores.find((item) => item.store_id === position.location_id);
    return {
      locationCode: store?.store_code,
      locationName: store?.store_name,
      regionName: store?.region_name
    };
  }

  const warehouse = data.warehouses.find((item) => item.warehouse_id === position.location_id);
  return {
    locationCode: warehouse?.warehouse_code,
    locationName: warehouse?.warehouse_name,
    regionName: warehouse?.region_name
  };
}

function productLookup(data, productId) {
  return data.products.find((product) => product.product_id === productId);
}

function createDemoStorePayload(payload = {}) {
  const suffix = String(Date.now()).slice(-6);
  return {
    store_code: payload.storeCode || `CLN${suffix}`,
    store_name: payload.storeName || `Demo Showcase Store ${suffix}`,
    region_name: payload.regionName || "Clone Lab",
    city: payload.city || "San Jose",
    state_code: payload.stateCode || "CA",
    store_format: payload.storeFormat || "Urban",
    status: payload.status || "OPEN",
    opened_on: new Date()
  };
}

function toRecommendation(data, position) {
  const product = productLookup(data, position.product_id);
  const location = locationLookup(data, position);
  const recommendedQty = Math.max(0, position.reorder_point + position.reorder_qty - position.on_hand);
  return {
    productId: position.product_id,
    sku: product?.sku,
    productName: product?.product_name,
    category: product?.category,
    locationType: position.location_type,
    locationId: position.location_id,
    ...location,
    onHand: position.on_hand,
    reservedQty: position.reserved_qty,
    reorderPoint: position.reorder_point,
    reorderQty: position.reorder_qty,
    safetyStock: position.safety_stock,
    stockStatus: stockStatus(position),
    recommendedQty
  };
}

export function createMockRepository(config) {
  const data = buildRetailData({
    seed: "api-mock",
    scale: SCALE_PRESETS.tiny
  });
  const scenarios = SCENARIO_TEMPLATES.map((template, index) => ({
    scenarioId: index + 1,
    templateId: template.id,
    scenarioName: template.scenarioName,
    scenarioType: template.scenarioType,
    status: "DRAFT",
    requestedBy: "demo-user",
    createdAt: new Date("2026-06-01T12:00:00.000Z").toISOString(),
    appliedAt: null,
    notes: template.notes
  }));

  return {
    kind: "mock",

    async health() {
      return {
        databaseReachable: false,
        message: "Using deterministic local sample data because DB_CONNECT_STRING is not set"
      };
    },

    async getInventorySummary() {
      const statusCounts = data.positions.reduce((accumulator, position) => {
        const status = stockStatus(position);
        accumulator[status] = (accumulator[status] || 0) + 1;
        return accumulator;
      }, {});
      const totalOnHand = data.positions.reduce((sum, position) => sum + position.on_hand, 0);
      const totalReserved = data.positions.reduce((sum, position) => sum + position.reserved_qty, 0);
      const categoryMap = new Map();

      for (const position of data.positions) {
        const product = productLookup(data, position.product_id);
        categoryMap.set(product.category, (categoryMap.get(product.category) || 0) + position.on_hand);
      }

      return {
        appEnv: config.appEnv,
        scenarioLabel: config.scenarioLabel,
        dataSource: "mock",
        generatedAt: new Date().toISOString(),
        totals: {
          stores: data.stores.length,
          warehouses: data.warehouses.length,
          products: data.products.length,
          inventoryPositions: data.positions.length,
          orders: data.orders.length,
          totalOnHand,
          totalReserved
        },
        stockStatus: {
          critical: statusCounts.CRITICAL || 0,
          low: statusCounts.LOW || 0,
          healthy: statusCounts.HEALTHY || 0,
          overstock: statusCounts.OVERSTOCK || 0
        },
        topCategories: [...categoryMap.entries()]
          .map(([category, onHand]) => ({ category, onHand }))
          .sort((left, right) => right.onHand - left.onHand)
          .slice(0, 6)
      };
    },

    async listStores({ limit, region } = {}) {
      return data.stores
        .filter((store) => !region || store.region_name === region)
        .slice(0, limit || 50)
        .map((store) => ({
          storeId: store.store_id,
          storeCode: store.store_code,
          storeName: store.store_name,
          regionName: store.region_name,
          city: store.city,
          stateCode: store.state_code,
          storeFormat: store.store_format,
          status: store.status
        }));
    },

    async addDemoStore(payload = {}) {
      const store = createDemoStorePayload(payload);
      const storeId = Math.max(...data.stores.map((item) => item.store_id), 0) + 1;
      const inserted = {
        store_id: storeId,
        ...store
      };
      data.stores.unshift(inserted);
      return {
        storeId,
        storeCode: inserted.store_code,
        storeName: inserted.store_name,
        regionName: inserted.region_name,
        city: inserted.city,
        stateCode: inserted.state_code,
        storeFormat: inserted.store_format,
        status: inserted.status,
        message: `Added demo store ${inserted.store_code} in ${config.scenarioLabel}`
      };
    },

    async expandCatalog(payload = {}) {
      const plan = buildCatalogExpansionPlan({
        currentProductCount: data.products.length,
        currentPositionCount: data.positions.length,
        targetProducts: payload.targetProducts,
        targetPositions: payload.targetPositions,
        stores: data.stores,
        warehouses: data.warehouses
      });

      data.products.push(...plan.products.map((product) => ({
        product_id: product.productId,
        sku: product.sku,
        product_name: product.productName,
        category: product.category,
        subcategory: product.subcategory,
        brand: product.brand,
        unit_cost: product.unitCost,
        unit_price: product.unitPrice,
        lifecycle_status: product.lifecycleStatus
      })));

      data.positions.push(...plan.positions.map((position) => ({
        position_id: position.positionId,
        product_id: position.productId,
        location_type: position.locationType,
        location_id: position.locationId,
        on_hand: position.onHand,
        reserved_qty: position.reservedQty,
        reorder_point: position.reorderPoint,
        reorder_qty: position.reorderQty,
        safety_stock: position.safetyStock,
        last_updated: new Date()
      })));

      return {
        addedProducts: plan.products.length,
        addedPositions: plan.positions.length,
        totals: {
          products: data.products.length,
          inventoryPositions: data.positions.length
        },
        message: `Expanded ${config.scenarioLabel} by ${plan.products.length} products and ${plan.positions.length} positions`
      };
    },

    async listProducts({ limit, search, category } = {}) {
      const normalizedSearch = search?.toLowerCase();
      return data.products
        .filter((product) => !category || product.category === category)
        .filter((product) => !normalizedSearch || product.product_name.toLowerCase().includes(normalizedSearch) || product.sku.toLowerCase().includes(normalizedSearch))
        .slice(0, limit || 50)
        .map((product) => ({
          productId: product.product_id,
          sku: product.sku,
          productName: product.product_name,
          category: product.category,
          subcategory: product.subcategory,
          brand: product.brand,
          unitPrice: product.unit_price,
          lifecycleStatus: product.lifecycle_status
        }));
    },

    async getReplenishmentRecommendations({ limit, region } = {}) {
      const recommendations = data.positions
        .filter((position) => position.location_type === "STORE")
        .map((position) => toRecommendation(data, position))
        .filter((item) => !region || item.regionName === region);
      return rankRecommendations(recommendations, limit || 40);
    },

    async listScenarios() {
      return scenarios;
    },

    async createScenario(payload) {
      const template = scenarioTemplateFor(payload.id || `scenario-${scenarios.length + 1}`, payload);
      const scenario = {
        scenarioId: scenarios.length + 1,
        templateId: template.id,
        scenarioName: template.scenarioName,
        scenarioType: template.scenarioType,
        status: "DRAFT",
        requestedBy: payload.requestedBy || "demo-user",
        createdAt: new Date().toISOString(),
        appliedAt: null,
        notes: template.notes
      };
      scenarios.unshift(scenario);
      return scenario;
    },

    async applyScenario(id, payload = {}) {
      const template = scenarioTemplateFor(id, payload);
      const recommendations = await this.getReplenishmentRecommendations({
        limit: Number(payload.maxActions || 25),
        region: template.region
      });
      const actions = buildScenarioActions(recommendations, template, Number(payload.maxActions || 25));
      const now = new Date().toISOString();
      const scenario = {
        scenarioId: scenarios.length + 1,
        templateId: template.id,
        scenarioName: template.scenarioName,
        scenarioType: template.scenarioType,
        status: "APPLIED",
        requestedBy: payload.requestedBy || "demo-user",
        createdAt: now,
        appliedAt: now,
        notes: template.notes
      };

      for (const action of actions) {
        const position = data.positions.find((item) =>
          item.product_id === action.productId &&
          item.location_type === action.locationType &&
          item.location_id === action.locationId
        );
        if (position) {
          position.on_hand += action.quantityDelta;
          position.last_updated = new Date();
        }
      }

      scenarios.unshift(scenario);
      return {
        scenario,
        actions,
        mutatedPositions: actions.length,
        message: `Applied ${actions.length} replenishment actions in ${config.scenarioLabel}`
      };
    }
  };
}
