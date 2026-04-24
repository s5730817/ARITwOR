import React, { useState } from "react";
import ARImageCapture from "./createMode/ARImageCapture";
import ARAnnotationMode from "./annotationMode/ARAnnotationMode";
import ARInspectionMode from "./inspectionMode/ARInspectionMode"; // ✅ NEW
import MapManager from "./MapSelector";
import DownloadMode from "./DownloadMode";

import "./ARController.css";

function ARController() {
  const [mode, setMode] = useState("menu");
  const [selectedMapId, setSelectedMapId] = useState(null);

  // -----------------------------
  // Back handler
  // -----------------------------
  const goBack = () => {
    setMode("menu");
    setSelectedMapId(null);
  };

  // -----------------------------
  // Shared selection handler
  // -----------------------------
  const handleSelectMap = (mapId, nextMode) => {
    console.log("📌 Selected:", mapId, nextMode);
    setSelectedMapId(mapId);
    setMode(nextMode);
  };

  // -----------------------------
  // CREATE MODE
  // -----------------------------
  if (mode === "create") {
    return (
      <>
        <button className="back-btn" onClick={goBack}>← Back</button>
        <ARImageCapture />
      </>
    );
  }

  // -----------------------------
  // ANNOTATION MODE
  // -----------------------------
  if (mode === "annotation") {
    if (!selectedMapId) {
      return (
        <>
          <button className="back-btn" onClick={goBack}>← Back</button>

          <MapManager onSelectMap={handleSelectMap} />
        </>
      );
    }

    return (
      <ARAnnotationMode
        mapId={selectedMapId}
        onBack={goBack}
      />
    );
  }

  // -----------------------------
  // INSPECTION MODE
  // -----------------------------
  if (mode === "inspection") {
    if (!selectedMapId) {
      return (
        <>
          <button className="back-btn" onClick={goBack}>← Back</button>

          <MapManager
            mode="inspection"
            onSelectMap={handleSelectMap}
          />
        </>
      );
    }

    return (
      <ARInspectionMode
        mapId={selectedMapId}
        onBack={goBack}
      />
    );
  }

  // -----------------------------
  // DOWNLOAD MODE
  // -----------------------------
  if (mode === "download") {
    return <DownloadMode onBack={goBack} />;
  }

  // -----------------------------
  // MENU
  // -----------------------------
  return (
    <div className="ar-menu-container">
      <h1 className="ar-title">AR System</h1>

      <div className="menu-section">
        <button className="menu-btn" onClick={() => setMode("create")}>
          Create Map
        </button>
      </div>

      <div className="menu-section">
        <button className="menu-btn" onClick={() => setMode("annotation")}>
          Annotate Map
        </button>
      </div>

      <div className="menu-section">
        <button className="menu-btn" onClick={() => setMode("inspection")}>
          Inspect Map
        </button>
      </div>

      <div className="menu-section">
        <button className="menu-btn" onClick={() => setMode("download")}>
          Download
        </button>
      </div>
    </div>
  );
}

export default ARController;