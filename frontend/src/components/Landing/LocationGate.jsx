import { useMemo, useState } from "react";
import "./LocationGate.css"
import { LOCATION_DATA } from "../../data/locations";

export default function LocationGate({ onComplete }) {
  const [closing, setClosing] = useState(false);

  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [district, setDistrict] = useState("");

  const countryObj = useMemo(
    () => LOCATION_DATA.find((c) => c.country === country),
    [country]
  );

  const regions = countryObj?.regions || [];
  const regionObj = useMemo(
    () => regions.find((r) => r.name === region),
    [regions, region]
  );
  const districts = regionObj?.districts || [];

  const canContinue = Boolean(country && region && district);

  const handleContinue = () => {
    if (!canContinue) return;
    setClosing(true);
    setTimeout(() => {
      onComplete({ country, region, district });
    }, 700);
  };

  const handleCountryChange = (value) => {
    setCountry(value);
    setRegion("");
    setDistrict("");
  };

  const handleRegionChange = (value) => {
    setRegion(value);
    setDistrict("");
  };

  return (
    <div className={`role-gate ${closing ? "role-gate--closing" : ""}`}>
      <div className="gate-bg">
        <div className="blob blob--1" />
        <div className="blob blob--2" />
        <div className="blob blob--3" />
        <div className="grain" />
      </div>

      <div className="gate-content">
      

        <div className="gate-header">
          <h2 className="gate-title">Choose your area</h2>
          <p className="gate-subtitle">
            Select country, region, and district to tailor the map.
          </p>
        </div>

        <div className="location-form">
          <div className="form-field">
            <label className="field-label">
              <span>Country</span>
              <select
                value={country}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="field-select"
              >
                <option value="" disabled>
                  Select a country
                </option>
                {LOCATION_DATA.map((c) => (
                  <option key={c.country} value={c.country}>
                    {c.country}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-field">
            <label className="field-label">
              <span>Region</span>
              <select
                value={region}
                onChange={(e) => handleRegionChange(e.target.value)}
                disabled={!country}
                className={`field-select ${!country ? 'field-select--disabled' : ''}`}
              >
                <option value="" disabled>
                  {country ? "Select a region" : "Select a country first"}
                </option>
                {regions.map((r) => (
                  <option key={r.name} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-field">
            <label className="field-label">
              <span>District</span>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                disabled={!region}
                className={`field-select ${!region ? 'field-select--disabled' : ''}`}
              >
                <option value="" disabled>
                  {region ? "Select a district" : "Select a region first"}
                </option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <button
          className={`continue-button ${canContinue ? 'continue-button--enabled' : 'continue-button--disabled'}`}
          disabled={!canContinue}
          onClick={handleContinue}
        >
          <span>Continue</span>
          <span className="continue-arrow">→</span>
        </button>

        <div className="footer-note">
          <span className="note-icon">💡</span>
          Dummy data for demo. Try Bangladesh → Dhaka → Dhaka.
        </div>
      </div>
    </div>
  );
}