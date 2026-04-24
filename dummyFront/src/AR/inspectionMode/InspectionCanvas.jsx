import { useEffect, useRef, useState, useCallback } from "react";

import {
  projectFeatureToScreen,
  projectScreenToMap
} from "../utils/featureProjection";

import {
  runTrackingStep,
  resetTrackingState
} from "../utils/trackingController";

import {
  updatePose,
  getDisplayPose,
  resetPose
} from "../utils/poseController";

import { getMapById } from "../services/MapStorage";
import { extractFeatures } from "../utils/featureAdapter";

import "./styles/inspectionCanvas.css";

const HIT_RADIUS = 30;

function isValidHomography(H) {
  if (!Array.isArray(H) || H.length !== 9) return false;
  for (let i = 0; i < 9; i++) {
    if (!Number.isFinite(H[i])) return false;
  }
  return Math.abs(H[8]) > 1e-8;
}

function getVideoTransform(canvas, video) {
  if (!video) return null;

  const vw = video.videoWidth;
  const vh = video.videoHeight;

  if (!vw || !vh) return null;

  const rect = canvas.getBoundingClientRect();
  const cw = rect.width;
  const ch = rect.height;

  if (!cw || !ch) return null;

  const scale = Math.max(cw / vw, ch / vh);

  if (!Number.isFinite(scale) || scale <= 0) return null;

  const displayedWidth = vw * scale;
  const displayedHeight = vh * scale;

  const offsetX = (cw - displayedWidth) / 2;
  const offsetY = (ch - displayedHeight) / 2;

  return { scale, offsetX, offsetY };
}

function isValidPoint(point) {
  return point && Number.isFinite(point.x) && Number.isFinite(point.y);
}

function InspectionCanvas({
  mapId,
  setDebugText,
  captureFrame,
  videoRef,
  annotations = [],
  inspections = [],
  selectedItem = null,
  onSelect = () => {},
  onCreateInspection = () => {}
}) {
  const canvasRef = useRef(null);
  const [map, setMap] = useState(null);

  const animationFrameRef = useRef(null);
  const isTrackingRef = useRef(false);

  const lastMarkersRef = useRef([]);

  // -----------------------------
  // Load map
  // -----------------------------
  useEffect(() => {
    async function loadMap() {
      resetTrackingState();
      resetPose();

      const loadedMap = await getMapById(mapId);

      if (!loadedMap) {
        setMap(null);
        setDebugText("❌ Map failed");
        return;
      }

      const featureMap = loadedMap.featureMap || loadedMap;
      setMap(featureMap);

      const descriptorCount = featureMap.descriptors
        ? Object.keys(featureMap.descriptors).length
        : 0;

      setDebugText(`Map loaded: ${descriptorCount}`);
    }

    loadMap();
  }, [mapId, setDebugText]);

  // -----------------------------
  // Resize
  // -----------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resize();
    window.addEventListener("resize", resize);

    return () => window.removeEventListener("resize", resize);
  }, []);

  // -----------------------------
  // DRAW
  // -----------------------------
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const H = getDisplayPose();
    const video = videoRef?.current;
    const transform = getVideoTransform(canvas, video);

    if (!isValidHomography(H) || !transform) {
      lastMarkersRef.current = [];
      return;
    }

    const { scale, offsetX, offsetY } = transform;
    const features = extractFeatures(map);

    const markers = [];

    // -----------------------------
    // ANNOTATIONS (FEATURE LOCKED)
    // -----------------------------
    for (const a of annotations) {
      if (!a) continue;

      let mapX = a.mapX;
      let mapY = a.mapY;

      if (a.featureId) {
        const feature = features.find(f => f.id === a.featureId);
        if (feature) {
          mapX = feature.x + a.offsetX;
          mapY = feature.y + a.offsetY;
        }
      }

      const p = projectFeatureToScreen(
        { x: mapX, y: mapY },
        canvas,
        { homography: H }
      );

      if (!isValidPoint(p)) continue;

      markers.push({
        id: a.id,
        type: "annotation",
        x: p.x * scale + offsetX,
        y: p.y * scale + offsetY,
        colour: "#00ff88"
      });
    }

    // -----------------------------
    // INSPECTIONS (NO LOCKING)
    // -----------------------------
    for (const f of inspections) {
      if (!f) continue;

      const p = projectFeatureToScreen(
        { x: f.mapX, y: f.mapY },
        canvas,
        { homography: H }
      );

      if (!isValidPoint(p)) continue;

      markers.push({
        id: f.id,
        type: "inspection",
        x: p.x * scale + offsetX,
        y: p.y * scale + offsetY,
        colour: "#ff3b3b"
      });
    }

    // -----------------------------
    // SMOOTHING
    // -----------------------------
    const prev = lastMarkersRef.current;
    const smoothed = [];

    for (const m of markers) {
      const prevM = prev.find(
        p => p.id === m.id && p.type === m.type
      );

      let x = m.x;
      let y = m.y;

      if (prevM) {
        const dx = Math.abs(prevM.x - m.x);
        const dy = Math.abs(prevM.y - m.y);
        const dist = dx + dy;

        if (dist < 2) {
          x = prevM.x;
          y = prevM.y;
        } else {
          const alpha = Math.min(0.9, 0.65 + dist * 0.01);
          x = prevM.x * (1 - alpha) + x * alpha;
          y = prevM.y * (1 - alpha) + y * alpha;
        }
      }

      smoothed.push({ ...m, x, y });
    }

    lastMarkersRef.current = smoothed;

    // -----------------------------
    // DRAW MARKERS
    // -----------------------------
    for (const m of smoothed) {
      const selected =
        selectedItem &&
        selectedItem.id === m.id &&
        selectedItem.type === m.type;

      ctx.beginPath();
      ctx.arc(m.x, m.y, selected ? 14 : 10, 0, Math.PI * 2);
      ctx.fillStyle = m.colour;
      ctx.fill();

      if (selected) {
        ctx.beginPath();
        ctx.arc(m.x, m.y, 18, 0, Math.PI * 2);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, [annotations, inspections, selectedItem, videoRef, map]);

  // -----------------------------
  // Render loop
  // -----------------------------
  useEffect(() => {
    const loop = () => {
      draw();
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [draw]);

  // -----------------------------
  // Tracking loop (FRAME SYNC)
  // -----------------------------
  useEffect(() => {
    if (!map) return;

    let cancelled = false;

    const loop = async () => {
      if (cancelled) return;

      if (!isTrackingRef.current) {
        const frame = captureFrame?.();

        if (frame && !frame.bad) {
          isTrackingRef.current = true;

          try {
            const result = await runTrackingStep(frame, map);
            updatePose(result);
            setDebugText(result.isLost ? "Scanning..." : "Tracking ✓");
          } finally {
            isTrackingRef.current = false;
          }
        }
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);

    return () => {
      cancelled = true;
    };
  }, [map, captureFrame, setDebugText]);

  // -----------------------------
  // POINTER
  // -----------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePointer = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const markers = lastMarkersRef.current;

      let closest = null;
      let bestDist = Infinity;

      for (const m of markers) {
        const dx = x - m.x;
        const dy = y - m.y;
        const dist = dx * dx + dy * dy;

        if (dist < bestDist) {
          bestDist = dist;
          closest = m;
        }
      }

      if (closest && bestDist < HIT_RADIUS * HIT_RADIUS) {
        onSelect(closest.id, closest.type);
        return;
      }

      const H = getDisplayPose();
      if (!isValidHomography(H)) return;

      const video = videoRef?.current;
      const transform = getVideoTransform(canvas, video);
      if (!transform) return;

      const { scale, offsetX, offsetY } = transform;

      const frameX = (x - offsetX) / scale;
      const frameY = (y - offsetY) / scale;

      const mapPoint = projectScreenToMap(frameX, frameY, H);
      if (!isValidPoint(mapPoint)) return;

      onCreateInspection({
        mapX: mapPoint.x,
        mapY: mapPoint.y
      });
    };

    canvas.addEventListener("pointerdown", handlePointer);
    return () => canvas.removeEventListener("pointerdown", handlePointer);
  }, [onSelect, onCreateInspection, videoRef]);

  return (
    <canvas
      ref={canvasRef}
      className="inspection-canvas"
    />
  );
}

export default InspectionCanvas;