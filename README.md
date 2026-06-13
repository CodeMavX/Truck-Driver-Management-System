# ELD Trip Planner

**Live demo:** [eld-trip-planner-zeta-six.vercel.app](https://eld-trip-planner-zeta-six.vercel.app)
**API:** [eld-trip-planner-api-pmq7.onrender.com](https://eld-trip-planner-api-pmq7.onrender.com)

A full-stack app that turns trip details into an HOS-compliant route plan and drawn FMCSA daily log sheets for a property-carrying truck driver.

Enter a current location, pickup, dropoff, and current cycle hours used — the app maps the route, schedules legally-required rests, breaks, and fuel stops, then renders one filled-out Driver's Daily Log grid per day of the trip.

Built with **Django REST Framework** (backend) and **React + Vite + Leaflet** (frontend).

---

## Features

- Route mapping with a free, key-less map stack (OpenStreetMap + OSRM)
- HOS engine implementing FMCSA 49 CFR Part 395 for the 70 hr / 8 day cycle:
  - 11-hour driving limit and 14-hour on-duty window
  - 30-minute break after 8 cumulative driving hours
  - 10-hour off-duty reset of the daily clocks
  - 70-hour / 8-day cycle limit with optional 34-hour restart
- Stops planned automatically and pinned to their geographic position on the route: pickup (1 h), drop-off (1 h), fuel every 1,000 mi, 30-min breaks, 10-h rests
- Drawn ELD log sheets — a real 24-hour grid per day with the duty-status step line, per-row totals, and a remarks list of duty-status changes
- Win11 Fluent design system with dark and light themes
- Collapsible Trip Summary Panel with daily breakdown bars and 24-hour timeline

---

## Project Structure

```
.
├── backend/                # Django + DRF API
│   ├── eldcore/            # project settings & urls
│   └── trips/
│       ├── hos.py          # HOS simulation engine
│       ├── logsheet.py     # segments → per-day log grids
│       ├── routing.py      # Nominatim geocoding + OSRM routing
│       ├── planner.py      # orchestrates routing + HOS + logs
│       ├── views.py        # /api/plan-trip/ endpoint
│       └── tests.py        # HOS engine unit tests
└── frontend/               # React + Vite SPA
    └── src/
        ├── api.js
        ├── App.jsx
        └── components/
            ├── TripForm.jsx
            ├── RouteMap.jsx
            ├── TripSummaryPanel.jsx
            ├── LogSheet.jsx
            └── LogSheetCard.jsx
```

---

## Assumptions

- Property-carrying driver, 70 hrs / 8 days, no adverse driving conditions
- Average speed 55 mph (used to convert route miles to driving hours)
- Fuel stop every 1,000 miles (~30 min on-duty each)
- 1 hour on-duty for pickup and 1 hour for drop-off
- Trip day modeled starting at 08:00 on Day 1
- "Current cycle used" is the on-duty hours already spent in the rolling 8-day cycle

---

## Running Locally

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

API available at `http://localhost:8000/api/`.

Run tests:

```bash
python manage.py test trips
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at the URL Vite prints (default `http://localhost:5173`). It calls `http://localhost:8000` by default; override with `VITE_API_URL` (see `.env.example`).

---

## Deployment

**Backend → Render**
- Root dir `backend`, build `./build.sh`, start `gunicorn eldcore.wsgi`
- Set `CORS_ALLOWED_ORIGINS` to the frontend URL
- `DATABASE_URL` is picked up automatically if a Postgres instance is attached (falls back to SQLite otherwise)

**Frontend → Vercel**
- Framework: Vite, output `dist`
- Set env var `VITE_API_URL` to the Render backend URL

---

## API

`POST /api/plan-trip/`

```json
{
  "current_location": "Dallas, TX",
  "pickup_location": "Oklahoma City, OK",
  "dropoff_location": "Chicago, IL",
  "current_cycle_used": 10
}
```

Returns `route` (geometry + distances), `stops` (geo-located events), `summary` (distance / hours / days / cycle), and `log_sheets` (per-day grids + remarks).

---

## Third-party APIs

- **Nominatim** (`nominatim.openstreetmap.org`) — forward geocoding
- **OSRM** (`router.project-osrm.org`) — driving routes and geometry
- **OpenStreetMap tiles** via Leaflet for the map

All free with no API key required.
