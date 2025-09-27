import "./App.css";
import { useState } from "react";
import MapView from "./components/Map/MapView.jsx";
import RoleGate from "./components/Landing/RoleGate.jsx";

export default function App() {
  const [role, setRole] = useState(null);
  const [showGate, setShowGate] = useState(true);

  const handleGateComplete = (selectedRole) => {
    setRole(selectedRole);
    setShowGate(false);
  };

  return (
    <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
      {showGate ? (
        <RoleGate onComplete={handleGateComplete} />
      ) : (
        <MapView role={role || "urban-planner"} />
      )}
    </div>
  );
}