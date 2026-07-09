import {
  Activity,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Factory,
  Gauge,
  Layers,
  PackageSearch,
  Play,
  RefreshCw,
  ServerCog,
  Store,
  TriangleAlert,
  Truck
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { inventoryApi } from "./api.js";

const emptyState = {
  health: null,
  summary: null,
  stores: [],
  warehouses: [],
  products: [],
  recommendations: [],
  scenarios: []
};

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function statusClass(status) {
  return String(status || "").toLowerCase().replaceAll("_", "-");
}

function isCloneEnvironment(health) {
  const label = String(health?.scenarioLabel || "").toLowerCase();
  const appEnv = String(health?.appEnv || "").toLowerCase();
  return label.includes("clone") || appEnv.includes("clone");
}

function Metric({ icon: Icon, label, value, tone }) {
  return (
    <section className={`metric ${tone || ""}`}>
      <div className="metric-icon" aria-hidden="true">
        <Icon size={20} />
      </div>
      <div>
        <p>{label}</p>
        <strong>{formatNumber(value)}</strong>
      </div>
    </section>
  );
}

function StockBars({ stockStatus }) {
  const values = [
    ["Critical", stockStatus?.critical || 0, "critical"],
    ["Low", stockStatus?.low || 0, "low"],
    ["Healthy", stockStatus?.healthy || 0, "healthy"],
    ["Overstock", stockStatus?.overstock || 0, "overstock"]
  ];
  const max = Math.max(...values.map(([, value]) => value), 1);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Stock Health</span>
          <h2>Inventory risk distribution</h2>
        </div>
        <Activity size={20} />
      </div>
      <div className="bar-list">
        {values.map(([label, value, tone]) => (
          <div className="bar-row" key={label}>
            <div className="bar-label">
              <span>{label}</span>
              <strong>{formatNumber(value)}</strong>
            </div>
            <div className="bar-track" aria-label={`${label}: ${value}`}>
              <div className={`bar-fill ${tone}`} style={{ width: `${Math.max(8, (value / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Recommendations({ recommendations }) {
  return (
    <section className="panel queue-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Replenishment</span>
          <h2>Priority queue</h2>
        </div>
        <Truck size={20} />
      </div>
      <div className="queue">
        {recommendations.map((item) => (
          <article className="queue-item" key={`${item.productId}-${item.locationId}`}>
            <div>
              <span className={`pill ${statusClass(item.stockStatus)}`}>{item.stockStatus}</span>
              <h3>{item.productName}</h3>
              <p>{item.sku} · {item.locationCode} · {item.regionName}</p>
            </div>
            <div className="queue-qty">
              <span>Recommended</span>
              <strong>{formatNumber(item.recommendedQty)}</strong>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ScenarioPanel({ scenarios, applying, onApply }) {
  const templates = [
    ["demand-spike-northeast", "Northeast spike", "Demand surge"],
    ["warehouse-outage-midwest", "Warehouse outage", "Fulfillment constraint"],
    ["tighten-replenishment", "Tighten rules", "Low-stock recovery"]
  ];

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Scenario Test</span>
          <h2>Apply scenario</h2>
        </div>
        <ClipboardCheck size={20} />
      </div>
      <div className="scenario-actions">
        {templates.map(([id, label, description]) => (
          <button type="button" className="scenario-button" key={id} onClick={() => onApply(id)} disabled={applying}>
            <Play size={16} aria-hidden="true" />
            <span>{label}</span>
            <small>{description}</small>
          </button>
        ))}
      </div>
      <div className="scenario-log">
        {scenarios.slice(0, 5).map((scenario) => (
          <div className="scenario-row" key={`${scenario.scenarioId}-${scenario.createdAt}`}>
            <span className={`dot ${statusClass(scenario.status)}`} />
            <div>
              <strong>{scenario.scenarioName}</strong>
              <p>{scenario.status} · {scenario.scenarioType}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function EnvironmentScalePanel({ scalingEnvironment, onScaleEnvironment, totals, cloneMode }) {
  const [form, setForm] = useState({
    targetStores: 350,
    targetWarehouses: 100,
    targetProducts: 35000,
    targetPositions: 370000
  });

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    await onScaleEnvironment({
      targetStores: Number(form.targetStores),
      targetWarehouses: Number(form.targetWarehouses),
      targetProducts: Number(form.targetProducts),
      targetPositions: Number(form.targetPositions)
    });
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Environment Scale</span>
          <h2>{cloneMode ? "Scale cloned environment" : "Scale source environment"}</h2>
        </div>
        <Gauge size={20} />
      </div>
      <p className="panel-copy">
        The same capability exists in both deployments. For isolated demo changes, run these updates against the clone environment.
      </p>
      <form className="store-form" onSubmit={submit}>
        <div className="field-grid">
          <label className="field">
            <span>Target stores</span>
            <input className="text-input" type="number" min="1" name="targetStores" value={form.targetStores} onChange={updateField} />
          </label>
          <label className="field">
            <span>Target warehouses</span>
            <input className="text-input" type="number" min="1" name="targetWarehouses" value={form.targetWarehouses} onChange={updateField} />
          </label>
          <label className="field">
            <span>Target products</span>
            <input className="text-input" type="number" min="1" name="targetProducts" value={form.targetProducts} onChange={updateField} />
          </label>
          <label className="field">
            <span>Target positions</span>
            <input className="text-input" type="number" min="1" name="targetPositions" value={form.targetPositions} onChange={updateField} />
          </label>
        </div>
        <div className="growth-stats">
          <div>
            <span>Current stores</span>
            <strong>{formatNumber(totals.stores)}</strong>
          </div>
          <div>
            <span>Current warehouses</span>
            <strong>{formatNumber(totals.warehouses)}</strong>
          </div>
          <div>
            <span>Current products</span>
            <strong>{formatNumber(totals.products)}</strong>
          </div>
          <div>
            <span>Current positions</span>
            <strong>{formatNumber(totals.inventoryPositions)}</strong>
          </div>
        </div>
        <div className="panel-actions">
          <button type="submit" className={`icon-button ${cloneMode ? "clone-action" : ""}`} disabled={scalingEnvironment}>
            <Gauge size={18} aria-hidden="true" />
            <span>{scalingEnvironment ? "Scaling Environment..." : "Apply Growth Targets"}</span>
          </button>
        </div>
      </form>
    </section>
  );
}

function DataTable({ title, icon: Icon, rows, columns }) {
  return (
    <section className="panel table-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Reference</span>
          <h2>{title}</h2>
        </div>
        <Icon size={20} />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => <th key={column.key}>{column.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.storeId || row.productId || row.warehouseId || index}>
                {columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function App() {
  const [state, setState] = useState(emptyState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);
  const [scalingEnvironment, setScalingEnvironment] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [health, summary, stores, warehouses, products, recommendations, scenarios] = await Promise.all([
        inventoryApi.health(),
        inventoryApi.summary(),
        inventoryApi.stores(),
        inventoryApi.warehouses(),
        inventoryApi.products(),
        inventoryApi.recommendations(),
        inventoryApi.scenarios()
      ]);
      setState({ health, summary, stores, warehouses, products, recommendations, scenarios });
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  async function applyScenario(id) {
    setApplying(true);
    setError("");
    setMessage("");
    try {
      const result = await inventoryApi.applyScenario(id);
      setMessage(result.message || "");
      await load();
    } catch (applyError) {
      setError(applyError.message);
    } finally {
      setApplying(false);
    }
  }

  async function scaleEnvironment(payload) {
    setScalingEnvironment(true);
    setError("");
    setMessage("");
    try {
      const result = await inventoryApi.expandEnvironment(payload);
      setMessage(result.message || "Scaled environment");
      await load();
      return true;
    } catch (scaleError) {
      setError(scaleError.message);
      return false;
    } finally {
      setScalingEnvironment(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totals = state.summary?.totals || {};
  const categoryRows = useMemo(() => state.summary?.topCategories || [], [state.summary]);
  const cloneMode = isCloneEnvironment(state.health);
  const environmentLabel = state.health?.scenarioLabel || "local";
  const workspaceEyebrow = cloneMode ? "Clone Inventory Control Center" : "Inventory Control Center";
  const workspaceTitle = cloneMode
    ? "Thin-cloned retail operations for safe scenario testing"
    : "Production-like retail operations, safely cloned for testing";
  const brandSubtitle = cloneMode ? "ExaDB-XS Thin Clone Demo · CLONE" : "ExaDB-XS Thin Clone Demo";

  useEffect(() => {
    document.body.dataset.mode = cloneMode ? "clone" : "source";
    document.title = cloneMode
      ? `Retail Inventory Ops Clone - ${environmentLabel}`
      : `Retail Inventory Ops Source - ${environmentLabel}`;

    return () => {
      delete document.body.dataset.mode;
    };
  }, [cloneMode, environmentLabel]);

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Boxes size={22} /></div>
          <div>
            <strong>Retail Inventory Ops</strong>
            <span>{brandSubtitle}</span>
          </div>
        </div>
        <nav aria-label="Dashboard sections">
          <a href="#overview"><Activity size={18} /> Overview</a>
          <a href="#replenishment"><Truck size={18} /> Replenishment</a>
          <a href="#scenarios"><Layers size={18} /> Scenarios</a>
          <a href="#catalog"><PackageSearch size={18} /> Catalog</a>
        </nav>
        <div className="environment">
          <span className="eyebrow">Environment</span>
          <strong>{environmentLabel}</strong>
          <p>{state.health?.repository || "loading"} backend · {state.health?.appEnv || "demo"}</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">{workspaceEyebrow}</span>
            <div className="title-row">
              <h1>{workspaceTitle}</h1>
              <span className="clone-badge">{cloneMode ? "CLONE" : "PROD-LIKE"}</span>
            </div>
          </div>
          <div className="topbar-actions">
            <button type="button" className="icon-button" onClick={load} disabled={loading || applying || scalingEnvironment} title="Refresh dashboard data">
              <RefreshCw size={18} aria-hidden="true" />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {error && (
          <div className="notice error">
            <TriangleAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="notice success">
            <CheckCircle2 size={18} />
            <span>{message}</span>
          </div>
        )}

        {loading && !state.summary ? (
          <div className="loading"><ServerCog size={28} /> Loading inventory signals</div>
        ) : (
          <>
            <section className="metrics" id="overview">
              <Metric icon={Store} label="Stores" value={totals.stores} tone="teal" />
              <Metric icon={Factory} label="Warehouses" value={totals.warehouses} tone="blue" />
              <Metric icon={PackageSearch} label="Products" value={totals.products} tone="green" />
              <Metric icon={Database} label="Positions" value={totals.inventoryPositions} tone="amber" />
            </section>

            <section className="grid two">
              <StockBars stockStatus={state.summary?.stockStatus} />
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">Mix</span>
                    <h2>Top on-hand categories</h2>
                  </div>
                  <CheckCircle2 size={20} />
                </div>
                <div className="category-list">
                  {categoryRows.map((item) => (
                    <div className="category-row" key={item.category}>
                      <span>{item.category}</span>
                      <strong>{formatNumber(item.onHand)}</strong>
                    </div>
                  ))}
                </div>
              </section>
            </section>

            <section className="grid two" id="replenishment">
              <Recommendations recommendations={state.recommendations} />
              <div className="stack-panels" id="scenarios">
                <EnvironmentScalePanel
                  scalingEnvironment={scalingEnvironment}
                  onScaleEnvironment={scaleEnvironment}
                  totals={totals}
                  cloneMode={cloneMode}
                />
                <ScenarioPanel scenarios={state.scenarios} applying={applying} onApply={applyScenario} />
              </div>
            </section>

            <section className="grid two" id="catalog">
              <DataTable
                title="Stores"
                icon={Store}
                rows={state.stores}
                columns={[
                  { key: "storeCode", label: "Code" },
                  { key: "storeName", label: "Store" },
                  { key: "regionName", label: "Region" },
                  { key: "status", label: "Status", render: (row) => <span className={`pill ${statusClass(row.status)}`}>{row.status}</span> }
                ]}
              />
              <DataTable
                title="Products"
                icon={PackageSearch}
                rows={state.products}
                columns={[
                  { key: "sku", label: "SKU" },
                  { key: "productName", label: "Product" },
                  { key: "category", label: "Category" },
                  { key: "unitPrice", label: "Price", render: (row) => `$${Number(row.unitPrice).toFixed(2)}` }
                ]}
              />
            </section>
          </>
        )}
      </section>
    </main>
  );
}
