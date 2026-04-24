import { useEffect, useState } from "react";

import {
  fetchAvailableMaps,
  fetchFeatureMapById
} from "./services/FeatureMapClient";

import {
  fetchAnnotations
} from "./services/annotationClient";

import {
  saveMap,
  wipeDatabase,
  getAllMaps
} from "./services/MapStorage";

import {
  saveAnnotationMapLocal
} from "./services/AnnotationStorage";

import { validateStoredMap } from "./utils/mapValidator";
import { validateAnnotations } from "./utils/annotationsValidator";

import "./DownloadMode.css";

function DownloadMode({ onBack }) {

  const [serverMaps, setServerMaps] = useState([]);
  const [localMaps, setLocalMaps] = useState([]);

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [confirmWipe, setConfirmWipe] = useState(false);

  // -----------------------------
  // LOAD DATA
  // -----------------------------
  useEffect(() => {
    async function load() {
      try {
        const maps = await fetchAvailableMaps();
        const local = await getAllMaps();

        setServerMaps(maps);
        setLocalMaps(local);

      } catch (err) {
        console.error(err);
        setStatus("Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // -----------------------------
  // DOWNLOAD MAP
  // -----------------------------
  async function handleDownloadMap(map) {
    try {
      setStatus("Downloading map...");

      const featureMap = await fetchFeatureMapById(map.id);

      // 🔥 VALIDATE USING SHARED VALIDATOR
      const error = validateStoredMap(featureMap);

      if (error) {
        setStatus(`❌ Invalid map: ${error}`);
        return;
      }

      await saveMap({
        id: featureMap.id,
        featureMap
      });

      setStatus("✅ Map saved");

    } catch (err) {
      console.error(err);
      setStatus("❌ Map download failed");
    }
  }

  // -----------------------------
  // DOWNLOAD ANNOTATIONS FOR ONE MAP
  // -----------------------------
  async function handleDownloadAnnotations(map) {
    try {
      const mapId =
        map.featureMapId ||
        map.featureMap?.id ||
        map.id;

      console.log("MAP OBJECT:", map);
      console.log("MAP ID USED:", mapId);

      if (!mapId) {
        setStatus("Invalid map");
        return;
      }

      setStatus(`Fetching annotations for ${mapId}...`);

      const annotationSet = await fetchAnnotations(mapId);

      console.log("ANNOTATION SET:", annotationSet);

      // 🔥 VALIDATE USING SHARED VALIDATOR
      const error = validateAnnotations(annotationSet);

      if (error) {
        setStatus(`❌ Invalid annotation data: ${error}`);
        return;
      }

      await saveAnnotationMapLocal({
        featureMapId: mapId,
        annotations: annotationSet.annotations
      });

      setStatus("✅ Annotations saved");

    } catch (err) {
      console.error("Download error:", err);
      setStatus("❌ Annotation download failed");
    }
  }

  // -----------------------------
  // WIPE DATABASE
  // -----------------------------
  async function handleWipe() {
    try {
      await wipeDatabase();

      setStatus("🧹 Database wiped");
      setConfirmWipe(false);
      setLocalMaps([]);

    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to wipe database");
    }
  }

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="download-container">

      <div className="top-bar">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2 className="download-title">Download</h2>
      </div>

      {loading && <p>Loading...</p>}

      {status && <p className="status-text">{status}</p>}

      {/* SERVER MAPS */}
      <h3>Available Maps (Server)</h3>

      <div className="download-list">
        {serverMaps.map((map) => (
          <div key={map.id} className="download-card">

            <div className="download-info">
              <strong>{map.name || map.id}</strong>
              <span>ID: {map.id}</span>
            </div>

            <button
              className="download-btn"
              onClick={() => handleDownloadMap(map)}
            >
              Download Map
            </button>

          </div>
        ))}
      </div>

      {/* LOCAL MAPS */}
      <h3>Your Maps (Local)</h3>

      {localMaps.length === 0 && (
        <p>No local maps found</p>
      )}

      <div className="download-list">
        {localMaps.map((map) => {

          const mapId = map.id || map.featureMap?.id;

          return (
            <div key={mapId} className="download-card">

              <div className="download-info">
                <strong>{mapId}</strong>
              </div>

              <button
                className="download-btn"
                onClick={() => handleDownloadAnnotations(map)}
              >
                Download Annotations
              </button>

            </div>
          );
        })}
      </div>

      {/* WIPE */}
      {!confirmWipe && (
        <button
          className="wipe-btn"
          onClick={() => setConfirmWipe(true)}
        >
          Wipe Local Data
        </button>
      )}

      {confirmWipe && (
        <div className="wipe-confirm">
          <p>Are you sure? This will delete ALL local maps.</p>

          <button
            className="confirm-btn"
            onClick={handleWipe}
          >
            Yes, wipe
          </button>

          <button
            className="cancel-btn"
            onClick={() => setConfirmWipe(false)}
          >
            Cancel
          </button>
        </div>
      )}

    </div>
  );
}

export default DownloadMode;