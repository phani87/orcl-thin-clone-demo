import test from "node:test";
import assert from "node:assert/strict";
import { buildRetailData, SCALE_PRESETS, summarizeInventory } from "./generateRetailData.mjs";

test("retail data generation is deterministic", () => {
  const first = buildRetailData({ seed: "same", scale: SCALE_PRESETS.tiny });
  const second = buildRetailData({ seed: "same", scale: SCALE_PRESETS.tiny });
  assert.deepEqual(first.stores.slice(0, 3), second.stores.slice(0, 3));
  assert.deepEqual(first.products.slice(0, 5), second.products.slice(0, 5));
  assert.deepEqual(summarizeInventory(first), summarizeInventory(second));
});

test("generated inventory has sane low-stock signals", () => {
  const data = buildRetailData({ seed: "signals", scale: SCALE_PRESETS.tiny });
  const summary = summarizeInventory(data);
  assert.equal(summary.stores, SCALE_PRESETS.tiny.stores);
  assert.equal(summary.products, SCALE_PRESETS.tiny.products);
  assert.ok(summary.positions > 0);
  assert.ok(summary.criticalPositions + summary.lowPositions + summary.overstockPositions > 0);
});
