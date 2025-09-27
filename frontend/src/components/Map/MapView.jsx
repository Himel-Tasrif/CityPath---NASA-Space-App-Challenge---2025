import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import L from "leaflet";
import ChatBox from "../Chat/ChatBox.jsx";
import { BASEMAPS } from "../../config/layers.js";
import HexLayer from "./HexLayer.jsx";
import { getHotspots, getStats } from "../../services/api.js";
import CreateEventForm from "../Events/CreateEventForm.jsx";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Gradient marker
function GradientMarker({ center, color, children, onClick, size = 8, intensity = 1 }) {
  const [isHovered, setIsHovered] = useState(false);
  const baseOpacity = Math.min(intensity, 1);
  const hoverMultiplier = isHovered ? 1.5 : 1;

  return (
    <>
      <CircleMarker
        center={center}
        radius={size * 4 * hoverMultiplier}
        pathOptions={{ color, weight: 0, fillColor: color, fillOpacity: baseOpacity * 0.05 }}
      />
      <CircleMarker
        center={center}
        radius={size * 2.5 * hoverMultiplier}
        pathOptions={{ color, weight: 0, fillColor: color, fillOpacity: baseOpacity * 0.15 }}
      />
      <CircleMarker
        center={center}
        radius={size * 1.8 * hoverMultiplier}
        pathOptions={{ color, weight: 0, fillColor: color, fillOpacity: baseOpacity * 0.25 }}
      />
      
      <CircleMarker
        center={center}
        radius={size * hoverMultiplier}
        pathOptions={{
          color: color,
          weight: 2,
          fillColor: color,
          fillOpacity: baseOpacity * 0.9,
        }}
        eventHandlers={{
          ...(typeof onClick === "function" ? { click: onClick } : {}),
          mouseover: () => setIsHovered(true),
          mouseout: () => setIsHovered(false),
        }}
      >
        {children}
      </CircleMarker>
    </>
  );
}

function Chip({ active, onClick, children, color = "#1a73e8" }) {
  return (
    <button
      onClick={onClick}
      className={`chip ${active ? "chip--active" : ""}`}
      style={{ "--chip-color": color }}
    >
      {children}
    </button>
  );
}

export default function MapView({ role = "local-leader" }) {
  const center = useMemo(() => [23.78, 90.42], []);
  const [theme, setTheme] = useState("population");
  const [hotspots, setHotspots] = useState([]);
  const [activePopup, setActivePopup] = useState(null);

  // AI markers coming from ChatBox
  const [aiMarkers, setAiMarkers] = useState([]);
  const [markerType, setMarkerType] = useState(""); // 'parks' | 'clinics' | 'heat' | 'general'

  // Events
  const [events, setEvents] = useState([]);
  const [showEventBar, setShowEventBar] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState("");

  const isLocalLeader = role === "local-leader";

  // Load hotspots (heat hexes)
  useEffect(() => {
    (async () => {
      try {
        const hs = await getHotspots("heat", 50);
        setHotspots(hs.items || hs);
      } catch (error) {
        console.error("Error loading hotspots:", error);
      }
    })();
  }, []);

  async function openStats(hex_id, lat, lon) {
    try {
      const s = await getStats(hex_id);
      setActivePopup({ lat, lon, content: s });
    } catch {
      setActivePopup({ lat, lon, content: { hex_id, error: "Stats not found" } });
    }
  }

  const handleAIMarkers = (markers, type = "general") => {
    setAiMarkers(markers || []);
    setMarkerType(type);
  };

  const getMarkerColor = (type) => {
    switch (type) {
      case "parks": return "#10b981";
      case "clinics": return "#3b82f6";
      case "heat": return "#ef4444";
      case "event": return "#8b5cf6";
      default: return "#8b5cf6";
    }
  };

  const getMarkerIcon = (type) => {
    switch (type) {
      case "parks": return "🌳";
      case "clinics": return "🏥";
      case "heat": return "🔥";
      case "event": return "🗓️";
      default: return "📍";
    }
  };

  const canCreateEventFromType = (type) => ["parks", "clinics", "heat"].includes(type);

  const addEvent = ({ title, whenISO, category, desc, source }) => {
    const ev = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      lat: source.lat,
      lon: source.lon,
      title,
      whenISO,
      category,
      desc,
      sourceType: source.type,
      sourceName: source.name,
    };
    setEvents((prev) => [...prev, ev]);
    setToast("Event created");
    setShowEventBar(true);
    setTimeout(() => setToast(""), 1800);
  };

  // Helper to pan/zoom to an event on click
  const [map, setMap] = useState(null);
  const flyToEvent = (ev) => {
    if (!map) return;
    map.setView([ev.lat, ev.lon], Math.max(map.getZoom(), 15), { animate: true });
  };

  return (
    <>
      <style>
        {`
          .chip {
            padding: 8px 16px; border-radius: 20px; border: 2px solid transparent;
            background: rgba(255, 255, 255, 0.95); color: #666; font-size: 14px; font-weight: 500;
            cursor: pointer; margin-right: 8px; transition: all .3s cubic-bezier(.4,0,.2,1);
            backdrop-filter: blur(10px); box-shadow: 0 2px 8px rgba(0,0,0,.1);
          }
          .chip--active {
            border-color: var(--chip-color);
            background: color-mix(in srgb, var(--chip-color) 15%, white);
            color: var(--chip-color); font-weight: 600; transform: translateY(-1px);
            box-shadow: 0 4px 12px color-mix(in srgb, var(--chip-color) 30%, transparent);
          }
          .control-panel {
            position: absolute; top: 20px; left: 20px; z-index: 1000; backdrop-filter: blur(20px);
            background: rgba(255, 255, 255, 0.95); border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 20px 24px; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.12);
            font-family: system-ui, -apple-system, sans-serif; min-width: 320px;
          }
          .role-badge {
            display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 999px;
            font-weight: 700; font-size: 12px; letter-spacing: .3px; color: #0f172a;
            background: rgba(14,165,233,.12); border: 1px solid rgba(14,165,233,.25);
          }
          .role-badge--leader { background: rgba(16,185,129,.12); border-color: rgba(16,185,129,.25); }
          .legend { margin-top: 16px; font-size: 12px; color: #6b7280; }
          .legend-item { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
          .legend-dot { width: 12px; height: 12px; border-radius: 50%; }
          .ui-label { display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px; }
          .ui-input { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #e5e7eb; outline: none; font-size: 14px; background: #fff; box-shadow: 0 1px 0 rgba(0,0,0,0.02); }
          .ui-input:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.15); }
          .ui-btn { padding: 10px 12px; border-radius: 10px; border: 1px solid #10b981; background: linear-gradient(135deg, #10b981, #059669); color: white; font-weight: 700; letter-spacing: .2px; box-shadow: 0 6px 18px rgba(16,185,129,0.30); cursor: pointer; }
          .ui-btn--disabled { opacity: .65; cursor: not-allowed; filter: grayscale(.2); }
          .ui-hint { font-size: 11px; color: #94a3b8; margin-top: 4px; }

          .toast {
            position: absolute; top: 20px; right: 20px; z-index: 1200;
            background: #065f46; color: white; padding: 10px 14px; border-radius: 10px;
            box-shadow: 0 8px 30px rgba(0,0,0,.18); font-weight: 700; letter-spacing: .2px; font-size: 13px;
          }

          /* Event Bar styles */
          .event-bar {
            position: absolute; bottom: 20px; left: 20px; z-index: 1100;
            width: 360px; max-height: 40vh; display: flex; flex-direction: column;
            background: rgba(255,255,255,0.95); border: 1px solid rgba(0,0,0,0.08);
            border-radius: 14px; box-shadow: 0 12px 30px rgba(0,0,0,0.15); overflow: hidden;
            backdrop-filter: blur(10px);
          }
          .event-bar__header {
            display: flex; align-items: center; justify-content: space-between; gap: 8px;
            padding: 10px 12px; border-bottom: 1px solid rgba(0,0,0,0.06);
            background: linear-gradient(180deg, rgba(139,92,246,0.10), rgba(255,255,255,0));
          }
          .event-bar__title {
            display: inline-flex; align-items: center; gap: 8px; font-weight: 800; color: #4c1d95; font-size: 13px;
          }
          .event-bar__badge {
            background: #8b5cf6; color: white; font-weight: 700; font-size: 12px; padding: 2px 8px; border-radius: 999px;
          }
          .event-bar__toggle {
            background: transparent; border: none; color: #4c1d95; font-weight: 700; cursor: pointer;
          }
          .event-bar__list {
            overflow-y: auto; padding: 8px;
          }
          .event-item {
            display: grid; grid-template-columns: 1fr auto; gap: 4px 8px;
            padding: 10px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.06);
            background: white; margin-bottom: 8px; transition: box-shadow .2s ease, transform .05s ease;
            cursor: pointer;
          }
          .event-item:hover {
            box-shadow: 0 6px 20px rgba(139,92,246,0.25);
          }
          .event-item__title {
            font-weight: 700; color: #111827; font-size: 13px;
          }
          .event-item__meta {
            grid-column: 1 / -1; color: #6b7280; font-size: 12px; display: flex; gap: 6px; flex-wrap: wrap;
          }
          .event-item__category {
            background: rgba(139,92,246,0.12); color: #6d28d9; padding: 2px 6px; border-radius: 999px; font-weight: 700; font-size: 11px;
          }
          .event-item__loc {
            color: #4b5563;
          }

          .event-bar--collapsed {
            height: auto;
          }
          .event-bar--collapsed .event-bar__list {
            display: none;
          }
        `}
      </style>

      {toast && <div className="toast">✅ {toast}</div>}

      <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }} whenCreated={setMap}>
        {/* Control panel */}
        <div className="control-panel">
          {/* <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div className={`role-badge ${isLocalLeader ? "role-badge--leader" : ""}`}>
              <span style={{ fontSize: 14 }}>{isLocalLeader ? "🏛️" : "🏙️"}</span>
              {isLocalLeader ? "Local Leader Mode" : "Urban Planner Mode"}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Chip active={theme === "heat"} onClick={() => setTheme("heat")} color="#ef4444">🔥 Heat</Chip>
              <Chip active={theme === "greenspace"} onClick={() => setTheme("greenspace")} color="#22c55e">🌳 Green</Chip>
              <Chip active={theme === "population"} onClick={() => setTheme("population")} color="#3b82f6">👥 Pop</Chip>
            </div>
          </div> */}

          <div className="legend">
            <div className="legend-item">
              <div className="legend-dot" style={{ background: "#ef4444" }}></div>
              <span>Heat Hotspots ({hotspots.length})</span>
            </div>
            {events.length > 0 && (
              <div className="legend-item">
                <div className="legend-dot" style={{ background: getMarkerColor("event") }}></div>
                <span>Community Events ({events.length})</span>
              </div>
            )}
            {aiMarkers.length > 0 && (
              <div className="legend-item">
                <div className="legend-dot" style={{ background: getMarkerColor(markerType) }}></div>
                <span>AI Suggestions ({aiMarkers.length})</span>
              </div>
            )}
          </div>
        </div>

        {/* Event Bar (shows after first event) */}
        {events.length > 0 && (
          <div className={`event-bar ${showEventBar ? "" : "event-bar--collapsed"}`}>
            <div className="event-bar__header">
              <div className="event-bar__title">
                <span style={{ fontSize: 16 }}>🗓️</span>
                Community Events
                <span className="event-bar__badge">{events.length}</span>
              </div>
              <button
                className="event-bar__toggle"
                onClick={() => setShowEventBar((v) => !v)}
                aria-label={showEventBar ? "Collapse event bar" : "Expand event bar"}
                title={showEventBar ? "Collapse" : "Expand"}
              >
                {showEventBar ? "Hide ▾" : "Show ▴"}
              </button>
            </div>
            <div className="event-bar__list">
              {events
                .slice()
                .sort((a, b) => new Date(a.whenISO) - new Date(b.whenISO))
                .map((ev) => (
                  <div key={ev.id} className="event-item" onClick={() => flyToEvent(ev)}>
                    <div className="event-item__title">{ev.title}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      {new Date(ev.whenISO).toLocaleString()}
                    </div>
                    <div className="event-item__meta">
                      {ev.category && <span className="event-item__category">{ev.category}</span>}
                      <span className="event-item__loc">📍 {ev.sourceName}</span>
                      <span>• {ev.lat.toFixed(4)}, {ev.lon.toFixed(4)}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Base map */}
        <TileLayer url={BASEMAPS.osm.url} attribution={BASEMAPS.osm.attribution} />

        {/* Choropleth */}
        <HexLayer theme={theme} limit={2000} />

        {/* Heat hotspots (click to open stats + create event) */}
        {hotspots.map((p) => (
          <GradientMarker
            key={`hot-${p.hex_id}`}
            center={[p.lat, p.lon]}
            color={getMarkerColor("heat")}
            size={6}
            intensity={0.8}
            onClick={() => openStats(p.hex_id, p.lat, p.lon)}
          />
        ))}

        {/* Events created */}
        {events.map((ev) => (
          <GradientMarker
            key={`ev-${ev.id}`}
            center={[ev.lat, ev.lon]}
            color={getMarkerColor("event")}
            size={9}
            intensity={1}
          >
            <Popup>
              <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 14, padding: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontWeight: 700, color: getMarkerColor("event") }}>
                  <span style={{ fontSize: 18 }}>🗓️</span>
                  Community Event
                </div>
                <div style={{ color: "#111827" }}>
                  <div style={{ fontWeight: 700 }}>{ev.title}</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
                    {new Date(ev.whenISO).toLocaleString()}
                    {ev.category ? ` • ${ev.category}` : ""}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <strong>Location:</strong> {ev.sourceName} <br />
                    <span style={{ fontSize: 12, color: "#6b7280" }}>
                      {ev.lat.toFixed(5)}, {ev.lon.toFixed(5)} • {ev.sourceType}
                    </span>
                  </div>
                  {ev.desc && <div style={{ marginTop: 8 }}>{ev.desc}</div>}
                </div>
              </div>
            </Popup>
          </GradientMarker>
        ))}

        {/* AI-suggested markers (parks/clinics/heat) */}
        {aiMarkers.map((p, i) => {
          const type = markerType;
          const color = getMarkerColor(type);
          const icon = getMarkerIcon(type);
          const displayName =
            p.name ||
            (type === "parks"
              ? "Suggested Park Site"
              : type === "clinics"
              ? "Suggested Clinic Site"
              : type === "heat"
              ? "Heat Stress Area"
              : "AI Suggestion");

        return (
            <GradientMarker key={`ai-${p.hex_id || i}`} center={[p.lat, p.lon]} color={color} size={8} intensity={0.9}>
              <Popup>
                <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 14, padding: 12, borderRadius: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontWeight: 700, color }}>
                    <span style={{ fontSize: 18 }}>{icon}</span>
                    {displayName}
                  </div>

                  {(p.hex_id || p.why) && (
                    <div style={{ color: "#4b5563", marginBottom: isLocalLeader && canCreateEventFromType(type) ? 10 : 0 }}>
                      {p.hex_id && <div style={{ fontSize: 12 }}><strong>Hex ID:</strong> {p.hex_id}</div>}
                      {"why" in p && (
                        <>
                          {"lst_day_mean" in (p.why || {}) && <div style={{ fontSize: 12 }}><strong>Temperature:</strong> {p.why.lst_day_mean}°C</div>}
                          {"ndvi_mean" in (p.why || {}) && <div style={{ fontSize: 12 }}><strong>Vegetation:</strong> {p.why.ndvi_mean}</div>}
                          {"pop_density" in (p.why || {}) && <div style={{ fontSize: 12 }}><strong>Population:</strong> {p.why.pop_density}</div>}
                        </>
                      )}
                    </div>
                  )}

                  {isLocalLeader && canCreateEventFromType(type) && (
                    <CreateEventForm
                      source={{ name: displayName, lat: p.lat, lon: p.lon, type }}
                      onCreate={({ title, whenISO, category, desc }) =>
                        addEvent({
                          title,
                          whenISO,
                          category,
                          desc,
                          source: { name: displayName, lat: p.lat, lon: p.lon, type },
                        })
                      }
                      onDone={() => setToast("Event created")}
                    />
                  )}
                </div>
              </Popup>
            </GradientMarker>
          );
        })}

        {/* Stats popup for heat hotspots (with Create Event) */}
        {activePopup && (
          <Popup position={[activePopup.lat, activePopup.lon]} eventHandlers={{ remove: () => setActivePopup(null) }}>
            <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 14, padding: 12, borderRadius: 8, maxWidth: 320 }}>
              {activePopup.content?.error ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontWeight: 700, color: "#ef4444" }}>
                    <span style={{ fontSize: 18 }}>⚠️</span>
                    Error
                  </div>
                  <div style={{ color: "#4b5563" }}>
                    <div><strong>Hex:</strong> {activePopup.content.hex_id}</div>
                    <div><strong>Error:</strong> {activePopup.content.error}</div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontWeight: 700, color: "#ef4444" }}>
                    <span style={{ fontSize: 18 }}>🔥</span>
                    Heat Hotspot
                  </div>
                  <div style={{ color: "#4b5563", marginBottom: isLocalLeader ? 10 : 0 }}>
                    <div><strong>Hex ID:</strong> {activePopup.content.hex_id}</div>
                    <div><strong>Temperature:</strong> {activePopup.content.lst_day_mean ?? "—"}°C</div>
                    <div><strong>Vegetation:</strong> {activePopup.content.ndvi_mean ?? "—"}</div>
                    <div><strong>Population:</strong> {activePopup.content.pop_density ?? "—"}</div>
                  </div>

                  {isLocalLeader && (
                    <CreateEventForm
                      source={{
                        name: `Heat Hotspot (${activePopup.content?.hex_id || "unknown hex"})`,
                        lat: activePopup.lat,
                        lon: activePopup.lon,
                        type: "heat",
                      }}
                      onCreate={({ title, whenISO, category, desc }) =>
                        addEvent({
                          title,
                          whenISO,
                          category,
                          desc,
                          source: {
                            name: `Heat Hotspot (${activePopup.content?.hex_id || "unknown hex"})`,
                            lat: activePopup.lat,
                            lon: activePopup.lon,
                            type: "heat",
                          },
                        })
                      }
                      onDone={() => setToast("Event created")}
                    />
                  )}
                </>
              )}
            </div>
          </Popup>
        )}

        <ChatBox onMarkers={handleAIMarkers} />
      </MapContainer>
    </>
  );
}