import { useState } from "react";

const TYPE_ICON  = { fuel: "⛽", break: "☕", rest: "🛏", restart: "⏻" };
const TYPE_LABEL = { fuel: "Fuel", break: "Break", rest: "Rest", restart: "Restart" };

function CycleBar({ used, limit = 70 }) {
  const pct   = Math.min(100, (used / limit) * 100);
  const color = used > 60 ? "var(--amber)" : used > 45 ? "var(--orange)" : "var(--accent)";
  return (
    <div className="cyc-bar">
      <div className="cyc-track">
        <div className="cyc-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="cyc-text">{used.toFixed(1)} / {limit} h</span>
    </div>
  );
}

function DayBar({ driving = 0, on = 0, off = 0, sb = 0 }) {
  const total  = driving + on + off + sb || 24;
  const dPct   = (driving / total) * 100;
  const onPct  = (on      / total) * 100;
  const sbPct  = (sb      / total) * 100;
  const offPct = Math.max(0, 100 - dPct - onPct - sbPct);
  return (
    <div className="day-bar">
      {dPct   > 0 && <div className="db-seg seg-drive" style={{ width: `${dPct}%`   }} title={`Drive ${driving.toFixed(1)}h`} />}
      {onPct  > 0 && <div className="db-seg seg-on"    style={{ width: `${onPct}%`  }} title={`On-duty ${on.toFixed(1)}h`} />}
      {sbPct  > 0 && <div className="db-seg seg-sb"    style={{ width: `${sbPct}%`  }} title={`Sleeper ${sb.toFixed(1)}h`} />}
      {offPct > 0 && <div className="db-seg seg-off"   style={{ width: `${offPct}%` }} title={`Off ${off.toFixed(1)}h`} />}
    </div>
  );
}

function DayTimeline({ rows }) {
  const segs = [
    { key: "D",   cls: "seg-drive" },
    { key: "ON",  cls: "seg-on"    },
    { key: "SB",  cls: "seg-sb"    },
    { key: "OFF", cls: "seg-off"   },
  ];
  const hourMarks = [0, 3, 6, 9, 12, 15, 18, 21, 24];
  return (
    <div className="day-timeline-wrap">
      <div className="dt-ticks">
        {hourMarks.map(h => (
          <span key={h} className="dt-tick" style={{ left: `${(h / 24) * 100}%` }}>
            {h === 0 ? "M" : h === 12 ? "N" : h === 24 ? "M" : h}
          </span>
        ))}
      </div>
      <div className="dt-bar">
        {segs.map(({ key, cls }) =>
          (rows?.[key] || []).map((seg, i) => (
            <div
              key={`${key}-${i}`}
              className={`dt-seg ${cls}`}
              style={{
                left:  `${(seg.start / 24) * 100}%`,
                width: `${((seg.end - seg.start) / 24) * 100}%`,
              }}
              title={`${key} ${seg.start.toFixed(1)}h–${seg.end.toFixed(1)}h`}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function TripSummaryPanel({ summary: s, logSheets, stops, onViewLogs }) {
  const [open, setOpen] = useState(true);

  const stopCounts = (stops || []).reduce((acc, st) => {
    if (TYPE_LABEL[st.type]) acc[st.type] = (acc[st.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className={`trip-panel${open ? "" : " trip-panel--collapsed"}`}>
      <div className="tp-head">
        <span className="tp-title">Trip Summary</span>
        <button className="tp-toggle" onClick={() => setOpen(o => !o)}>
          {open
            ? <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13"><path d="M12 10L8 6l-4 4"/></svg>
            : <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13"><path d="M4 6l4 4 4-4"/></svg>}
        </button>
      </div>

      {open && (
        <div className="tp-body">
          <div className="tp-stats-row">
            <div className="tp-stat">
              <div className="tp-val">{s.total_distance_miles.toLocaleString()}</div>
              <div className="tp-key">mi total</div>
            </div>
            <div className="tp-vdiv" />
            <div className="tp-stat">
              <div className="tp-val">{s.total_drive_hours.toFixed(1)}</div>
              <div className="tp-key">h drive</div>
            </div>
            <div className="tp-vdiv" />
            <div className="tp-stat">
              <div className="tp-val">{s.num_days}</div>
              <div className="tp-key">{s.num_days > 1 ? "days" : "day"}</div>
            </div>
          </div>

          <div className="tp-section">
            <div className="tp-section-label">70 hr / 8 day Cycle</div>
            <CycleBar used={s.cycle_used_end} />
          </div>

          <div className="tp-hdiv" />

          <div className="tp-section">
            <div className="tp-section-label">Daily Breakdown</div>
            {logSheets.map((day) => {
              const t = day.totals ?? {};
              return (
                <div key={day.day_number} className="tp-day">
                  <div className="tp-day-head">
                    <span className="tp-day-num">Day {day.day_number}</span>
                    <span className="tp-day-date">{day.date}</span>
                  </div>
                  <DayBar
                    driving={t.driving ?? 0}
                    on={t.on ?? 0}
                    off={t.off ?? 0}
                    sb={t.sb ?? 0}
                  />
                  <div className="day-bar-legend">
                    <span className="dbl drive">Drive {(t.driving ?? 0).toFixed(1)}h</span>
                    {(t.on ?? 0) > 0 && <span className="dbl on">On-duty {(t.on ?? 0).toFixed(1)}h</span>}
                    <span className="dbl off">Off {((t.off ?? 0) + (t.sb ?? 0)).toFixed(1)}h</span>
                  </div>
                  <DayTimeline rows={day.rows} />
                  <div className="tp-day-miles">{(t.miles ?? 0).toLocaleString()} mi</div>
                </div>
              );
            })}
          </div>

          <div className="tp-bar-legend">
            <span className="tbl-item drive">■ Drive</span>
            <span className="tbl-item on">■ On-duty</span>
            <span className="tbl-item off">■ Off / Sleeper</span>
          </div>

          {Object.keys(stopCounts).length > 0 && (
            <>
              <div className="tp-hdiv" />
              <div className="tp-stops">
                {Object.entries(stopCounts).map(([type, n]) => (
                  <span key={type} className="tp-stop-chip">
                    {TYPE_ICON[type]} {TYPE_LABEL[type]} ×{n}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {open && onViewLogs && (
        <div className="tp-footer">
          <button className="tp-logs-btn" onClick={onViewLogs}>
            View Daily Logs
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="12" height="12">
              <path d="M3 8h10M9 4l4 4-4 4"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
