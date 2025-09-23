// src/services/api.js
import axios from "axios";

const API = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8080";

export async function getHotspots(theme = "heat", limit = 200) {
  const url = `${API}/api/hotspots/?theme=${encodeURIComponent(theme)}&limit=${limit}`;
  const { data } = await axios.get(url);
  return data || [];
}

export async function getStats(hex_id) {
  const url = `${API}/api/stats/?hex_id=${encodeURIComponent(hex_id)}`;
  const { data } = await axios.get(url);
  return data;
}

// Grid feed (hex attributes)
export async function getGrid(limit = 2000) {
  const url = `${API}/api/grid/?limit=${limit}`;
  const { data } = await axios.get(url);
  return data.items || [];
}

// Layers
export async function getLayers() {
  const { data } = await axios.get(`${API}/api/layers`);
  return data;
}

// Simple chat (non-streaming, old version) – keep for compatibility
export async function postChat(question) {
  const { data } = await axios.post(`${API}/api/chat`, { question });
  return data;
}

// Streaming chat (new, recommended)
// Chat streaming
export async function streamChat(question, onDelta) {
  const url = `${API}/api/chat/`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  if (!resp.body) throw new Error("No response body");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder("utf-8");

  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buf += decoder.decode(value, { stream: true });

    // Split by markers if present
    const parts = buf.split("[MARKERS]");
    if (parts.length > 1) {
      // First part is the text, second is JSON markers
      onDelta(parts[0], true, JSON.parse(parts[1]));
      buf = "";
    } else {
      onDelta(buf, false, null);
      buf = "";
    }
  }
}

// Recommendations
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