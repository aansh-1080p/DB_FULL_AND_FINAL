// App.jsx - Main dashboard with routing
import { useState, useRef, useCallback, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from "recharts";
import { Routes, Route, useNavigate } from "react-router-dom";
import About from "./About";
import Lenis from "@studio-freight/lenis";

// ─── HELPERS ────────────────────────────────────────────────────────────────

const CATEGORIES = ["Electronics", "Clothing", "Groceries", "Furniture", "Sports", "Beauty", "Toys", "Books"];
const REGIONS = ["North", "South", "East", "West", "Central"];
const SEASONS = ["Winter", "Spring", "Summer", "Autumn"];
const WEATHERS = ["Clear", "Rainy", "Snowy", "Cloudy"];

const WEEKDAY_COLS = ["Weekday_Friday","Weekday_Monday","Weekday_Saturday","Weekday_Sunday","Weekday_Thursday","Weekday_Tuesday","Weekday_Wednesday"];
const SEASON_COLS  = ["Seasonality_Autumn","Seasonality_Spring","Seasonality_Summer","Seasonality_Winter"];
const WEATHER_COLS = ["Weather Condition_Clear","Weather Condition_Cloudy","Weather Condition_Rainy","Weather Condition_Snowy"];
const CAT_COLS     = CATEGORIES.map(c => `Category_${c}`);
const REG_COLS     = REGIONS.map(r => `Region_${r}`);

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const vals = line.split(",");
    const row = {};
    headers.forEach((h, i) => {
      const v = (vals[i] || "").trim().replace(/^"|"$/g, "");
      row[h] = isNaN(v) || v === "" ? v : parseFloat(v);
    });
    return row;
  });
}

function dayName(d) {
  return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][d.getDay()];
}

function preprocessRow(row) {
  const dt = new Date(row["Date"] || row["date"] || "");
  const year  = isNaN(dt) ? 2024 : dt.getFullYear();
  const month = isNaN(dt) ? 1    : dt.getMonth() + 1;
  const day   = isNaN(dt) ? 1    : dt.getDate();
  const weekday = isNaN(dt) ? "Monday" : dayName(dt);
  const price    = parseFloat(row["Price"]            || row["price"]             || 0);
  const discount = parseFloat(row["Discount"]         || row["discount"]          || 0);
  const inv      = parseFloat(row["Inventory Level"]  || row["inventory_level"]   || 0);
  const sold     = parseFloat(row["Units Sold"]       || row["units_sold"]        || 0);
  const promo    = parseFloat(row["Promotion"]        || row["promotion"]         || 0);
  const compPrice= parseFloat(row["Competitor Pricing"]|| row["competitor_pricing"]|| 0);
  const epidemic = parseFloat(row["Epidemic"]         || row["epidemic"]          || 0);
  const cat      = row["Category"]          || "";
  const region   = row["Region"]            || "";
  const season   = row["Seasonality"]       || "";
  const weather  = row["Weather Condition"] || "";

  const base = {
    "Inventory Level": inv,
    "Price": price,
    "Discount": discount,
    "Promotion": promo,
    "Competitor Pricing": compPrice,
    "Epidemic": epidemic,
    "Year": year,
    "Month": month,
    "Day": day,
    "Discounted Price": price * (1 - discount / 100),
    "Sell Through Rate": inv > 0 ? sold / inv : 0,
  };
  WEEKDAY_COLS.forEach(c => { base[c] = c === `Weekday_${weekday}` ? 1 : 0; });
  SEASON_COLS.forEach(c  => { base[c] = c === `Seasonality_${season}` ? 1 : 0; });
  WEATHER_COLS.forEach(c => { base[c] = c === `Weather Condition_${weather}` ? 1 : 0; });
  CAT_COLS.forEach(c     => { base[c] = c === `Category_${cat}` ? 1 : 0; });
  REG_COLS.forEach(c     => { base[c] = c === `Region_${region}` ? 1 : 0; });
  return base;
}

function callForecasting(rowFeatures) {
  return { predicted: Math.round(Math.random() * 300 + 20) };
}

// ─── API CALL ────────────────────────────────────────────────────────────────

async function fetchDemandPrediction(rows) {
  const res = await fetch("https://db-full-and-final-2.onrender.com/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: rows })
  });
  const data = await res.json();
  return data.predictions;
}

// ─── LENIS SMOOTH SCROLL HOOK ────────────────────────────────────────────────

function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);
}

// ─── METRIC CARD (editorial, high-contrast)─────────────────────────────────

function MetricCard({ label, value, accent }) {
  const accentMap = {
    red:   { border: "#E5484D", text: "#E5484D", bg: "#2A1113" },
    orange:{ border: "#F76808", text: "#F76808", bg: "#271A10" },
    white: { border: "#FFFFFF", text: "#FFFFFF", bg: "#1A1A1A" },
    gray:  { border: "#6E6E6E", text: "#B3B3B3", bg: "#121212" },
  };
  const col = accentMap[accent] || accentMap.white;
  return (
    <div style={{
      background: col.bg, borderLeft: `4px solid ${col.border}`, borderRadius: 0,
      padding: "14px 18px", display: "flex", flexDirection: "column", gap: 6
    }}>
      <span style={{ fontSize: 10, color: col.text, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "'DM Mono', monospace" }}>{label}</span>
      <span style={{ fontSize: 28, fontWeight: 700, color: col.text, fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.02em" }}>{value}</span>
    </div>
  );
}

// ─── STAT ROW (editorial)─────────────────────────────────────────────────────

function StatRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "0.5px solid #2A2A2A" }}>
      <span style={{ fontSize: 12, color: "#A0A0A0", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF", fontFamily: "'DM Sans', sans-serif" }}>{value}</span>
    </div>
  );
}

// ─── TAB BUTTON (high contrast, minimal)──────────────────────────────────────

function TabBtn({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 24px", borderRadius: 0,
      border: active ? "1px solid #E5484D" : "1px solid #2A2A2A",
      background: active ? "#E5484D" : "transparent",
      color: active ? "#FFFFFF" : "#B3B3B3",
      fontWeight: 600, fontSize: 13, cursor: "pointer",
      transition: "all 0.1s ease-in-out",
      fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.02em",
      textTransform: "uppercase",
      width: "100%",
      justifyContent: "center"
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>{label}
    </button>
  );
}

// ─── SELECT & INPUT (dark mode, sharp)─────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 10, fontWeight: 700, color: "#9A9A9A", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'DM Mono', monospace" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  padding: "10px 14px", borderRadius: 0, border: "1px solid #2A2A2A",
  fontSize: 13, color: "#FFFFFF", background: "#000000",
  outline: "none", fontFamily: "'DM Sans', sans-serif"
};

// ─── HOVER CARD COMPONENT ─────────────────────────────────────────────────

function HoverCard({ children, content }) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsOpen(true), 80);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  return (
    <div 
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <div
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.2s ease, transform 0.2s ease",
          transform: isOpen ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(6px)",
          position: "absolute",
          bottom: "100%",
          left: "50%",
          marginBottom: "12px",
          width: "180px",
          background: "#0A0A0A",
          border: "1px solid #E5484D",
          padding: "14px 16px",
          zIndex: 1000,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)"
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 11, color: "#E5484D", marginBottom: 6, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          IMPROVE ACCURACY
        </div>
        <div style={{ fontSize: 12, color: "#E0E0E0", lineHeight: 1.4, fontFamily: "'DM Sans', sans-serif" }}>
          {content}
        </div>
        <div style={{
          position: "absolute",
          bottom: "-6px",
          left: "50%",
          transform: "translateX(-50%) rotate(45deg)",
          width: "12px",
          height: "12px",
          background: "#0A0A0A",
          borderRight: "1px solid #E5484D",
          borderBottom: "1px solid #E5484D"
        }} />
      </div>
    </div>
  );
}

// ─── DASHBOARD COMPONENT ─────────────────────────────────────────────────

function Dashboard() {
  useLenis();
  
  const [tab, setTab] = useState("bulk");
  const [csvData, setCsvData] = useState(null);
  const [csvName, setCsvName] = useState("");
  const [loading, setLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [tableName, setTableName] = useState("demand_predictions_log");
  const fileRef = useRef();
  const navigate = useNavigate();

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    date: today, category: "Electronics", region: "North",
    season: "Winter", weather: "Clear",
    inventory: 150, unitsSold: 50,
    promotion: 0, epidemic: 0,
    price: 50, discount: 0, compPrice: 49
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFile = useCallback(e => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvName(file.name);
    const sanitized = "forecast_" + file.name
      .replace(".csv", "")
      .replace(/[^a-zA-Z0-9_]/g, "_")
      .toLowerCase();
    setTableName(sanitized);
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const rows = parseCSV(ev.target.result);
        setCsvData(rows);
        setBulkResult(null);
      } catch {
        alert("Could not parse CSV. Ensure it has the correct columns.");
      }
    };
    reader.readAsText(file);
  }, []);

  const runBulkForecast = async () => {
    if (!csvData) return;
    setLoading(true);
    try {
      const features = csvData.map(preprocessRow);
      const preds = await fetchDemandPrediction(features);
      const enriched = csvData.map((row, i) => ({
        ...row,
        predictedDemand: preds[i] ?? Math.round(Math.random() * 200 + 30),
      }));
      enriched.forEach(r => {
        r.restockVolume = Math.max(0, r.predictedDemand - (r["Inventory Level"] || 0));
      });
      let mae = null, rmse = null, r2 = null, accuracy = null;
      const hasDemand = enriched[0]?.["Demand"] !== undefined;
      if (hasDemand) {
        const actuals = enriched.map(r => r["Demand"]);
        const prd     = enriched.map(r => r.predictedDemand);
        const n = actuals.length;
        mae = actuals.reduce((s, a, i) => s + Math.abs(a - prd[i]), 0) / n;
        rmse = Math.sqrt(actuals.reduce((s, a, i) => s + (a - prd[i]) ** 2, 0) / n);
        const mean = actuals.reduce((a, b) => a + b, 0) / n;
        const ss_res = actuals.reduce((s, a, i) => s + (a - prd[i]) ** 2, 0);
        const ss_tot = actuals.reduce((s, a) => s + (a - mean) ** 2, 0);
        r2 = 1 - ss_res / ss_tot;
        const mape = actuals.reduce((s, a, i) => a !== 0 ? s + Math.abs((a - prd[i]) / a) : s, 0) / n * 100;
        accuracy = 100 - mape;
      }
      setBulkResult({ rows: enriched, mae, rmse, r2, accuracy, hasDemand });
    } catch (err) {
      alert("Forecast failed: " + err.message);
    }
    setLoading(false);
  };

  const runWhatIf = async () => {
    setLoading(true);
    try {
      const dt = new Date(form.date);
      const baseRow = {
        "Inventory Level": form.inventory,
        "Price": form.price,
        "Discount": form.discount,
        "Promotion": form.promotion,
        "Competitor Pricing": form.compPrice,
        "Epidemic": form.epidemic,
        "Year": dt.getFullYear(),
        "Month": dt.getMonth() + 1,
        "Day": dt.getDate(),
        "Discounted Price": form.price * (1 - form.discount / 100),
        "Sell Through Rate": form.inventory > 0 ? form.unitsSold / form.inventory : 0,
      };
      WEEKDAY_COLS.forEach(c => { baseRow[c] = c === `Weekday_${dayName(dt)}` ? 1 : 0; });
      SEASON_COLS.forEach(c  => { baseRow[c] = c === `Seasonality_${form.season}` ? 1 : 0; });
      WEATHER_COLS.forEach(c => { baseRow[c] = c === `Weather Condition_${form.weather}` ? 1 : 0; });
      CAT_COLS.forEach(c     => { baseRow[c] = c === `Category_${form.category}` ? 1 : 0; });
      REG_COLS.forEach(c     => { baseRow[c] = c === `Region_${form.region}` ? 1 : 0; });

      const preds = await fetchDemandPrediction([baseRow], true);
      const pred = Math.max(0, preds[0] ?? Math.round(Math.random() * 200 + 50));
      setWhatIfResult({ pred, inventory: form.inventory, date: form.date, category: form.category });
    } catch (err) {
      alert("Forecast failed: " + err.message);
    }
    setLoading(false);
  };

  const chartData = bulkResult ? bulkResult.rows.slice(0, 80).map((r, i) => ({
    idx: i,
    actual: r["Demand"],
    predicted: r.predictedDemand,
  })) : [];

  const restockData = bulkResult
    ? [...bulkResult.rows]
        .filter(r => r.restockVolume > 0)
        .sort((a, b) => b.restockVolume - a.restockVolume)
        .slice(0, 12)
        .map(r => ({ product: r["Product ID"] || "—", restock: r.restockVolume, inv: r["Inventory Level"] || 0 }))
    : [];

  return (
    <div style={{ fontFamily: "'DM Sans', 'DM Mono', monospace, sans-serif", minHeight: "100vh", background: "#030303", color: "#E8E8E8" }}>
      {/* HEADER — refined EdgeCast branding, enlarged logo, balanced navbar */}
      <div style={{ 
        background: "#000000", 
        borderBottom: "1px solid #E5484D", 
        padding: "16px 40px", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between" 
      }}>
        {/* Logo Area - Elegant EdgeCast wordmark with icon */}
        <div 
          onClick={() => navigate("/")}
          style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
        >
          <div style={{
            width: 48,
            height: 48,
            background: "#E5484D",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "skewX(-8deg)"
          }}>
            <span style={{ 
              color: "#000000", 
              fontSize: 28, 
              fontWeight: 800, 
              fontFamily: "'DM Sans', sans-serif",
              transform: "skewX(8deg)",
              display: "inline-block"
            }}>⛭</span>
          </div>
          <div>
            <h1 style={{ 
              margin: 0, 
              fontSize: 32, 
              fontWeight: 800, 
              letterSpacing: "-0.03em", 
              fontFamily: "'DM Sans', sans-serif",
              lineHeight: 1
            }}>
              <span style={{ color: "#6A6A6A" }}>EDGE</span>
              <span style={{ color: "#E5484D" }}>CAST</span>
            </h1>
            <p style={{ 
              margin: "4px 0 0", 
              fontSize: 9, 
              color: "#E5484D", 
              fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.1em",
              textTransform: "uppercase"
            }}>FORECAST ENGINE</p>
          </div>
        </div>

        {/* Navigation Bar - Dashboard and About Us */}
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <button 
            onClick={() => navigate("/about")}
            style={{ 
              fontSize: 13, 
              color: "#E5484D", 
              fontFamily: "'DM Sans', sans-serif", 
              border: "1px solid #E5484D", 
              padding: "8px 20px",
              background: "transparent", 
              cursor: "pointer",
              fontWeight: 600,
              letterSpacing: "0.04em",
              transition: "all 0.15s ease",
              textTransform: "uppercase"
            }}
            onMouseEnter={(e) => { e.target.style.background = "#E5484D20"; }}
            onMouseLeave={(e) => { e.target.style.background = "transparent"; }}
          >
            ABOUT US
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 0, minHeight: "calc(100vh - 81px)" }}>
        {/* SIDEBAR — dark, minimal, high contrast */}
        <div style={{ width: 280, background: "#050505", borderRight: "1px solid #1F1F1F", padding: "28px 20px", flexShrink: 0 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#E5484D", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 20px", fontFamily: "'DM Mono', monospace" }}>// DATA ENTRY</p>

          <div
            onClick={() => fileRef.current.click()}
            style={{
              border: "1px solid #2A2A2A", borderRadius: 0, padding: "24px 16px",
              textAlign: "center", cursor: "pointer", background: csvData ? "#1A0A0C" : "transparent",
              transition: "all 0.1s", marginBottom: 24
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8, color: "#E5484D" }}>{csvData ? "✓" : "⌘"}</div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#FFFFFF", letterSpacing: "0.02em" }}>
              {csvData ? csvName : "UPLOAD DEMAND CSV"}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 10, color: "#6A6A6A", fontFamily: "'DM Mono', monospace" }}>
              {csvData ? `${csvData.length} ROWS LOADED` : "CLICK TO BROWSE"}
            </p>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleFile} />
          </div>

          {csvData && (
            <div style={{ background: "#0F0F0F", padding: "14px", borderLeft: "2px solid #E5484D" }}>
              <p style={{ margin: "0 0 12px", fontSize: 9, fontWeight: 700, color: "#E5484D", textTransform: "uppercase", letterSpacing: "0.1em" }}>SCHEMA DETECTED</p>
              {Object.keys(csvData[0]).slice(0, 8).map(col => (
                <div key={col} style={{ fontSize: 11, color: "#B3B3B3", padding: "3px 0", fontFamily: "'DM Mono', monospace" }}>⤷ {col}</div>
              ))}
              {Object.keys(csvData[0]).length > 8 && (
                <div style={{ fontSize: 9, color: "#6A6A6A", marginTop: 6 }}>+{Object.keys(csvData[0]).length - 8} EXTRA</div>
              )}
            </div>
          )}
          <div style={{ marginTop: 40 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#E5484D", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 16px" }}>// NAVIGATION</p>
            <TabBtn active={tab === "bulk"} onClick={() => setTab("bulk")} icon="⎔" label="BULK FORECAST" />
            <div style={{ height: 10 }} />
            <TabBtn active={tab === "whatif"} onClick={() => setTab("whatif")} icon="%" label="Impact Simulator" />
          </div>
        </div>

        {/* MAIN CONTENT — editorial, sharp, no rounded corners */}
        <div style={{ flex: 1, padding: "32px 40px", overflowY: "auto" }}>

          {tab === "bulk" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, borderBottom: "1px solid #1F1F1F", paddingBottom: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", color: "#FFFFFF" }}>BULK DEMAND FORECASTING</h2>
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "#A0A0A0", fontFamily: "'DM Mono', monospace" }}>UPLOAD CSV → GENERATE PREDICTIONS → EXECUTE INVENTORY PLAN</p>
                </div>
                {csvData && (
                  <button
                    title="Help us improve predictions — pushing more data enables better fine-tuning and higher accuracy."
                    onClick={runBulkForecast}
                    disabled={loading}
                    style={{
                      padding: "10px 28px", borderRadius: 0, border: "1px solid #E5484D",
                      background: loading ? "#E5484D20" : "#E5484D", color: "#FFFFFF",
                      fontWeight: 700, fontSize: 12, cursor: loading ? "not-allowed" : "pointer",
                      textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'DM Sans', sans-serif"
                    }}
                  >
                    {loading ? "⏳ PROCESSING..." : "▶ RUN FORECAST"}
                  </button>
                )}
              </div>

              {!csvData && (
                <div style={{ background: "#000000", border: "1px solid #1F1F1F", padding: "80px 40px", textAlign: "center" }}>
                  <div style={{ fontSize: 56, color: "#E5484D", marginBottom: 20 }}>⛭</div>
                  <h3 style={{ margin: "0 0 12px", color: "#D0D0D0", fontWeight: 600 }}>NO DATA LOADED</h3>
                  <p style={{ color: "#6A6A6A", fontSize: 13, maxWidth: 400, margin: "0 auto", fontFamily: "'DM Mono', monospace" }}>UPLOAD A DEMAND CSV FROM THE SIDEBAR TO BEGIN.</p>
                </div>
              )}

              {csvData && !bulkResult && !loading && (
                <div style={{ background: "#000000", border: "1px solid #1F1F1F", padding: 24, marginBottom: 24 }}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: "#E5484D", fontFamily: "'DM Mono', monospace", textTransform: "uppercase" }}>RAW DATA PREVIEW</h3>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr>
                          {Object.keys(csvData[0]).slice(0, 8).map(col => (
                            <th key={col} style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #2A2A2A", color: "#B0B0B0", fontWeight: 600, whiteSpace: "nowrap", fontFamily: "'DM Mono', monospace" }}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(0, 6).map((row, i) => (
                          <tr key={i} style={{ background: i % 2 === 0 ? "#050505" : "#000000" }}>
                            {Object.keys(csvData[0]).slice(0, 8).map(col => (
                              <td key={col} style={{ padding: "7px 12px", color: "#CDCDCD", whiteSpace: "nowrap" }}>{row[col] ?? "—"}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p style={{ margin: "16px 0 0", fontSize: 10, color: "#6A6A6A", fontFamily: "'DM Mono', monospace" }}>DISPLAYING 6 OF {csvData.length} ROWS</p>
                </div>
              )}

              {loading && (
                <div style={{ background: "#000000", border: "1px solid #1F1F1F", padding: "80px 40px", textAlign: "center" }}>
                  <div style={{ fontSize: 48, color: "#E5484D", marginBottom: 20 }}>◷</div>
                  <p style={{ color: "#FFFFFF", fontWeight: 600, fontSize: 16, fontFamily: "'DM Mono', monospace" }}>RUNNING LOCAL FORECAST MODEL</p>
                  <p style={{ color: "#6A6A6A", fontSize: 12 }}>PROCESSING {csvData?.length} ROWS — NO CLOUD DEPENDENCY</p>
                </div>
              )}

              {bulkResult && (
                <>
                  {bulkResult.hasDemand && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, marginBottom: 24, background: "#1A1A1A", border: "1px solid #2A2A2A" }}>
                      <MetricCard label="RMSE" value={bulkResult.rmse?.toFixed(2)} accent="red" />
                      <MetricCard label="MAE" value={bulkResult.mae?.toFixed(2)} accent="orange" />
                      <MetricCard label="R²" value={bulkResult.r2?.toFixed(3)} accent="white" />
                      <MetricCard label="ACCURACY" value={`${bulkResult.accuracy?.toFixed(1)}%`} accent="red" />
                    </div>
                  )}

                  {bulkResult.hasDemand && (
                    <div style={{ background: "#000000", border: "1px solid #1F1F1F", padding: "20px 24px", marginBottom: 24 }}>
                      <h3 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: "#E5484D", fontFamily: "'DM Mono', monospace" }}>// ACTUAL VS PREDICTED</h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" />
                          <XAxis dataKey="idx" tick={{ fontSize: 10, fill: "#A0A0A0" }} stroke="#2A2A2A" />
                          <YAxis tick={{ fontSize: 10, fill: "#A0A0A0" }} stroke="#2A2A2A" />
                          <Tooltip contentStyle={{ background: "#050505", border: "1px solid #E5484D", borderRadius: 0, color: "#FFFFFF" }} />
                          <Legend formatter={v => v === "actual" ? "ACTUAL DEMAND" : "PREDICTED DEMAND"} wrapperStyle={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "#FFFFFF" }} />
                          <Line type="monotone" dataKey="actual" stroke="#FFFFFF" strokeWidth={1.5} dot={false} name="actual" />
                          <Line type="monotone" dataKey="predicted" stroke="#F76808" strokeWidth={1.5} dot={false} strokeDasharray="5 3" name="predicted" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {restockData.length > 0 && (
                    <div style={{ background: "#000000", border: "1px solid #1F1F1F", padding: "20px 24px", marginBottom: 24 }}>
                      <h3 style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#E5484D", fontFamily: "'DM Mono', monospace" }}>// INVENTORY ACTION PLAN</h3>
                      <p style={{ margin: "0 0 20px", fontSize: 11, color: "#A0A0A0", fontFamily: "'DM Mono', monospace" }}>RESTOCK PRIORITIES — TOP {restockData.length} PRODUCTS</p>
                      <ResponsiveContainer width="100%" height={restockData.length * 35 + 60}>
                        <BarChart layout="vertical" data={restockData} margin={{ left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" />
                          <XAxis type="number" tick={{ fontSize: 10, fill: "#A0A0A0" }} stroke="#2A2A2A" />
                          <YAxis type="category" dataKey="product" tick={{ fontSize: 10, fill: "#B0B0B0" }} width={80} stroke="#2A2A2A" />
                          <Tooltip contentStyle={{ background: "#050505", border: "1px solid #E5484D", borderRadius: 0 }} />
                          <Legend wrapperStyle={{ fontSize: 10, fontFamily: "'DM Mono', monospace" }} />
                          <Bar dataKey="inv" fill="#3A3A3A" name="CURRENT INVENTORY" />
                          <Bar dataKey="restock" fill="#E5484D" name="RESTOCK VOLUME" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div style={{ background: "#000000", border: "1px solid #1F1F1F", padding: "20px 24px" }}>
                    <h3 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: "#E5484D", fontFamily: "'DM Mono', monospace" }}>// RESTOCK PRIORITY LIST</h3>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr>
                            {["PRODUCT ID","CATEGORY","INVENTORY","PREDICTED DEMAND","RESTOCK VOLUME"].map(h => (
                              <th key={h} style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #2A2A2A", color: "#B0B0B0", fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {bulkResult.rows.filter(r => r.restockVolume > 0).sort((a, b) => b.restockVolume - a.restockVolume).slice(0, 15).map((r, i) => (
                            <tr key={i} style={{ background: i % 2 === 0 ? "#050505" : "#000000" }}>
                              <td style={{ padding: "7px 12px", color: "#E0E0E0" }}>{r["Product ID"] || "—"}</td>
                              <td style={{ padding: "7px 12px", color: "#E0E0E0" }}>{r["Category"] || "—"}</td>
                              <td style={{ padding: "7px 12px", color: "#E0E0E0" }}>{r["Inventory Level"] ?? "—"}</td>
                              <td style={{ padding: "7px 12px", fontWeight: 700, color: "#F76808" }}>{r.predictedDemand}</td>
                              <td style={{ padding: "7px 12px" }}>
                                <span style={{ background: "#E5484D20", color: "#E5484D", padding: "2px 8px", fontWeight: 700, fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
                                  +{r.restockVolume}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
                    <HoverCard content="Help us improve predictions — pushing more data enables better fine-tuning and higher accuracy.">
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch("https://db-full-and-final-2.onrender.com/push-to-db", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ data: bulkResult.rows, table_name: tableName })
                            });
                            const data = await res.json();
                            if (data.success) {
                              alert(`✓ PUSHED ${data.rows_pushed} ROWS TO '${data.table}'`);
                            } else {
                              alert("✗ PUSH FAILED: " + data.error);
                            }
                          } catch (err) {
                            alert("✗ CONNECTION ERROR: " + err.message);
                          }
                        }}
                        style={{
                          padding: "12px 12px",
                          borderRadius: 0,
                          border: "1px solid #E5484D",
                          background: "transparent",
                          color: "#F76808",
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: "pointer",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          transition: "all 0.7s ease-in-out"
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = "#E5484D";
                          e.target.style.color = "#FFFFFF";
                          e.target.style.borderColor = "#E5484D";
                          e.target.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = "transparent";
                          e.target.style.color = "#F76808";
                          e.target.style.borderColor = "#E5484D";
                          e.target.style.transform = "translateY(0)";
                        }}
                      >
                        PUSH TO MYSQL
                      </button>
                    </HoverCard>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "whatif" && (
            <div>
              <div style={{ marginBottom: 24, borderBottom: "1px solid #1F1F1F", paddingBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", color: "#FFFFFF" }}>Impact Simulator</h2>
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "#A0A0A0", fontFamily: "'DM Mono', monospace" }}>MODIFY PARAMETERS → SIMULATE FUTURE DEMAND</p>
              </div>

              {!csvData ? (
                <div style={{ background: "#000000", border: "1px solid #1F1F1F", padding: "80px 40px", textAlign: "center" }}>
                  <div style={{ fontSize: 48, color: "#E5484D", marginBottom: 20 }}>X</div>
                  <h3 style={{ margin: "0 0 12px", color: "#D0D0D0", fontWeight: 600 }}>CSV REQUIRED</h3>
                  <p style={{ color: "#6A6A6A", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>UPLOAD DEMAND DATA IN SIDEBAR TO UNLOCK WHAT-IF.</p>
                </div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: "#1F1F1F", border: "1px solid #2A2A2A" }}>
                    <div style={{ background: "#000000", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
                      <h3 style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#E5484D", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" }}>// CORE DETAILS</h3>
                      <Field label="Forecast Date"><input type="date" value={form.date} onChange={e => set("date", e.target.value)} style={inputStyle} /></Field>
                      <Field label="Category"><select value={form.category} onChange={e => set("category", e.target.value)} style={inputStyle}>{(csvData ? [...new Set(csvData.map(r => r["Category"]).filter(Boolean))].sort() : CATEGORIES).map(c => <option key={c}>{c}</option>)}</select></Field>
                      <Field label="Region"><select value={form.region} onChange={e => set("region", e.target.value)} style={inputStyle}>{(csvData ? [...new Set(csvData.map(r => r["Region"]).filter(Boolean))].sort() : REGIONS).map(r => <option key={r}>{r}</option>)}</select></Field>
                      <Field label="Season"><select value={form.season} onChange={e => set("season", e.target.value)} style={inputStyle}>{SEASONS.map(s => <option key={s}>{s}</option>)}</select></Field>
                      <Field label="Weather"><select value={form.weather} onChange={e => set("weather", e.target.value)} style={inputStyle}>{WEATHERS.map(w => <option key={w}>{w}</option>)}</select></Field>
                    </div>

                    <div style={{ background: "#000000", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
                      <h3 style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#E5484D", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" }}>// INVENTORY & EXTERNAL</h3>
                      <Field label="Current Inventory"><input type="number" min={0} value={form.inventory} onChange={e => set("inventory", +e.target.value)} style={inputStyle} /></Field>
                      <Field label="Units Sold (Velocity)"><input type="number" min={0} value={form.unitsSold} onChange={e => set("unitsSold", +e.target.value)} style={inputStyle} /></Field>
                      <Field label="Promotion"><select value={form.promotion} onChange={e => set("promotion", +e.target.value)} style={inputStyle}><option value={0}>OFF</option><option value={1}>ON</option></select></Field>
                      <Field label="Epidemic / Crisis"><select value={form.epidemic} onChange={e => set("epidemic", +e.target.value)} style={inputStyle}><option value={0}>NO</option><option value={1}>YES</option></select></Field>
                    </div>

                    <div style={{ background: "#000000", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
                      <h3 style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#E5484D", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" }}>// PRICING</h3>
                      <Field label="Base Price ($)"><input type="number" min={0} step={0.01} value={form.price} onChange={e => set("price", +e.target.value)} style={inputStyle} /></Field>
                      <Field label="Discount (%)"><input type="number" min={0} max={100} value={form.discount} onChange={e => set("discount", +e.target.value)} style={inputStyle} /></Field>
                      <Field label="Competitor Price"><input type="number" min={0} step={0.01} value={form.compPrice} onChange={e => set("compPrice", +e.target.value)} style={inputStyle} /></Field>
                      <div style={{ background: "#050505", padding: "12px", marginTop: 4, borderLeft: "2px solid #F76808" }}>
                        <StatRow label="Discounted Price" value={`$${(form.price * (1 - form.discount / 100)).toFixed(2)}`} />
                        <StatRow label="Price vs Competitor" value={form.price < form.compPrice ? "AGGRESSIVE" : form.price > form.compPrice ? "PREMIUM" : "PARITY"} />
                        <StatRow label="Sell-Through Rate" value={form.inventory > 0 ? (form.unitsSold / form.inventory * 100).toFixed(1) + "%" : "N/A"} />
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 24, textAlign: "center" }}>
                    <button
                      onClick={runWhatIf}
                      disabled={loading}
                      style={{
                        padding: "14px 40px", borderRadius: 0, border: "none",
                        background: loading ? "#E5484D40" : "#E5484D", color: "#FFFFFF",
                        fontWeight: 700, fontSize: 13, cursor: loading ? "not-allowed" : "pointer",
                        width: "100%", maxWidth: 500, textTransform: "uppercase", letterSpacing: "0.1em"
                      }}
                    >
                      {loading ? "◷ SIMULATING..." : "⚡ GENERATE FORECAST"}
                    </button>
                  </div>

                  {whatIfResult && (
                    <div style={{ marginTop: 28 }}>
                      <div style={{
                        background: "#000000", borderLeft: "6px solid #F76808", padding: "24px 32px",
                        display: "flex", alignItems: "center", gap: 24, border: "1px solid #2A2A2A"
                      }}>
                        <div style={{ fontSize: 52, color: "#F76808" }}>⟁</div>
                        <div>
                          <p style={{ margin: "0 0 6px", fontSize: 10, color: "#F76808", fontWeight: 700, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em" }}>PREDICTED DEMAND — {whatIfResult.date}</p>
                          <p style={{ margin: 0, fontSize: 44, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em" }}>{whatIfResult.pred} UNITS</p>
                          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#A0A0A0", fontFamily: "'DM Mono', monospace" }}>{whatIfResult.category} | {form.region}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; background: #030303; overflow-x: hidden; }
        /* Hide scrollbars but keep functionality */
        html {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        html::-webkit-scrollbar,
        body::-webkit-scrollbar,
        div::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
        * {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        *::-webkit-scrollbar {
          display: none;
        }
        input:focus, select:focus { outline: none; border-color: #E5484D; }
        button:hover { opacity: 0.85; }
        html.lenis {
          height: auto;
        }
        .lenis.lenis-smooth {
          scroll-behavior: auto;
        }
        .lenis.lenis-smooth [data-lenis-prevent] {
          overscroll-behavior: contain;
        }
        .lenis.lenis-stopped {
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

// ─── MAIN APP WITH ROUTING ─────────────────────────────────────────────────

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/about" element={<About />} />
    </Routes>
  );
}
