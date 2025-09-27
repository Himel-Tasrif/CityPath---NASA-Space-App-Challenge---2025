import { useState } from "react";
// import "./RoleGate.css"
export default function RoleGate({ onComplete }) {
  const [closing, setClosing] = useState(false);

  const handleSelect = (selectedRole) => {
    setClosing(true);
    setTimeout(() => onComplete(selectedRole), 700);
  };

  return (
    <div className={`role-gate  ${closing ? "role-gate--closing" : ""}`}>
      <div className="gate-bg">
        <div className="blob blob--1" />
        <div className="blob blob--2" />
        <div className="blob blob--3" />
        <div className="grain" />
      </div>

      <div className="gate-content -translateY-6" style={{ transform: "translateY(-100px)"}}>
        <div className="brand">
          <div className="brand-mark">🌆</div>
          <div className="brand-text">
            <h1>CityPath</h1>
            <p>Navigating Urban Futures</p>
          </div>
        </div>

        <h2 className="gate-title">Who are you?</h2>
        <p className="gate-subtitle">
          Pick your role to tailor the experience. You can plan, analyze, or engage your community.
        </p>

        <div className="role-cards">
          <button 
            className="role-card" 
            onClick={() => handleSelect("urban-planner")}
          >
            <div className="role-icon role-icon--planner">
              🏙️
            </div>
            <div className="role-info">
              <h3>Urban Planner</h3>
              <p>Explore analytics, hotspots, and planning layers.</p>
            </div>
            <div className="role-cta">Continue →</div>
          </button>

          <button
            className="role-card role-card--accent"
            onClick={() => handleSelect("local-leader")}
          >
            <div className="role-icon role-icon--leader">
              🏛️
            </div>
            <div className="role-info">
              <h3>Local Leader</h3>
              <p>Create events by tapping points of interest on the map.</p>
            </div>
            <div className="role-cta">Continue →</div>
          </button>
        </div>

        <div className="footer-note">
          Made for communities and cities — fast, simple, and privacy-first.
        </div>
      </div>
    </div>
  );
}