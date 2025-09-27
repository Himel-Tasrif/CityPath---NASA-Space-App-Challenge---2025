import { useState, useRef, useEffect, useCallback } from "react";
import { streamChat } from "../../services/api.js";

export default function ChatBox({ onMarkers }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [conversation, setConversation] = useState([]);
  const textareaRef = useRef(null);
  const bodyRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    if (!bodyRef.current) return;
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversation, answer, scrollToBottom]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [question]);

  const detectMarkerType = (question) => {
    const q = question.toLowerCase();
    if (q.includes('park') || q.includes('green') || q.includes('tree')) return 'parks';
    if (q.includes('clinic') || q.includes('hospital') || q.includes('health')) return 'clinics';
    if (q.includes('heat') || q.includes('hot') || q.includes('temperature')) return 'heat';
    return 'general';
  };

  const send = useCallback(async () => {
    const q = question.trim();
    if (!q || loading) return;

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const markerType = detectMarkerType(q);
    
    setConversation((prev) => [...prev, { type: "user", content: q, time }]);
    setQuestion("");
    setAnswer("");
    setLoading(true);

    try {
      let full = "";
      await streamChat(q, (chunk, isFinal, markers) => {
        if (!isFinal) {
          full += chunk;
          setAnswer(full);
        } else {
          const time2 = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          setConversation((prev) => [
            ...prev,
            { type: "assistant", content: full, time: time2, markers: markers || undefined },
          ]);
          setAnswer("");
          if (markers && markers.length > 0) {
            onMarkers?.(markers, markerType);
          }
        }
      });
    } catch (e) {
      const time2 = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setConversation((prev) => [
        ...prev,
        {
          type: "error",
          content: "Sorry, something went wrong. Please try again.",
          time: time2,
        },
      ]);
      setAnswer("");
      console.error("Chat error:", e);
    } finally {
      setLoading(false);
    }
  }, [question, loading, onMarkers]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = () => {
    setConversation([]);
    setAnswer("");
    setQuestion("");
    onMarkers?.([], '');
  };

  const quickPrompts = [
    "Where should we add more parks?",
    "Find optimal clinic locations", 
    "Show areas with high heat stress",
    "Suggest green infrastructure",
  ];

  return (
    <>
      <style>
        {`
          .chatbox {
            position: absolute;
            bottom: 24px;
            right: 24px;
            z-index: 1200;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(24px);
            border-radius: 24px;
            box-shadow: 
              0 20px 60px rgba(0, 0, 0, 0.15),
              0 8px 32px rgba(0, 0, 0, 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.4);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            border: 1px solid rgba(255, 255, 255, 0.2);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            max-width: 440px;
            min-width: 340px;
            transform: translateZ(0);
          }
          
          .chatbox--expanded {
            height: 580px;
          }
          
          .chatbox--collapsed {
            height: auto;
            max-height: 220px;
          }
          
          .chatbox__header {
            padding: 24px 28px 20px;
            background: linear-gradient(135deg, 
              #667eea 0%, 
              #764ba2 50%,
              #667eea 100%);
            background-size: 200% 200%;
            animation: gradientShift 6s ease-in-out infinite;
            color: white;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-radius: 24px 24px 0 0;
            position: relative;
          }
          
          .chatbox__header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.1) 100%);
            pointer-events: none;
          }
          
          @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          
          .chatbox__title {
            display: flex;
            align-items: center;
            gap: 16px;
            position: relative;
          }
          
          .chatbox__avatar {
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.25);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.3);
          }
          
          .chatbox__meta {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          
          .chatbox__name {
            font-weight: 700;
            font-size: 17px;
            line-height: 1.2;
            letter-spacing: -0.01em;
          }
          
          .chatbox__status {
            font-size: 13px;
            opacity: 0.85;
            line-height: 1.2;
            font-weight: 500;
          }
          
          .chatbox__actions {
            display: flex;
            gap: 12px;
          }
          
          .btn {
            border: none;
            border-radius: 12px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            position: relative;
            overflow: hidden;
          }
          
          .btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.2);
            transform: translateX(-100%);
            transition: transform 0.3s ease;
          }
          
          .btn:hover::before {
            transform: translateX(0);
          }
          
          .btn--ghost {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            padding: 10px 14px;
            font-size: 13px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.3);
          }
          
          .btn--ghost:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
          }
          
          .btn--primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 14px 24px;
            font-size: 15px;
            border-radius: 16px;
            box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
          }
          
          .btn--primary:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
          }
          
          .btn--primary:active {
            transform: translateY(0);
          }
          
          .btn--primary:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
          }
          
          .chatbox__body {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
            max-height: 340px;
            background: linear-gradient(to bottom, 
              rgba(248, 250, 252, 0.8) 0%,
              rgba(255, 255, 255, 0.9) 100%);
          }
          
          .chatbox__body::-webkit-scrollbar {
            width: 6px;
          }
          
          .chatbox__body::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.05);
            border-radius: 3px;
          }
          
          .chatbox__body::-webkit-scrollbar-thumb {
            background: rgba(102, 126, 234, 0.3);
            border-radius: 3px;
          }
          
          .chatbox__body::-webkit-scrollbar-thumb:hover {
            background: rgba(102, 126, 234, 0.5);
          }
          
          .chatbox__empty {
            text-align: center;
            color: #6b7280;
            padding: 32px 0;
          }
          
          .chatbox__emptyIcon {
            font-size: 56px;
            margin-bottom: 20px;
            animation: float 3s ease-in-out infinite;
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
          
          .chatbox__emptyTitle {
            font-weight: 700;
            font-size: 20px;
            margin-bottom: 12px;
            color: #1f2937;
            letter-spacing: -0.02em;
          }
          
          .chatbox__emptySub {
            font-size: 15px;
            margin-bottom: 28px;
            line-height: 1.6;
            color: #6b7280;
            max-width: 300px;
            margin-left: auto;
            margin-right: auto;
          }
          
          .chatbox__chips {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            justify-content: center;
          }
          
          .chatbox__compact {
            padding: 20px 24px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.06);
            background: linear-gradient(to right, 
              rgba(248, 250, 252, 0.8) 0%,
              rgba(255, 255, 255, 0.9) 100%);
          }
          
          .chatbox__hint {
            font-size: 13px;
            color: #6b7280;
            margin-bottom: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          
          .chip {
            background: linear-gradient(135deg, 
              rgba(102, 126, 234, 0.08) 0%, 
              rgba(118, 75, 162, 0.08) 100%);
            border: 2px solid rgba(102, 126, 234, 0.15);
            border-radius: 20px;
            padding: 10px 16px;
            font-size: 13px;
            color: #667eea;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-weight: 600;
            position: relative;
            overflow: hidden;
          }
          
          .chip::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, 
              rgba(102, 126, 234, 0.1) 0%, 
              rgba(118, 75, 162, 0.1) 100%);
            opacity: 0;
            transition: opacity 0.3s ease;
          }
          
          .chip:hover::before {
            opacity: 1;
          }
          
          .chip:hover {
            border-color: rgba(102, 126, 234, 0.3);
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(102, 126, 234, 0.15);
          }
          
          .msg {
            display: flex;
            gap: 16px;
            margin-bottom: 20px;
            align-items: flex-start;
            animation: messageSlide 0.4s ease-out;
          }
          
          @keyframes messageSlide {
            from {
              opacity: 0;
              transform: translateY(16px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .msg--user {
            flex-direction: row-reverse;
          }
          
          .msg__avatar {
            width: 36px;
            height: 36px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            color: white;
            flex-shrink: 0;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }
          
          .msg--user .msg__avatar {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          }
          
          .msg--ai .msg__avatar {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          
          .msg--error .msg__avatar {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          }
          
          .msg__content {
            flex: 1;
            max-width: 85%;
          }
          
          .msg__bubble {
            padding: 16px 20px;
            border-radius: 20px;
            font-size: 15px;
            line-height: 1.6;
            word-wrap: break-word;
            position: relative;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
          }
          
          .msg--user .msg__bubble {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            border-radius: 20px 20px 6px 20px;
          }
          
          .msg--ai .msg__bubble {
            background: rgba(255, 255, 255, 0.9);
            color: #374151;
            border-radius: 20px 20px 20px 6px;
            border: 2px solid rgba(102, 126, 234, 0.1);
            backdrop-filter: blur(10px);
          }
          
          .msg--error .msg__bubble {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
            border-radius: 20px 20px 20px 6px;
          }
          
          .msg__toolbar {
            margin-top: 12px;
            display: flex;
            gap: 10px;
          }
          
          .btn--tiny {
            padding: 6px 12px;
            font-size: 12px;
            background: rgba(102, 126, 234, 0.1);
            color: #667eea;
            border: 1px solid rgba(102, 126, 234, 0.2);
            border-radius: 10px;
            font-weight: 600;
          }
          
          .btn--tiny:hover {
            background: rgba(102, 126, 234, 0.2);
            transform: translateY(-1px);
          }
          
          .msg__meta {
            margin-top: 8px;
            font-size: 12px;
            color: #9ca3af;
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 500;
          }
          
          .msg--user .msg__meta {
            justify-content: flex-end;
          }
          
          .chatbox__footer {
            padding: 24px;
            border-top: 1px solid rgba(0, 0, 0, 0.06);
            background: linear-gradient(to top, 
              rgba(248, 250, 252, 0.95) 0%,
              rgba(255, 255, 255, 0.9) 100%);
            backdrop-filter: blur(20px);
          }
          
          .chatbox__inputWrap {
            display: flex;
            gap: 16px;
            align-items: flex-end;
          }
          
          .chatbox__input {
            flex: 1;
            resize: none;
            padding: 16px 20px;
            border-radius: 20px;
            border: 2px solid rgba(102, 126, 234, 0.15);
            font-size: 15px;
            font-family: inherit;
            background: rgba(255, 255, 255, 0.9);
            transition: all 0.3s ease;
            outline: none;
            min-height: 52px;
            max-height: 120px;
            backdrop-filter: blur(10px);
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
          }
          
          .chatbox__input:focus {
            border-color: rgba(102, 126, 234, 0.4);
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.15);
          }
          
          .chatbox__input:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          
          .chatbox__input::placeholder {
            color: #9ca3af;
            font-weight: 500;
          }
          
          .spinner {
            width: 18px;
            height: 18px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top: 2px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .msg__stream {
            color: #667eea;
            font-style: italic;
            opacity: 0.8;
          }
          
          /* Mobile responsiveness */
          @media (max-width: 480px) {
            .chatbox {
              bottom: 16px;
              right: 16px;
              left: 16px;
              max-width: none;
              min-width: auto;
            }
            
            .chatbox--expanded {
              height: 70vh;
            }
            
            .chatbox__header {
              padding: 20px 20px 16px;
            }
            
            .chatbox__body {
              padding: 20px;
            }
            
            .chatbox__footer {
              padding: 20px;
            }
            
            .msg__content {
              max-width: 75%;
            }
          }
          
          /* Dark mode support */
          @media (prefers-color-scheme: dark) {
            .chatbox {
              background: rgba(17, 24, 39, 0.95);
              border-color: rgba(75, 85, 99, 0.3);
            }
            
            .chatbox__body {
              background: linear-gradient(to bottom, 
                rgba(17, 24, 39, 0.8) 0%,
                rgba(31, 41, 55, 0.9) 100%);
            }
            
            .chatbox__footer {
              background: linear-gradient(to top, 
                rgba(17, 24, 39, 0.95) 0%,
                rgba(31, 41, 55, 0.9) 100%);
            }
            
            .chatbox__emptyTitle {
              color: #f9fafb;
            }
            
            .chatbox__emptySub {
              color: #9ca3af;
            }
            
            .msg--ai .msg__bubble {
              background: rgba(31, 41, 55, 0.9);
              color: #f9fafb;
              border-color: rgba(102, 126, 234, 0.3);
            }
            
            .chatbox__input {
              background: rgba(31, 41, 55, 0.9);
              color: #f9fafb;
              border-color: rgba(102, 126, 234, 0.3);
            }
            
            .chatbox__input::placeholder {
              color: #6b7280;
            }
          }
        `}
      </style>
      
      <section className={`chatbox ${expanded ? 'chatbox--expanded' : 'chatbox--collapsed'}`}>
        {/* Header */}
        <header className="chatbox__header">
          <div className="chatbox__title">
            <div className="chatbox__avatar">🤖</div>
            <div className="chatbox__meta">
              <div className="chatbox__name">AI Urban Planner</div>
              <div className="chatbox__status">{loading ? "Thinking…" : "Ready to help"}</div>
            </div>
          </div>

          <div className="chatbox__actions">
            {conversation.length > 0 && (
              <button className="btn btn--ghost" onClick={clearChat} title="Clear conversation">
                🗑️
              </button>
            )}
            <button
              className="btn btn--ghost"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? "Minimize" : "Expand"}
            >
              {expanded ? "▾" : "▴"}
            </button>
          </div>
        </header>

        {/* Body */}
        {expanded ? (
          <main className="chatbox__body" ref={bodyRef}>
            {conversation.length === 0 && !answer ? (
              <div className="chatbox__empty">
                <div className="chatbox__emptyIcon">🗺️</div>
                <div className="chatbox__emptyTitle">Welcome to AI Urban Planning</div>
                <div className="chatbox__emptySub">
                  Ask about optimal locations for parks, clinics, or urban infrastructure.
                  I'll automatically show relevant markers on the map!
                </div>
                <div className="chatbox__chips">
                  {quickPrompts.map((p) => (
                    <button key={p} className="chip" onClick={() => setQuestion(p)} title={p}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {conversation.map((m, i) => (
                  <MessageBubble key={i} msg={m} onMarkers={onMarkers} />
                ))}
                {answer && (
                  <MessageBubble msg={{ type: "assistant", content: answer, time: "" }} streaming />
                )}
              </>
            )}
          </main>
        ) : (
          conversation.length === 0 && (
            <div className="chatbox__compact">
              <div className="chatbox__hint">Try asking:</div>
              <div className="chatbox__chips">
                {quickPrompts.slice(0, 2).map((p) => (
                  <button key={p} className="chip" onClick={() => setQuestion(p)} title={p}>
                    {p.length > 28 ? p.slice(0, 28) + "…" : p}
                  </button>
                ))}
              </div>
            </div>
          )
        )}

        {/* Footer */}
        <footer className="chatbox__footer">
          <div className="chatbox__inputWrap">
            <textarea
              ref={textareaRef}
              className="chatbox__input"
              rows={expanded ? 2 : 1}
              placeholder="Ask about urban planning…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              className="btn btn--primary"
              onClick={send}
              disabled={loading || !question.trim()}
            >
              {loading ? <div className="spinner" /> : "Send"}
            </button>
          </div>
        </footer>
      </section>
    </>
  );
}

function MessageBubble({ msg, streaming = false, onMarkers }) {
  const isUser = msg.type === "user";
  const isError = msg.type === "error";
  const roleClass = isUser ? "msg--user" : isError ? "msg--error" : "msg--ai";

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  return (
    <article className={`msg ${roleClass}`}>
      <div className="msg__avatar">
        {isUser ? "👤" : isError ? "⚠️" : "🤖"}
      </div>
      <div className="msg__content">
        <div className="msg__bubble">
          <div className="msg__text">{msg.content}</div>

          {!isUser && !streaming && (
            <div className="msg__toolbar">
              <button className="btn btn--tiny" onClick={() => copyText(msg.content)}>
                📋 Copy
              </button>
              {Array.isArray(msg.markers) && msg.markers.length > 0 && (
                <button
                  className="btn btn--tiny"
                  onClick={() => onMarkers?.(msg.markers, 'general')}
                >
                  📍 Show on map ({msg.markers.length})
                </button>
              )}
            </div>
          )}
        </div>
        <div className="msg__meta">
          {msg.time && <span className="msg__time">{msg.time}</span>}
          {streaming && <span className="msg__stream">✨ streaming…</span>}
        </div>
      </div>
    </article>
  );
}