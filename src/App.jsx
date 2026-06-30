import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from "recharts";
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from "react-leaflet";
// CircleMarker のみ使用するためデフォルトアイコンの読み込みは不要だが、
// 将来 Marker を使う場合に備えてのメモ:
// import L from "leaflet";
// import icon from "leaflet/dist/images/marker-icon.png";

/**
 * AirHealth 応募用デモ — Air Quality アプリ（3案統合版）
 * -----------------------------------------------------------
 * 案1: Dashboard  — 都市を選んで現在の大気質を表示
 * 案2: Forecast   — 時系列データを折れ線グラフで表示 (Recharts)
 * 案3: Map        — 複数都市の大気質を地図にプロット (Leaflet)
 *
 * データソース: Open-Meteo Air Quality API（無料・認証不要）
 * https://open-meteo.com/en/docs/air-quality-api
 *
 * すべて実APIを叩いて動く完成版。ブラウザから直接 fetch するので、
 * 動かせば本物の大気質データが表示される。
 */

// ---- 対象都市（メルボルン周辺 + 主要都市）----
const CITIES = [
  { id: "melbourne", name: "Melbourne",  lat: -37.8136, lon: 144.9631 },
  { id: "geelong",   name: "Geelong",    lat: -38.1499, lon: 144.3617 },
  { id: "ballarat",  name: "Ballarat",   lat: -37.5622, lon: 143.8503 },
  { id: "bendigo",   name: "Bendigo",    lat: -36.7570, lon: 144.2794 },
  { id: "sydney",    name: "Sydney",     lat: -33.8688, lon: 151.2093 },
  { id: "brisbane",  name: "Brisbane",   lat: -27.4698, lon: 153.0251 },
];

// ---- European AQI のバンド定義（色と健康影響）----
// データの「状態」を色で直感的に伝えるのがこのUIの核
const AQI_BANDS = [
  { max: 20,  label: "Good",            color: "#3b9c6d", text: "#fff" },
  { max: 40,  label: "Fair",            color: "#a3c14a", text: "#1a1a1a" },
  { max: 60,  label: "Moderate",        color: "#f0c419", text: "#1a1a1a" },
  { max: 80,  label: "Poor",            color: "#e8743b", text: "#fff" },
  { max: 100, label: "Very Poor",       color: "#d64545", text: "#fff" },
  { max: Infinity, label: "Extremely Poor", color: "#8b2c4a", text: "#fff" },
];

function bandFor(aqi) {
  if (aqi == null || isNaN(aqi)) return AQI_BANDS[0];
  return AQI_BANDS.find((b) => aqi <= b.max) || AQI_BANDS[AQI_BANDS.length - 1];
}

// ---- API 呼び出し ----
async function fetchAirQuality(city) {
  const params = new URLSearchParams({
    latitude: city.lat,
    longitude: city.lon,
    current: "european_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,ozone,sulphur_dioxide",
    hourly: "pm2_5,pm10,european_aqi",
    timezone: "auto",
    forecast_days: "2",
  });
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// =====================================================================
// 共通UIパーツ
// =====================================================================
function Spinner({ label = "Loading data..." }) {
  return (
    <div style={S.center}>
      <div style={S.spinner} />
      <span style={{ color: "#6b7280", fontSize: 14 }}>{label}</span>
    </div>
  );
}

function ErrorBox({ message, onRetry }) {
  return (
    <div style={S.errorBox}>
      <strong>Couldn't load air quality data.</strong>
      <span style={{ color: "#7f1d1d", fontSize: 14 }}>{message}</span>
      <button style={S.retryBtn} onClick={onRetry}>Try again</button>
    </div>
  );
}

function CitySelect({ value, onChange }) {
  return (
    <select
      value={value.id}
      onChange={(e) => onChange(CITIES.find((c) => c.id === e.target.value))}
      style={S.select}
    >
      {CITIES.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
}

// =====================================================================
// 案1: DASHBOARD
// =====================================================================
function Dashboard() {
  const [city, setCity] = useState(CITIES[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchAirQuality(city)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [city]);

  const current = data?.current;
  const aqi = current?.european_aqi;
  const band = bandFor(aqi);

  const metrics = current
    ? [
        { key: "pm2_5", label: "PM2.5", value: current.pm2_5, unit: "µg/m³" },
        { key: "pm10",  label: "PM10",  value: current.pm10,  unit: "µg/m³" },
        { key: "ozone", label: "Ozone (O₃)", value: current.ozone, unit: "µg/m³" },
        { key: "nitrogen_dioxide", label: "NO₂", value: current.nitrogen_dioxide, unit: "µg/m³" },
        { key: "sulphur_dioxide", label: "SO₂", value: current.sulphur_dioxide, unit: "µg/m³" },
        { key: "carbon_monoxide", label: "CO", value: current.carbon_monoxide, unit: "µg/m³" },
      ]
    : [];

  return (
    <div>
      <div style={S.controlRow}>
        <CitySelect value={city} onChange={setCity} />
        <span style={S.updated}>
          {current ? `Updated ${new Date(current.time).toLocaleString()}` : ""}
        </span>
      </div>

      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={load} />}

      {!loading && !error && current && (
        <>
          {/* AQI ヒーローカード — 状態が色で一目でわかる */}
          <div style={{ ...S.hero, background: band.color, color: band.text }}>
            <div style={S.heroLabel}>European Air Quality Index</div>
            <div style={S.heroValue}>{Math.round(aqi)}</div>
            <div style={S.heroBand}>{band.label}</div>
            <div style={S.heroCity}>{city.name}</div>
          </div>

          {/* 個別の汚染物質 */}
          <div style={S.metricGrid}>
            {metrics.map((m) => (
              <div key={m.key} style={S.metricCard}>
                <div style={S.metricLabel}>{m.label}</div>
                <div style={S.metricValue}>
                  {m.value != null ? m.value.toFixed(1) : "—"}
                  <span style={S.metricUnit}>{m.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// =====================================================================
// 案2: FORECAST (Recharts 折れ線グラフ)
// =====================================================================
function Forecast() {
  const [city, setCity] = useState(CITIES[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchAirQuality(city)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [city]);

  // hourly 配列を Recharts 用に整形
  const chartData = useMemo(() => {
    if (!data?.hourly) return [];
    const { time, pm2_5, pm10 } = data.hourly;
    return time.map((t, i) => ({
      time: new Date(t).toLocaleTimeString([], { hour: "2-digit", hour12: false }),
      fullTime: new Date(t),
      "PM2.5": pm2_5[i],
      "PM10": pm10[i],
    })).filter((_, i) => i % 1 === 0).slice(0, 48); // 48時間分
  }, [data]);

  return (
    <div>
      <div style={S.controlRow}>
        <CitySelect value={city} onChange={setCity} />
        <span style={S.updated}>48-hour forecast · {city.name}</span>
      </div>

      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={load} />}

      {!loading && !error && chartData.length > 0 && (
        <div style={S.chartCard}>
          <h3 style={S.chartTitle}>Particulate matter forecast</h3>
          <p style={S.chartSub}>µg/m³ over the next 48 hours</p>
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={chartData} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="g25" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e8743b" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#e8743b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g10" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f2" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#9ca3af" }} interval={5} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13 }}
              />
              <Area type="monotone" dataKey="PM2.5" stroke="#e8743b" strokeWidth={2} fill="url(#g25)" />
              <Area type="monotone" dataKey="PM10" stroke="#3b82f6" strokeWidth={2} fill="url(#g10)" />
            </AreaChart>
          </ResponsiveContainer>
          <div style={S.legend}>
            <span style={S.legendItem}><i style={{ background: "#e8743b" }} />PM2.5</span>
            <span style={S.legendItem}><i style={{ background: "#3b82f6" }} />PM10</span>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// 案3: MAP (Leaflet)
// =====================================================================
function AirMap() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all(
      CITIES.map((c) =>
        fetchAirQuality(c)
          .then((d) => ({ city: c, aqi: d.current?.european_aqi, pm25: d.current?.pm2_5 }))
          .catch(() => ({ city: c, aqi: null, pm25: null }))
      )
    )
      .then(setResults)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div>
      <div style={S.controlRow}>
        <span style={S.updated}>Live AQI across {CITIES.length} cities</span>
      </div>

      {loading && <Spinner label="Loading all cities..." />}
      {error && <ErrorBox message={error} onRetry={load} />}

      {!loading && !error && (
        <div style={S.mapCard}>
          <MapContainer
            center={[-36.5, 146]}
            zoom={6}
            style={{ height: 420, width: "100%", borderRadius: 12 }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {results.map((r) => {
              const band = bandFor(r.aqi);
              return (
                <CircleMarker
                  key={r.city.id}
                  center={[r.city.lat, r.city.lon]}
                  radius={14}
                  pathOptions={{
                    color: "#fff",
                    weight: 2,
                    fillColor: band.color,
                    fillOpacity: 0.9,
                  }}
                >
                  <LeafletTooltip>
                    <strong>{r.city.name}</strong><br />
                    AQI: {r.aqi != null ? Math.round(r.aqi) : "—"} ({band.label})<br />
                    PM2.5: {r.pm25 != null ? r.pm25.toFixed(1) : "—"} µg/m³
                  </LeafletTooltip>
                </CircleMarker>
              );
            })}
          </MapContainer>

          {/* 凡例 */}
          <div style={S.mapLegend}>
            {AQI_BANDS.slice(0, 5).map((b) => (
              <span key={b.label} style={S.mapLegendItem}>
                <i style={{ background: b.color }} />{b.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// ルート — タブで3案を切り替え
// =====================================================================
const TABS = [
  { id: "dashboard", label: "Dashboard", node: <Dashboard /> },
  { id: "forecast",  label: "Forecast",  node: <Forecast /> },
  { id: "map",       label: "Map",       node: <AirMap /> },
];

export default function App() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div style={S.app}>
      <header style={S.header}>
        <div style={S.logo}>
          <span style={S.logoDot} />
          AirWatch
        </div>
        <span style={S.tagline}>Environmental air quality · Open-Meteo API</span>
      </header>

      <nav style={S.tabBar}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              ...S.tab,
              ...(tab === t.id ? S.tabActive : {}),
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main style={S.main}>
        {TABS.find((t) => t.id === tab)?.node}
      </main>

      <footer style={S.footer}>
        Data: Open-Meteo Air Quality API · Built with React, Recharts & Leaflet
      </footer>
    </div>
  );
}

// =====================================================================
// スタイル
// =====================================================================
const S = {
  app: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    maxWidth: 760,
    margin: "0 auto",
    padding: "0 16px 40px",
    color: "#1a1a1a",
    background: "#fafbfc",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    padding: "24px 0 16px",
  },
  logo: { fontSize: 22, fontWeight: 700, letterSpacing: -0.5, display: "flex", alignItems: "center", gap: 8 },
  logoDot: { width: 12, height: 12, borderRadius: "50%", background: "#3b9c6d", display: "inline-block" },
  tagline: { fontSize: 13, color: "#9ca3af" },
  tabBar: { display: "flex", gap: 4, borderBottom: "1px solid #e5e7eb", marginBottom: 24 },
  tab: {
    padding: "10px 18px",
    border: "none",
    background: "none",
    fontSize: 15,
    fontWeight: 500,
    color: "#6b7280",
    cursor: "pointer",
    borderBottom: "2px solid transparent",
    marginBottom: -1,
  },
  tabActive: { color: "#1a1a1a", borderBottom: "2px solid #3b9c6d" },
  main: { minHeight: 400 },
  controlRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20, flexWrap: "wrap" },
  select: {
    padding: "9px 14px",
    fontSize: 15,
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 500,
  },
  updated: { fontSize: 13, color: "#9ca3af" },
  hero: {
    borderRadius: 16,
    padding: "32px 28px",
    textAlign: "center",
    marginBottom: 20,
    transition: "background 0.4s",
  },
  heroLabel: { fontSize: 13, opacity: 0.85, textTransform: "uppercase", letterSpacing: 1 },
  heroValue: { fontSize: 72, fontWeight: 800, lineHeight: 1, margin: "6px 0" },
  heroBand: { fontSize: 22, fontWeight: 600 },
  heroCity: { fontSize: 14, opacity: 0.85, marginTop: 8 },
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: 12,
  },
  metricCard: {
    background: "#fff",
    border: "1px solid #eef0f2",
    borderRadius: 12,
    padding: "16px 18px",
  },
  metricLabel: { fontSize: 13, color: "#6b7280", marginBottom: 6 },
  metricValue: { fontSize: 26, fontWeight: 700, display: "flex", alignItems: "baseline", gap: 4 },
  metricUnit: { fontSize: 12, fontWeight: 400, color: "#9ca3af" },
  chartCard: { background: "#fff", border: "1px solid #eef0f2", borderRadius: 16, padding: "22px 20px 16px" },
  chartTitle: { margin: 0, fontSize: 17, fontWeight: 700 },
  chartSub: { margin: "2px 0 18px", fontSize: 13, color: "#9ca3af" },
  legend: { display: "flex", gap: 18, justifyContent: "center", marginTop: 8 },
  legendItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6b7280" },
  mapCard: { background: "#fff", border: "1px solid #eef0f2", borderRadius: 16, padding: 16 },
  mapLegend: { display: "flex", gap: 14, flexWrap: "wrap", marginTop: 14, justifyContent: "center" },
  mapLegendItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280" },
  footer: { marginTop: 32, paddingTop: 16, borderTop: "1px solid #eef0f2", fontSize: 12, color: "#9ca3af", textAlign: "center" },
  center: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "60px 0" },
  spinner: {
    width: 32, height: 32, borderRadius: "50%",
    border: "3px solid #e5e7eb", borderTopColor: "#3b9c6d",
    animation: "spin 0.8s linear infinite",
  },
  errorBox: {
    display: "flex", flexDirection: "column", gap: 8,
    background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12,
    padding: 20, color: "#991b1b",
  },
  retryBtn: {
    alignSelf: "flex-start", marginTop: 4, padding: "7px 14px",
    background: "#dc2626", color: "#fff", border: "none", borderRadius: 8,
    cursor: "pointer", fontSize: 14, fontWeight: 500,
  },
};

// スピナーのkeyframesを注入（小さなインラインCSS）
if (typeof document !== "undefined" && !document.getElementById("aq-spin")) {
  const style = document.createElement("style");
  style.id = "aq-spin";
  style.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
  document.head.appendChild(style);
}

// Leaflet のマーカー用CSS（凡例の色ドット）を注入
if (typeof document !== "undefined" && !document.getElementById("aq-legend")) {
  const style = document.createElement("style");
  style.id = "aq-legend";
  style.textContent = `
    [style*="background"] > i { display:inline-block; width:11px; height:11px; border-radius:3px; }
  `;
  document.head.appendChild(style);
}
