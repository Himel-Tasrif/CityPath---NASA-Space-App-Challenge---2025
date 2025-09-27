import { useMemo, useState } from "react";

export default function CreateEventForm({ source, onCreate, onDone }) {
  // source: { name, lat, lon, type: 'parks' | 'clinics' | 'heat' }
  const [title, setTitle] = useState("");
  const [datetime, setDatetime] = useState("");
  const [category, setCategory] = useState("Town Hall");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const canSubmit = title.trim().length > 0 && !!datetime && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      // datetime-local returns "YYYY-MM-DDTHH:mm" in local time
      const when = new Date(datetime);
      if (isNaN(when.getTime())) {
        throw new Error("Invalid date/time");
      }
      const whenISO = when.toISOString();

      await Promise.resolve(
        onCreate?.({
          title: title.trim(),
          whenISO,
          category,
          desc: desc.trim(),
        })
      );

      // Clear the form
      setTitle("");
      setDatetime("");
      setCategory("Town Hall");
      setDesc("");
      
      // Notify parent that event was created successfully
      // This should trigger the parent to close/hide the form
      if (onDone) {
        onDone("created");
      }
    } catch (e) {
      setError("Could not create event. Please check the fields and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Clear form and notify parent to close
    setTitle("");
    setDatetime("");
    setCategory("Town Hall");
    setDesc("");
    setError("");
    if (onDone) {
      onDone("cancelled");
    }
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 14, minWidth: 280 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontWeight: 700, color: "#059669" }}>
        <span style={{ fontSize: 18 }}>🗓️</span>
        Create Event
      </div>

      <div style={{ color: "#374151", marginBottom: 10 }}>
        <div style={{ fontWeight: 600 }}>{source?.name ?? "Selected Location"}</div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          {source?.lat?.toFixed ? source.lat.toFixed(5) : source?.lat},{" "}
          {source?.lon?.toFixed ? source.lon.toFixed(5) : source?.lon} • {source?.type}
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <label className="ui-label">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            className="ui-input"
          />
        </div>

        <div>
          <label className="ui-label">Date & Time</label>
          <input
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            className="ui-input"
          />
          <div className="ui-hint">Times are in your timezone: {tz}</div>
        </div>

        <div>
          <label className="ui-label">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="ui-input"
          >
            <option>Town Hall</option>
            <option>Community Cleanup</option>
            <option>Health Camp</option>
            <option>Tree Planting</option>
            <option>Workshop</option>
            <option>Safety Meeting</option>
          </select>
        </div>

        <div>
          <label className="ui-label">Description</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Details, agenda, who should attend..."
            rows={3}
            className="ui-input"
            style={{ resize: "vertical" }}
          />
        </div>

        {error && <div style={{ color: "#b91c1c", fontSize: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleCancel}
            disabled={submitting}
            className="ui-btn ui-btn--secondary"
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`ui-btn ${canSubmit ? "" : "ui-btn--disabled"}`}
            style={{ flex: 2 }}
            title={!title ? "Enter a title" : !datetime ? "Pick date & time" : "Create event"}
          >
            {submitting ? "Creating…" : "Create Event"}
          </button>
        </div>
      </div>
    </div>
  );
}