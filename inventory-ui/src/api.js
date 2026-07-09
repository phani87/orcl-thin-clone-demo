const runtimeBase = window.__API_BASE_URL__;
const buildBase = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = runtimeBase || buildBase || "/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error?.message || `Request failed: ${response.status}`);
  }

  return response.json();
}

export const inventoryApi = {
  health: () => request("/health"),
  summary: () => request("/inventory/summary"),
  stores: () => request("/stores?limit=12"),
  addDemoStore: (payload = {}) => request("/stores/demo", {
    method: "POST",
    body: JSON.stringify({ requestedBy: "retail-ops-demo", ...payload })
  }),
  expandCatalog: (payload = {}) => request("/catalog/expand", {
    method: "POST",
    body: JSON.stringify({ requestedBy: "retail-ops-demo", ...payload })
  }),
  products: () => request("/products?limit=12"),
  recommendations: () => request("/replenishment/recommendations?limit=12"),
  scenarios: () => request("/scenarios"),
  applyScenario: (id) => request(`/scenarios/${id}/apply`, {
    method: "POST",
    body: JSON.stringify({ maxActions: 12, requestedBy: "retail-ops-demo" })
  })
};
