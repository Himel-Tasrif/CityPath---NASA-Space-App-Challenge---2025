import { useState } from "react";

export default function EventsPanel({ events, onClose, onDeleteEvent, onEventClick }) {
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  const filteredEvents = events.filter(event => {
    if (filter === "all") return true;
    if (filter === "upcoming") return new Date(event.whenISO) > new Date();
    if (filter === "past") return new Date(event.whenISO) <= new Date();
    return event.category === filter;
  });

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    switch (sortBy) {
      case "date":
        return new Date(b.whenISO) - new Date(a.whenISO);
      case "title":
        return a.title.localeCompare(b.title);
      case "created":
        return new Date(b.createdAt) - new Date(a.createdAt);
      default:
        return 0;
    }
  });

  const getEventStatus = (event) => {
    const eventDate = new Date(event.whenISO);
    const now = new Date();
    
    if (eventDate > now) {
      const diffTime = eventDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { status: "upcoming", text: `In ${diffDays} day${diffDays > 1 ? 's' : ''}`, color: "#10b981" };
    } else {
      return { status: "past", text: "Past", color: "#6b7280" };
    }
  };

  const uniqueCategories = [...new Set(events.map(e => e.category).filter(Boolean))];

  return (
    <>
      <style>
        {`
          .citypath-events-panel {
            position: absolute;
            top: 24px;
            right: 24px;
            z-index: 1000;
            width: 440px;
            max-height: calc(100vh - 48px);
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(25px) saturate(200%);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 24px;
            box-shadow: 
              0 20px 50px rgba(0, 0, 0, 0.15), 
              0 8px 30px rgba(0, 0, 0, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.4);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, sans-serif;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          .citypath-events-header {
            padding: 28px 28px 20px;
            border-bottom: 1px solid rgba(139, 92, 246, 0.15);
            flex-shrink: 0;
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.03), rgba(99, 102, 241, 0.02));
          }

          .citypath-events-title {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
          }

          .citypath-events-title h3 {
            margin: 0;
            font-size: 22px;
            font-weight: 800;
            color: #1f2937;
            display: flex;
            align-items: center;
            gap: 12px;
            letter-spacing: -0.02em;
          }

          .citypath-close-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #6b7280;
            padding: 8px;
            border-radius: 12px;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
          }

          .citypath-close-btn:hover {
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
            transform: scale(1.1);
          }

          .citypath-events-controls {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 20px;
          }

          .citypath-control-select {
            padding: 12px 16px;
            border: 2px solid rgba(139, 92, 246, 0.15);
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(10px);
            font-size: 14px;
            font-weight: 600;
            color: #4b5563;
            outline: none;
            transition: all 0.3s ease;
          }

          .citypath-control-select:focus {
            border-color: #8b5cf6;
            background: white;
            box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
          }

          .citypath-events-list {
            flex: 1;
            overflow-y: auto;
            padding: 0 28px 28px;
            scrollbar-width: thin;
            scrollbar-color: rgba(139, 92, 246, 0.3) transparent;
          }

          .citypath-events-list::-webkit-scrollbar {
            width: 6px;
          }

          .citypath-events-list::-webkit-scrollbar-track {
            background: transparent;
          }

          .citypath-events-list::-webkit-scrollbar-thumb {
            background: rgba(139, 92, 246, 0.3);
            border-radius: 3px;
          }

          .citypath-event-card {
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 20px;
            padding: 24px;
            margin-bottom: 16px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            cursor: pointer;
            overflow: hidden;
          }

          .citypath-event-card:hover {
            border-color: rgba(139, 92, 246, 0.4);
            box-shadow: 0 12px 40px rgba(139, 92, 246, 0.15);
            transform: translateY(-4px);
            background: rgba(255, 255, 255, 0.95);
          }

          .citypath-event-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 16px;
          }

          .citypath-event-title {
            font-size: 18px;
            font-weight: 800;
            color: #1f2937;
            margin: 0 0 8px 0;
            line-height: 1.3;
            letter-spacing: -0.01em;
          }

          .citypath-event-meta {
            display: flex;
            flex-direction: column;
            gap: 8px;
            font-size: 14px;
            color: #6b7280;
            margin-top: 12px;
          }

          .citypath-event-meta-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 500;
          }

          .citypath-event-status {
            font-size: 12px;
            font-weight: 800;
            padding: 6px 12px;
            border-radius: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: inline-block;
            margin-top: 4px;
          }

          .citypath-event-description {
            margin-top: 16px;
            padding: 16px;
            background: linear-gradient(135deg, rgba(249, 250, 251, 0.8), rgba(243, 244, 246, 0.6));
            backdrop-filter: blur(10px);
            border: 1px solid rgba(229, 231, 235, 0.5);
            border-radius: 12px;
            font-size: 14px;
            color: #4b5563;
            line-height: 1.5;
          }

          .citypath-event-actions {
            position: absolute;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 8px;
          }

          .citypath-action-btn {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 8px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
          }

          .citypath-action-btn:hover {
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
            border-color: rgba(239, 68, 68, 0.2);
            transform: scale(1.1);
          }

          .citypath-no-events {
            text-align: center;
            padding: 60px 20px;
            color: #6b7280;
          }

          .citypath-no-events-icon {
            font-size: 64px;
            margin-bottom: 24px;
            opacity: 0.4;
          }

          .citypath-no-events h4 {
            font-size: 18px;
            font-weight: 700;
            margin: 0 0 8px 0;
            color: #374151;
          }

          .citypath-no-events p {
            font-size: 14px;
            margin: 0;
            line-height: 1.5;
          }

          .citypath-events-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 20px;
          }

          .citypath-stat-badge {
            text-align: center;
            padding: 16px 12px;
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(99, 102, 241, 0.05));
            border: 1px solid rgba(139, 92, 246, 0.2);
            border-radius: 16px;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
          }

          .citypath-stat-badge:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(139, 92, 246, 0.15);
          }

          .citypath-stat-number {
            font-size: 20px;
            font-weight: 800;
            color: #7c3aed;
            margin-bottom: 4px;
            display: block;
          }

          .citypath-stat-label {
            color: #6b7280;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-size: 11px;
          }

          @media (max-width: 768px) {
            .citypath-events-panel {
              width: calc(100vw - 48px);
              right: 24px;
              left: 24px;
            }
          }
        `}
      </style>

      <div className="citypath-events-panel">
        <div className="citypath-events-header">
          <div className="citypath-events-title">
            <h3>
              <span>📅</span>
              Event Manager
            </h3>
            <button className="citypath-close-btn" onClick={onClose}>
              ×
            </button>
          </div>

          <div className="citypath-events-stats">
            <div className="citypath-stat-badge">
              <div className="citypath-stat-number">{events.length}</div>
              <div className="citypath-stat-label">Total</div>
            </div>
            <div className="citypath-stat-badge">
              <div className="citypath-stat-number">
                {events.filter(e => new Date(e.whenISO) > new Date()).length}
              </div>
              <div className="citypath-stat-label">Upcoming</div>
            </div>
            <div className="citypath-stat-badge">
              <div className="citypath-stat-number">
                {events.filter(e => new Date(e.whenISO) <= new Date()).length}
              </div>
              <div className="citypath-stat-label">Past</div>
            </div>
          </div>

          <div className="citypath-events-controls">
            <select 
              className="citypath-control-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All Events</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past Events</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select 
              className="citypath-control-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date">Sort by Date</option>
              <option value="title">Sort by Title</option>
              <option value="created">Sort by Created</option>
            </select>
          </div>
        </div>

        <div className="citypath-events-list">
          {sortedEvents.length === 0 ? (
            <div className="citypath-no-events">
              <div className="citypath-no-events-icon">📅</div>
              <h4>No events found</h4>
              <p>No events match your current filter criteria.</p>
            </div>
          ) : (
            sortedEvents.map((event) => {
              const status = getEventStatus(event);
              return (
                <div 
                  key={event.id} 
                  className="citypath-event-card"
                  onClick={() => onEventClick?.(event)}
                >
                  <div className="citypath-event-actions">
                    <button 
                      className="citypath-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to delete this event?')) {
                          onDeleteEvent(event.id);
                        }
                      }}
                      title="Delete event"
                    >
                      🗑️
                    </button>
                  </div>

                  <div className="citypath-event-header">
                    <div>
                      <h4 className="citypath-event-title">{event.title}</h4>
                      <div 
                        className="citypath-event-status"
                        style={{ 
                          backgroundColor: `${status.color}20`,
                          color: status.color 
                        }}
                      >
                        {status.text}
                      </div>
                    </div>
                  </div>

                  <div className="citypath-event-meta">
                    <div className="citypath-event-meta-item">
                      <span>📅</span>
                      <span>{new Date(event.whenISO).toLocaleString()}</span>
                    </div>
                    <div className="citypath-event-meta-item">
                      <span>📍</span>
                      <span>{event.sourceName}</span>
                    </div>
                    {event.category && (
                      <div className="citypath-event-meta-item">
                        <span>🏷️</span>
                        <span>{event.category}</span>
                      </div>
                    )}
                    <div className="citypath-event-meta-item">
                      <span>🌐</span>
                      <span>{event.lat.toFixed(4)}, {event.lon.toFixed(4)}</span>
                    </div>
                  </div>

                  {event.desc && (
                    <div className="citypath-event-description">
                      {event.desc}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}