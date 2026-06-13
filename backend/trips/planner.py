from datetime import date
from typing import Dict, Optional

from . import routing
from .hos import simulate, DRIVING, PICKUP_DURATION, DROPOFF_DURATION
from .logsheet import build_log_sheets

STOP_META = {
    "Pickup": ("pickup", "Pickup (1h on-duty)"),
    "Dropoff": ("dropoff", "Drop-off (1h on-duty)"),
    "Fuel stop": ("fuel", "Fuel stop"),
    "30-minute break": ("break", "30-min break"),
    "10-hour rest (reset)": ("rest", "10-hour rest"),
    "34-hour restart": ("restart", "34-hour restart"),
}


def plan_trip(
    current_location: str,
    pickup_location: str,
    dropoff_location: str,
    current_cycle_used: float,
    start_date: Optional[date] = None,
) -> Dict:
    start_date = start_date or date.today()

    current = routing.geocode(current_location)
    pickup = routing.geocode(pickup_location)
    dropoff = routing.geocode(dropoff_location)

    route_data = routing.route([current, pickup, dropoff])
    legs = route_data["legs"]
    miles_to_pickup = legs[0]["distance_miles"] if len(legs) > 0 else 0.0
    miles_to_dropoff = legs[1]["distance_miles"] if len(legs) > 1 else 0.0

    hos = simulate(
        legs=[
            {"type": "drive", "miles": miles_to_pickup, "label": "Drive to pickup"},
            {"type": "onduty", "hours": PICKUP_DURATION, "label": "Pickup"},
            {"type": "drive", "miles": miles_to_dropoff, "label": "Drive to dropoff"},
            {"type": "onduty", "hours": DROPOFF_DURATION, "label": "Dropoff"},
        ],
        current_cycle_used=current_cycle_used,
    )

    log_sheets = build_log_sheets(hos.segments, start_date)

    interp = routing.RouteInterpolator(route_data["geometry"])
    stops = [
        {
            "type": "start",
            "label": "Trip start",
            "lat": current["lat"], "lng": current["lng"],
            "name": current["display_name"], "mile": 0.0,
        }
    ]
    for seg in hos.segments:
        if not seg.is_stop:
            continue
        kind, label = STOP_META.get(seg.label, ("stop", seg.label))
        coord = interp.at(seg.miles_at)
        if coord is None:
            continue
        stops.append({
            "type": kind,
            "label": label,
            "lat": coord[0], "lng": coord[1],
            "mile": round(seg.miles_at, 1),
            "at_hours": round(seg.start, 2),
        })

    return {
        "inputs": {
            "current_location": current_location,
            "pickup_location": pickup_location,
            "dropoff_location": dropoff_location,
            "current_cycle_used": current_cycle_used,
            "start_date": start_date.isoformat(),
        },
        "locations": {
            "current": current,
            "pickup": pickup,
            "dropoff": dropoff,
        },
        "route": {
            "geometry": route_data["geometry"],
            "total_distance_miles": round(route_data["total_distance_miles"], 1),
            "miles_to_pickup": round(miles_to_pickup, 1),
            "miles_to_dropoff": round(miles_to_dropoff, 1),
        },
        "stops": stops,
        "summary": {
            "total_distance_miles": round(hos.total_miles, 1),
            "total_drive_hours": round(hos.total_drive_hours, 2),
            "total_on_duty_hours": round(hos.total_on_duty_hours, 2),
            "total_duration_hours": round(hos.total_duration_hours, 2),
            "num_days": len(log_sheets),
            "cycle_used_start": round(hos.cycle_used_start, 2),
            "cycle_used_end": round(hos.cycle_used_end, 2),
            "cycle_limit": 70.0,
            "feasible": hos.feasible,
            "warnings": hos.warnings,
            "avg_speed_mph": 55.0,
        },
        "log_sheets": log_sheets,
    }
