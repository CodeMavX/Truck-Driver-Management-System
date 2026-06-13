import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const STOP_STYLE = {
  start:   { color: "#3B82F6", icon: "A", label: "Start" },
  pickup:  { color: "#3B82F6", icon: "P", label: "Pickup" },
  dropoff: { color: "#f06a6f", icon: "D", label: "Drop-off" },
  fuel:    { color: "#F59E0B", icon: "⛽", label: "Fuel" },
  break:   { color: "#94A3BB", icon: "☕", label: "30-min break" },
  rest:    { color: "#64748B", icon: "🛏", label: "10-hr rest" },
  restart: { color: "#64748B", icon: "⏻", label: "34-hr restart" },
  stop:    { color: "#94A3BB", icon: "•", label: "Stop" },
};

const CHIP_ORDER = ["start", "pickup", "fuel", "break", "rest", "restart", "dropoff"];
const US_BOUNDS  = [[24.0, -126.0], [50.0, -66.0]];

const OSM_TILES = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
};

function pinIcon(type) {
  const s = STOP_STYLE[type] || STOP_STYLE.stop;
  return L.divIcon({
    className: "",
    html: `<div class="map-pin" style="background:${s.color}"><span>${s.icon}</span></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -24],
  });
}

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 1)
      map.fitBounds(bounds, { padding: [60, 60], animate: true });
  }, [bounds, map]);
  return null;
}

export default function RouteMap({ route, stops }) {
  const geometry  = route?.geometry || [];
  const safeStops = stops || [];

  const counts = safeStops.reduce((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1;
    return acc;
  }, {});

  const activeBounds = geometry.length > 1 ? geometry : US_BOUNDS;

  return (
    <div className="map-fullview">
      <MapContainer
        bounds={US_BOUNDS}
        boundsOptions={{ padding: [0, 0] }}
        scrollWheelZoom
        attributionControl={false}
        minZoom={3}
        maxBounds={[[5, -180], [75, 180]]}
        maxBoundsViscosity={1.0}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
      >
        <TileLayer
          url={OSM_TILES.url}
          attribution={OSM_TILES.attribution}
          maxZoom={OSM_TILES.maxZoom}
        />

        <FitBounds bounds={activeBounds} />

        {geometry.length > 1 && (
          <Polyline
            positions={geometry}
            pathOptions={{ color: "#3ee0bf", weight: 5, opacity: 0.9 }}
          />
        )}

        {safeStops.map((st, i) => (
          <Marker key={i} position={[st.lat, st.lng]} icon={pinIcon(st.type)}>
            <Popup>
              <strong>{st.label}</strong>
              <br />
              {st.name ? <span>{st.name}</span> : <span>Mile {st.mile?.toLocaleString()}</span>}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {CHIP_ORDER.some((t) => counts[t]) && (
        <div className="map-chips-overlay">
          {CHIP_ORDER.filter((t) => counts[t]).map((t) => (
            <span className="status-chip" key={t} style={{ "--chip": STOP_STYLE[t].color }}>
              <span className="pip" />
              {STOP_STYLE[t].label} <span className="ct">({counts[t]})</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
