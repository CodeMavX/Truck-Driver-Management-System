import { useState, useRef, useCallback } from "react";

export default function AutocompleteInput({ value, onChange, placeholder, icon }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const containerRef = useRef(null);
  const timerRef = useRef(null);

  const fetchItems = useCallback((q) => {
    clearTimeout(timerRef.current);
    if (q.length < 2) { setItems([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=7&countrycodes=us`,
          { headers: { "Accept-Language": "en" } }
        );
        const data = await res.json();
        const seen = new Set();
        const results = [];
        for (const d of data) {
          const parts = d.display_name.split(", ");
          const city = parts[0];
          const stIdx = parts.findIndex((p) => /^[A-Z]{2}$/.test(p));
          const st = stIdx > 0 ? parts[stIdx] : parts[1] || "";
          const short = st ? `${city}, ${st}` : parts.slice(0, 2).join(", ");
          if (!seen.has(short)) { seen.add(short); results.push(short); }
        }
        setItems(results.slice(0, 5));
        setOpen(true);
      } catch { /* ignore network errors */ }
    }, 320);
  }, []);

  const handleChange = (e) => {
    onChange(e.target.value);
    fetchItems(e.target.value);
  };

  const handleSelect = (item) => {
    onChange(item);
    setItems([]);
    setOpen(false);
  };

  const handleBlur = (e) => {
    if (!containerRef.current?.contains(e.relatedTarget)) setOpen(false);
  };

  return (
    <div className="ac-wrap" ref={containerRef} onBlur={handleBlur}>
      {icon && <span className="ac-icon">{icon}</span>}
      <input
        className="ac-input"
        value={value}
        onChange={handleChange}
        onFocus={() => items.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
      />
      {value && (
        <button
          type="button"
          className="ac-clear"
          onMouseDown={(e) => { e.preventDefault(); onChange(""); setItems([]); setOpen(false); }}
        >
          ×
        </button>
      )}
      {open && items.length > 0 && (
        <ul className="ac-dropdown">
          {items.map((item, i) => (
            <li key={i} onMouseDown={() => handleSelect(item)}>
              <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12" style={{ color: "var(--muted)", flexShrink: 0 }}>
                <path d="M8 1C5.24 1 3 3.24 3 6c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5zm0 6.5A1.5 1.5 0 1 1 8 4a1.5 1.5 0 0 1 0 3z" />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
