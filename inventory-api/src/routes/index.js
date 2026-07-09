import { Router } from "express";

function asyncHandler(handler) {
  return async (request, response, next) => {
    try {
      await handler(request, response, next);
    } catch (error) {
      next(error);
    }
  };
}

function parseLimit(value, fallback = 50, max = 250) {
  const parsed = Number(value || fallback);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
}

export function createRouter({ repository, config }) {
  const router = Router();

  router.get("/health", asyncHandler(async (_request, response) => {
    const health = await repository.health();
    response.json({
      status: "ok",
      appEnv: config.appEnv,
      scenarioLabel: config.scenarioLabel,
      repository: repository.kind,
      ...health
    });
  }));

  router.get("/inventory/summary", asyncHandler(async (_request, response) => {
    response.json(await repository.getInventorySummary());
  }));

  router.get("/stores", asyncHandler(async (request, response) => {
    response.json(await repository.listStores({
      limit: parseLimit(request.query.limit, 50, 500),
      region: request.query.region
    }));
  }));

  router.get("/warehouses", asyncHandler(async (request, response) => {
    response.json(await repository.listWarehouses({
      limit: parseLimit(request.query.limit, 50, 500),
      region: request.query.region
    }));
  }));

  router.post("/stores/demo", asyncHandler(async (request, response) => {
    const store = await repository.addDemoStore(request.body || {});
    response.status(201).json(store);
  }));

  router.post("/catalog/expand", asyncHandler(async (request, response) => {
    const result = await repository.expandCatalog(request.body || {});
    response.status(201).json(result);
  }));

  router.post("/environment/expand", asyncHandler(async (request, response) => {
    const result = await repository.expandEnvironment(request.body || {});
    response.status(201).json(result);
  }));

  router.get("/products", asyncHandler(async (request, response) => {
    response.json(await repository.listProducts({
      limit: parseLimit(request.query.limit, 50, 500),
      search: request.query.search,
      category: request.query.category
    }));
  }));

  router.get("/replenishment/recommendations", asyncHandler(async (request, response) => {
    response.json(await repository.getReplenishmentRecommendations({
      limit: parseLimit(request.query.limit, 40, 250),
      region: request.query.region
    }));
  }));

  router.get("/scenarios", asyncHandler(async (_request, response) => {
    response.json(await repository.listScenarios());
  }));

  router.post("/scenarios", asyncHandler(async (request, response) => {
    const scenario = await repository.createScenario(request.body || {});
    response.status(201).json(scenario);
  }));

  router.post("/scenarios/:id/apply", asyncHandler(async (request, response) => {
    const result = await repository.applyScenario(request.params.id, request.body || {});
    response.json(result);
  }));

  return router;
}
