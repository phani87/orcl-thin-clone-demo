export const SCENARIO_TEMPLATES = [
  {
    id: "demand-spike-northeast",
    scenarioName: "Northeast demand spike",
    scenarioType: "DEMAND_SPIKE",
    region: "Northeast",
    quantityMultiplier: 1.35,
    notes: "Simulates a regional demand surge and pulls forward replenishment for low-stock stores."
  },
  {
    id: "warehouse-outage-midwest",
    scenarioName: "Midwest warehouse outage",
    scenarioType: "WAREHOUSE_OUTAGE",
    region: "Midwest",
    quantityMultiplier: 1.15,
    notes: "Tests store recovery when a fulfillment hub is constrained."
  },
  {
    id: "tighten-replenishment",
    scenarioName: "Tighten replenishment rules",
    scenarioType: "REPLENISHMENT_RULE",
    region: null,
    quantityMultiplier: 1,
    notes: "Applies recommended replenishment actions for the most urgent low-stock positions."
  }
];

export function stockStatus(position) {
  if (position.on_hand <= position.safety_stock) return "CRITICAL";
  if (position.on_hand <= position.reorder_point) return "LOW";
  if (position.on_hand >= position.reorder_point + position.reorder_qty) return "OVERSTOCK";
  return "HEALTHY";
}

export function stockPriority(status) {
  return {
    CRITICAL: 1,
    LOW: 2,
    HEALTHY: 3,
    OVERSTOCK: 4
  }[status] || 9;
}

export function rankRecommendations(items, limit = 40) {
  return [...items]
    .filter((item) => item.stockStatus === "CRITICAL" || item.stockStatus === "LOW")
    .sort((left, right) => {
      const priorityDiff = stockPriority(left.stockStatus) - stockPriority(right.stockStatus);
      if (priorityDiff) return priorityDiff;
      return right.recommendedQty - left.recommendedQty;
    })
    .slice(0, limit);
}

export function scenarioTemplateFor(id, fallbackPayload = {}) {
  const template = SCENARIO_TEMPLATES.find((scenario) => scenario.id === id);
  if (template) return { ...template, ...fallbackPayload };

  return {
    id,
    scenarioName: fallbackPayload.scenarioName || `Ad hoc scenario ${id}`,
    scenarioType: fallbackPayload.scenarioType || "STORE_TRANSFER",
    region: fallbackPayload.region || null,
    quantityMultiplier: Number(fallbackPayload.quantityMultiplier || 1),
    notes: fallbackPayload.notes || "Ad hoc inventory scenario"
  };
}

export function buildScenarioActions(recommendations, scenario, maxActions = 25) {
  const multiplier = Number(scenario.quantityMultiplier || 1);
  return recommendations.slice(0, maxActions).map((item) => ({
    actionType: "REPLENISHMENT",
    productId: item.productId,
    sku: item.sku,
    productName: item.productName,
    locationType: "STORE",
    locationId: item.locationId,
    locationCode: item.locationCode,
    quantityDelta: Math.max(1, Math.round(item.recommendedQty * multiplier)),
    reason: `${item.stockStatus} stock at ${item.locationCode}`
  }));
}
