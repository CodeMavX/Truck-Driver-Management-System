import LogSheet from "./LogSheet";

export default function LogSheetCard({ day, inputs }) {
  const t = day.totals;
  return (
    <div className="card log-sheet">
      <div className="card-head">
        <h2>
          Day {day.day_number} &nbsp;
          <span style={{ color: "var(--muted)", fontWeight: 500, fontSize: 14 }}>
            {day.date}
          </span>
        </h2>
        <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
          Driver's Daily Log · 24 hours
        </span>
      </div>

      <div className="log-meta">
        <div className="m">
          <div className="k">Total miles driving</div>
          <div className="val">{t.miles.toLocaleString()} mi</div>
        </div>
        <div className="m">
          <div className="k">From → To</div>
          <div className="val" style={{ fontSize: 13 }}>
            {inputs.current_location} → {inputs.dropoff_location}
          </div>
        </div>
        <div className="m">
          <div className="k">Driving / On-duty</div>
          <div className="val">
            {t.driving.toFixed(1)}h / {(t.driving + t.on).toFixed(1)}h
          </div>
        </div>
        <div className="m">
          <div className="k">Off-duty / Sleeper</div>
          <div className="val">
            {t.off.toFixed(1)}h / {t.sb.toFixed(1)}h
          </div>
        </div>
      </div>

      <div className="log-grid-wrap">
        <LogSheet day={day} />
      </div>

      {day.change_rows.length > 0 && (
        <div className="remarks">
          <h4>Remarks — duty status changes</h4>
          <ul>
            {day.change_rows.map((c, i) => (
              <li key={i}>
                <span className="t">{c.time}</span>
                <span>
                  {c.remark}{" "}
                  <span style={{ color: "var(--muted)" }}>
                    ({c.status_label})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
