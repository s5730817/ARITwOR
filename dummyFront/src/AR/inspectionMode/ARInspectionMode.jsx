import {
  useEffect,
  useState,
  useCallback
} from "react";

import { useCamera } from "../hooks/useCamera";
import InspectionCanvas from "./InspectionCanvas";
import BoxInspection from "./BoxInspection";
import { getMapById } from "../services/MapStorage";
import { getAnnotationMapLocal } from "../services/AnnotationStorage";
import { saveInspectionSession } from "../services/InspectionClient";

import "./styles/ARInspectionMode.css";

function ARInspectionMode({ mapId, onBack }) {
  const { videoRef, startCamera, captureFrame } = useCamera();

  const [debugText, setDebugText] = useState("Starting...");

  const [annotations, setAnnotations] = useState([]);
  const [inspections, setInspections] = useState([]);

  const [selectedItem, setSelectedItem] = useState(null);

  // -----------------------------
  // Start camera
  // -----------------------------
  useEffect(() => {
    startCamera();
  }, [startCamera]);

  // -----------------------------
  // Load map + annotations
  // -----------------------------
  useEffect(() => {
    if (!mapId) return;

    async function init() {
      const map = await getMapById(mapId);

      if (!map) {
        setDebugText("Map not found");
        return;
      }

      const annotationSet = await getAnnotationMapLocal(mapId);

      const normalized = (annotationSet?.annotations || []).map(a => ({
        ...a,

        // 🔥 keep BOTH fields
        note: a.note || "", // instructions
        inspectionNote: a.inspectionNote || "", // findings

        status: a.status || "pending",
        inspectionResult: a.inspectionResult || "functional",
        updatedAt: a.updatedAt || null
      }));

      setAnnotations(normalized);
      setInspections([]);
      setSelectedItem(null);

      setDebugText("Map + annotations loaded");
    }

    init();
  }, [mapId]);

  // -----------------------------
  // CREATE INSPECTION (FAULT)
  // -----------------------------
  const handleCreateInspection = useCallback((item) => {
    const newInspection = {
      id: crypto.randomUUID(),

      mapX: item.mapX,
      mapY: item.mapY,

      featureId: item.featureId ?? null,
      offsetX: item.offsetX ?? 0,
      offsetY: item.offsetY ?? 0,

      title: "New Fault",

      note: "", // optional short label
      inspectionNote: "", // 🔥 main user input

      inspectionResult: "defective",
      status: "pending",

      createdAt: new Date().toISOString()
    };

    setInspections(prev => [...prev, newInspection]);

    setSelectedItem({
      id: newInspection.id,
      type: "inspection"
    });
  }, []);

  // -----------------------------
  // UPDATE INSPECTION
  // -----------------------------
  const handleUpdateTitle = useCallback((id, title) => {
    setInspections(prev =>
      prev.map(i =>
        i.id === id ? { ...i, title } : i
      )
    );
  }, []);

  const handleUpdateNote = useCallback((id, note) => {
    setInspections(prev =>
      prev.map(i =>
        i.id === id ? { ...i, inspectionNote: note } : i
      )
    );
  }, []);

  // -----------------------------
  // UPDATE ANNOTATION (INSPECTION SIDE)
  // -----------------------------
  const handleUpdateAnnotationNote = useCallback((id, note) => {
    setAnnotations(prev =>
      prev.map(a =>
        a.id === id
          ? {
              ...a,
              inspectionNote: note,
              updatedAt: new Date().toISOString()
            }
          : a
      )
    );
  }, []);

  const handleUpdateAnnotationResult = useCallback((id, result) => {
    setAnnotations(prev =>
      prev.map(a =>
        a.id === id
          ? {
              ...a,
              inspectionResult: result,
              updatedAt: new Date().toISOString()
            }
          : a
      )
    );
  }, []);

  // -----------------------------
  // COMPLETE
  // -----------------------------
  const handleComplete = useCallback((id, type) => {
    if (type === "inspection") {
      setInspections(prev =>
        prev.map(i =>
          i.id === id ? { ...i, status: "checked" } : i
        )
      );
    }

    if (type === "annotation") {
      setAnnotations(prev =>
        prev.map(a =>
          a.id === id
            ? {
                ...a,
                status: "checked",
                updatedAt: new Date().toISOString()
              }
            : a
        )
      );
    }

    setSelectedItem(null);
  }, []);

  // -----------------------------
  // DELETE INSPECTION
  // -----------------------------
  const handleDelete = useCallback((id) => {
    setInspections(prev =>
      prev.filter(i => i.id !== id)
    );

    setSelectedItem(null);
  }, []);

  // -----------------------------
  // SAVE SESSION
  // -----------------------------
  const handleSave = useCallback(async () => {
    try {
      setDebugText("Saving...");

      const payload = {
        id: crypto.randomUUID(),

        featureMapId: mapId,
        entityId: null,

        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),

        annotationCount: annotations.length,

        // 🔥 FULL SNAPSHOT
        annotations: annotations,
        inspections: inspections
      };

      await saveInspectionSession(payload);

      setDebugText("✅ Saved");
    } catch (err) {
      console.error(err);
      setDebugText("❌ Save failed");
    }
  }, [mapId, annotations, inspections]);

  // -----------------------------
  // SELECT
  // -----------------------------
  const handleSelect = useCallback((id, type) => {
    setSelectedItem(id ? { id, type } : null);
  }, []);

  const setDebugTextStable = useCallback((text) => {
    setDebugText(text);
  }, []);

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <div className="ar-inspection-container inspection-mode">

      <div className="camera-wrapper">
        <video
          ref={videoRef}
          className="camera-feed"
          playsInline
          muted
          autoPlay
        />

        <InspectionCanvas
          mapId={mapId}
          setDebugText={setDebugTextStable}
          captureFrame={captureFrame}
          videoRef={videoRef}

          annotations={annotations}
          inspections={inspections}

          selectedItem={selectedItem}

          onSelect={handleSelect}
          onCreateInspection={handleCreateInspection}
        />
      </div>

      <div className="ui-layer">

        <div className="ui-content">
          <BoxInspection
            annotations={annotations}
            inspections={inspections}
            selectedItem={selectedItem}

            onSelect={handleSelect}

            onUpdateTitle={handleUpdateTitle}
            onUpdateNote={handleUpdateNote}
            onUpdateAnnotationNote={handleUpdateAnnotationNote}
            onUpdateAnnotationResult={handleUpdateAnnotationResult}

            onComplete={handleComplete}
            onDelete={handleDelete}
          />
        </div>

        <div className="ui-footer">
          <button className="save-button" onClick={handleSave}>
            Save Inspection
          </button>
        </div>

      </div>

      <div className="debug-overlay">{debugText}</div>

      <button className="back-button" onClick={onBack}>
        Back
      </button>
    </div>
  );
}

export default ARInspectionMode;