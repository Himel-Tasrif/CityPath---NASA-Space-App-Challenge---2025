// Unified dataset fetchers for points coming from your backend.
// Configure API base via Vite env or fallback.
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) ||
  "http://localhost:3000";

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} for ${url}: ${text}`);
  }
  return res.json();
}

/**
 * Expected shape for each endpoint: array of objects with:
 * - name: string
 * - lat: number
 * - lon: number
 * Optionally: id, meta
 * Adjust mapper if your schema differs.
 */

export async function getPOIs(limit = 200) {
  const data = await getJSON(`${API_BASE}/pois?limit=${limit}`);
  return (Array.isArray(data) ? data : data.items || []).map((d, i) => ({
    id: d.id ?? `poi-${i}`,
    name: d.name ?? "POI",
    lat: Number(d.lat),
    lon: Number(d.lon),
    meta: d.meta ?? {},
  }));
}

export async function getParks(limit = 300) {
  const data = await getJSON(`${API_BASE}/parks?limit=${limit}`);
  return (Array.isArray(data) ? data : data.items || []).map((d, i) => ({
    id: d.id ?? `park-${i}`,
    name: d.name ?? "Park",
    lat: Number(d.lat),
    lon: Number(d.lon),
    meta: d.meta ?? {},
  }));
}

export async function getClinics(limit = 300) {
  const data = await getJSON(`${API_BASE}/clinics?limit=${limit}`);
  return (Array.isArray(data) ? data : data.items || []).map((d, i) => ({
    id: d.id ?? `clinic-${i}`,
    name: d.name ?? "Clinic",
    lat: Number(d.lat),
    lon: Number(d.lon),
    meta: d.meta ?? {},
  }));
}

// High-density population points (centroids or representative points)
export async function getPopulationPoints(limit = 400) {
  const data = await getJSON(`${API_BASE}/population-points?limit=${limit}`);
  return (Array.isArray(data) ? data : data.items || []).map((d, i) => ({
    id: d.id ?? `pop-${i}`,
    name: d.name ?? "Population Hotspot",
    lat: Number(d.lat),
    lon: Number(d.lon),
    density: d.density ?? d.pop_density ?? null,
    meta: d.meta ?? {},
  }));
}