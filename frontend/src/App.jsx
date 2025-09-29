import "./App.css";
import { useEffect, useState } from "react";
import MapView from "./components/Map/MapView.jsx";
import RoleGate from "./components/Landing/RoleGate.jsx";
import LocationGate from "./components/Landing/LocationGate.jsx";

function readParams() {
  const sp = new URLSearchParams(window.location.search);
  return {
    role: sp.get("role"),
    country: sp.get("country"),
    region: sp.get("region"),
    district: sp.get("district"),
  };
}

function pushParams(updates) {
  const url = new URL(window.location.href);
  Object.entries(updates).forEach(([k, v]) => {
    if (v === null || v === undefined || v === "") {
      url.searchParams.delete(k);
    } else {
      url.searchParams.set(k, v);
    }
  });
  window.history.pushState(null, "", url);
}

export default function App() {
  const [params, setParams] = useState(readParams());

  useEffect(() => {
    const onPop = () => setParams(readParams());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const updateParams = (updates) => {
    pushParams(updates);
    setParams(readParams());
  };

  const needsRole = !params.role;
  const needsLocation = !params.country || !params.region || !params.district;

  const handleRoleSelected = (selectedRole) => {
    // When role changes, clear existing location to force re-selection
    updateParams({
      role: selectedRole,
      country: null,
      region: null,
      district: null,
    });
  };

  const handleLocationSelected = ({ country, region, district }) => {
    updateParams({ country, region, district });
  };

  return (
    <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
      {needsRole ? (
        <RoleGate onComplete={handleRoleSelected} />
      ) : needsLocation ? (
        <LocationGate onComplete={handleLocationSelected} />
      ) : (
        <MapView
          role={params.role || "urban-planner"}
          location={{
            country: params.country,
            region: params.region,
            district: params.district,
          }}
        />
      )}
    </div>
  );
}