import {
  useEffect,
  useState,
  useCallback,
  useRef
} from "react";

import { useCamera } from "../hooks/useCamera";
import AnnotationCanvas from "./annotationCanvas";
import BoxAnnotations from "./BoxAnnotations";

import { saveAnnotations } from "../services/annotationClient";

import "./styles/ARAnnotationMode.css";

const DOT_COLOURS = [
  "#00ff88",
  "#ff9f1c",
  "#00c2ff",
  "#ff4d6d",
  "#c77dff"
];

function ARAnnotationMode({
  mapId,
  entityId,
  onBack
}) {
  const {
    videoRef,
    startCamera,
    captureFrame
  } = useCamera();

  const [
    debugText,
    setDebugText
  ] = useState("Starting...");

  const [
    annotations,
    setAnnotations
  ] = useState([]);

  const [
    selectedId,
    setSelectedId
  ] = useState(null);

  const [
    isSaving,
    setIsSaving
  ] = useState(false);

  const [
    saveStatus,
    setSaveStatus
  ] = useState("");

  const nextColourIndexRef =
    useRef(0);

  useEffect(() => {
    startCamera();
  }, []);

  const setDebugTextStable =
    useCallback((text) => {
      setDebugText(text);
    }, []);

  const handleSelect =
    useCallback((id) => {
      setSelectedId(id);
    }, []);

  const handleCreateAnnotation =
    useCallback((item) => {
      const colour =
        DOT_COLOURS[
          nextColourIndexRef.current %
            DOT_COLOURS.length
        ];

      nextColourIndexRef.current += 1;

      const newItem = {
        ...item,
        colour
      };

      setAnnotations((prev) => [
        ...prev,
        newItem
      ]);

      setSelectedId(
        newItem.id
      );
    }, []);

  const handleToggleDone =
    useCallback((id) => {
      setAnnotations((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                done:
                  !item.done
              }
            : item
        )
      );

      setSelectedId(
        (prev) =>
          prev === id
            ? null
            : prev
      );
    }, []);

  const handleDelete =
    useCallback((id) => {
      setAnnotations((prev) =>
        prev.filter(
          (item) =>
            item.id !== id
        )
      );

      setSelectedId(
        (prev) =>
          prev === id
            ? null
            : prev
      );
    }, []);

  const handleUpdateNote =
    useCallback((id, note) => {
      setAnnotations((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                note
              }
            : item
        )
      );
    }, []);

  const handleUpdateTitle =
    useCallback((id, title) => {
      setAnnotations((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                title
              }
            : item
        )
      );
    }, []);

  // -----------------------------
  // SAVE TO SERVER
  // -----------------------------
  const handleSaveAnnotations =
    useCallback(async () => {
      if (
        annotations.length === 0
      ) {
        setSaveStatus(
          "⚠️ No annotations to save"
        );
        return;
      }

      try {
        setIsSaving(true);
        setSaveStatus("");

        const payload = {
          id: crypto.randomUUID(),           
          featureMapId: mapId,               
          entityId: entityId ?? null,
          createdAt: new Date().toISOString(),

          annotations: annotations.map(a => ({
            id: a.id || crypto.randomUUID(),

            mapX: a.mapX,
            mapY: a.mapY,

            featureId: a.featureId ?? null,
            offsetX: a.offsetX ?? 0,
            offsetY: a.offsetY ?? 0,

            title: a.title ?? "",
            note: a.note ?? "",
            done: a.done ?? false,

            colour: a.colour
          }))
        };

        await saveAnnotations(
          payload
        );

        setSaveStatus(
          "✅ Annotation set saved"
        );
      } catch (err) {
        console.error(err);

        setSaveStatus(
          "❌ Save failed"
        );
      } finally {
        setIsSaving(false);
      }
    }, [
      mapId,
      annotations
    ]);

  return (
  <div className="ar-annotation-container">
    {/* CAMERA AREA */}
    <div className="camera-wrapper">
      <video
        ref={videoRef}
        className="camera-feed"
        playsInline
        muted
        autoPlay
      />

      <AnnotationCanvas
        mapId={mapId}
        setDebugText={
          setDebugTextStable
        }
        captureFrame={
          captureFrame
        }
        videoRef={videoRef}
        annotations={
          annotations
        }
        selectedId={
          selectedId
        }
        onSelect={
          handleSelect
        }
        onCreateAnnotation={
          handleCreateAnnotation
        }
      />
    </div>

    {/* BOTTOM UI PANEL */}
    <div className="ui-layer">
      <BoxAnnotations
        annotations={
          annotations
        }
        selectedId={
          selectedId
        }
        onSelect={
          handleSelect
        }
        onToggleDone={
          handleToggleDone
        }
        onDelete={
          handleDelete
        }
        onUpdateNote={
          handleUpdateNote
        }
        onUpdateTitle={
          handleUpdateTitle
        }
      />

      {saveStatus && (
        <div className="save-status">
          {saveStatus}
        </div>
      )}

      <button
        className="save-button"
        onClick={
          handleSaveAnnotations
        }
        disabled={
          isSaving
        }
      >
        {isSaving
          ? "Saving..."
          : "Create Annotations"}
      </button>
    </div>

    {/* DEBUG */}
    <div className="debug-overlay">
      {debugText}
    </div>

    {/* BACK */}
    <button
      className="back-button"
      onClick={onBack}
    >
      Back
    </button>
  </div>
);
}

export default ARAnnotationMode;