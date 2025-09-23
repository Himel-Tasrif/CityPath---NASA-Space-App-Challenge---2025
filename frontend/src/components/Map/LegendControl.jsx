// src/components/Map/LegendControl.jsx
import { useEffect, useMemo } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

/**
 * LegendControl renders a simple legend in the bottom-right corner.
 * It updates whenever the field or min/max range changes.
 */
export default function LegendControl({ field, min, max }) {
  const map = useMap();
  const container = useMemo(() => L.DomUtil.create("div", "info legend"), []);

  useEffect(() => {
    if (!map) return;

    // Style
    container.style.background = "white";
    container.style.padding = "6px 10px";
    container.style.borderRadius = "6px";
    container.style.boxShadow = "0 0 6px rgba(0,0,0,0.2)";
    container.style.fontSize = "12px";
    container.style.lineHeight = "16px";

    const grades = 5;
    const step = (max - min) / grades;

    container.innerHTML = `<div style="font-weight:bold;margin-bottom:4px">${field}</div>`;
    for (let i = 0; i <= grades; i++) {
      const v = min + step * i;
      // red→green ramp (same as HexLayer)
      const r = Math.round(255 * (1 - i / grades));
      const g = Math.round(255 * (i / grades));
      const b = 90;
      const color = `rgb(${r},${g},${b})`;

      container.innerHTML += `
        <div style="display:flex;align-items:center;margin-bottom:2px">
          <span style="display:inline-block;width:18px;height:12px;background:${color};margin-right:6px"></span>
          ${v.toFixed(1)}
        </div>
      `;
    }

    const control = L.control({ position: "bottomright" });
    control.onAdd = () => container;
    control.addTo(map);

    return () => {
      control.remove();
    };
  }, [map, field, min, max, container]);

  return null;
}
