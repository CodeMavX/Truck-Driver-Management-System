from datetime import date, timedelta
from typing import List, Dict

from .hos import Segment, DRIVING, ON, OFF, SB, AVG_SPEED_MPH

STATUS_ORDER = [OFF, SB, DRIVING, ON]
STATUS_LABEL = {
    OFF: "Off Duty",
    SB: "Sleeper Berth",
    DRIVING: "Driving",
    ON: "On Duty (not driving)",
}


def _fmt_clock(hour_of_day: float) -> str:
    total_minutes = int(round(hour_of_day * 60))
    total_minutes = max(0, min(24 * 60, total_minutes))
    h, m = divmod(total_minutes, 60)
    return f"{h:02d}:{m:02d}"


def build_log_sheets(segments: List[Segment], start_date: date) -> List[Dict]:
    if not segments:
        return []

    last_end = segments[-1].end
    num_days = int((last_end - 1e-9) // 24) + 1
    days = []

    for d in range(num_days):
        day_start = d * 24.0
        day_end = day_start + 24.0
        rows = {s: [] for s in STATUS_ORDER}
        totals = {s: 0.0 for s in STATUS_ORDER}
        miles = 0.0
        change_rows = []

        for seg in segments:
            if seg.end <= day_start + 1e-9 or seg.start >= day_end - 1e-9:
                continue
            s = max(seg.start, day_start) - day_start
            e = min(seg.end, day_end) - day_start
            if e - s <= 1e-9:
                continue
            rows[seg.status].append({"start": round(s, 4), "end": round(e, 4)})
            totals[seg.status] += e - s
            if seg.status == DRIVING:
                miles += (e - s) * AVG_SPEED_MPH

            if seg.start >= day_start - 1e-9 and seg.label:
                change_rows.append({
                    "time": _fmt_clock(s),
                    "status": seg.status,
                    "status_label": STATUS_LABEL[seg.status],
                    "remark": seg.label,
                })

        grid_date = start_date + timedelta(days=d)
        days.append({
            "day_number": d + 1,
            "date": grid_date.isoformat(),
            "rows": rows,
            "change_rows": change_rows,
            "totals": {
                "off": round(totals[OFF], 2),
                "sb": round(totals[SB], 2),
                "driving": round(totals[DRIVING], 2),
                "on": round(totals[ON], 2),
                "total": round(sum(totals.values()), 2),
                "miles": round(miles, 1),
            },
        })

    return days
