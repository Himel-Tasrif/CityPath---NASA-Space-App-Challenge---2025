// src/components/Chat/ChatBox.jsx
import { useState } from "react";
import { streamChat } from "../../services/api.js";

export default function ChatBox({ onMarkers }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!question.trim()) return;
    setAnswer("");
    setLoading(true);

    try {
      await streamChat(question, (chunk, isFinal, markers) => {
        setAnswer((prev) => prev + chunk);
        if (isFinal && markers) {
          console.log("Markers from backend:", markers);
          onMarkers?.(markers);
        }
      });
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom: 10,
        left: 10,
        zIndex: 1200,
        background: "white",
        padding: "8px",
        borderRadius: 8,
        width: 300,
        boxShadow: "0 6px 12px rgba(0,0,0,0.2)",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ marginBottom: 6 }}>
        <textarea
          rows={2}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask: where to add parks? clinics?"
          style={{
            width: "100%",
            resize: "none",
            padding: 6,
            borderRadius: 6,
            border: "1px solid #ccc",
            fontSize: 13,
          }}
        />
      </div>
      <button
        onClick={handleSend}
        disabled={loading}
        style={{
          padding: "6px 12px",
          borderRadius: 6,
          border: "none",
          background: "#1a73e8",
          color: "white",
          cursor: "pointer",
          fontSize: 13,
        }}
      >
        {loading ? "Thinking..." : "Send"}
      </button>
      <div
        style={{
          marginTop: 8,
          fontSize: 13,
          whiteSpace: "pre-wrap",
          maxHeight: 160,
          overflowY: "auto",
        }}
      >
        {answer}
      </div>
    </div>
  );
}
