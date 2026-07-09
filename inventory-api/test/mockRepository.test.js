import test from "node:test";
import assert from "node:assert/strict";
import { createMockRepository } from "../src/db/mockRepository.js";

test("mock repository scenario changes clone-like data", async () => {
  const repository = createMockRepository({ appEnv: "test", scenarioLabel: "clone-test" });
  const before = await repository.getInventorySummary();
  const result = await repository.applyScenario("tighten-replenishment", { maxActions: 5 });
  const after = await repository.getInventorySummary();

  assert.equal(result.mutatedPositions, 5);
  assert.ok(after.totals.totalOnHand > before.totals.totalOnHand);
  assert.equal((await repository.listScenarios())[0].status, "APPLIED");
});

test("adding a demo store changes only the targeted repository instance", async () => {
  const sourceRepository = createMockRepository({ appEnv: "production-like", scenarioLabel: "source" });
  const cloneRepository = createMockRepository({ appEnv: "thin-clone-test", scenarioLabel: "pdb_retail_clone_1" });

  const sourceBefore = await sourceRepository.getInventorySummary();
  const cloneBefore = await cloneRepository.getInventorySummary();
  const createdStore = await cloneRepository.addDemoStore();
  const sourceAfter = await sourceRepository.getInventorySummary();
  const cloneAfter = await cloneRepository.getInventorySummary();
  const cloneStores = await cloneRepository.listStores({ limit: 5 });

  assert.match(createdStore.storeCode, /^CLN\d+$/);
  assert.equal(sourceAfter.totals.stores, sourceBefore.totals.stores);
  assert.equal(cloneAfter.totals.stores, cloneBefore.totals.stores + 1);
  assert.equal(cloneStores[0].storeCode, createdStore.storeCode);
});
