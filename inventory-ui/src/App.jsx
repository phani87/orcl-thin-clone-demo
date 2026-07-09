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

function CloneStorePanel({ addingStore, onAddStore }) {
  const defaults = {
    storeCode: "",
    storeName: "",
    regionName: "Clone Lab",
    city: "San Jose",
    stateCode: "CA",
    storeFormat: "Urban"
  };
  const [form, setForm] = useState(defaults);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    const created = await onAddStore(form);
    if (created) {
      setForm(defaults);
    }
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Data Change</span>
          <h2>Add store</h2>
        </div>
        <Store size={20} />
      </div>
      <form className="store-form" onSubmit={submit}>
        <div className="field-grid">
          <label className="field">
            <span>Code</span>
            <input className="text-input" name="storeCode" value={form.storeCode} onChange={updateField} placeholder="CLN auto" />
          </label>
          <label className="field">
            <span>Format</span>
            <select className="text-input" name="storeFormat" value={form.storeFormat} onChange={updateField}>
              <option>Urban</option>
              <option>Outlet</option>
              <option>Flagship</option>
              <option>Neighborhood</option>
            </select>
          </label>
          <label className="field field-span-2">
            <span>Name</span>
            <input className="text-input" name="storeName" value={form.storeName} onChange={updateField} placeholder="Demo Showcase Store" />
          </label>
          <label className="field">
            <span>Region</span>
            <input className="text-input" name="regionName" value={form.regionName} onChange={updateField} />
          </label>
          <label className="field">
            <span>City</span>
            <input className="text-input" name="city" value={form.city} onChange={updateField} />
          </label>
          <label className="field">
            <span>State</span>
            <input className="text-input" name="stateCode" value={form.stateCode} onChange={updateField} maxLength={2} />
          </label>
        </div>
        <div className="panel-actions">
          <button type="submit" className="icon-button clone-action" disabled={addingStore}>
            <Store size={18} aria-hidden="true" />
            <span>{addingStore ? "Adding Store..." : "Create Store in Clone"}</span>
          </button>
        </div>
      </form>
    </section>
  );
}

function CloneGrowthPanel({ expandingCatalog, onExpandCatalog, totals }) {
  const [form, setForm] = useState({
    targetProducts: 22000,
    targetPositions: 430000
  });

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    await onExpandCatalog({
      targetProducts: Number(form.targetProducts),
      targetPositions: Number(form.targetPositions)
    });
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Data Change</span>
          <h2>Grow catalog</h2>
        </div>
        <Gauge size={20} />
      </div>
      <p className="panel-copy">
        Expand the active environment from 20,000 products and 300,000 positions to 22,000 products and 430,000 positions.
      </p>
      <form className="store-form" onSubmit={submit}>
        <div className="field-grid">
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
            <span>Current products</span>
            <strong>{formatNumber(totals.products)}</strong>
          </div>
          <div>
            <span>Current positions</span>
            <strong>{formatNumber(totals.inventoryPositions)}</strong>
          </div>
        </div>
        <div className="panel-actions">
          <button type="submit" className="icon-button clone-action" disabled={expandingCatalog}>
            <Gauge size={18} aria-hidden="true" />
            <span>{expandingCatalog ? "Growing Clone..." : "Expand Clone Catalog"}</span>
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
              <tr key={row.storeId || row.productId || index}>
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
  const [addingStore, setAddingStore] = useState(false);
  const [expandingCatalog, setExpandingCatalog] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [health, summary, stores, products, recommendations, scenarios] = await Promise.all([
        inventoryApi.health(),
        inventoryApi.summary(),
        inventoryApi.stores(),
        inventoryApi.products(),
        inventoryApi.recommendations(),
        inventoryApi.scenarios()
      ]);
      setState({ health, summary, stores, products, recommendations, scenarios });
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

  async function addDemoStore(payload) {
    setAddingStore(true);
    setError("");
    setMessage("");
    try {
      const result = await inventoryApi.addDemoStore(payload);
      setMessage(result.message || `Added ${result.storeCode}`);
      await load();
      return true;
    } catch (storeError) {
      setError(storeError.message);
      return false;
    } finally {
      setAddingStore(false);
    }
  }

  async function expandCatalog(payload) {
    setExpandingCatalog(true);
    setError("");
    setMessage("");
    try {
      const result = await inventoryApi.expandCatalog(payload);
      setMessage(result.message || "Expanded clone catalog");
      await load();
      return true;
    } catch (catalogError) {
      setError(catalogError.message);
      return false;
    } finally {
      setExpandingCatalog(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totals = state.summary?.totals || {};
  const categoryRows = useMemo(() => state.summary?.topCategories || [], [state.summary]);
  const environmentLabel = state.health?.scenarioLabel || "local";
  const workspaceEyebrow = "Inventory Control Center";
  const workspaceTitle = "Production-like retail operations, safely cloned for testing";
  const brandSubtitle = "ExaDB-XS Thin Clone Demo";

  useEffect(() => {
    document.title = `Retail Inventory Ops - ${environmentLabel}`;
  }, [environmentLabel]);

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
            </div>
          </div>
          <div className="topbar-actions">
            <button type="button" className="icon-button" onClick={load} disabled={loading || addingStore || expandingCatalog} title="Refresh dashboard data">
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
                <CloneGrowthPanel expandingCatalog={expandingCatalog} onExpandCatalog={expandCatalog} totals={totals} />
                <CloneStorePanel addingStore={addingStore} onAddStore={addDemoStore} />
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
