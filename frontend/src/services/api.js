// src/services/api.jsx
import axios from "axios";

const API = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8080";

export async function getHotspots(theme = "heat", limit = 200) {
  const url = `${API}/api/hotspots/?theme=${encodeURIComponent(theme)}&limit=${limit}`;
  const { data } = await axios.get(url);
  console.log(data);
  return data || [];
}

export async function getStats(hex_id) {
  const url = `${API}/api/stats/?hex_id=${encodeURIComponent(hex_id)}`;
  const { data } = await axios.get(url);
  return data;
}

// NEW: grid feed (hex attributes)
export async function getGrid(limit = 2000) {
  const url = `${API}/api/grid/?limit=${limit}`;
  const { data } = await axios.get(url);
  return data.items || [];
}

/* ──────────────────────────────────────────────────────────────
   Keep these so older imports don’t break (layers/chat)
   ────────────────────────────────────────────────────────────── */
export async function getLayers() {
  const { data } = await axios.get(`${API}/api/layers`);
  return data;
}

export async function postChat(question) {
  const { data } = await axios.post(`${API}/api/chat`, { question });
  return data;
}


export async function getParks(limit = 10) {
  const url = `${API}/api/recommend/parks?limit=${limit}`;
  const { data } = await axios.get(url);
  return data.items || [];
}

export async function getClinics(limit = 10) {
  const url = `${API}/api/recommend/clinics?limit=${limit}`;
  const { data } = await axios.get(url);
  return data.items || [];
}
