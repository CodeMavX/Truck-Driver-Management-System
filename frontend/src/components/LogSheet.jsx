const ROWS = [
  { key: "off",     label: "1. Off Duty" },
  { key: "sb",      label: "2. Sleeper Berth" },
  { key: "driving", label: "3. Driving" },
  { key: "on",      label: "4. On Duty (not driving)" },
];

const STATUS_ROW = { OFF: 0, SB: 1, D: 2, ON: 3 };

const PAD_L = 150;
const PAD_R = 56;
const PAD_T = 26;
const ROW_H = 34;
const GRID_W = 720;
const HOUR_W = GRID_W / 24;

function hourLabel(h) {
  if (h === 0 || h === 24) return "M";
  if (h === 12) return "N";
  return h % 12 === 0 ? 12 : h % 12;
}

function buildTimeline(rows) {
  const bars = [];
  Object.entries(STATUS_ROW).forEach(([code, rowIdx]) => {
    const key = ROWS[rowIdx].key;
    (rows[code] || rows[key] || []).forEach((b) =>
      bars.push({ row: rowIdx, start: b.start, end: b.end })
    );
  });
  bars.sort((a, b) => a.start - b.start);
  return bars;
}

export default function LogSheet({ day }) {
  const x    = (h) => PAD_L + h * HOUR_W;
  const yMid = (i) => PAD_T + i * ROW_H + ROW_H / 2;
  const width  = PAD_L + GRID_W + PAD_R;
  const height = PAD_T + ROWS.length * ROW_H + 10;

  const timeline = buildTimeline(day.rows);

  const segPaths = [];
  timeline.forEach((bar, i) => {
    const y = yMid(bar.row);
    segPaths.push(`M ${x(bar.start)} ${y} L ${x(bar.end)} ${y}`);
    const next = timeline[i + 1];
    if (next) segPaths.push(`M ${x(bar.end)} ${y} L ${x(next.start)} ${yMid(next.row)}`);
  });

  const totalByRow = {
    0: day.totals.off,
    1: day.totals.sb,
    2: day.totals.driving,
    3: day.totals.on,
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", minWidth: 680, display: "block" }}
      role="img"
      aria-label={`Daily log grid for day ${day.day_number}`}
    >
      {Array.from({ length: 25 }, (_, h) => (
        <text key={`hl${h}`} x={x(h)} y={PAD_T - 10} fontSize="9" textAnchor="middle" fill="#607089">
          {hourLabel(h)}
        </text>
      ))}

      {ROWS.map((r, i) => (
        <g key={r.key}>
          <rect
            x={PAD_L} y={PAD_T + i * ROW_H}
            width={GRID_W} height={ROW_H}
            fill={i % 2 === 0 ? "#fbfcfe" : "#f4f8fd"}
            stroke="#c7d3e2"
          />
          <text x={PAD_L - 8} y={yMid(i) + 3} fontSize="10.5" textAnchor="end" fill="#1b2a3a" fontWeight="600">
            {r.label}
          </text>
          <text x={PAD_L + GRID_W + 28} y={yMid(i) + 4} fontSize="12" textAnchor="middle" fill="#0d2b4e" fontWeight="700">
            {totalByRow[i].toFixed(2)}
          </text>
        </g>
      ))}

      {Array.from({ length: 24 }, (_, h) =>
        [0, 1, 2, 3].map((q) => {
          const hx = x(h + q / 4);
          const isHour = q === 0;
          return (
            <line
              key={`t${h}-${q}`}
              x1={hx} x2={hx} y1={PAD_T} y2={PAD_T + ROWS.length * ROW_H}
              stroke={isHour ? "#c7d3e2" : "#e4ebf4"}
              strokeWidth={isHour ? 1 : 0.5}
            />
          );
        })
      )}

      <path d={segPaths.join(" ")} fill="none" stroke="#1f7ae0" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />

      <text x={PAD_L + GRID_W + 28} y={PAD_T - 10} fontSize="9" textAnchor="middle" fill="#607089">Hrs</text>
    </svg>
  );
}
