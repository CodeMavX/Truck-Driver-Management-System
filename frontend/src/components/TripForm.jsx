import { useState } from "react";
import AutocompleteInput from "./AutocompleteInput";

const EXAMPLES = [
  { label: "Dallas → Chicago", v: { current_location: "Dallas, TX", pickup_location: "Oklahoma City, OK", dropoff_location: "Chicago, IL", current_cycle_used: 10 } },
  { label: "LA → New York", v: { current_location: "Los Angeles, CA", pickup_location: "Phoenix, AZ", dropoff_location: "New York, NY", current_cycle_used: 8 } },
  { label: "Atlanta → Nashville", v: { current_location: "Atlanta, GA", pickup_location: "Chattanooga, TN", dropoff_location: "Nashville, TN", current_cycle_used: 20 } },
];

const IcPin = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13">
    <circle cx="8" cy="8" r="3" />
    <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);
const IcBox = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="13" height="13">
    <rect x="2" y="5" width="12" height="8" rx="1.5" />
    <path d="M5 5V4a3 3 0 0 1 6 0v1" />
  </svg>
);
const IcDrop = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13">
    <path d="M8 1C5.24 1 3 3.24 3 6c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5zm0 6.5A1.5 1.5 0 1 1 8 4a1.5 1.5 0 0 1 0 3z" />
  </svg>
);
const IcClock = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="13" height="13">
    <circle cx="8" cy="8" r="6.5" />
    <path d="M8 4.5V8l2.5 2" />
  </svg>
);

export default function TripForm({ onSubmit, loading, error }) {
  const [form, setForm] = useState({
    current_location: "",
    pickup_location: "",
    dropoff_location: "",
    current_cycle_used: "",
  });

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.current_location || !form.pickup_location || !form.dropoff_location) return;
    onSubmit({ ...form, current_cycle_used: parseFloat(form.current_cycle_used || 0) });
  };

  const fill = (vals) => setForm({ ...vals, current_cycle_used: String(vals.current_cycle_used) });
  const canSubmit = !loading && form.current_location && form.pickup_location && form.dropoff_location;

  return (
    <div className="map-form-panel">
      <form className="map-form-bar" onSubmit={submit}>
        <AutocompleteInput value={form.current_location} onChange={set("current_location")} placeholder="Current location" icon={<IcPin />} />
        <div className="bar-sep" />
        <AutocompleteInput value={form.pickup_location} onChange={set("pickup_location")} placeholder="Pickup location" icon={<IcBox />} />
        <div className="bar-sep" />
        <AutocompleteInput value={form.dropoff_location} onChange={set("dropoff_location")} placeholder="Drop-off location" icon={<IcDrop />} />
        <div className="bar-sep" />
        <div className="ac-wrap ac-static">
          <span className="ac-icon"><IcClock /></span>
          <input
            className="ac-input"
            type="number" min="0" max="70" step="0.5"
            value={form.current_cycle_used}
            onChange={(e) => set("current_cycle_used")(e.target.value)}
            placeholder="Cycle hrs"
            style={{ width: 96 }}
          />
        </div>
        <button type="submit" className="plan-btn" disabled={!canSubmit}>
          {loading
            ? <><span className="spinner spinner-sm" /> Planning…</>
            : "Plan Trip"}
        </button>
      </form>

      <div className="map-examples">
        <span className="ex-label">Try:</span>
        {EXAMPLES.map((ex) => (
          <button key={ex.label} type="button" className="bar-ex-chip" onClick={() => fill(ex.v)}>
            {ex.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bar-error">⚠ {error}</div>
      )}
    </div>
  );
}
