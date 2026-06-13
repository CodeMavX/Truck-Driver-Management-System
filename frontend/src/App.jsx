import { useEffect, useState } from "react";
import { planTrip } from "./api";
import TripForm from "./components/TripForm";
import RouteMap from "./components/RouteMap";
import LogSheetCard from "./components/LogSheetCard";
import Logo from "./components/Logo";
import ThemeToggle from "./components/ThemeToggle";
import TripSummaryPanel from "./components/TripSummaryPanel";

export default function App() {
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [view, setView]       = useState("map");
  const [theme, setTheme]     = useState("dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const handleSubmit = async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const data = await planTrip(payload);
      setResult(data);
      setView("map");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const s = result?.summary;
  const hasResult = !!result;

  return (
    <div className="app-shell">

      <header className="win-topbar">
        <div className="wtb-brand">
          <Logo size={26} />
          <span className="wtb-title">ELD Planner</span>
          <span className="wtb-sep" />
        </div>

        <nav className="wtb-nav">
          <button
            className={`wtb-tab${view === "map" ? " active" : ""}`}
            onClick={() => setView("map")}
          >
            Trip Planner
          </button>
          <button
            className={`wtb-tab${view === "logs" ? " active" : ""}`}
            disabled={!hasResult}
            onClick={() => setView("logs")}
          >
            Daily Logs
            {s?.num_days ? <span className="wtb-badge">{s.num_days}</span> : null}
          </button>
        </nav>

        <div className="wtb-spacer" />

        {s && (
          <div className="wtb-metrics">
            <span className="wtb-chip"><b>{s.total_distance_miles.toLocaleString()}</b> mi</span>
            <span className="wtb-chip"><b>{s.total_drive_hours.toFixed(1)}</b> h</span>
            <span className="wtb-chip"><b>{s.num_days}</b> {s.num_days > 1 ? "days" : "day"}</span>
            <span className={`wtb-chip${s.cycle_used_end > 60 ? " chip-warn" : " chip-ok"}`}>
              <b>{s.cycle_used_end.toFixed(1)}</b>/70 cycle
            </span>
          </div>
        )}

        <div className="wtb-end">
          <ThemeToggle
            theme={theme}
            onToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
          />
        </div>
      </header>

      <main className="main">
        {view === "map" && (
          <div className="map-view">
            <div className="map-form-overlay">
              <TripForm onSubmit={handleSubmit} loading={loading} error={error} />
            </div>
            {hasResult && (
              <TripSummaryPanel summary={s} logSheets={result.log_sheets} stops={result.stops} onViewLogs={() => setView("logs")} />
            )}
            <RouteMap route={result?.route} stops={result?.stops} />
          </div>
        )}

        {view === "logs" && result && (
          <div className="content">
            <div className="logs-head">
              <h2>Driver's Daily Logs</h2>
              <span style={{ color: "var(--muted)", fontSize: 13 }}>
                {s.num_days} sheet{s.num_days > 1 ? "s" : ""} · avg {s.avg_speed_mph} mph
              </span>
            </div>
            {result.log_sheets.map((day) => (
              <LogSheetCard key={day.day_number} day={day} inputs={result.inputs} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
