import math
from typing import List, Tuple, Dict, Optional

import requests
from django.conf import settings

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OSRM_URL = "https://router.project-osrm.org/route/v1/driving"
METERS_PER_MILE = 1609.344
TIMEOUT = 20


class RoutingError(Exception):
    pass


def _headers() -> Dict[str, str]:
    return {"User-Agent": settings.NOMINATIM_USER_AGENT}


def geocode(place: str) -> Dict:
    place = (place or "").strip()
    if not place:
        raise RoutingError("Empty location provided.")
    try:
        resp = requests.get(
            NOMINATIM_URL,
            params={"q": place, "format": "json", "limit": 1, "addressdetails": 0},
            headers=_headers(),
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as exc:
        raise RoutingError(f"Geocoding service error: {exc}") from exc

    if not data:
        raise RoutingError(f"Could not find location: '{place}'.")
    hit = data[0]
    return {
        "query": place,
        "lat": float(hit["lat"]),
        "lng": float(hit["lon"]),
        "display_name": hit.get("display_name", place),
    }


def route(points: List[Dict]) -> Dict:
    if len(points) < 2:
        raise RoutingError("At least two points are required to build a route.")

    coord_str = ";".join(f"{p['lng']},{p['lat']}" for p in points)
    try:
        resp = requests.get(
            f"{OSRM_URL}/{coord_str}",
            params={"overview": "full", "geometries": "geojson", "steps": "false"},
            headers=_headers(),
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as exc:
        raise RoutingError(f"Routing service error: {exc}") from exc

    if data.get("code") != "Ok" or not data.get("routes"):
        raise RoutingError("No driving route found between the given locations.")

    r = data["routes"][0]
    geometry = [[c[1], c[0]] for c in r["geometry"]["coordinates"]]
    legs = [
        {"distance_miles": leg["distance"] / METERS_PER_MILE}
        for leg in r.get("legs", [])
    ]
    return {
        "geometry": geometry,
        "total_distance_miles": r["distance"] / METERS_PER_MILE,
        "legs": legs,
    }


def _haversine_miles(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    lat1, lng1 = math.radians(a[0]), math.radians(a[1])
    lat2, lng2 = math.radians(b[0]), math.radians(b[1])
    dlat, dlng = lat2 - lat1, lng2 - lng1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    return 3958.7613 * 2 * math.asin(math.sqrt(h))


class RouteInterpolator:
    def __init__(self, geometry: List[List[float]]):
        self.geometry = geometry
        self.cum = [0.0]
        for i in range(1, len(geometry)):
            self.cum.append(
                self.cum[-1] + _haversine_miles(geometry[i - 1], geometry[i])
            )
        self.total = self.cum[-1] if self.cum else 0.0

    def at(self, miles: float) -> Optional[List[float]]:
        if not self.geometry:
            return None
        if miles <= 0:
            return self.geometry[0]
        if miles >= self.total:
            return self.geometry[-1]
        for i in range(1, len(self.cum)):
            if self.cum[i] >= miles:
                seg_len = self.cum[i] - self.cum[i - 1]
                frac = 0.0 if seg_len == 0 else (miles - self.cum[i - 1]) / seg_len
                a, b = self.geometry[i - 1], self.geometry[i]
                return [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac]
        return self.geometry[-1]
