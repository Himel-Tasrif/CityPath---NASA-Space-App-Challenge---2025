// src/components/Map/MapView.jsx
import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import L from "leaflet";
import ChatBox from "../Chat/ChatBox.jsx";
import { BASEMAPS } from "../../config/layers.js";
import HexLayer from "./HexLayer.jsx";
import {
  getHotspots,
  getStats,
  getParks,
  getClinics,
} from "../../services/api.js";

import "leaflet/dist/leaflet.css";

// Fix default marker icons for bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px",
        borderRadius: 16,
        border: active ? "2px solid #1a73e8" : "1px solid #bbb",
        background: active ? "#e8f0fe" : "#fff",
        fontSize: 13,
        cursor: "pointer",
        marginRight: 8,
      }}
    >
      {children}
    </button>
  );
}

export default function MapView() {
  const center = useMemo(() => [23.78, 90.42], []);
  const [theme, setTheme] = useState("population"); // "heat" | "greenspace" | "population"

  // Red hotspots
  const [hotspots, setHotspots] = useState([]);
  const [activePopup, setActivePopup] = useState(null);

  // Recommendation overlays
  const [parks, setParks] = useState([]);
  const [clinics, setClinics] = useState([]);

  // Load top “heat” hotspots for dots
  useEffect(() => {
    (async () => {
      const hs = await getHotspots("heat", 50);
      // Your backend sometimes returns {items: [...]}, other times an array.
      setHotspots(hs.items || hs);
    })();
  }, []);

  async function openStats(hex_id, lat, lon) {
    try {
      const s = await getStats(hex_id);
      setActivePopup({ lat, lon, content: s });
    } catch {
      setActivePopup({
        lat,
        lon,
        content: { hex_id, error: "Stats not found" },
      });
    }
  }

  return (
    <MapContainer
      center={center}
      zoom={11}
      style={{ height: "100%", width: "100%" }}
    >
      {/* Top-left UI: choropleth theme + suggest buttons */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 1000,
          background: "white",
          padding: "8px 10px",
          borderRadius: 8,
          boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontWeight: 700, marginRight: 8 }}>Choropleth:</span>
          <Chip active={theme === "heat"} onClick={() => setTheme("heat")}>
            heat
          </Chip>
          <Chip
            active={theme === "greenspace"}
            onClick={() => setTheme("greenspace")}
          >
            greenspace
          </Chip>
          <Chip
            active={theme === "population"}
            onClick={() => setTheme("population")}
          >
            population
          </Chip>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={async () => setParks(await getParks(15))}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid #7e3ff2",
              background: "#f5f0ff",
              color: "#5125b6",
              cursor: "pointer",
            }}
            title="Suggest areas to add parks/trees"
          >
            Suggest Parks
          </button>
          <button
            onClick={async () => setClinics(await getClinics(15))}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid #1f78ff",
              background: "#eef5ff",
              color: "#0d4fb6",
              cursor: "pointer",
            }}
            title="Suggest candidate clinic sites"
          >
            Suggest Clinics
          </button>
        </div>
      </div>

      {/* Base map */}
      <TileLayer
        url={BASEMAPS.osm.url}
        attribution={BASEMAPS.osm.attribution}
      />

      {/* Choropleth polygons (under the dots) */}
      <HexLayer theme={theme} limit={2000} />

      {/* Hotspot dots (red) */}
      {hotspots.map((p) => (
        <CircleMarker
          key={`hot-${p.hex_id}`}
          center={[p.lat, p.lon]}
          radius={6}
          pathOptions={{ color: "#d33", weight: 2, fillOpacity: 0.85 }}
          eventHandlers={{ click: () => openStats(p.hex_id, p.lat, p.lon) }}
        />
      ))}

      {/* Park recommendations (purple) */}
      {parks.map((p) => (
        <CircleMarker
          key={`park-${p.hex_id}`}
          center={[p.lat, p.lon]}
          radius={7}
          pathOptions={{ color: "#7e3ff2", weight: 2, fillOpacity: 0.85 }}
        >
          <Popup>
            <div>
              <b>Park candidate</b>
              <br />
              Hex: {p.hex_id}
              <br />
              LST: {p.why?.lst_day_mean ?? "—"}
              <br />
              NDVI: {p.why?.ndvi_mean ?? "—"}
              <br />
              Pop: {p.why?.pop_density ?? "—"}
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {/* Clinic recommendations (blue) */}
      {clinics.map((p) => (
        <CircleMarker
          key={`clinic-${p.hex_id}`}
          center={[p.lat, p.lon]}
          radius={7}
          pathOptions={{ color: "#1f78ff", weight: 2, fillOpacity: 0.85 }}
        >
          <Popup>
            <div>
              <b>Clinic candidate</b>
              <br />
              Hex: {p.hex_id}
              <br />
              LST: {p.why?.lst_day_mean ?? "—"}
              <br />
              NDVI: {p.why?.ndvi_mean ?? "—"}
              <br />
              Pop: {p.why?.pop_density ?? "—"}
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {/* Stats popup for red hotspots */}
      {activePopup && (
        <Popup
          position={[activePopup.lat, activePopup.lon]}
          eventHandlers={{ remove: () => setActivePopup(null) }}
        >
          {activePopup.content?.error ? (
            <div>
              <b>Hex:</b> {activePopup.content.hex_id}
              <br />
              <b>Error:</b> {activePopup.content.error}
            </div>
          ) : (
            <div>
              <b>Hex:</b> {activePopup.content.hex_id}
              <br />
              <b>LST (°C):</b> {activePopup.content.lst_day_mean ?? "—"}
              <br />
              <b>NDVI:</b> {activePopup.content.ndvi_mean ?? "—"}
              <br />
              <b>Pop:</b> {activePopup.content.pop_density ?? "—"}
            </div>
          )}
        </Popup>
      )}

      <ChatBox
        onMarkers={(markers) => {
          console.log("ChatBox markers:", markers);
          // Later: decide to show them as clinics/parks
          setParks([]);
          setClinics([]);
          // Example: if question was about clinics you can setClinics(markers)
        }}
      />
    </MapContainer>
  );
}
