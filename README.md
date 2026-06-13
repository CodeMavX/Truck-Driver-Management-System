# 🚚 ELD Trip Planner

A full-stack app that turns trip details into an **HOS-compliant route plan** and
**drawn FMCSA daily log sheets** for a property-carrying truck driver.

Enter a current location, pickup, dropoff, and current cycle hours used — the app
maps the route, schedules legally-required rests / breaks / fuel stops, and renders
one filled-out **Driver's Daily Log** grid per day of the trip.

Built with **Django REST Framework** (backend) and **React + Vite + Leaflet** (frontend).

---

## ✨ Features

- **Route mapping** with a free, key-less map stack (OpenStreetMap + OSRM).
- **HOS engine** implementing FMCSA 49 CFR Part 395 for the 70 hr / 8 day cycle:
  - 11-hour driving limit & 14-hour on-duty window
  - 30-minute break after 8 cumulative driving hours
  - 10-hour off-duty reset of the daily clocks
  - 70-hour / 8-day cycle limit with optional 34-hour restart
- **Stops planned automatically** and pinned to their geographic position on the route:
  pickup (1 h), drop-off (1 h), fuel every 1,000 mi, 30-min breaks, 10-h rests.
- **Drawn ELD log sheets** — a real 24-hour grid per day with the duty-status step line,
  per-row totals, and a remarks list of duty-status changes. Long trips produce
  multiple sheets.
- Clean, responsive UI with summary stats and a Map / Logs tab switch.

---

## 🧱 Project structure

```
.
├── backend/                # Django + DRF API
│   ├── eldcore/            # project settings & urls
│   └── trips/
│       ├── hos.py          # ⭐ HOS simulation engine (the accuracy core)
│       ├── logsheet.py     # segments -> per-day log grids
│       ├── routing.py      # Nominatim geocoding + OSRM routing + interpolation
│       ├── planner.py      # orchestrates routing + HOS + logs
│       ├── views.py        # /api/plan-trip/ endpoint
│       └── tests.py        # HOS engine unit tests
└── frontend/               # React + Vite SPA
    └── src/
        ├── api.js
        ├── App.jsx
        └── components/
            ├── TripForm.jsx
            ├── RouteMap.jsx        # Leaflet map + colored stop markers
            ├── LogSheet.jsx        # ⭐ SVG drawing of the FMCSA grid
            └── LogSheetCard.jsx
```

---

## 🔧 Assumptions (per the brief)

- Property-carrying driver, **70 hrs / 8 days**, no adverse driving conditions.
- **Average speed 55 mph** (used to convert route miles ↔ driving hours).
- **Fuel stop every 1,000 miles** (~30 min on-duty each).
- **1 hour** on-duty for pickup and **1 hour** for drop-off.
- The trip day is modeled starting at **08:00** home-terminal time on Day 1.
- "Current cycle used" is the on-duty hours already spent in the rolling 8-day cycle.

---

## 🚀 Running locally

### Backend (Django)

```bash
cd backend
python -m venv venv
venv\Scripts\activate           # Windows  (use: source venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

API is now at `http://localhost:8000/api/`.

Run the HOS test suite:

```bash
python manage.py test trips
```

### Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

App is at the URL Vite prints (e.g. `http://localhost:5173`). It talks to
`http://localhost:8000` by default; override with `VITE_API_URL` (see `.env.example`).

---

## ☁️ Deployment

The frontend and backend deploy independently.

**Backend → Render** (`render.yaml` included):
- Root dir `backend`, build `./build.sh`, start `gunicorn eldcore.wsgi`.
- Set `CORS_ALLOWED_ORIGINS` to the deployed frontend URL.
- `DATABASE_URL` is picked up automatically if a Postgres instance is attached
  (falls back to SQLite otherwise).

**Frontend → Vercel** (`frontend/vercel.json` included):
- Framework: Vite, output `dist`.
- Set env var `VITE_API_URL` to the Render backend URL.

---

## 🔌 API

`POST /api/plan-trip/`

```json
{
  "current_location": "Dallas, TX",
  "pickup_location": "Oklahoma City, OK",
  "dropoff_location": "Chicago, IL",
  "current_cycle_used": 10
}
```

Returns `route` (geometry + distances), `stops` (geo-located events), `summary`
(distance / hours / days / cycle), and `log_sheets` (per-day grids + remarks).

---

## 🛰️ Third-party APIs (free, no key required)

- **Nominatim** (`nominatim.openstreetmap.org`) — forward geocoding.
- **OSRM** (`router.project-osrm.org`) — driving routes & geometry.
- **OpenStreetMap tiles** via Leaflet for the map.

These public demo endpoints are rate-limited; for heavy production traffic, swap in a
self-hosted OSRM/Nominatim or a keyed provider (e.g. OpenRouteService).
