import React, { useState } from "react";
import { getAllMaps } from "./services/MapStorage";
import { getAllAnnotationMapsLocal } from "./services/AnnotationStorage";
import { validateStoredMap } from "./utils/mapValidator";

import "./MapSelector.css";

function MapManager({ onSelectMap, mode = "annotation" }) {
  const [maps, setMaps] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [status, setStatus] = useState("");

  // -----------------------------
  // Load maps from IndexedDB
  // -----------------------------
  const loadMaps = async () => {
    try {
      const storedMaps = await getAllMaps();
      const annotationMaps = await getAllAnnotationMapsLocal();

      if (!storedMaps || storedMaps.length === 0) {
        setStatus("⚠️ No maps stored locally");
        setMaps([]);
        return;
      }

      // Attach annotation counts
      const mapsWithCounts = storedMaps.map(map => {
        const match = annotationMaps.find(
          a => a.featureMapId === map.id
        );

        return {
          ...map,
          annotationCount: match?.annotations?.length || 0
        };
      });

      setMaps(mapsWithCounts);
      setSelectedId(null);
      setStatus("✅ Maps loaded");

    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to load maps");
    }
  };

  // -----------------------------
  // Selected map + annotation count
  // -----------------------------
  const selectedMap = maps.find(m => m.id === selectedId);
  const annotationCount = selectedMap?.annotationCount || 0;

  // -----------------------------
  // Select + trigger action
  // -----------------------------
  const handleAction = () => {
    if (!selectedId) {
      setStatus("⚠️ Select a map");
      return;
    }

    const selectedMap = maps.find(m => m.id === selectedId);

    // Validate map
    const mapError = validateStoredMap(selectedMap);
    if (mapError) {
      setStatus(`❌ Invalid map format: ${mapError}`);
      return;
    }

    // Block inspection if no annotations
    if (mode === "inspection" && annotationCount === 0) {
      setStatus("❌ No annotations found. Cannot inspect this map.");
      return;
    }

    if (onSelectMap) {
      onSelectMap(selectedId, mode);
    }
  };

  return (
    <div className="map-manager-container">

      <h2 className="map-manager-title">Map Manager</h2>

      {/* LOAD */}
      <button className="menu-btn" onClick={loadMaps}>
        View Maps
      </button>

      {/* LIST */}
      {maps.length > 0 && (
        <div className="map-list">

          <h4 className="map-list-title">
            Stored Maps
          </h4>

          {maps.map((map) => {
            const count = map.annotationCount || 0;

            return (
              <label key={map.id} className="map-item">
                <input
                  type="radio"
                  name="map"
                  checked={selectedId === map.id}
                  onChange={() => {
                    setSelectedId(map.id);
                    setStatus("");
                  }}
                />

                {map.name || map.session || map.id}

                {/* Annotation indicator */}
                <span
                  style={{
                    marginLeft: "10px",
                    fontSize: "12px",
                    color: count > 0 ? "green" : "red"
                  }}
                >
                  {count > 0
                    ? `(${count} annotations)`
                    : "(no annotations)"}
                </span>
              </label>
            );
          })}

        </div>
      )}

      {/* ACTION */}
      {maps.length > 0 && (
        <button className="menu-btn" onClick={handleAction}>
          {mode === "annotation"
            ? "Annotate Selected Map"
            : "Inspect Selected Map"}
        </button>
      )}

      {/* STATUS */}
      {status && <p className="status-text">{status}</p>}
    </div>
  );
}

export default MapManager;