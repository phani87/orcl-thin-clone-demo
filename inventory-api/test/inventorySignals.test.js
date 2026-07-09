import test from "node:test";
import assert from "node:assert/strict";
import {
  buildScenarioActions,
  rankRecommendations,
  scenarioTemplateFor,
  stockStatus
} from "../src/services/inventorySignals.js";

test("stock status thresholds are stable", () => {
  assert.equal(stockStatus({ on_hand: 2, safety_stock: 3, reorder_point: 10, reorder_qty: 20 }), "CRITICAL");
  assert.equal(stockStatus({ on_hand: 8, safety_stock: 3, reorder_point: 10, reorder_qty: 20 }), "LOW");
  assert.equal(stockStatus({ on_hand: 35, safety_stock: 3, reorder_point: 10, reorder_qty: 20 }), "OVERSTOCK");
  assert.equal(stockStatus({ on_hand: 18, safety_stock: 3, reorder_point: 10, reorder_qty: 20 }), "HEALTHY");
});

test("recommendations rank critical items before low items", () => {
  const ranked = rankRecommendations([
    { sku: "LOW", stockStatus: "LOW", recommendedQty: 80 },
    { sku: "CRITICAL", stockStatus: "CRITICAL", recommendedQty: 10 },
    { sku: "HEALTHY", stockStatus: "HEALTHY", recommendedQty: 100 }
  ]);
  assert.deepEqual(ranked.map((item) => item.sku), ["CRITICAL", "LOW"]);
});

test("scenario action quantities respect scenario multiplier", () => {
  const template = scenarioTemplateFor("demand-spike-northeast");
  const actions = buildScenarioActions([
    {
      productId: 1,
      sku: "SKU-1",
      productName: "Test",
      locationId: 10,
      locationCode: "STR10",
      recommendedQty: 20,
      stockStatus: "LOW"
    }
  ], template);

  assert.equal(actions[0].quantityDelta, 27);
});
