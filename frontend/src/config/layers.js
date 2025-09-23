// src/config/layers.js

// Free OSM basemap
export const BASEMAPS = {
  osm: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
  },
  // You can add other tile layers here if needed
};

// NASA GIBS example: NO₂ daily
export const NASA_LAYERS = {
  no2: {
    url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/OMI_NO2_Column_Amount_Tropospheric/default/{time}/{tileMatrixSet}/{z}/{y}/{x}.png",
    tileSize: 256,
    attribution: "NASA GIBS",
  },
};
