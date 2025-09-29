import { useEffect, useRef, useState } from "react";
import "./RoleGate.css";

const ROLES = [
  {
    id: "urban-planner",
    title: "Urban Planner",
    description: "Explore analytics, hotspots, and multi-layer planning tools.",
    icon: "🏙️",
    accent: "blue",
  },
  {
    id: "local-leader",
    title: "Local Leader",
    description: "Create events by tapping points of interest on the map.",
    icon: "🏛️",
    accent: "teal",
  },
];

export default function RoleGate({ onComplete }) {
  const [closing, setClosing] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const cardRefs = useRef([]);

  useEffect(() => {
    // focus first card on mount for keyboard users
    cardRefs.current?.[0]?.focus?.();
  }, []);

  const handleSelect = (selectedRole) => {
    setClosing(true);
    window.requestAnimationFrame(() => {
      setTimeout(() => onComplete(selectedRole), 550);
    });
  };

  const onKeyNav = (e) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;
    e.preventDefault();
    const cols = window.innerWidth >= 720 ? 2 : 1;
    const count = ROLES.length;
    let next = focusedIndex;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      next = (focusedIndex + 1) % count;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      next = (focusedIndex - 1 + count) % count;
    }
    setFocusedIndex(next);
    cardRefs.current?.[next]?.focus?.();
  };

  return (
    <div className={`role-gate ${closing ? "is-closing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="gate-title" aria-describedby="gate-subtitle">
      <div className="gate-bg" aria-hidden="true">
        <div className="bg-gradient" />
        <div className="blob blob--a" />
        <div className="blob blob--b" />
        <div className="blob blob--c" />
        <div className="grain" />
      </div>

      <main className="gate-panel">
        <header className="brand">
          <div className="brand-mark" aria-hidden="true">🌆</div>
          <div className="brand-text">
            <h1 className="brand-title" style={{color:"#fff"}}>CityPath</h1>
            <p className="brand-tagline">Navigating Urban Futures</p>
          </div>
        </header>

        <section className="intro">
          <h2 id="gate-title" className="gate-title" style={{color:"#fff"}}>Choose your role</h2>
          <p id="gate-subtitle" className="gate-subtitle">
            Tailor the experience to plan, analyze, or engage your community.
          </p>
        </section>

        <section className="cards" onKeyDown={onKeyNav}>
          {ROLES.map((r, i) => (
            <button
              key={r.id}
              ref={(el) => (cardRefs.current[i] = el)}
              type="button"
              className={`card card--${r.accent}`}
              onClick={() => handleSelect(r.id)}
              onFocus={() => setFocusedIndex(i)}
              aria-describedby={`${r.id}-desc`}
            >
              <div className="card-icon" aria-hidden="true">{r.icon}</div>
              <div className="card-body">
                <h3 className="card-title">{r.title}</h3>
                <p id={`${r.id}-desc`} className="card-text">{r.description}</p>
              </div>
              <div className="card-cta" aria-hidden="true">
                Continue <span className="arrow">→</span>
              </div>
            </button>
          ))}
        </section>

        <footer className="footer-note" style={{color:"#f2eeeeff"}}>
          Built for communities and cities — fast, simple, and privacy‑first.
        </footer>
      </main>
    </div>
  );
}