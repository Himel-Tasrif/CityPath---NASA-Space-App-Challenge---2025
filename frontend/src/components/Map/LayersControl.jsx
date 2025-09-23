// src/components/Map/LayersControl.jsx
import { LayersControl, TileLayer, LayerGroup } from "react-leaflet";

export default function LayersControlPanel({ basemap, overlays }) {
  return (
    <LayersControl position="topright">
      {/* Base map */}
      {basemap?.url && (
        <LayersControl.BaseLayer checked name="OpenStreetMap">
          <TileLayer url={basemap.url} attribution={basemap.attribution} />
        </LayersControl.BaseLayer>
      )}

      {/* Overlays (optional) */}
      {overlays?.no2?.url && (
        <LayersControl.Overlay name="NO₂ (NASA GIBS)">
          <TileLayer url={overlays.no2.url} attribution="NASA GIBS" />
        </LayersControl.Overlay>
      )}

      {/* A safe empty group to avoid runtime errors */}
      <LayersControl.Overlay name="Data" checked>
        <LayerGroup />
      </LayersControl.Overlay>
    </LayersControl>
  );
}
