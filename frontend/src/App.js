import React, { useEffect, useState } from "react";
import "./App.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const HISTORY_POINTS = 28;

const clamp = (value, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const seedHistory = (value) =>
  Array.from({ length: HISTORY_POINTS }, () => value ?? 0);

const mergeHistory = (incoming, current) =>
  incoming.map((metric) => {
    const previous = current.find((m) => m.key === metric.key);
    const history = previous
      ? [...previous.history.slice(-(HISTORY_POINTS - 1)), metric.value]
      : seedHistory(metric.value);
    return { ...metric, history };
  });

function App() {
  const [metrics, setMetrics] = useState([]);
  const [services, setServices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [theme, setTheme] = useState("dark");

  const [systemStats, setSystemStats] = useState([
    { label: "Requests/sec", value: "842", trend: "+12%" },
    { label: "Active Users", value: "1.2k", trend: "+5%" },
    { label: "Response Time", value: "145ms", trend: "-8%" },
    { label: "Success Rate", value: "99.8%", trend: "+0.2%" },
  ]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/metrics`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json();
        if (!alive) return;

        setMetrics((current) =>
          mergeHistory(payload.metrics || [], current).map((metric) => ({
            ...metric,
            history: metric.history.map((point) =>
              clamp(point, metric.unit === "%" ? 0 : 0, 400)
            ),
          }))
        );
        setServices(payload.services || []);
        setAlerts(payload.alerts || []);
        setClusters(payload.clusters || []);
        setRegions(payload.regions || []);
        setUpdatedAt(payload.timestamp || new Date().toISOString());
        setError("");
      } catch (err) {
        setError(err.message || "Unable to fetch metrics");
      } finally {
        setLoading(false);
      }
    };

    load();
    const id = setInterval(load, 10000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className={`app theme-${theme}`}>
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">⚡</div>
          <span className="logo-text">CloudOps</span>
        </div>
        <nav className="nav">
          <button
            className={`nav-item ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <span className="nav-icon">📊</span>
            <span>Overview</span>
          </button>
          <button
            className={`nav-item ${activeTab === "metrics" ? "active" : ""}`}
            onClick={() => setActiveTab("metrics")}
          >
            <span className="nav-icon">📈</span>
            <span>Metrics</span>
          </button>
          <button
            className={`nav-item ${activeTab === "services" ? "active" : ""}`}
            onClick={() => setActiveTab("services")}
          >
            <span className="nav-icon">🔧</span>
            <span>Services</span>
          </button>
          <button
            className={`nav-item ${activeTab === "alerts" ? "active" : ""}`}
            onClick={() => setActiveTab("alerts")}
          >
            <span className="nav-icon">🔔</span>
            <span>Alerts</span>
            {alerts.length > 0 && (
              <span className="nav-badge">{alerts.length}</span>
            )}
          </button>
          <button
            className={`nav-item ${
              activeTab === "infrastructure" ? "active" : ""
            }`}
            onClick={() => setActiveTab("infrastructure")}
          >
            <span className="nav-icon">🏗️</span>
            <span>Infrastructure</span>
          </button>
        </nav>
        <div className="nav-footer">
          <button
            className="theme-toggle"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          >
            <span>{theme === "dark" ? "☀️" : "🌙"}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div>
            <h1 className="title">
              {activeTab === "overview" && "System Overview"}
              {activeTab === "metrics" && "Performance Metrics"}
              {activeTab === "services" && "Service Status"}
              {activeTab === "alerts" && "Alerts & Notifications"}
              {activeTab === "infrastructure" && "Infrastructure"}
            </h1>
            <p className="subtitle">
              Real-time monitoring • Last updated{" "}
              {updatedAt ? new Date(updatedAt).toLocaleTimeString() : "..."}
            </p>
          </div>
          <div className="header-actions">
            <span className="badge badge-live">
              <span className="pulse-dot"></span>
              Live
            </span>
            <span className="badge badge-healthy">
              {loading ? "Loading..." : error ? "Error" : "Healthy"}
            </span>
          </div>
        </header>

        {error && (
          <div className="banner error">
            <span className="banner-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {/* Quick Stats */}
            <section className="stats-grid">
              {systemStats.map((stat, idx) => (
                <div key={idx} className="stat-card">
                  <p className="stat-label">{stat.label}</p>
                  <div className="stat-content">
                    <span className="stat-value">{stat.value}</span>
                    <span
                      className={`stat-trend ${
                        stat.trend.startsWith("+") ? "positive" : "negative"
                      }`}
                    >
                      {stat.trend}
                    </span>
                  </div>
                </div>
              ))}
            </section>

            {/* Metrics Grid */}
            <section className="grid">
              {metrics.map((metric) => (
                <div
                  key={metric.key}
                  className="card"
                  onClick={() =>
                    setSelectedMetric(
                      metric.key === selectedMetric ? null : metric.key
                    )
                  }
                  style={{ cursor: "pointer" }}
                >
                  <div className="card-top">
                    <p className="label">{metric.label}</p>
                    <span
                      className={`chip ${
                        metric.value > 80 && metric.unit === "%"
                          ? "chip-warn"
                          : "chip-ok"
                      }`}
                    >
                      {metric.unit === "ms" ? "Latency" : "Usage"}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="metric-value">{metric.value}</span>
                    <span className="metric-unit">{metric.unit}</span>
                  </div>
                  <div className="spark">
                    {metric.history.map((point, idx) => (
                      <span
                        key={idx}
                        className="spark-bar"
                        style={{ height: `${clamp(point, 5, 100)}%` }}
                      />
                    ))}
                  </div>
                  <div className="progress">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${
                          metric.unit === "ms"
                            ? clamp(metric.value / 4, 0, 100)
                            : clamp(metric.value, 0, 100)
                        }%`,
                      }}
                    />
                  </div>
                  {selectedMetric === metric.key && (
                    <div className="card-expanded">
                      <p className="expanded-detail">
                        Min: {Math.min(...metric.history).toFixed(1)}{" "}
                        {metric.unit}
                      </p>
                      <p className="expanded-detail">
                        Max: {Math.max(...metric.history).toFixed(1)}{" "}
                        {metric.unit}
                      </p>
                      <p className="expanded-detail">
                        Avg:{" "}
                        {(
                          metric.history.reduce((a, b) => a + b, 0) /
                          metric.history.length
                        ).toFixed(1)}{" "}
                        {metric.unit}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </section>

            {/* Services & Alerts */}
            <section className="layout">
              <div className="panel">
                <div className="panel-head">
                  <h3>Service Health</h3>
                  <span className="hint">{services.length} services</span>
                </div>
                <div className="service-list">
                  {services.length === 0 && (
                    <div className="empty-state">No services yet</div>
                  )}
                  {services.map((service) => (
                    <div key={service.name} className="service-row">
                      <div className="service-id">
                        <span className={`dot dot-${service.status}`} />
                        <span>{service.name}</span>
                      </div>
                      <div className="service-meta">
                        <span className="pill">{service.latency} ms</span>
                        <span className={`pill pill-${service.status}`}>
                          {service.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">
                  <h3>Recent Alerts</h3>
                  <span className="hint">{alerts.length} active</span>
                </div>
                <div className="alerts">
                  {alerts.length === 0 && (
                    <div className="empty-state">✅ No active alerts</div>
                  )}
                  {alerts.map((alert, idx) => (
                    <div key={idx} className="alert">
                      <span className={`pill pill-${alert.severity}`}>
                        {alert.severity}
                      </span>
                      <div>
                        <p className="alert-title">{alert.title}</p>
                        <p className="alert-detail">{alert.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {/* Metrics Tab */}
        {activeTab === "metrics" && (
          <section className="grid-large">
            {metrics.map((metric) => (
              <div key={metric.key} className="card card-large">
                <div className="card-top">
                  <p className="label">{metric.label}</p>
                  <span
                    className={`chip ${
                      metric.value > 80 && metric.unit === "%"
                        ? "chip-warn"
                        : "chip-ok"
                    }`}
                  >
                    {metric.value}
                    {metric.unit}
                  </span>
                </div>
                <div className="chart-container">
                  {metric.history.map((point, idx) => (
                    <div
                      key={idx}
                      className="chart-bar"
                      style={{ height: `${clamp(point, 5, 100)}%` }}
                    >
                      <div className="chart-bar-fill"></div>
                    </div>
                  ))}
                </div>
                <div className="metric-stats">
                  <div className="metric-stat">
                    <span className="stat-label">Current</span>
                    <span className="stat-value">
                      {metric.value}
                      {metric.unit}
                    </span>
                  </div>
                  <div className="metric-stat">
                    <span className="stat-label">Avg</span>
                    <span className="stat-value">
                      {(
                        metric.history.reduce((a, b) => a + b, 0) /
                        metric.history.length
                      ).toFixed(1)}
                      {metric.unit}
                    </span>
                  </div>
                  <div className="metric-stat">
                    <span className="stat-label">Peak</span>
                    <span className="stat-value">
                      {Math.max(...metric.history).toFixed(1)}
                      {metric.unit}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Services Tab */}
        {activeTab === "services" && (
          <section className="services-view">
            {services.length === 0 && (
              <div className="empty-state-large">No services available</div>
            )}
            {services.map((service) => (
              <div key={service.name} className="service-card">
                <div className="service-header">
                  <div className="service-title">
                    <span className={`dot dot-${service.status} pulse`} />
                    <h3>{service.name}</h3>
                  </div>
                  <span className={`pill pill-${service.status}`}>
                    {service.status}
                  </span>
                </div>
                <div className="service-metrics">
                  <div className="service-metric">
                    <span className="metric-label">Latency</span>
                    <span className="metric-value">{service.latency}ms</span>
                  </div>
                  <div className="service-metric">
                    <span className="metric-label">Status</span>
                    <span className={`status-${service.status}`}>
                      {service.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Alerts Tab */}
        {activeTab === "alerts" && (
          <section className="alerts-view">
            {alerts.length === 0 && (
              <div className="empty-state-large">✅ No active alerts</div>
            )}
            {alerts.map((alert, idx) => (
              <div key={idx} className="alert-card">
                <div className="alert-header">
                  <span className={`pill pill-${alert.severity}`}>
                    {alert.severity}
                  </span>
                  <span className="alert-time">Just now</span>
                </div>
                <h3 className="alert-title-large">{alert.title}</h3>
                <p className="alert-detail-large">{alert.detail}</p>
                <div className="alert-actions">
                  <button className="btn btn-sm">Acknowledge</button>
                  <button className="btn btn-sm btn-ghost">View Details</button>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Infrastructure Tab */}
        {activeTab === "infrastructure" && (
          <>
            <section className="layout">
              <div className="panel">
                <div className="panel-head">
                  <h3>Clusters</h3>
                  <span className="hint">{clusters.length} active</span>
                </div>
                <div className="cluster-grid">
                  {clusters.length === 0 && (
                    <div className="empty-state">No clusters</div>
                  )}
                  {clusters.map((cluster) => (
                    <div key={cluster.name} className="cluster">
                      <div className="cluster-top">
                        <span className="cluster-name">{cluster.name}</span>
                        <span className="pill">{cluster.nodes} nodes</span>
                      </div>
                      <p className="cluster-sub">{cluster.pods} pods running</p>
                      <div className="progress small">
                        <div
                          className="progress-fill"
                          style={{ width: `${cluster.utilization}%` }}
                        />
                      </div>
                      <p className="cluster-foot">
                        Utilization {cluster.utilization}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">
                  <h3>Traffic by Region</h3>
                  <span className="hint">{regions.length} regions</span>
                </div>
                <div className="region-list">
                  {regions.length === 0 && (
                    <div className="empty-state">No region data</div>
                  )}
                  {regions.map((region) => (
                    <div key={region.name} className="region-row">
                      <span>{region.name}</span>
                      <div className="progress tiny">
                        <div
                          className="progress-fill"
                          style={{ width: `${region.traffic}%` }}
                        />
                      </div>
                      <span className="region-value">{region.traffic}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
