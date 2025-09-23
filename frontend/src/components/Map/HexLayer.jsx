// src/components/Map/HexLayer.jsx
import { useEffect, useMemo, useState } from "react";
import { Polygon, Tooltip } from "react-leaflet";
import * as h3 from "h3-js";
import { getGrid } from "../../services/api.js";

/* ── h3 v3/v4 compatibility ─────────────────────────────────────────────── */
function boundaryOf(hexId) {
  // h3 v4
  if (typeof h3.cellToBoundary === "function") {
    return h3.cellToBoundary(hexId, true); // [[lat,lng], ...]
  }
  // h3 v3
  if (typeof h3.h3ToGeoBoundary === "function") {
    return h3.h3ToGeoBoundary(hexId, true); // [[lat,lng], ...]
  }
  throw new Error("No h3 boundary function available");
}
/* ───────────────────────────────────────────────────────────────────────── */

/* Color helpers: high-contrast red→yellow→green for easy visual changes. */
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}
function makeColor(value, min, max, invert = false) {
  if (value == null || Number.isNaN(value)) return "#cccccc";
  const t0 = (value - min) / (max - min || 1);
  const t = clamp01(invert ? 1 - t0 : t0);

  // Ramp from red (low) → yellow → green (high). Very visible.
  const r = Math.round(255 * (1 - t));
  const g = Math.round(255 * t);
  const b = 90;
  return `rgb(${r},${g},${b})`;
}

export default function HexLayer({ theme = "heat", limit = 2000, onStats, onRange }) {
  const [rows, setRows] = useState([]);

  // Which metric to draw for a given theme
  const field =
    theme === "greenspace" ? "ndvi_mean" :
    theme === "population" ? "pop_density" :
    "lst_day_mean";

  useEffect(() => {
    (async () => {
      const items = await getGrid(limit);
      const cleaned = (items || []).filter(r => r.hex_id && r.lat != null && r.lon != null);
      setRows(cleaned);

      console.log("[HexLayer] sample rows:", cleaned.slice(0, 5));
    })();
  }, [limit]);

  // Compute domain for current field
  const [minVal, maxVal] = useMemo(() => {
    const vals = rows.map(r => r[field]).filter(v => v != null && !Number.isNaN(v));
    const min = vals.length ? Math.min(...vals) : 0;
    const max = vals.length ? Math.max(...vals) : 1;

    console.log(`[HexLayer] field="${field}" min=${min} max=${max} (n=${vals.length})`);
    return [min, max];
  }, [rows, field]);

  // Allow parent (MapView) to know current range for LegendControl
  useEffect(() => {
    if (onRange) onRange(field, minVal, maxVal);
  }, [field, minVal, maxVal, onRange]);

  // Extra logs when the user switches theme
  useEffect(() => {
    const ex = rows[0];
    console.log('[HexLayer] theme switched →', `"${theme}"`, ', using field', `"${field}"`);
    if (ex) {
      console.log('[HexLayer] render check:', {
        theme,
        field,
        example_hex: ex.hex_id,
        lst: ex.lst_day_mean,
        ndvi: ex.ndvi_mean,
        pop: ex.pop_density
      });
    }
  }, [theme, field, rows]);

  // Population is all zeros? Tell the console so you know why it looks flat.
  useEffect(() => {
    if (
      field === "pop_density" &&
      Number.isFinite(minVal) &&
      Number.isFinite(maxVal) &&
      maxVal === 0
    ) {
      console.warn("[HexLayer] population is all zero in current dataset — choropleth will look uniform.");
    }
  }, [field, minVal, maxVal]);

  return (
    <>
      {rows.map((r) => {
        let coords;
        try {
          coords = boundaryOf(r.hex_id).map(([lat, lng]) => [lat, lng]);
        } catch {
          return null; // skip any invalid hex
        }

        const color = makeColor(
          r[field],
          minVal,
          maxVal,
          theme === "greenspace" // invert so greener → “better” (greener color)
        );

        return (
          <Polygon
            key={r.hex_id}
            positions={coords}
            pathOptions={{
              color: "#222",
              weight: 0.6,
              fillColor: color,
              fillOpacity: 0.6
            }}
            eventHandlers={{
              click: () => onStats?.(r.hex_id, r.lat, r.lon),
            }}
          >
            <Tooltip sticky>
              <div style={{ minWidth: 160 }}>
                <div><b>Hex:</b> {r.hex_id}</div>
                <div><b>LST (°C):</b> {r.lst_day_mean ?? "—"}</div>
                <div><b>NDVI:</b> {r.ndvi_mean ?? "—"}</div>
                <div><b>Pop:</b> {r.pop_density ?? "—"}</div>
              </div>
            </Tooltip>
          </Polygon>
        );
      })}
    </>
  );
}
